import OpenAI from 'openai'
import type {
  BoardDraft,
  PlaymakerAnalysis,
  PlaymakerImprovement,
  PlaymakerImprovementChange,
} from '@/lib/playmaker/types'
import { buildFallbackAnalysis, sanitizeRecommendationChanges } from '@/lib/playmaker/analysis-engine'

export type PlaymakerResponseMeta = {
  id?: string
  model?: string | null
  status?: string | null
  requestID?: string | null
}

export function errorResponse(error: string, status = 500, code?: string) {
  return Response.json({ ok: false, error, code }, { status })
}

export function isBoardDraftPayload(value: unknown): value is BoardDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<BoardDraft>
  return (
    draft.version === 1 &&
    typeof draft.name === 'string' &&
    typeof draft.analysisContext === 'string' &&
    typeof draft.activePhaseId === 'string' &&
    Array.isArray(draft.phases)
  )
}

export function extractJsonCandidate(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('```')) {
    const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    if (fenced.trim().startsWith('{') && fenced.trim().endsWith('}')) {
      return fenced.trim()
    }
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1)
  }

  return null
}

export function normalizeStringList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

export function getModelName() {
  return process.env.PLAYMAKER_OPENAI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4.1'
}

export function getTemperature() {
  const raw = process.env.PLAYMAKER_OPENAI_TEMPERATURE?.trim()
  if (!raw) return 0.35
  const value = Number(raw)
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0.35
}

export function isReasoningModel(modelName: string) {
  return /^(gpt-5|o[134])/i.test(modelName)
}

export function extractRawResponseText(response: OpenAI.Responses.Response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  for (const outputItem of response.output ?? []) {
    if (outputItem.type !== 'message') continue

    for (const contentItem of outputItem.content ?? []) {
      if (contentItem.type === 'output_text' && contentItem.text.trim()) {
        return contentItem.text.trim()
      }
    }
  }

  return ''
}

export function formatOpenAiError(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    return {
      status: error.status,
      type: error.type,
      code: error.code,
      param: error.param,
      requestID: error.requestID,
      message: error.message,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    value: String(error),
  }
}

export type AnalysisValidationResult =
  | {
      ok: true
      analysis: PlaymakerAnalysis
      errors: string[]
    }
  | {
      ok: false
      analysis: null
      errors: string[]
    }

export function validateAnalysisPayload(value: unknown, draft: BoardDraft): AnalysisValidationResult {
  const errors: string[] = []

  if (!value || typeof value !== 'object') {
    return {
      ok: false,
      analysis: null,
      errors: ['La respuesta parseada no es un objeto JSON.'],
    }
  }

  const payload = value as Record<string, unknown>
  const verdict = typeof payload.verdict === 'string' ? payload.verdict.trim() : ''
  const mainProblem = typeof payload.main_problem === 'string' ? payload.main_problem.trim() : ''

  if (!verdict) errors.push('Falta `verdict` o no es texto válido.')
  if (!mainProblem) errors.push('Falta `main_problem` o no es texto válido.')

  const confidence =
    payload.confidence === 'low' || payload.confidence === 'medium' || payload.confidence === 'high'
      ? payload.confidence
      : 'medium'

  const activePhase = draft.phases.find((phase) => phase.id === draft.activePhaseId) ?? draft.phases[0]
  const rawRecommendations = Array.isArray(payload.recommendations) ? payload.recommendations : []

  const recommendations = rawRecommendations
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`recommendations[${index}] no es un objeto válido.`)
        return null
      }

      const recommendation = item as Record<string, unknown>
      const title = typeof recommendation.title === 'string' ? recommendation.title.trim() : ''
      const reason = typeof recommendation.reason === 'string' ? recommendation.reason.trim() : ''
      const changes = sanitizeRecommendationChanges(recommendation.changes, activePhase)

      if (!title) errors.push(`recommendations[${index}] no tiene title válido.`)
      if (!reason) errors.push(`recommendations[${index}] no tiene reason válido.`)

      if (Array.isArray(recommendation.changes) && recommendation.changes.length > 0 && changes.length === 0) {
        errors.push(`recommendations[${index}] incluye changes, pero ninguno es aplicable de forma segura.`)
      }

      if (!title || !reason || changes.length === 0) return null
      return { title, reason, changes }
    })
    .filter(
      (
        item
      ): item is PlaymakerAnalysis['recommendations'][number] => Boolean(item)
    )
    .slice(0, 3)

  if (errors.some((error) => error.startsWith('Falta `verdict`') || error.startsWith('Falta `main_problem`'))) {
    return {
      ok: false,
      analysis: null,
      errors,
    }
  }

  return {
    ok: true,
    analysis: {
      verdict,
      main_problem: mainProblem,
      reasons: normalizeStringList(payload.reasons, 4),
      improvements: normalizeStringList(payload.improvements, 3),
      danger_zones: normalizeStringList(payload.danger_zones, 3),
      strengths: normalizeStringList(payload.strengths, 3),
      assumptions: normalizeStringList(payload.assumptions, 2),
      recommendations,
      confidence,
    },
    errors,
  }
}

