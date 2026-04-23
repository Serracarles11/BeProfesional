import type {
  BoardDraft,
  BoardElement,
  PhaseDraft,
  PlaymakerAnalysis,
  PlaymakerRecommendation,
  RecommendationChange,
} from '@/lib/playmaker/types'

type TeamName = 'blue' | 'red'

type TacticalMarker = BoardElement & {
  type: 'marker'
  color: TeamName | 'ball'
}

type PlayerMarker = BoardElement & {
  type: 'marker'
  color: TeamName
}

type Point = {
  xPct: number
  yPct: number
}

type LastChangeSummary = {
  summary: string
  movement_direction: string
  element_shift_count: number
  drawing_delta_count: number
} | null

export type DerivedFeatures = {
  strong_side: 'left' | 'center' | 'right'
  weak_side: 'left' | 'right'
  weak_side_occupied: boolean
  ball_zone: string
  support_count_near_ball: number
  defensive_balance_ok: boolean
  rest_defence_count: number
  overload_near_ball: boolean
  switch_option_available: boolean
  space_in_behind_risk: 'low' | 'medium' | 'high'
  vertical_compactness: 'low' | 'medium' | 'high'
  width_usage: 'narrow' | 'balanced' | 'wide'
  number_of_safe_passing_options: number
  isolated_players: string[]
  free_player_candidates: string[]
  transition_risk: 'low' | 'medium' | 'high'
  line_breaking_options: string[]
  ball_holder: string | null
  blue_player_count: number
  red_player_count: number
  weak_side_connection_quality: 'low' | 'medium' | 'high'
  pressing_pressure_on_ball: 'low' | 'medium' | 'high'
}

export type PlayContext = {
  play_name: string
  play_type: string
  attacking_team: string
  defending_team: string
  attack_direction: string
  current_phase_id: string
  phase_name: string
  objective: string
  ball_holder: string | null
  focus_priorities: string[]
}

export type BoardSemantics = {
  coordinate_system: {
    x_axis: string
    y_axis: string
  }
  team_mapping: Record<string, string>
  colors: Record<string, string>
  drawing_types: Record<string, string>
  element_types: Record<string, string>
  note: string
}

