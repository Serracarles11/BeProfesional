export type SquadPlayer = {
  id: string
  name: string
  team: string
  position: string | null
  age: number | null
  dorsal: number | null
  avatarUrl: string | null
  dominantFoot: string | null
  heightCm: number | null
  weightKg: number | null
  gender?: string | null
  phone?: string | null
  city?: string | null
  country?: string | null
  bio?: string | null
  instagram?: string | null
  objective?: string | null
  joinedAt?: string | null
  stats: {
    apps: number
    minutes: number
    goals: number
    assists: number
    goalsPerMinute: number
    yellows: number
    reds: number
    starts: number
  }
}

export type SquadSuccessResponse = {
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
  summary: {
    seasonLabel: string
    squadPassAccuracy: number
    readinessIndex: number
    nextMatchDate: string | null
    nextMatchRival: string | null
    nextMatchVenue: string | null
  }
  players: SquadPlayer[]
  source: 'jugadores_externos' | 'players' | 'fallback'
}

export type SquadErrorResponse = {
  ok: false
  error: string
  code?: string | null
  details?: string | null
  hint?: string | null
}

export type SquadApiResponse = SquadSuccessResponse | SquadErrorResponse

export type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'