function normalizeImprovementChange(change: unknown, draft: BoardDraft): PlaymakerImprovementChange | null {
  if (!change || typeof change !== 'object') return null
  const payload = change as Record<string, unknown>
  const activePhase = draft.phases.find((phase) => phase.id === draft.activePhaseId) ?? draft.phases[0]

  if (payload.type === 'move_element') {
    const elementId = typeof payload.elementId === 'string' ? payload.elementId.trim() : ''
    const to = payload.to
    const x = to && typeof to === 'object' && typeof (to as Record<string, unknown>).x === 'number' ? (to as Record<string, number>).x : null
    const y = to && typeof to === 'object' && typeof (to as Record<string, unknown>).y === 'number' ? (to as Record<string, number>).y : null

    if (!elementId || x === null || y === null) return null
    if (!activePhase.elements.some((element) => element.id === elementId)) return null

    return {
      type: 'move_element',
      elementId,
      to: { x, y },
    }
  }

  if (payload.type === 'add_drawing') {
    const drawing = payload.drawing
    if (!drawing || typeof drawing !== 'object') return null
    const drawingPayload = drawing as Record<string, unknown>

    const from = drawingPayload.from
    const to = drawingPayload.to
    const fromX = from && typeof from === 'object' && typeof (from as Record<string, unknown>).x === 'number' ? (from as Record<string, number>).x : null
    const fromY = from && typeof from === 'object' && typeof (from as Record<string, unknown>).y === 'number' ? (from as Record<string, number>).y : null
    const toX = to && typeof to === 'object' && typeof (to as Record<string, unknown>).x === 'number' ? (to as Record<string, number>).x : null
    const toY = to && typeof to === 'object' && typeof (to as Record<string, unknown>).y === 'number' ? (to as Record<string, number>).y : null
    const arrowType = drawingPayload.type === 'arrow' ? 'arrow' : null
    if (!arrowType || fromX === null || fromY === null || toX === null || toY === null) return null

    return {
      type: 'add_drawing',
      drawing: {
        type: 'arrow',
        kind:
          drawingPayload.kind === 'run' || drawingPayload.kind === 'pass' || drawingPayload.kind === 'support'
            ? drawingPayload.kind
            : undefined,
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
        color: typeof drawingPayload.color === 'string' ? drawingPayload.color : undefined,
        strokeWidthPct: typeof drawingPayload.strokeWidthPct === 'number' ? drawingPayload.strokeWidthPct : undefined,
      },
    }
  }

  if (payload.type === 'delete_drawing') {
    const drawingId = typeof payload.drawingId === 'string' ? payload.drawingId.trim() : ''
    if (!drawingId) return null
    if (!activePhase.drawings.some((drawing) => drawing.id === drawingId)) return null

    return {
      type: 'delete_drawing',
      drawingId,
    }
  }

  return null
}

export type ImprovementValidationResult =
  | {
      ok: true
      improvement: PlaymakerImprovement
      errors: string[]
    }
  | {
      ok: false
      improvement: null
      errors: string[]
    }