export type AnalysisModelInput = {
  play_context: PlayContext
  board_semantics: BoardSemantics
  board_state: BoardDraft
  derived_features: DerivedFeatures
  coach_note: string
  current_phase: {
    id: string
    label: string
    player_count: number
    drawing_count: number
  }
  last_change: LastChangeSummary
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function distanceBetween(a: Point, b: Point) {
  return Math.hypot(a.xPct - b.xPct, a.yPct - b.yPct)
}

function getActivePhase(draft: BoardDraft) {
  return draft.phases.find((phase) => phase.id === draft.activePhaseId) ?? draft.phases[0]
}

function getMarkers(phase: PhaseDraft): TacticalMarker[] {
  return phase.elements.filter((element): element is TacticalMarker => {
    return (
      element.type === 'marker' &&
      (element.color === 'blue' || element.color === 'red' || element.color === 'ball') &&
      isFiniteNumber(element.xPct) &&
      isFiniteNumber(element.yPct)
    )
  })
}

function getPlayers(phase: PhaseDraft, color: TeamName): PlayerMarker[] {
  return getMarkers(phase).filter((marker): marker is PlayerMarker => marker.color === color)
}

function getBall(phase: PhaseDraft) {
  return getMarkers(phase).find((marker) => marker.color === 'ball') ?? null
}

function getPlayerName(player: PlayerMarker) {
  return player.label?.trim() ? `${player.color}-${player.label.trim()}` : `${player.color}-${player.id}`
}

function getLane(xPct: number) {
  if (xPct < 33.34) return 'left'
  if (xPct > 66.66) return 'right'
  return 'center'
}

function describeZone(xPct: number, yPct: number) {
  const lane = getLane(xPct)
  if (yPct <= 20) return `zona de finalizacion ${lane}`
  if (yPct <= 40) return `ultimo tercio ${lane}`
  if (yPct <= 65) return `mediocampo ${lane}`
  if (yPct <= 82) return `inicio ${lane}`
  return `base propia ${lane}`
}

function countNearby(players: PlayerMarker[], target: Point, radius: number) {
  return players.filter((player) => distanceBetween(player, target) <= radius).length
}

function getBallHolder(ball: TacticalMarker | null, bluePlayers: PlayerMarker[]) {
  if (!ball || bluePlayers.length === 0) return null

  const sorted = [...bluePlayers]
    .map((player) => ({ player, distance: distanceBetween(player, ball) }))
    .sort((left, right) => left.distance - right.distance)

  const closest = sorted[0]
  if (!closest || closest.distance > 11) return null
  return closest.player
}

function getStrongSide(ball: TacticalMarker | null, bluePlayers: PlayerMarker[]) {
  if (ball) {
    return getLane(ball.xPct)
  }

  const averageX = bluePlayers.reduce((sum, player) => sum + player.xPct, 0) / Math.max(bluePlayers.length, 1)
  return getLane(averageX)
}

function getWeakSide(strongSide: 'left' | 'center' | 'right'): 'left' | 'right' {
  if (strongSide === 'left') return 'right'
  return 'left'
}

function getWeakSideOccupied(bluePlayers: PlayerMarker[], weakSide: 'left' | 'right') {
  return bluePlayers.some((player) => getLane(player.xPct) === weakSide && player.yPct <= 72)
}

function getVerticalCompactness(bluePlayers: PlayerMarker[]) {
  if (bluePlayers.length < 2) return 'low' as const
  const yValues = bluePlayers.map((player) => player.yPct)
  const spread = Math.max(...yValues) - Math.min(...yValues)
  if (spread <= 28) return 'high' as const
  if (spread <= 46) return 'medium' as const
  return 'low' as const
}

function getWidthUsage(bluePlayers: PlayerMarker[]) {
  if (bluePlayers.length < 2) return 'narrow' as const
  const xValues = bluePlayers.map((player) => player.xPct)
  const width = Math.max(...xValues) - Math.min(...xValues)
  if (width >= 56) return 'wide' as const
  if (width >= 36) return 'balanced' as const
  return 'narrow' as const
}

function getSafePassingOptions(ballHolder: PlayerMarker | null, bluePlayers: PlayerMarker[], redPlayers: PlayerMarker[]) {
  if (!ballHolder) return 0

  return bluePlayers.filter((player) => {
    if (player.id === ballHolder.id) return false
    const distance = distanceBetween(player, ballHolder)
    if (distance > 26) return false
    const nearbyOpponents = redPlayers.filter((opponent) => distanceBetween(opponent, player) <= 8).length
    return nearbyOpponents <= 1
  }).length
}

function getRestDefenceCount(ball: TacticalMarker | null, bluePlayers: PlayerMarker[]) {
  if (!ball) {
    return bluePlayers.filter((player) => player.yPct >= 58).length
  }

  return bluePlayers.filter((player) => player.yPct >= ball.yPct + 10).length
}

function getTransitionRisk(restDefenceCount: number, supportCount: number, weakSideOccupied: boolean) {
  const score = (restDefenceCount >= 3 ? 0 : 2) + (supportCount >= 2 ? 0 : 1) + (weakSideOccupied ? 0 : 1)
  if (score <= 1) return 'low' as const
  if (score === 2) return 'medium' as const
  return 'high' as const
}

function getSpaceInBehindRisk(bluePlayers: PlayerMarker[], redPlayers: PlayerMarker[]) {
  if (bluePlayers.length === 0 || redPlayers.length === 0) return 'medium' as const

  const deepestBlue = Math.min(...bluePlayers.map((player) => player.yPct))
  const highBlueCount = bluePlayers.filter((player) => player.yPct <= 38).length
  const redRunners = redPlayers.filter((player) => player.yPct >= deepestBlue + 18).length

  if (highBlueCount >= 4 && redRunners >= 2 && deepestBlue <= 34) return 'high' as const
  if (highBlueCount >= 3 && redRunners >= 1) return 'medium' as const
  return 'low' as const
}

function getOverloadNearBall(ball: TacticalMarker | null, bluePlayers: PlayerMarker[], redPlayers: PlayerMarker[]) {
  if (!ball) return false
  const blueCount = countNearby(bluePlayers, ball, 18)
  const redCount = countNearby(redPlayers, ball, 18)
  return blueCount >= redCount + 2
}

function getPressingPressureOnBall(ballHolder: PlayerMarker | null, redPlayers: PlayerMarker[]) {
  if (!ballHolder) return 'medium' as const
  const nearby = redPlayers.filter((player) => distanceBetween(player, ballHolder) <= 9).length
  if (nearby >= 3) return 'high' as const
  if (nearby >= 1) return 'medium' as const
  return 'low' as const
}

function getIsolatedPlayers(bluePlayers: PlayerMarker[]) {
  return bluePlayers
    .filter((player) => {
      const teammatesNearby = bluePlayers.filter(
        (candidate) => candidate.id !== player.id && distanceBetween(candidate, player) <= 18
      ).length
      return teammatesNearby === 0
    })
    .map(getPlayerName)
    .slice(0, 4)
}

function getFreePlayerCandidates(bluePlayers: PlayerMarker[], redPlayers: PlayerMarker[]) {
  return bluePlayers
    .filter((player) => redPlayers.every((opponent) => distanceBetween(opponent, player) > 10))
    .sort((left, right) => left.yPct - right.yPct)
    .map(getPlayerName)
    .slice(0, 4)
}

function intersectsPressureLine(ballHolder: PlayerMarker, teammate: PlayerMarker, redPlayers: PlayerMarker[]) {
  return redPlayers.some((opponent) => {
    const ax = ballHolder.xPct
    const ay = ballHolder.yPct
    const bx = teammate.xPct
    const by = teammate.yPct
    const px = opponent.xPct
    const py = opponent.yPct

    const segmentLengthSquared = (bx - ax) ** 2 + (by - ay) ** 2
    if (segmentLengthSquared === 0) return false

    const t = clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / segmentLengthSquared, 0, 1)
    const projection = {
      xPct: ax + (bx - ax) * t,
      yPct: ay + (by - ay) * t,
    }

    return distanceBetween(projection, opponent) <= 5.5
  })
}

