import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerOpenAiConfig, getServerOpenAiKeyError } from '@/lib/openai-server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { buildPlaymakerAnalysisInput } from '@/lib/playmaker/analysis-engine'
import {
  extractJsonCandidate,
  extractRawResponseText,
  formatOpenAiError,
  getModelName,
  getTemperature,
  isBoardDraftPayload,
  isReasoningModel,
  validateAnalysisPayload,
} from '@/lib/playmaker/server-ai'
import { buildFallbackAnalysis } from '@/lib/playmaker/analysis-engine'

type RequestBody = {
  draft?: unknown
}

const ANALYSIS_MAX_OUTPUT_TOKENS = 5000

const ANALYSIS_JSON_SCHEMA = {
  name: 'playmaker_tactical_analysis',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      verdict: { type: 'string' },
      main_problem: { type: 'string' },
      reasons: { type: 'array', items: { type: 'string' } },
      improvements: { type: 'array', items: { type: 'string' } },
      danger_zones: { type: 'array', items: { type: 'string' } },
      strengths: { type: 'array', items: { type: 'string' } },
      assumptions: { type: 'array', items: { type: 'string' } },
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            reason: { type: 'string' },
            changes: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      operation: { type: 'string', enum: ['move_element'] },
                      elementId: { type: 'string' },
                      xPct: { type: 'number' },
                      yPct: { type: 'number' },
                      rotationDeg: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                    },
                    required: ['operation', 'elementId', 'xPct', 'yPct', 'rotationDeg'],
                  },
                  {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      operation: { type: 'string', enum: ['add_drawing'] },
                      type: { type: 'string', enum: ['arrow'] },
                      color: { type: 'string' },
                      startXPct: { type: 'number' },
                      startYPct: { type: 'number' },
                      endXPct: { type: 'number' },
                      endYPct: { type: 'number' },
                      strokeWidthPct: { type: 'number' },
                      fromElementId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                      toElementId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                      kind: { type: 'string', enum: ['pass', 'run', 'support', 'dribble'] },
                      label: { type: 'string' },
                    },
                    required: ['operation', 'type', 'color', 'startXPct', 'startYPct', 'endXPct', 'endYPct', 'strokeWidthPct', 'fromElementId', 'toElementId', 'kind', 'label'],
                  },
                  {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      operation: { type: 'string', enum: ['delete_drawing'] },
                      drawingId: { type: 'string' },
                    },
                    required: ['operation', 'drawingId'],
                  },
                ],
              },
            },
          },
          required: ['title', 'reason', 'changes'],
        },
      },
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
    required: ['verdict', 'main_problem', 'reasons', 'improvements', 'danger_zones', 'strengths', 'assumptions', 'recommendations', 'confidence'],
  },
} as const

function errorResponse(error: string, status = 500, code?: string) {
  return NextResponse.json({ ok: false, error, code }, { status })
}