export function validateImprovementPayload(value: unknown, draft: BoardDraft): ImprovementValidationResult {
  const errors: string[] = []

  if (!value || typeof value !== 'object') {
    return {
      ok: false,
      improvement: null,
      errors: ['La mejora parseada no es un objeto JSON.'],
    }
  }

  const payload = value as Record<string, unknown>
  const improvedVerdict = typeof payload.improved_verdict === 'string' ? payload.improved_verdict.trim() : ''
  const improvementGoal = typeof payload.improvement_goal === 'string' ? payload.improvement_goal.trim() : ''
  const rawChanges = Array.isArray(payload.changes) ? payload.changes : []
  const changes = rawChanges
    .map((change, index) => {
      const normalized = normalizeImprovementChange(change, draft)
      if (!normalized) {
        errors.push(`changes[${index}] no es aplicable de forma segura.`)
      }
      return normalized
    })
    .filter((change): change is PlaymakerImprovementChange => Boolean(change))
    .slice(0, 8)

  if (!improvedVerdict) errors.push('Falta `improved_verdict` o no es texto válido.')
  if (!improvementGoal) errors.push('Falta `improvement_goal` o no es texto válido.')
  if (rawChanges.length === 0) errors.push('La mejora no incluye cambios.')
  if (rawChanges.length > 0 && changes.length === 0) errors.push('Ningun cambio sugerido era seguro para aplicar.')

  if (!improvedVerdict || !improvementGoal || changes.length === 0) {
    return {
      ok: false,
      improvement: null,
      errors,
    }
  }

  return {
    ok: true,
    improvement: {
      improved_verdict: improvedVerdict,
      improvement_goal: improvementGoal,
      changes,
      expected_benefits: normalizeStringList(payload.expected_benefits, 4),
    },
    errors,
  }
}

export function buildFallbackImprovement(draft: BoardDraft, analysis?: PlaymakerAnalysis | null): PlaymakerImprovement {
  const fallbackAnalysis = analysis ?? buildFallbackAnalysis(draft)
  const recommendation = fallbackAnalysis.recommendations[0]

  if (recommendation) {
    const fallbackChanges: PlaymakerImprovementChange[] = []

    for (const change of recommendation.changes) {
      if (change.operation === 'move_element') {
        fallbackChanges.push({
          type: 'move_element',
          elementId: change.elementId,
          to: { x: change.xPct, y: change.yPct },
        })
        continue
      }

      if (change.operation === 'add_drawing') {
        fallbackChanges.push({
          type: 'add_drawing',
          drawing: {
            type: 'arrow',
            kind: 'run',
            from: { x: change.startXPct, y: change.startYPct },
            to: { x: change.endXPct, y: change.endYPct },
            color: change.color,
            strokeWidthPct: change.strokeWidthPct,
          },
        })
        continue
      }

      if (change.operation === 'delete_drawing') {
        fallbackChanges.push({
          type: 'delete_drawing',
          drawingId: change.drawingId,
        })
      }
    }

    return {
      improved_verdict: recommendation.reason,
      improvement_goal: recommendation.title,
      changes: fallbackChanges,
      expected_benefits:
        fallbackAnalysis.improvements.length > 0
          ? fallbackAnalysis.improvements.slice(0, 3)
          : ['mejor equilibrio tras perdida', 'mejores apoyos para progresar'],
    }
  }

  const activePhase = draft.phases.find((phase) => phase.id === draft.activePhaseId) ?? draft.phases[0]
  const fallbackElement = activePhase.elements.find((element) => element.type === 'marker' && element.color === 'blue')

  return {
    improved_verdict: 'La mejora propone una versión algo más estable de la misma idea.',
    improvement_goal: 'dar más apoyo al poseedor y proteger mejor la pérdida',
    changes: fallbackElement
      ? [
          {
            type: 'move_element',
            elementId: fallbackElement.id,
            to: {
              x: Math.min(Math.max(fallbackElement.xPct + 6, 0), 100),
              y: Math.min(Math.max(fallbackElement.yPct + 6, 0), 100),
            },
          },
        ]
      : [],
    expected_benefits: ['mejor rest defence', 'progresión algo más segura'],
  }
}