function getLineBreakingOptions(ballHolder: PlayerMarker | null, bluePlayers: PlayerMarker[], redPlayers: PlayerMarker[]) {
  if (!ballHolder) return []

  return bluePlayers
    .filter((player) => {
      if (player.id === ballHolder.id) return false
      if (player.yPct >= ballHolder.yPct - 6) return false
      return !intersectsPressureLine(ballHolder, player, redPlayers)
    })
    .sort((left, right) => left.yPct - right.yPct)
    .map((player) => `${getPlayerName(player)} ataca espacio interior`)
    .slice(0, 3)
}

function getSwitchOptionAvailable(ball: TacticalMarker | null, bluePlayers: PlayerMarker[], strongSide: 'left' | 'center' | 'right') {
  if (!ball) return false
  const weakSide = getWeakSide(strongSide)
  return bluePlayers.some((player) => getLane(player.xPct) === weakSide && Math.abs(player.xPct - ball.xPct) >= 28)
}

function getWeakSideConnectionQuality(
  weakSideOccupied: boolean,
  switchOptionAvailable: boolean,
  lineBreakingOptions: string[]
) {
  if (weakSideOccupied && switchOptionAvailable) return 'high' as const
  if (weakSideOccupied || switchOptionAvailable || lineBreakingOptions.length > 0) return 'medium' as const
  return 'low' as const
}

function inferPlayType(phase: PhaseDraft, bluePlayers: PlayerMarker[], redPlayers: PlayerMarker[]) {
  if (phase.drawings.length >= 3) return 'pattern_play'
  if (bluePlayers.length > redPlayers.length + 2) return 'attacking_overload'
  if (redPlayers.length >= bluePlayers.length && bluePlayers.every((player) => player.yPct >= 45)) return 'build_up'
  return 'open_play'
}

function inferObjective(features: DerivedFeatures) {
  if (features.switch_option_available && features.strong_side !== 'center') {
    return 'atraer en lado fuerte y activar el lado debil'
  }
  if (features.line_breaking_options.length > 0) {
    return 'progresar por dentro y romper una linea'
  }
  if (features.overload_near_ball) {
    return 'fijar y crear superioridad cerca del balon'
  }
  return 'dar continuidad a la posesion con seguridad'
}

