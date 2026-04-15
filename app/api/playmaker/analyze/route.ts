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
  validateAnalysisPayload,
} from '@/lib/playmaker/server-ai'
import { buildFallbackAnalysis } from '@/lib/playmaker/analysis-engine'

type RequestBody = {
  draft?: unknown
}

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
                    },
                    required: ['operation', 'type', 'color', 'startXPct', 'startYPct', 'endXPct', 'endYPct', 'strokeWidthPct'],
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
Eres un analista tactico de futbol profesional. No eres un narrador del tablero.

Tu trabajo es leer una pizarra tactica, entender la idea, juzgar si funciona y explicar por que.
Debes sonar como un entrenador o analista con criterio real: claro, tactico, natural y capaz de decir que una jugada es floja, ingenua o poco realista si lo merece.

Prioridades de analisis, en este orden:
1. espacio a la espalda
2. balance defensivo tras perdida
3. apoyos reales para el poseedor
4. ocupacion del lado debil
5. lineas de pase y opciones para romper lineas
6. amplitud y profundidad
7. realismo del objetivo

Reglas:
- No describas posiciones de forma mecanica.
- No premies una jugada solo porque tenga muchos jugadores cerca del balon.
- Si hay ambiguedad, explica la suposicion en assumptions.
- Si derived_features contradice la intuicion visual, usa ambas cosas y razona la diferencia.
- Valora la jugada; no la resumas.
- Mantente concreto, opinionado y util.
- Devuelve solo JSON valido siguiendo el esquema pedido.
- Las recomendaciones son opcionales, pero si propones cambios deben ser seguros, realistas y aplicables al tablero recibido.
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
    verdict: 'No me gusta esta jugada porque cargas el lado fuerte pero no proteges nada detras.',
    main_problem: 'La sobrecarga no tiene ni salida limpia ni estructura para sostener la perdida.',
    reasons: [
      'El poseedor solo tiene una salida segura, asi que el rival puede encerrar la accion.',
      'Con solo dos jugadores en rest defence, la perdida deja espacio claro para correr a tu espalda.',
      'El lado debil no existe de verdad, asi que la sobrecarga no obliga al rival a respetar un cambio de orientacion.',
    ],
    improvements: [
      'Fija un jugador util en el lado debil antes de atraer tanta gente al balon.',
      'Deja una cobertura interior y otra exterior por detras del balon para sostener la transicion.',
    ],
    danger_zones: ['pasillo central tras perdida', 'espacio a la espalda del ultimo apoyo'],
    strengths: ['La idea de atraer por un costado es reconocible.'],
    assumptions: [],
    recommendations: [],
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
    verdict: 'Esta jugada tiene sentido porque la estructura si sostiene la progresion y la perdida.',
    main_problem: 'Lo menos convincente es que la recepcion interior depende demasiado de un solo hombre libre.',
    reasons: [
      'Hay tres apoyos seguros para el poseedor, asi que la salida no nace forzada.',
      'La rest defence de tres jugadores te deja una base razonable si el pase interior falla.',
      'El lado debil esta ocupado y eso mantiene abierta la opcion de girar la accion.',
    ],
    improvements: ['Acerca una segunda recepcion interior para que la progresion no dependa solo del mismo apoyo.'],
    danger_zones: ['intervalo interior si el receptor gira mal'],
    strengths: [
      'La jugada junta apoyo cercano, amenaza interior y posibilidad de cambio de orientacion.',
      'El balance tras perdida esta bastante mejor protegido que en una salida demasiado agresiva.',
    ],
    assumptions: [],
    recommendations: [],
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
    if (!isBoardDraftPayload(body.draft)) return errorResponse('El tablero recibido no es valido.', 400, 'INVALID_BODY')

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

    try {
      const response = await openai.responses.create({
        model: modelName,
        temperature,
        max_output_tokens: 1100,
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
        },
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
