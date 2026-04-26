export type EquipmentType = 'cone' | 'ladder' | 'pole' | 'hurdle' | 'mannequin' | 'mini-goal'

export type MarkerColor = 'blue' | 'red' | 'ball'
export type ElementType = 'marker' | EquipmentType

export type BoardElement = {
  id: string
  type: ElementType
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
  rotationDeg: number
  color?: MarkerColor
  label?: string
}

export type DrawingKind = 'pass' | 'run' | 'support' | 'dribble'

export type BoardDrawing = {
  id: string
  type: 'arrow'
  color: string
  startXPct: number
  startYPct: number
  endXPct: number
  endYPct: number
  strokeWidthPct: number
  fromElementId?: string
  toElementId?: string
  kind?: DrawingKind
  label?: string
}

export type PhaseDraft = {
  id: string
  label: string
  elements: BoardElement[]
  drawings: BoardDrawing[]
}

export type BoardDraft = {
  version: 1
  name: string
  analysisContext: string
  activePhaseId: string
  phases: PhaseDraft[]
}

export type RecommendationChange =
  | {
      operation: 'move_element'
      elementId: string
      xPct: number
      yPct: number
      rotationDeg?: number
    }
  | {
      operation: 'add_drawing'
      type: 'arrow'
      color: string
      startXPct: number
      startYPct: number
      endXPct: number
      endYPct: number
      strokeWidthPct: number
      fromElementId?: string
      toElementId?: string
      kind?: DrawingKind
      label?: string
    }
  | {
      operation: 'delete_drawing'
      drawingId: string
    }

export type PlaymakerRecommendation = {
  title: string
  reason: string
  changes: RecommendationChange[]
}

export type PlaymakerAnalysis = {
  verdict: string
  main_problem: string
  reasons: string[]
  improvements: string[]
  danger_zones: string[]
  strengths: string[]
  assumptions: string[]
  recommendations: PlaymakerRecommendation[]
  confidence: 'low' | 'medium' | 'high'
}

export type PlaymakerAnalysisMeta = {
  fallbackUsed: boolean
  model: string
  currentPhaseId: string
}

export type PlaymakerAnalysisResponse = {
  ok: boolean
  data?: PlaymakerAnalysis
  meta?: PlaymakerAnalysisMeta
  error?: string
}

export type PlaymakerImprovementChange =
  | {
      type: 'move_element'
      elementId: string
      to: {
        x: number
        y: number
      }
    }
  | {
      type: 'add_drawing'
      drawing: {
        type: 'arrow'
        kind?: 'run' | 'pass' | 'support'
        from: {
          x: number
          y: number
        }
        to: {
          x: number
          y: number
        }
        color?: string
        strokeWidthPct?: number
      }
    }
  | {
      type: 'delete_drawing'
      drawingId: string
    }

export type PlaymakerImprovement = {
  improved_verdict: string
  improvement_goal: string
  changes: PlaymakerImprovementChange[]
  expected_benefits: string[]
}

export type PlaymakerImprovementMeta = {
  fallbackUsed: boolean
  model: string
  currentPhaseId: string
}

export type PlaymakerImprovementResponse = {
  ok: boolean
  data?: PlaymakerImprovement
  meta?: PlaymakerImprovementMeta
  error?: string
}