function summarizeLastChange(previousPhase: PhaseDraft | null, activePhase: PhaseDraft): LastChangeSummary {
  if (!previousPhase) return null

  const previousElements = new Map(previousPhase.elements.map((element) => [element.id, element]))
  let movedCount = 0
  let forwardMoves = 0
  let backwardMoves = 0

  for (const element of activePhase.elements) {
    const previous = previousElements.get(element.id)
    if (!previous) continue
    const displacement = distanceBetween(previous, element)
    if (displacement < 6) continue
    movedCount += 1
    if (element.yPct < previous.yPct) {
      forwardMoves += 1
    } else {
      backwardMoves += 1
    }
  }

  const drawingDelta = Math.abs(activePhase.drawings.length - previousPhase.drawings.length)
  if (movedCount === 0 && drawingDelta === 0) return null

  const movementDirection =
    forwardMoves > backwardMoves ? 'forward' : backwardMoves > forwardMoves ? 'backward' : 'mixed'

  return {
    summary:
      movementDirection === 'forward'
        ? 'La fase actual adelanta alturas respecto a la fase anterior.'
        : movementDirection === 'backward'
          ? 'La fase actual protege mas la estructura que la fase anterior.'
          : 'La fase actual reorganiza alturas sin una direccion unica clara.',
    movement_direction: movementDirection,
    element_shift_count: movedCount,
    drawing_delta_count: drawingDelta,
  }
}

function buildFallbackRecommendations(features: DerivedFeatures, phase: PhaseDraft): PlaymakerRecommendation[] {
  const safeRecommendations: PlaymakerRecommendation[] = []
  const bluePlayers = getPlayers(phase, 'blue')

  if (!features.weak_side_occupied) {
    const candidate = bluePlayers.find((player) => getLane(player.xPct) === 'center') ?? bluePlayers[0]
    if (candidate) {
      safeRecommendations.push({
        title: 'Conecta el lado debil',
        reason: 'Te falta una amenaza util lejos del balon para poder girar la jugada.',
        changes: [
          {
            operation: 'move_element',
            elementId: candidate.id,
            xPct: features.weak_side === 'left' ? 18 : 82,
            yPct: clamp(candidate.yPct - 8, 12, 82),
          },
        ],
      })
    }
  }

  if (!features.defensive_balance_ok) {
    const restDefender =
      bluePlayers
        .filter((player) => player.yPct < 72)
        .sort((left, right) => right.yPct - left.yPct)[0] ?? null

    if (restDefender) {
      safeRecommendations.push({
        title: 'Mejora la rest defence',
        reason: 'La jugada necesita una cobertura mas estable si se pierde el balon.',
        changes: [
          {
            operation: 'move_element',
            elementId: restDefender.id,
            xPct: clamp(restDefender.xPct, 32, 68),
            yPct: clamp(Math.max(restDefender.yPct, 68), 60, 84),
          },
        ],
      })
    }
  }

  return safeRecommendations.slice(0, 2)
}

export function buildDerivedFeatures(draft: BoardDraft) {
  const activePhase = getActivePhase(draft)
  const bluePlayers = getPlayers(activePhase, 'blue')
  const redPlayers = getPlayers(activePhase, 'red')
  const ball = getBall(activePhase)
  const ballHolder = getBallHolder(ball, bluePlayers)
  const strongSide = getStrongSide(ball, bluePlayers)
  const weakSide = getWeakSide(strongSide)
  const supportCountNearBall = ballHolder ? countNearby(bluePlayers, ballHolder, 16) - 1 : countNearby(bluePlayers, ball ?? { xPct: 50, yPct: 50 }, 16)
  const restDefenceCount = getRestDefenceCount(ball, bluePlayers)
  const weakSideOccupied = getWeakSideOccupied(bluePlayers, weakSide)
  const safePassingOptions = getSafePassingOptions(ballHolder, bluePlayers, redPlayers)
  const lineBreakingOptions = getLineBreakingOptions(ballHolder, bluePlayers, redPlayers)
  const switchOptionAvailable = getSwitchOptionAvailable(ball, bluePlayers, strongSide)

  const features: DerivedFeatures = {
    strong_side: strongSide,
    weak_side: weakSide,
    weak_side_occupied: weakSideOccupied,
    ball_zone: ball ? describeZone(ball.xPct, ball.yPct) : 'sin balon identificado',
    support_count_near_ball: Math.max(0, supportCountNearBall),
    defensive_balance_ok: restDefenceCount >= 3,
    rest_defence_count: restDefenceCount,
    overload_near_ball: getOverloadNearBall(ball, bluePlayers, redPlayers),
    switch_option_available: switchOptionAvailable,
    space_in_behind_risk: getSpaceInBehindRisk(bluePlayers, redPlayers),
    vertical_compactness: getVerticalCompactness(bluePlayers),
    width_usage: getWidthUsage(bluePlayers),
    number_of_safe_passing_options: safePassingOptions,
    isolated_players: getIsolatedPlayers(bluePlayers),
    free_player_candidates: getFreePlayerCandidates(bluePlayers, redPlayers),
    transition_risk: getTransitionRisk(restDefenceCount, Math.max(0, supportCountNearBall), weakSideOccupied),
    line_breaking_options: lineBreakingOptions,
    ball_holder: ballHolder ? getPlayerName(ballHolder) : null,
    blue_player_count: bluePlayers.length,
    red_player_count: redPlayers.length,
    weak_side_connection_quality: getWeakSideConnectionQuality(
      weakSideOccupied,
      switchOptionAvailable,
      lineBreakingOptions
    ),
    pressing_pressure_on_ball: getPressingPressureOnBall(ballHolder, redPlayers),
  }

  return {
    activePhase,
    bluePlayers,
    redPlayers,
    ball,
    ballHolder,
    features,
  }
}

