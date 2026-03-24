export type DashboardActivityItem = {
  id: string
  type: 'partido' | 'entrenamiento'
  title: string
  subtitle: string | null
  date: string
  time: string | null
  status: string | null
}

export type DashboardHomeSuccess = {
  ok: true
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
    logo_url: string | null
  } | null
  role: string | null
  teamSummary: {
    totalMembers: number
    playerCount: number
    staffCount: number
  }
  coach: {
    nombre: string
    rol: string
  } | null
  kpis: {
    winrate: number
    pointsPerGame: number
    goalsFor: number
    goalsAgainst: number
    yellowCards: number
    position: number | null
    possession: number | null
  }
  playerSpotlight: {
    nombre: string
    foto_url: string | null
    posicion: string | null
    teamName: string | null
    matchesPlayed: number
    minutesPlayed: number
    goals: number
    assists: number
    avgRating: number | null
    goalsAssistsPct: number | null
    passAccPct: number | null
  }
  schedule: {
    monthLabel: string
    nextMatch: {
      fecha_hora: string
      rival_nombre: string | null
      casa_fuera: string | null
      lugar: string | null
    } | null
    calendarDays: Array<{ date: string; hasEvent: boolean }>
    activityItems: DashboardActivityItem[]
  }
  standings: Array<{
    posicion: number
    nombre: string
    puntos: number
    pj: number
    v: number
    e: number
    d: number
    gf: number
    gc: number
  }>
  scores: Array<{
    equipo_nombre: string
    rival_nombre: string | null
    goles_favor: number
    goles_contra: number
    fecha_hora: string
  }>
}

export type DashboardHomeError = {
  ok: false
  error: string
  code?: string | null
  details?: string | null
  hint?: string | null
}

export type DashboardHomeResponse = DashboardHomeSuccess | DashboardHomeError

export type DashboardMetric = {
  id: string
  label: string
  value: string
  helper: string
  icon: 'intensity' | 'health' | 'availability'
}

export type WeeklyCalendarDay = {
  key: string
  dayLabel: string
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  eventCount: number
}
