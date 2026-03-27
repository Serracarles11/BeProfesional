import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseRouteHandler>>

const DEFAULT_EQUIPO_ID = '9f2fb096-5905-4e69-81a5-7f1b84243dfe'

type EquipoActivo = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  logo_url: string | null
}

type SquadPlayer = {
  id: string
  name: string
  team: string
  position: string | null
  age: number | null
  dorsal: number | null
  avatarUrl: string | null
  stats: {
    apps: number
    minutes: number
    goals: number
    goalsPerMinute: number
    yellows: number
    starts: number
  }
}

type SquadSource = 'jugadores_externos' | 'players' | 'fallback'

type SquadSuccessResponse = {
  ok: true
  equipo: EquipoActivo | null
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
  source: SquadSource
}

type SquadErrorResponse = {
  ok: false
  error: string
  code?: string | null
  details?: string | null
  hint?: string | null
}

type MembershipRow = {
  rol: string | null
  fecha_alta: string | null
  equipo:
    | {
        id: string
        nombre: string
        club: string | null
        categoria: string | null
        temporada: string | null
        logo_url: string | null
      }
    | null
    | {
        id: string
        nombre: string
        club: string | null
        categoria: string | null
        temporada: string | null
        logo_url: string | null
      }[]
}

type MatchRow = {
  id: string
  fecha_hora: string
  goles_favor: number | string | null
  goles_contra: number | string | null
  rival_nombre: string | null
  lugar: string | null
  estado: string | null
}

type ExternalSquadRow = {
  id: string
  nombre: string
  dorsal: number | null
  posicion: string | null
  minutes_total: number
  goals_total: number
  yellows_total: number
  starts_total: number
}

type SquadDbRow = {
  id: string
  name: string
  team: string
  position: string | null
  dorsal: number | null
  age: number | null
  apps: number
  minutes_total: number
  goals_total: number
  yellows_total: number
  starts_total: number
}

const EMPTY_SUCCESS: SquadSuccessResponse = {
  ok: true,
  equipo: null,
  role: null,
  summary: {
    seasonLabel: '',
    squadPassAccuracy: 0,
    readinessIndex: 0,
    nextMatchDate: null,
    nextMatchRival: null,
    nextMatchVenue: null,
  },
  players: [],
  source: 'fallback',
}

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toUpperCase()
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function seasonLabel(value: string | null | undefined) {
  if (value?.trim()) return value
  const now = new Date()
  const start = String(now.getFullYear() % 100).padStart(2, '0')
  const end = String((now.getFullYear() + 1) % 100).padStart(2, '0')
  return `${start}/${end}`
}

function normalizeEquipo(row: MembershipRow): EquipoActivo | null {
  const rawEquipo = row.equipo
  const equipo = Array.isArray(rawEquipo) ? rawEquipo[0] : rawEquipo

  if (!equipo?.id) return null

  return {
    id: equipo.id,
    nombre: equipo.nombre,
    club: equipo.club,
    categoria: equipo.categoria,
    temporada: equipo.temporada,
    logo_url: equipo.logo_url,
  }
}

function estimateApps(minutesTotal: number, startsTotal: number) {
  const minutes = Math.max(minutesTotal, 0)
  const starts = Math.max(startsTotal, 0)
  const estimatedByMinutes = minutes > 0 ? Math.max(Math.round(minutes / 90), 1) : 0
  return Math.max(starts, estimatedByMinutes)
}

function toExternalSquadRow(raw: Record<string, unknown>): ExternalSquadRow | null {
  const id = typeof raw.id === 'string' ? raw.id : ''
  const nombre = typeof raw.nombre === 'string' ? raw.nombre.trim() : ''
  if (!id || !nombre) return null

  return {
    id,
    nombre,
    dorsal:
      typeof raw.dorsal === 'number' || typeof raw.dorsal === 'string'
        ? toNumber(raw.dorsal as number | string)
        : null,
    posicion: typeof raw.posicion === 'string' ? raw.posicion : null,
    minutes_total: toNumber(raw.minutes_total as number | string | null),
    goals_total: toNumber(raw.goals_total as number | string | null),
    yellows_total: toNumber(raw.yellows_total as number | string | null),
    starts_total: toNumber(raw.starts_total as number | string | null),
  }
}