export function buildPlaymakerAnalysisInput(draft: BoardDraft): AnalysisModelInput {
  const { activePhase, bluePlayers, redPlayers, ballHolder, features } = buildDerivedFeatures(draft)
  const activeIndex = draft.phases.findIndex((phase) => phase.id === activePhase.id)
  const previousPhase = activeIndex > 0 ? draft.phases[activeIndex - 1] ?? null : null

  return {
    play_context: {
      play_name: draft.name.trim() || 'Play Maker Draft',
      play_type: inferPlayType(activePhase, bluePlayers, redPlayers),
      attacking_team: 'blue',
      defending_team: 'red',
      attack_direction: 'blue attacks toward y=0',
      current_phase_id: activePhase.id,
      phase_name: activePhase.label,
      objective: inferObjective(features),
      ball_holder: ballHolder ? getPlayerName(ballHolder) : null,
      focus_priorities: [
        'space_in_behind',
        'rest_defence',
        'support_options',
        'weak_side_occupation',
        'passing_lanes',
        'width_and_depth',
        'objective_realism',
      ],
    },
    board_semantics: {
      coordinate_system: {
        x_axis: '0=left touchline, 100=right touchline',
        y_axis: '0=opponent goal, 100=own goal',
      },
      team_mapping: {
        blue: 'equipo que diseña la jugada',
        red: 'equipo rival',
      },
      colors: {
        blue: 'jugador del equipo azul',
        red: 'jugador rival',
        ball: 'balon',
      },
      drawing_types: {
        arrow: 'trayectoria, pase o movimiento sugerido segun contexto',
      },
      element_types: {
        marker: 'jugador o balon',
        cone: 'herramienta de entrenamiento',
        ladder: 'herramienta de entrenamiento',
        pole: 'herramienta de entrenamiento',
        hurdle: 'herramienta de entrenamiento',
        mannequin: 'oposicion pasiva o herramienta de entrenamiento',
        'mini-goal': 'objetivo o herramienta de entrenamiento',
      },
      note: 'Solo analiza jugadores, balon y dibujos; las herramientas no cuentan como futbolistas.',
    },
    board_state: draft,
    derived_features: features,
    coach_note: draft.analysisContext.trim(),
    current_phase: {
      id: activePhase.id,
      label: activePhase.label,
      player_count: activePhase.elements.filter((element) => element.type === 'marker').length,
      drawing_count: activePhase.drawings.length,
    },
    last_change: summarizeLastChange(previousPhase, activePhase),
  }
}

