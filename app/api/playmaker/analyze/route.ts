import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type BoardDraftPayload = {
  version: number
  name?: string
  analysisContext?: string
  activePhaseId: string
  phases: unknown[]
}

type AnalysisResult = {
  verdict: string
  main_problem: string
  reasons: string[]
  improvements: string[]
  danger_zones: string[]
  strengths: string[]
  assumptions: string[]
  recommendations: Array<{
    title: string
    reason: string
    changes: Array<{
      operation: 'move_element' | 'add_drawing' | 'delete_drawing'
      [key: string]: unknown
    }>
  }>
  confidence: 'low' | 'medium' | 'high'
}

type RequestBody = {
  draft?: unknown
}

function errorResponse(error: string, status = 500, code?: string) {
  return NextResponse.json({ ok: false, error, code }, { status })
}

function isBoardDraftPayload(value: unknown): value is BoardDraftPayload {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<BoardDraftPayload>
  return draft.version === 1 && typeof draft.activePhaseId === 'string' && Array.isArray(draft.phases)
}

function extractJson(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1)
  }
  return null
}

function normalizeStringList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

function normalizeRecommendations(value: unknown) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const raw = item as Record<string, unknown>
      const title = typeof raw.title === 'string' ? raw.title.trim() : ''
      const reason = typeof raw.reason === 'string' ? raw.reason.trim() : ''
      const changes = Array.isArray(raw.changes)
        ? raw.changes
            .map((change) => {
              if (!change || typeof change !== 'object') return null
              const payload = change as Record<string, unknown>
              const operation = payload.operation
              if (
                operation !== 'move_element' &&
                operation !== 'add_drawing' &&
                operation !== 'delete_drawing'
              ) {
                return null
              }
              return payload as {
                operation: 'move_element' | 'add_drawing' | 'delete_drawing'
                [key: string]: unknown
              }
            })
            .filter((change): change is {
              operation: 'move_element' | 'add_drawing' | 'delete_drawing'
              [key: string]: unknown
            } => Boolean(change))
        : []

      if (!title || !reason || changes.length === 0) return null
      return { title, reason, changes }
    })
    .filter(
      (
        item
      ): item is {
        title: string
        reason: string
        changes: Array<{
          operation: 'move_element' | 'add_drawing' | 'delete_drawing'
          [key: string]: unknown
        }>
      } => Boolean(item)
    )
    .slice(0, 3)
}

