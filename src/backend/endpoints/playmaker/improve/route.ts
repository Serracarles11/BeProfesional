import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerOpenAiConfig, getServerOpenAiKeyError } from '@/lib/openai-server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { buildPlaymakerAnalysisInput } from '@/lib/playmaker/analysis-engine'
import {
  buildFallbackImprovement,
  extractJsonCandidate,
  extractRawResponseText,
  formatOpenAiError,
  getModelName,
  getTemperature,
  isBoardDraftPayload,
  isReasoningModel,
  validateImprovementPayload,
} from '@/lib/playmaker/server-ai'
import type { PlaymakerAnalysis } from '@/lib/playmaker/types'

type RequestBody = {
  draft?: unknown
  analysis?: unknown
}

const IMPROVEMENT_MAX_OUTPUT_TOKENS = 3000

const IMPROVEMENT_JSON_SCHEMA = {
  name: 'playmaker_improved_play',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      improved_verdict: { type: 'string' },
      improvement_goal: { type: 'string' },
      changes: {
        type: 'array',
        items: {
          anyOf: [
            {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: { type: 'string', enum: ['move_element'] },
                elementId: { type: 'string' },
                to: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                  },
                  required: ['x', 'y'],
                },
              },
              required: ['type', 'elementId', 'to'],
            },
            {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: { type: 'string', enum: ['add_drawing'] },
                drawing: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    type: { type: 'string', enum: ['arrow'] },
                    kind: {
                      anyOf: [
                        { type: 'string', enum: ['run', 'pass', 'support'] },
                        { type: 'null' },
                      ],
                    },
                    from: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                      },
                      required: ['x', 'y'],
                    },
                    to: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                      },
                      required: ['x', 'y'],
                    },
                    color: {
                      anyOf: [{ type: 'string' }, { type: 'null' }],
                    },
                    strokeWidthPct: {
                      anyOf: [{ type: 'number' }, { type: 'null' }],
                    },
                  },
                  required: ['type', 'kind', 'from', 'to', 'color', 'strokeWidthPct'],
                },
              },
              required: ['type', 'drawing'],
            },
            {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: { type: 'string', enum: ['delete_drawing'] },
                drawingId: { type: 'string' },
              },
              required: ['type', 'drawingId'],
            },
          ],
        },
      },
      expected_benefits: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['improved_verdict', 'improvement_goal', 'changes', 'expected_benefits'],
  },
} as const

function errorResponse(error: string, status = 500, code?: string) {
  return NextResponse.json({ ok: false, error, code }, { status })
}

function looksLikeAnalysis(value: unknown): value is PlaymakerAnalysis {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).verdict === 'string' &&
      typeof (value as Record<string, unknown>).main_problem === 'string'
  )
}

function buildSystemPrompt() {
  return `
Eres un entrenador-analista de futbol y tu trabajo ahora no es comentar la jugada, sino mejorarla.

Vas a recibir:
- el tablero actual
- el contexto tactico
- las derived_features
- el analisis tactico previo

Tu tarea es proponer una version mejor de LA MISMA idea, no inventar una jugada nueva.
Debes preservar la intencion original siempre que sea posible y corregir los puntos debiles principales.

Prioriza:
1. rest defence
2. apoyos al poseedor
3. acceso al lado debil
4. proteccion del espacio a la espalda
5. progresion mas segura
6. mejor spacing

Reglas:
- No rompas la idea original salvo que sea claramente inviable.
- No muevas jugadores por moverlos: cada cambio debe tener sentido tactico.
- Usa pocos cambios, pero que sean utiles y coherentes.
- Si no hace falta borrar dibujos, no los borres.
- Si añades un dibujo, debe aclarar una mejora tactica real.
- Devuelve solo JSON valido.
  `.trim()
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
    const analysis = looksLikeAnalysis(body.analysis) ? body.analysis : null
    const modelName = getModelName()
    const temperature = getTemperature()
    const modelInput = buildPlaymakerAnalysisInput(draft)

    console.info('PLAYMAKER_IMPROVE_REQUEST', {
      userId: user.id,
      model: modelName,
      temperature,
      payload: {
        ...modelInput,
        current_analysis: analysis,
      },
    })

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
        max_output_tokens: IMPROVEMENT_MAX_OUTPUT_TOKENS,
        instructions: buildSystemPrompt(),
        input: [
          {
            role: 'user',
            content: JSON.stringify(
              {
                ...modelInput,
                current_analysis: analysis,
              },
              null,
              2
            ),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            ...IMPROVEMENT_JSON_SCHEMA,
          },
          ...(usesReasoningParams ? { verbosity: 'low' as const } : {}),
        },
        ...(usesReasoningParams
          ? { reasoning: { effort: 'low' } }
          : { temperature }),
      })

      responseMeta = {
        id: response.id,
        model: response.model,
        status: response.status,
        requestID: response._request_id ?? null,
      }

      console.info('PLAYMAKER_IMPROVE_OPENAI_RESPONSE', { responseMeta, response })
      rawText = extractRawResponseText(response)
      if (!rawText) throw new Error('EMPTY_AI_RESPONSE')
      const jsonCandidate = extractJsonCandidate(rawText)
      if (!jsonCandidate) throw new Error('INVALID_AI_JSON_WRAPPER')
      parsedResult = JSON.parse(jsonCandidate)
      console.info('PLAYMAKER_IMPROVE_PARSED_JSON', { responseMeta, rawText, parsedResult })
    } catch (modelError) {
      fallbackUsed = true
      validationErrors = ['La llamada estructurada a OpenAI fallo antes de producir una mejora valida.']
      console.warn('PLAYMAKER_IMPROVE_OPENAI_ERROR', {
        responseMeta,
        rawText,
        parsedResult,
        validationErrors,
        error: formatOpenAiError(modelError),
      })
    }

    let improvement
    if (!fallbackUsed) {
      const validation = validateImprovementPayload(parsedResult, draft)
      validationErrors = validation.errors
      console.info('PLAYMAKER_IMPROVE_VALIDATION', { responseMeta, rawText, parsedResult, validation })

      if (validation.ok) {
        improvement = validation.improvement
      } else {
        fallbackUsed = true
        console.warn('PLAYMAKER_IMPROVE_VALIDATION_FAILED', { responseMeta, rawText, parsedResult, validationErrors })
        improvement = buildFallbackImprovement(draft, analysis)
      }
    } else {
      improvement = buildFallbackImprovement(draft, analysis)
    }

    console.info('PLAYMAKER_IMPROVE_FINAL_RESULT', { responseMeta, fallbackUsed, rawText, parsedResult, validationErrors, improvement })

    return NextResponse.json({
      ok: true,
      data: improvement,
      meta: {
        fallbackUsed,
        model: responseMeta.model ?? modelName,
        currentPhaseId: draft.activePhaseId,
      },
    })
  } catch (error) {
    console.error('Error en POST /api/playmaker/improve:', { error: formatOpenAiError(error) })
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) return errorResponse('API key de OpenAI invalida.', 401, 'OPENAI_UNAUTHORIZED')
      if (error.status === 429) return errorResponse('Limite de OpenAI alcanzado. Intenta de nuevo.', 429, 'OPENAI_RATE_LIMIT')
    }
    return errorResponse('Error interno del servidor.', 500, 'INTERNAL_ERROR')
  }
}