export function sanitizeRecommendationChanges(changes: unknown, phase: PhaseDraft): RecommendationChange[] {
  if (!Array.isArray(changes)) return []

  const validElementIds = new Set(phase.elements.map((element) => element.id))
  const validDrawingIds = new Set(phase.drawings.map((drawing) => drawing.id))

  return changes
    .map((change) => {
      if (!change || typeof change !== 'object') return null
      const payload = change as Record<string, unknown>

      if (payload.operation === 'move_element') {
        const elementId = typeof payload.elementId === 'string' ? payload.elementId : ''
        const xPct = typeof payload.xPct === 'number' ? clamp(payload.xPct, 0, 100) : null
        const yPct = typeof payload.yPct === 'number' ? clamp(payload.yPct, 0, 100) : null
        const rotationDeg = typeof payload.rotationDeg === 'number' ? payload.rotationDeg : undefined
        if (!elementId || !validElementIds.has(elementId) || xPct === null || yPct === null) return null
        return { operation: 'move_element', elementId, xPct, yPct, rotationDeg } satisfies RecommendationChange
      }

      if (payload.operation === 'add_drawing') {
        const type = payload.type === 'arrow' ? 'arrow' : null
        const color = typeof payload.color === 'string' ? payload.color : '#ffe170'
        const startXPct = typeof payload.startXPct === 'number' ? clamp(payload.startXPct, 0, 100) : null
        const startYPct = typeof payload.startYPct === 'number' ? clamp(payload.startYPct, 0, 100) : null
        const endXPct = typeof payload.endXPct === 'number' ? clamp(payload.endXPct, 0, 100) : null
        const endYPct = typeof payload.endYPct === 'number' ? clamp(payload.endYPct, 0, 100) : null
        const strokeWidthPct =
          typeof payload.strokeWidthPct === 'number' ? clamp(payload.strokeWidthPct, 0.3, 2) : 0.7

        if (!type || startXPct === null || startYPct === null || endXPct === null || endYPct === null) return null
        return {
          operation: 'add_drawing',
          type,
          color,
          startXPct,
          startYPct,
          endXPct,
          endYPct,
          strokeWidthPct,
        } satisfies RecommendationChange
      }

      if (payload.operation === 'delete_drawing') {
        const drawingId = typeof payload.drawingId === 'string' ? payload.drawingId : ''
        if (!drawingId || !validDrawingIds.has(drawingId)) return null
        return { operation: 'delete_drawing', drawingId } satisfies RecommendationChange
      }

      return null
    })
    .filter((change): change is RecommendationChange => Boolean(change))
}

export function buildFallbackAnalysis(draft: BoardDraft): PlaymakerAnalysis {
  const { activePhase, features } = buildDerivedFeatures(draft)
  const reasons: string[] = []
  const improvements: string[] = []
  const dangerZones: string[] = []
  const strengths: string[] = []
  const assumptions: string[] = []

  if (features.space_in_behind_risk === 'high') {
    reasons.push('La estructura queda demasiado expuesta a la espalda de la jugada.')
    dangerZones.push('Espalda del ultimo jugador azul y pasillo central tras perdida.')
  }

  if (!features.defensive_balance_ok) {
    reasons.push('La rest defence es corta para sostener una perdida inmediata.')
    improvements.push('Deja al menos tres jugadores por detras del balon para proteger la transicion.')
  }

  if (features.number_of_safe_passing_options <= 1) {
    reasons.push('El poseedor tiene pocas salidas limpias y eso vuelve previsible la accion.')
    improvements.push('Acerca un apoyo por dentro y otro por fuera para darle dos lineas reales al poseedor.')
  }

  if (!features.weak_side_occupied) {
    reasons.push('El lado debil no esta conectado, asi que el cambio de orientacion pierde sentido.')
    improvements.push('Mantén un jugador util en el lado debil para castigar la basculacion rival.')
  }

  if (features.overload_near_ball) {
    strengths.push('La jugada si genera una superioridad cerca del balon.')
  }

  if (features.line_breaking_options.length > 0) {
    strengths.push('Hay al menos una opcion para progresar por delante de la primera presion.')
  }

  if (!features.ball_holder) {
    assumptions.push('No se detecta con claridad el poseedor, asi que la lectura de apoyos es aproximada.')
  }

  const mainProblem =
    reasons[0] ??
    'La jugada no termina de ordenar bien apoyos, equilibrio y conexiones para sostener la idea.'

  const verdict =
    features.transition_risk === 'high'
      ? 'No me convence esta jugada porque el riesgo tras perdida es demasiado alto para lo que te da.'
      : features.number_of_safe_passing_options <= 1
        ? 'La idea puede existir, pero ahora mismo el poseedor queda demasiado aislado.'
        : 'La estructura tiene una base util, pero necesita mejores conexiones para ser realmente fiable.'

  return {
    verdict,
    main_problem: mainProblem,
    reasons: reasons.slice(0, 4),
    improvements: improvements.slice(0, 3),
    danger_zones: dangerZones.slice(0, 3),
    strengths: strengths.slice(0, 3),
    assumptions: assumptions.slice(0, 2),
    recommendations: buildFallbackRecommendations(features, activePhase),
    confidence: 'low',
  }
}