function buildSystemPrompt() {
  return `
Eres un analista tactico de futbol profesional con experiencia en metodologia de juego de posicion, juego directo, transiciones y analisis de video al nivel de un primer equipo. No eres un narrador del tablero, no describes posiciones, no enumeras jugadores. Eres un entrenador con criterio que valora la jugada.

Tu objetivo es leer la pizarra, entender la INTENCIÓN del entrenador (lee con atención 'coach_note' y 'play_context.objective') y dar una opinión táctica argumentada, profesional y exigente. Debes sonar como Juanma Lillo, Marcelo Bielsa, Pep Guardiola, Xavi, Pellegrino o Pochettino: lenguaje táctico real, opiniones con criterio y capacidad para decir que una jugada es floja, ingenua, descompensada o poco realista cuando lo merezca.

PRINCIPIOS NO NEGOCIABLES:
1. Argumenta como un profesional. Cada razón debe explicar la causa táctica concreta y la consecuencia que provoca, no limitarse a un titular genérico.
2. Usa terminologia real: lado fuerte / lado debil, tercer hombre, fijar y soltar, intervalo, linea de pase interior, descarga, tercer apoyo, espalda de la linea, basculacion, presion tras perdida, rest defence, salida orientada, conduccion para fijar, atraccion, espacio entre lineas, perfil de receptor, superioridades posicionales / numericas / cualitativas, ruptura de linea, amplitud-profundidad-distancias, etc.
3. Cita zonas concretas (intervalo entre central y lateral del lado debil, pasillo interior derecho, espalda del 6 rival, perfil del extremo, cara externa del lateral) y, cuando ayude, jugadores por su nombre tecnico (poseedor, tercer hombre, hombre libre, receptor interior).
4. Conecta lo que ves en el tablero con lo que dice 'coach_note': si la intencion declarada no se sostiene con la estructura real, dilo sin rodeos y explica por que.
5. No premies la jugada solo porque haya gente cerca del balon. La aglomeracion sin estructura es ruido, no superioridad.
6. Cuando 'derived_features' contradiga la intuicion, usa ambas y razona la diferencia abiertamente.
7. Si el contexto es ambiguo, expresa la suposicion en 'assumptions' y sigue valorando con criterio.

PRIORIDADES DE ANALISIS, en este orden:
1. Realismo y coherencia entre objetivo declarado y estructura real.
2. Riesgo de transicion: rest defence, espalda de la linea, jugador libre rival.
3. Apoyos reales del poseedor: cantidad, calidad, perfil, distancia y orientacion.
4. Ocupación y conexión con el lado débil; viabilidad real de un cambio de orientación.
5. Lineas de pase para romper presion, opciones de tercer hombre y rupturas de linea.
6. Amplitud, profundidad y distancias entre lineas/jugadores.
7. Riesgo individual: aislamientos sin sentido, perfiles forzados, automatismos no asumibles.

EXIGENCIAS DE FORMATO:
- 'verdict': 1 frase con TU veredicto profesional. Nada de "la jugada tiene cosas buenas y cosas malas". Mojate.
- 'main_problem': el problema tactico principal, identificado con precision (no un sintoma).
- 'reasons': 3-4 argumentos tacticos solidos. Cada uno empieza identificando el problema/virtud y termina con la consecuencia que provoca en el juego (~25-45 palabras por razon, NO frases telegraficas).
- 'improvements': 2-3 ajustes accionables y concretos, no genericos. Si propones bajar a un jugador, di a que zona y para que.
- 'danger_zones': 2-3 zonas concretas del campo donde la jugada se rompe.
- 'strengths': 1-3 puntos fuertes reales (puede estar vacio si la jugada no los tiene).
- 'assumptions': lo que has tenido que asumir por falta de informacion.
- 'recommendations': SIEMPRE genera entre 1 y 3 recomendaciones que VISUALICEN tu razonamiento sobre el tablero.
- 'confidence': 'high' si la lectura es clara, 'medium' si depende de suposiciones, 'low' si faltan datos basicos.
- Devuelve SOLO JSON válido siguiendo el esquema pedido. Sin texto fuera del JSON.

FLECHAS EXPLICATIVAS (CRITICO):
Cuando hables de un jugador (apoyo cercano, ruptura, descarga, conduccion para fijar, cambio de orientacion, tercer hombre), DEBES traducirlo a una flecha en 'recommendations[].changes' con 'operation: add_drawing'. El objetivo es que el entrenador VEA en el campo lo que estas explicando con palabras.

Reglas de las flechas:
- 'fromElementId' debe ser el id real del jugador o balon que protagoniza la accion (cogelo de board_state.phases[].elements[].id). NUNCA inventes un id; si no existe el jugador, no pongas la flecha.
- 'toElementId' es opcional: usalo cuando la flecha apunta a otro jugador concreto (un pase). Si la flecha es una carrera al espacio, deja 'toElementId' como null y solo da las coordenadas finales.
- 'kind' indica el tipo: 'pass' (pase entre jugadores), 'run' (carrera al espacio), 'support' (movimiento de apoyo), 'dribble' (conduccion).
- 'color' codifica el tipo: '#ffe170' para pase, '#7dd3fc' para carrera al espacio, '#86efac' para apoyo, '#fda4af' para conduccion.
- 'label' es una etiqueta corta de 1-4 palabras que aparecera junto a la flecha (ej. 'Pase tercer hombre', 'Carrera espalda', 'Descarga al 6').
- 'startXPct' y 'startYPct' deben coincidir con la posicion del jugador en 'fromElementId'. Si pones 'toElementId', 'endXPct' y 'endYPct' deben coincidir con la posicion del receptor.
- 'strokeWidthPct' entre 0.5 y 1 (más grueso = más importante).
- Si 'fromElementId' o 'toElementId' no existen, omite ese campo o usa null. La aplicacion los ignora si no son validos.

Cada 'recommendation' debe combinar 'title' (idea), 'reason' (por que ayuda en 1-2 frases tacticas) y 'changes' con al menos UNA flecha que muestre la idea en el campo. Si la mejora implica reubicar a un jugador antes de la accion, anade tambien un 'move_element' del jugador a su nueva posicion.

- Idioma: español neutro; el tono debe ser profesional siempre.
  `.trim()
}