function normalizeAnalysisPayload(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Partial<AnalysisResult>

  const verdict = typeof payload.verdict === 'string' ? payload.verdict.trim() : ''
  const mainProblem = typeof payload.main_problem === 'string' ? payload.main_problem.trim() : ''
  const reasons = normalizeStringList(payload.reasons, 3)
  const improvements = normalizeStringList(payload.improvements, 2)
  const dangerZones = normalizeStringList(payload.danger_zones, 2)
  const strengths = normalizeStringList(payload.strengths, 2)
  const assumptions = normalizeStringList(payload.assumptions, 2)
  const recommendations = normalizeRecommendations(payload.recommendations)
  const confidence =
    payload.confidence === 'low' || payload.confidence === 'medium' || payload.confidence === 'high'
      ? payload.confidence
      : 'medium'

  if (!verdict || !mainProblem) return null

  return {
    verdict,
    main_problem: mainProblem,
    reasons,
    improvements,
    danger_zones: dangerZones,
    strengths,
    assumptions,
    recommendations,
    confidence,
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return errorResponse('OPENAI_API_KEY no configurada.', 500, 'OPENAI_KEY_MISSING')
    }

    const body = (await request.json()) as RequestBody
    if (!isBoardDraftPayload(body.draft)) {
      return errorResponse('El tablero recibido no es valido.', 400, 'INVALID_BODY')
    }

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse('No autorizado', 401, 'UNAUTHORIZED')
    }

    const systemPrompt = `
Eres un analista tactico de futbol de nivel profesional.

Tu trabajo NO es describir mecanicamente un tablero.
Tu trabajo es ENTENDER la idea tactica, JUZGARLA con criterio y dar una opinion clara, util y especifica, como lo haria un entrenador o analista experto.

Vas a recibir una jugada en formato JSON.
Debes interpretarla como una pizarra tactica de futbol.

========================
REGLAS DE INTERPRETACION
========================

1. El campo
- x=0 es el lado izquierdo del campo
- x=100 es el lado derecho del campo
- y=0 es la porteria rival
- y=100 es la porteria propia
- attack_direction indica hacia que porteria ataca el equipo azul

2. Equipos
- blue = equipo que disena la jugada
- red = rival
- white o black markers pueden representar balon, apoyos, referencias o herramientas segun board_semantics

3. Elementos
- type=player representa un jugador
- type=ball representa el balon
- tools como cone, ladder, pole, hurdle, mannequin, mini_goal son herramientas de entrenamiento y NO deben analizarse como jugadores
- cada jugador puede incluir team, number, role, label, x, y

4. Dibujos
- drawings representan acciones tacticas
- su significado exacto vendra definido en board_semantics
- por ejemplo:
  - dashed_arrow = pase
  - solid_arrow = desmarque
  - support_line = apoyo
  - zone = zona objetivo
- si algo no esta completamente claro, haz una suposicion razonable y declarala en "assumptions"

5. Contexto tactico
Ademas del tablero, recibiras contexto como:
- tipo de jugada
- objetivo
- quien inicia la accion
- fase actual
- foco de analisis
- comentario del entrenador

Ese contexto es MUY importante y debe influir en tu valoracion.

========================
COMO DEBES ANALIZAR
========================

No describas simplemente donde estan los jugadores.
No hagas comentarios obvios.
No seas generico.
No intentes quedar bien si la jugada esta mal.

Debes analizar la jugada como un entrenador con criterio.

Prioriza este orden:

1. Espacio a la espalda
2. Equilibrio tras perdida
3. Apoyos reales al poseedor
4. Ocupacion de espacios
5. Riesgo y viabilidad
6. Coherencia con el objetivo

========================
ESTILO DE RESPUESTA
========================

Quiero que hables como un analista tactico real.
Tu tono debe ser claro, directo, tactico, util, natural y con opinion real.

========================
SALIDA OBLIGATORIA
========================

Devuelve SOLO JSON valido con esta estructura exacta:
{
  "verdict": "opinion tactica principal en 1 frase, clara y directa",
  "main_problem": "principal problema tactico detectado",
  "reasons": ["razon tactica 1", "razon tactica 2", "razon tactica 3"],
  "improvements": ["mejora concreta 1", "mejora concreta 2"],
  "danger_zones": ["zona o situacion de riesgo 1", "zona o situacion de riesgo 2"],
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "assumptions": ["suposicion 1", "suposicion 2"],
  "recommendations": [
    {
      "title": "ajuste concreto",
      "reason": "por que merece la pena",
      "changes": [
        { "operation": "move_element", "elementId": "id-existente", "xPct": 52, "yPct": 61 },
        { "operation": "add_drawing", "type": "arrow", "color": "#ffe170", "startXPct": 48, "startYPct": 62, "endXPct": 61, "endYPct": 44, "strokeWidthPct": 0.7 }
      ]
    }
  ],
  "confidence": "low | medium | high"
}

========================
REGLAS FINALES
========================

- No inventes jugadores, movimientos o intenciones no presentes en los datos
- No ignores el contexto dado por el entrenador
- Si algo es ambiguo, usa assumptions
- Si la jugada es floja, dilo claramente
- Si la jugada es buena, explicalo claramente
- Además de opinar, devuelve recomendaciones aplicables al tablero
- Cada recommendation debe incluir title, reason y changes
- Los changes solo pueden usar operaciones permitidas: move_element, add_drawing, delete_drawing
- No inventes elementIds
- No propongas cambios imposibles
- No respondas en texto libre
- Responde SOLO con el JSON pedido
`.trim()

    const userPrompt = JSON.stringify(
      {
        PLAY_CONTEXT: {
          play_name: typeof body.draft.name === 'string' ? body.draft.name : 'Play Maker Draft',
          phase_in_focus: body.draft.activePhaseId,
          analysis_focus: 'evaluar viabilidad tactica, balance tras perdida y apoyos reales',
        },
        BOARD_SEMANTICS: {
          attack_direction: 'blue attacks toward y=0',
          team_mapping: {
            blue: 'equipo que diseña la jugada',
            red: 'rival',
          },
          markers: {
            blue: 'jugador del equipo azul',
            red: 'jugador rival',
            ball: 'balon',
          },
          drawings: {
            dashed_arrow: 'trayectoria, pase o movimiento orientativo segun contexto',
          },
          note: 'Los tools de entrenamiento no deben analizarse como jugadores.',
        },
        BOARD_STATE: body.draft,
        COACH_NOTE:
          typeof body.draft.analysisContext === 'string' && body.draft.analysisContext.trim()
            ? body.draft.analysisContext.trim()
            : '',
      },
      null,
      2
    )

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.55,
      max_tokens: 700,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const rawText = completion.choices[0]?.message?.content?.trim()
    if (!rawText) {
      return errorResponse('La IA no devolvio contenido.', 502, 'EMPTY_AI_RESPONSE')
    }

    const jsonText = extractJson(rawText)
    if (!jsonText) {
      return errorResponse('No se pudo interpretar la respuesta de IA como JSON.', 502, 'INVALID_AI_JSON')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return errorResponse('La IA devolvio JSON invalido.', 502, 'INVALID_AI_JSON')
    }

    const analysis = normalizeAnalysisPayload(parsed)
    if (!analysis) {
      return errorResponse('La IA devolvio una respuesta vacia o invalida.', 502, 'INVALID_AI_JSON')
    }

    return NextResponse.json({
      ok: true,
      data: analysis,
    })
  } catch (error) {
    console.error('Error en POST /api/playmaker/analyze:', error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) return errorResponse('API key de OpenAI invalida.', 401, 'OPENAI_UNAUTHORIZED')
      if (error.status === 429) return errorResponse('Limite de OpenAI alcanzado. Intenta de nuevo.', 429, 'OPENAI_RATE_LIMIT')
    }

    return errorResponse('Error interno del servidor.', 500, 'INTERNAL_ERROR')
  }
}