function buildErrorResponse(
  message: string,
  status: number,
  error?: { code?: string | null; details?: string | null; hint?: string | null }
) {
  const payload: SquadErrorResponse = {
    ok: false,
    error: message,
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  }

  console.error('API /api/dashboard/squad error:', message, error ?? null)
  return NextResponse.json(payload, { status })
}

async function loadPlayersByTeamOnly(
  supabase: SupabaseClient,
  equipo: EquipoActivo
): Promise<SquadDbRow[]> {
  const result = await supabase
    .from('jugadores_externos')
    .select('id, nombre, dorsal, posicion, minutes_total, goals_total, yellows_total, starts_total')
    .eq('equipo_id', equipo.id)
    .order('nombre', { ascending: true })
    .limit(1500)

  if (result.error) return []

  return ((result.data ?? []) as Array<Record<string, unknown>>)
    .map((raw) => toExternalSquadRow(raw))
    .filter((row): row is ExternalSquadRow => row !== null)
    .map((row) => ({
      id: row.id,
      name: row.nombre,
      team: equipo.nombre,
      position: row.posicion,
      dorsal: row.dorsal,
      age: null,
      apps: estimateApps(row.minutes_total, row.starts_total),
      minutes_total: Math.max(row.minutes_total, 0),
      goals_total: Math.max(row.goals_total, 0),
      yellows_total: Math.max(row.yellows_total, 0),
      starts_total: Math.max(row.starts_total, 0),
    }))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return buildErrorResponse('No autorizado', 401, authError ?? undefined)
    }

    const requestedTeamId = new URL(request.url).searchParams.get('equipo')

    const { data: memberships, error: membershipError } = await supabase
      .from('miembros_equipo')
      .select('rol, fecha_alta, equipo:equipos(id, nombre, club, categoria, temporada, logo_url)')
      .eq('usuario_id', user.id)
      .order('fecha_alta', { ascending: false })

    if (membershipError) {
      return buildErrorResponse('No se pudieron obtener los equipos del usuario.', 500, membershipError)
    }

    const equipos = (memberships ?? [])
      .map((row) => normalizeEquipo(row as MembershipRow))
      .filter((equipo): equipo is EquipoActivo => equipo !== null)

    if (equipos.length === 0) {
      return NextResponse.json(EMPTY_SUCCESS)
    }

    let activeTeam = requestedTeamId
      ? equipos.find((team) => team.id === requestedTeamId)
      : null

    if (!activeTeam) {
      activeTeam = equipos.find((team) => team.id === DEFAULT_EQUIPO_ID) ?? equipos[0]
    }

    if (requestedTeamId && !equipos.some((team) => team.id === requestedTeamId)) {
      return buildErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    const activeMembership = (memberships ?? []).find((row) => {
      const equipo = normalizeEquipo(row as MembershipRow)
      return equipo?.id === activeTeam?.id
    }) as MembershipRow | undefined

    const role = activeMembership?.rol ? String(activeMembership.rol) : null

    const nowIso = new Date().toISOString()

    const [matchesResult, nextMatchResult, checkinsResult, trainingsResult, teamPlayers] = await Promise.all([
      supabase
        .from('partidos')
        .select('id, fecha_hora, goles_favor, goles_contra, rival_nombre, lugar, estado')
        .eq('equipo_id', activeTeam.id)
        .order('fecha_hora', { ascending: false }),
      supabase
        .from('partidos')
        .select('fecha_hora, rival_nombre, lugar, estado')
        .eq('equipo_id', activeTeam.id)
        .gte('fecha_hora', nowIso)
        .neq('estado', 'FINALIZADO')
        .order('fecha_hora', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('checkins_diarios')
        .select('fatiga')
        .eq('equipo_id', activeTeam.id)
        .gte('fecha', new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)),
      supabase
        .from('entrenamientos_equipo')
        .select('id')
        .eq('equipo_id', activeTeam.id)
        .gte('fecha', new Date().toISOString().slice(0, 10))
        .lte('fecha', new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)),
      loadPlayersByTeamOnly(supabase, activeTeam),
    ])

    const matches = matchesResult.error ? [] : ((matchesResult.data ?? []) as MatchRow[])

    let players: SquadPlayer[] = []
    let source: SquadSource = 'fallback'

    if (teamPlayers.length > 0) {
      source = 'jugadores_externos'
      players = teamPlayers
        .sort((a, b) => {
          if (b.goals_total !== a.goals_total) return b.goals_total - a.goals_total
          if (b.minutes_total !== a.minutes_total) return b.minutes_total - a.minutes_total
          if (b.apps !== a.apps) return b.apps - a.apps
          return a.name.localeCompare(b.name, 'es')
        })
        .map((row) => {
          const minutes = Math.max(row.minutes_total, 0)
          const goals = Math.max(row.goals_total, 0)
          return {
            id: row.id,
            name: row.name,
            team: row.team,
            position: row.position,
            age: row.age,
            dorsal: row.dorsal,
            avatarUrl: null,
            stats: {
              apps: Math.max(row.apps, 0),
              minutes,
              goals,
              goalsPerMinute: minutes > 0 ? goals / minutes : 0,
              yellows: Math.max(row.yellows_total, 0),
              starts: Math.max(row.starts_total, 0),
            },
          }
        })
    }

    const finishedMatches = matches.filter((match) => normalizeText(match.estado) === 'FINALIZADO')
    const played = finishedMatches.length

    let wins = 0
    let draws = 0
    let goalsAgainst = 0

    for (const match of finishedMatches) {
      const gf = toNumber(match.goles_favor)
      const ga = toNumber(match.goles_contra)
      goalsAgainst += ga
      if (gf > ga) wins += 1
      else if (gf === ga) draws += 1
    }

    const points = wins * 3 + draws
    const pointsPerGame = played > 0 ? points / played : 0
    const goalsAgainstAvg = played > 0 ? goalsAgainst / played : 0

    const squadPassAccuracy = clamp(
      Math.round(76 + pointsPerGame * 4.5 + (played > 0 ? (wins / played) * 8 : 0) - goalsAgainstAvg * 2),
      65,
      95
    )

    const fatigueValues = (checkinsResult.error ? [] : checkinsResult.data ?? [])
      .map((row) => toNumber(row.fatiga))
      .filter((value) => value > 0)

    const avgFatigue =
      fatigueValues.length > 0
        ? fatigueValues.reduce((sum, value) => sum + value, 0) / fatigueValues.length
        : null

    const upcomingTrainingCount = trainingsResult.error ? 0 : (trainingsResult.data ?? []).length
    const readinessBase = 84 + upcomingTrainingCount * 1.5 - (avgFatigue ?? 0) * 5
    const readinessIndex = clamp(Math.round(readinessBase), 55, 98)

    const summary: SquadSuccessResponse['summary'] = {
      seasonLabel: seasonLabel(activeTeam.temporada),
      squadPassAccuracy,
      readinessIndex,
      nextMatchDate: nextMatchResult.error ? null : nextMatchResult.data?.fecha_hora ?? null,
      nextMatchRival: nextMatchResult.error ? null : nextMatchResult.data?.rival_nombre ?? null,
      nextMatchVenue: nextMatchResult.error ? null : nextMatchResult.data?.lugar ?? null,
    }

    const response: SquadSuccessResponse = {
      ok: true,
      equipo: activeTeam,
      role,
      summary,
      players,
      source,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error en GET /api/dashboard/squad:', error)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor.' }, { status: 500 })
  }
}