function buildFewShotMessages() {
  const exampleOneInput = {
    play_context: {
      play_type: 'attacking_overload',
      phase_name: 'Phase 2',
      objective: 'fijar en izquierda y soltar al lado debil',
      ball_holder: 'blue-8',
    },
    derived_features: {
      strong_side: 'left',
      weak_side: 'right',
      weak_side_occupied: false,
      support_count_near_ball: 3,
      defensive_balance_ok: false,
      rest_defence_count: 2,
      switch_option_available: false,
      space_in_behind_risk: 'high',
      number_of_safe_passing_options: 1,
      transition_risk: 'high',
      line_breaking_options: [],
    },
  }

  const exampleOneOutput = {
    verdict: 'La jugada no me convence: cargas el lado fuerte sin estructura ni amenaza real al lado debil, y eso te deja vendido si pierdes.',
    main_problem: 'Hay sobrecarga numerica cerca del balon, pero no superioridad posicional. El rival puede defender la accion con menos jugadores que tu y el riesgo de transicion es alto.',
    reasons: [
      'El poseedor solo tiene una linea de pase segura, asi que la accion es previsible: el rival cierra el corredor interior y te obliga a la perdida o al pase atras sin haber generado nada.',
      'La rest defence se queda en dos jugadores y el ultimo apoyo esta demasiado adelantado, asi que cualquier perdida deja un duelo igualado o en inferioridad ante la salida rival, con espalda libre en pasillo central.',
      'El lado debil no esta ocupado con un perfil util, por lo que la basculacion rival no tiene castigo: el cambio de orientacion no existe y la sobrecarga pierde su razon de ser, deja de ser un mecanismo y pasa a ser ruido.',
      'No hay tercer hombre claro entre los apoyos cercanos, asi que aunque el primer pase salga limpio, no hay continuidad para fijar y soltar al hombre libre.',
    ],
    improvements: [
      'Fija un extremo o interior con perfil abierto y altura razonable en el lado debil antes de cargar el balon, para que la sobrecarga obligue de verdad al rival a basculear.',
      'Deja dos coberturas (una interior, una exterior) por detras del balon a una distancia que permita morder al receptor rival en cinco metros, sosteniendo la presion tras perdida.',
      'Aproxima un tercer apoyo entre lineas en perfil cerrado para abrir un patron de tercer hombre y dejar de depender del unico pase corto que tienes hoy.',
    ],
    danger_zones: ['Pasillo central tras perdida', 'Espalda del ultimo apoyo en zona interior', 'Cara externa del lateral del lado debil'],
    strengths: ['La intencion de atraer por un costado se entiende, y el poseedor ocupa una zona logica para fijar.'],
    assumptions: [],
    recommendations: [
      {
        title: 'Activa el lado debil con el extremo opuesto',
        reason: 'Sin amenaza al lado debil la sobrecarga no obliga al rival a basculear; al subir al extremo se abre el cambio de orientacion.',
        changes: [
          {
            operation: 'move_element',
            elementId: 'blue-7',
            xPct: 82,
            yPct: 38,
            rotationDeg: null,
          },
          {
            operation: 'add_drawing',
            type: 'arrow',
            color: '#7dd3fc',
            startXPct: 60,
            startYPct: 38,
            endXPct: 82,
            endYPct: 30,
            strokeWidthPct: 0.7,
            fromElementId: 'blue-7',
            toElementId: null,
            kind: 'run',
            label: 'Amplitud lado debil',
          },
        ],
      },
      {
        title: 'Tercer hombre interior desde el 8',
        reason: 'El poseedor solo tiene una linea de pase; un apoyo cercano del 8 abre patron de tercer hombre y desbloquea la salida.',
        changes: [
          {
            operation: 'add_drawing',
            type: 'arrow',
            color: '#ffe170',
            startXPct: 35,
            startYPct: 55,
            endXPct: 48,
            endYPct: 50,
            strokeWidthPct: 0.7,
            fromElementId: 'blue-8',
            toElementId: 'blue-6',
            kind: 'pass',
            label: 'Descarga al 6',
          },
        ],
      },
    ],
    confidence: 'high',
  }

  const exampleTwoInput = {
    play_context: {
      play_type: 'build_up',
      phase_name: 'Phase 1',
      objective: 'progresar por dentro',
      ball_holder: 'blue-4',
    },
    derived_features: {
      strong_side: 'center',
      weak_side: 'left',
      weak_side_occupied: true,
      support_count_near_ball: 2,
      defensive_balance_ok: true,
      rest_defence_count: 3,
      switch_option_available: true,
      space_in_behind_risk: 'low',
      number_of_safe_passing_options: 3,
      transition_risk: 'low',
      line_breaking_options: ['blue-6 ataca espacio interior'],
    },
  }

  const exampleTwoOutput = {
    verdict: 'La jugada es solida y coherente con el objetivo: hay estructura para progresar por dentro y suficiente proteccion para sostener una perdida sin regalar la transicion.',
    main_problem: 'El unico punto fragil es que la progresion interior se apoya casi en exclusiva en un mismo receptor entre lineas; si el rival le marca, la salida pierde su llave.',
    reasons: [
      'El poseedor cuenta con tres apoyos seguros bien distribuidos en distancia y orientacion, por lo que la salida no nace forzada y permite elegir el pase adecuado a cada presion rival.',
      'La rest defence de tres jugadores combinada con un poseedor bajo deja una base de transicion realista: si el pase interior falla, el equipo puede morder al receptor rival a tiempo y no concede espalda en pasillo central.',
      'El lado debil esta ocupado con un perfil que amenaza la espalda del lateral rival, asi que el cambio de orientacion es una amenaza real y obliga a la primera linea de presion a no bascular en bloque.',
      'Aparece una opcion clara de ruptura interior por delante del 6 rival, lo que abre el patron de tercer hombre desde la primera salida.',
    ],
    improvements: [
      'Acerca un segundo perfil entre lineas en pasillo interior contrario para no depender de un unico hombre libre y poder escalonar la recepcion segun la presion rival.',
      'Da un metro más de profundidad al extremo del lado débil para forzar al lateral rival a renunciar a la basculación completa y abrir el intervalo interior.',
    ],
    danger_zones: ['Intervalo interior si el receptor entre lineas gira mal y pierde el balon de cara'],
    strengths: [
      'La jugada combina apoyo cercano, amenaza interior y cambio de orientacion: tres recursos a la vez, no uno solo.',
      'El balance entre poseedor, rest defence y altura del bloque permite presionar arriba tras perdida, no solo replegar.',
    ],
    assumptions: [],
    recommendations: [
      {
        title: 'Romper la primera linea por el 6',
        reason: 'El 6 ataca el espacio interior por delante del medio rival; el pase rompe la primera linea y deja al 10 con perfil para girar.',
        changes: [
          {
            operation: 'add_drawing',
            type: 'arrow',
            color: '#ffe170',
            startXPct: 50,
            startYPct: 70,
            endXPct: 50,
            endYPct: 48,
            strokeWidthPct: 0.8,
            fromElementId: 'blue-4',
            toElementId: 'blue-6',
            kind: 'pass',
            label: 'Pase interior',
          },
        ],
      },
    ],
    confidence: 'high',
  }

  return [
    { role: 'user' as const, content: `Ejemplo 1\n${JSON.stringify(exampleOneInput, null, 2)}` },
    { role: 'assistant' as const, content: JSON.stringify(exampleOneOutput) },
    { role: 'user' as const, content: `Ejemplo 2\n${JSON.stringify(exampleTwoInput, null, 2)}` },
    { role: 'assistant' as const, content: JSON.stringify(exampleTwoOutput) },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const openAiConfig = getServerOpenAiConfig()
    if (!openAiConfig) return errorResponse(getServerOpenAiKeyError(), 500, 'OPENAI_KEY_MISSING')
    const apiKey = openAiConfig.apiKey

    const body = (await request.json()) as RequestBody
    if (!isBoardDraftPayload(body.draft)) return errorResponse('El tablero recibido no es válido.', 400, 'INVALID_BODY')

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return errorResponse('No autorizado', 401, 'UNAUTHORIZED')

    const draft = body.draft
    const modelName = getModelName()
    const temperature = getTemperature()
    const modelInput = buildPlaymakerAnalysisInput(draft)

    console.info('PLAYMAKER_ANALYZE_REQUEST', { userId: user.id, model: modelName, temperature, payload: modelInput })

    const openai = new OpenAI({ apiKey })
    let rawText = ''
    let parsedResult: unknown = null
    let fallbackUsed = false
    let validationErrors: string[] = []
    let responseMeta: { id?: string; model?: string | null; status?: string | null; requestID?: string | null } = {}

    const usesReasoningParams = isReasoningModel(modelName)

    try {
      const response = await openai.responses.create({
        model: modelName,
        max_output_tokens: ANALYSIS_MAX_OUTPUT_TOKENS,
        instructions: buildSystemPrompt(),
        input: [
          ...buildFewShotMessages(),
          { role: 'user', content: JSON.stringify(modelInput, null, 2) },
        ],
        text: {
          format: {
            type: 'json_schema',
            ...ANALYSIS_JSON_SCHEMA,
          },
          ...(usesReasoningParams ? { verbosity: 'low' as const } : {}),
        },
        prompt_cache_key: 'playmaker-analyze-v1',
        ...(usesReasoningParams
          ? { reasoning: { effort: 'low' } }
          : { temperature: Math.min(temperature, 0.3) }),
      })

      responseMeta = {
        id: response.id,
        model: response.model,
        status: response.status,
        requestID: response._request_id ?? null,
      }

      console.info('PLAYMAKER_ANALYZE_OPENAI_RESPONSE', { responseMeta, response })

      rawText = extractRawResponseText(response)
      if (!rawText) throw new Error('EMPTY_AI_RESPONSE')
      const jsonCandidate = extractJsonCandidate(rawText)
      if (!jsonCandidate) throw new Error('INVALID_AI_JSON_WRAPPER')
      parsedResult = JSON.parse(jsonCandidate)
      console.info('PLAYMAKER_ANALYZE_PARSED_JSON', { responseMeta, rawText, parsedResult })
    } catch (modelError) {
      fallbackUsed = true
      validationErrors = ['La llamada estructurada a OpenAI fallo antes de producir una respuesta valida.']
      console.warn('PLAYMAKER_ANALYZE_OPENAI_ERROR', {
        responseMeta,
        rawText,
        parsedResult,
        validationErrors,
        error: formatOpenAiError(modelError),
      })
    }

    let analysis
    if (!fallbackUsed) {
      const validation = validateAnalysisPayload(parsedResult, draft)
      validationErrors = validation.errors
      console.info('PLAYMAKER_ANALYZE_VALIDATION', { responseMeta, rawText, parsedResult, validation })

      if (validation.ok) {
        analysis = validation.analysis
      } else {
        fallbackUsed = true
        console.warn('PLAYMAKER_ANALYZE_VALIDATION_FAILED', { responseMeta, rawText, parsedResult, validationErrors })
        analysis = buildFallbackAnalysis(draft)
      }
    } else {
      analysis = buildFallbackAnalysis(draft)
    }

    console.info('PLAYMAKER_ANALYZE_FINAL_RESULT', { responseMeta, fallbackUsed, rawText, parsedResult, validationErrors, analysis })

    return NextResponse.json({
      ok: true,
      data: analysis,
      meta: {
        fallbackUsed,
        model: responseMeta.model ?? modelName,
        currentPhaseId: draft.activePhaseId,
      },
    })
  } catch (error) {
    console.error('Error en POST /api/playmaker/analyze:', { error: formatOpenAiError(error) })
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) return errorResponse('API key de OpenAI invalida.', 401, 'OPENAI_UNAUTHORIZED')
      if (error.status === 429) return errorResponse('Limite de OpenAI alcanzado. Intenta de nuevo.', 429, 'OPENAI_RATE_LIMIT')
    }
    return errorResponse('Error interno del servidor.', 500, 'INTERNAL_ERROR')
  }
}
