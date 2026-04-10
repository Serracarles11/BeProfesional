import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

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
  dominantFoot: string | null
  heightCm: number | null
  weightKg: number | null
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

type TeamMemberProfileRow = {
  nombre: string | null
  foto_url: string | null
  posicion: string | null
  edad: number | string | null
  pie_dominante: string | null
  altura_cm: number | string | null
  peso_kg: number | string | null
}

type TeamMemberRow = {
  usuario_id: string | null
  dorsal: number | string | null
  fecha_alta: string | null
}

type MatchEventRow = {
  partido_id: string | null
  tipo: string | null
  jugador_id: string | null
  jugador_relacionado_id: string | null
}

type MatchParticipantRow = {
  partido_id: string | null
  jugador_id: string | null
  minutos_jugados: number | string | null
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

function normalizeProfile(raw: unknown): TeamMemberProfileRow | null {
  const profile = Array.isArray(raw) ? raw[0] : raw
  if (!profile || typeof profile !== 'object') return null

  const row = profile as Record<string, unknown>
  return {
    nombre: typeof row.nombre === 'string' ? row.nombre : null,
    foto_url: typeof row.foto_url === 'string' ? row.foto_url : null,
    posicion: typeof row.posicion === 'string' ? row.posicion : null,
    edad:
      typeof row.edad === 'number' || typeof row.edad === 'string'
        ? (row.edad as number | string)
        : null,
    pie_dominante: typeof row.pie_dominante === 'string' ? row.pie_dominante : null,
    altura_cm:
      typeof row.altura_cm === 'number' || typeof row.altura_cm === 'string'
        ? (row.altura_cm as number | string)
        : null,
    peso_kg:
      typeof row.peso_kg === 'number' || typeof row.peso_kg === 'string'
        ? (row.peso_kg as number | string)
        : null,
  }
}

function isGoalEvent(value: string | null | undefined) {
  return normalizeText(value).includes('GOL')
}

function isYellowCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes('AMAR') || normalized.includes('YELLOW')
}

function isAssistEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes('ASIST')
}

function isRedCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes('ROJA') || normalized.includes('RED')
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
      .eq('estado', 'ACTIVO')
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

    const [matchesResult, nextMatchResult, checkinsResult, trainingsResult, membersResult] = await Promise.all([
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
      supabase
        .from('miembros_equipo')
        .select('usuario_id, dorsal, fecha_alta')
        .eq('equipo_id', activeTeam.id)
        .eq('rol', 'JUGADOR')
        .eq('estado', 'ACTIVO')
        .order('fecha_alta', { ascending: false }),
    ])

    const matches = matchesResult.error ? [] : ((matchesResult.data ?? []) as MatchRow[])

    if (membersResult.error) {
      return buildErrorResponse('No se pudieron cargar los jugadores del equipo.', 500, membersResult.error)
    }

    const uniqueMembers = new Map<string, TeamMemberRow>()

    for (const row of (membersResult.data ?? []) as TeamMemberRow[]) {
      const userId = row.usuario_id
      if (!userId || uniqueMembers.has(userId)) continue
      uniqueMembers.set(userId, row)
    }

    const memberRows = [...uniqueMembers.values()]
    const memberIds = memberRows
      .map((row) => row.usuario_id)
      .filter((value): value is string => Boolean(value))

    let profilesById = new Map<string, TeamMemberProfileRow>()

    if (memberIds.length > 0) {
      const profilesResult = await supabase
        .from('perfiles')
        .select('id, nombre, foto_url, posicion, edad, pie_dominante, altura_cm, peso_kg')
        .in('id', memberIds)

      if (!profilesResult.error) {
        profilesById = new Map(
          ((profilesResult.data ?? []) as Array<Record<string, unknown>>)
            .map((row) => {
              const id = typeof row.id === 'string' ? row.id : null
              if (!id) return null
              return [id, normalizeProfile(row)] as const
            })
            .filter((entry): entry is readonly [string, TeamMemberProfileRow] => entry !== null && entry[1] !== null)
        )
      }
    }

    const basePlayers = memberRows
      .map((row) => {
        const userId = row.usuario_id
        if (!userId) return null

        const profile = profilesById.get(userId) ?? null
        const fallbackOwnName =
          userId === user.id && typeof user.user_metadata?.nombre === 'string'
            ? user.user_metadata.nombre.trim()
            : ''
        const name = profile?.nombre?.trim() || fallbackOwnName

        return {
          id: userId,
          name: name || 'Jugador',
          team: activeTeam.nombre,
          position: profile?.posicion ?? null,
          age: profile?.edad == null ? null : toNumber(profile.edad),
          dorsal:
            typeof row.dorsal === 'number' || typeof row.dorsal === 'string'
              ? toNumber(row.dorsal)
              : null,
          avatarUrl: profile?.foto_url ?? null,
          dominantFoot: profile?.pie_dominante?.trim() || null,
          heightCm: profile?.altura_cm == null ? null : toNumber(profile.altura_cm),
          weightKg: profile?.peso_kg == null ? null : toNumber(profile.peso_kg),
        }
      })
      .filter((row): row is Omit<SquadPlayer, 'stats'> => row !== null)

    const matchIds = matches.map((match) => match.id)

    let events: MatchEventRow[] = []
    let participants: MatchParticipantRow[] = []

    if (matchIds.length > 0 && basePlayers.length > 0) {
      const [eventsResult, participantsResult] = await Promise.all([
        supabase
          .from('eventos_partido')
          .select('partido_id, tipo, jugador_id, jugador_relacionado_id')
          .in('partido_id', matchIds),
        supabase
          .from('participantes_partido')
          .select('partido_id, jugador_id, minutos_jugados')
          .in('partido_id', matchIds)
          .in(
            'jugador_id',
            basePlayers.map((player) => player.id)
          ),
      ])

      if (!eventsResult.error) {
        events = (eventsResult.data ?? []) as MatchEventRow[]
      }

      if (!participantsResult.error) {
        participants = (participantsResult.data ?? []) as MatchParticipantRow[]
      }
    }

    const playerStats = new Map<
      string,
      {
        appMatches: Set<string>
        minutes: number
        goals: number
        assists: number
        yellows: number
        reds: number
      }
    >()

    for (const player of basePlayers) {
      playerStats.set(player.id, {
        appMatches: new Set<string>(),
        minutes: 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
      })
    }

    for (const row of participants) {
      if (!row.jugador_id || !row.partido_id) continue
      const current = playerStats.get(row.jugador_id)
      if (!current) continue
      current.appMatches.add(row.partido_id)
      current.minutes += Math.max(toNumber(row.minutos_jugados), 0)
    }

    for (const event of events) {
      if (event.jugador_id) {
        const current = playerStats.get(event.jugador_id)
        if (current) {
          if (isGoalEvent(event.tipo)) current.goals += 1
          if (isYellowCardEvent(event.tipo)) current.yellows += 1
          if (isRedCardEvent(event.tipo)) current.reds += 1
        }
      }

      if (isAssistEvent(event.tipo)) {
        const relatedId = event.jugador_relacionado_id ?? event.jugador_id
        if (!relatedId) continue
        const current = playerStats.get(relatedId)
        if (current) current.assists += 1
      }
    }

    const players: SquadPlayer[] = basePlayers
      .map((player) => {
        const stats = playerStats.get(player.id)
        const apps = stats?.appMatches.size ?? 0
        const minutes = stats?.minutes ?? 0
        const goals = stats?.goals ?? 0
        const assists = stats?.assists ?? 0
        const yellows = stats?.yellows ?? 0
        const reds = stats?.reds ?? 0

        return {
          ...player,
          stats: {
            apps,
            minutes,
            goals,
            assists,
            goalsPerMinute: minutes > 0 ? goals / minutes : 0,
            yellows,
            reds,
            starts: apps,
          },
        }
      })
      .sort((a, b) => {
        if (b.stats.goals !== a.stats.goals) return b.stats.goals - a.stats.goals
        if (b.stats.minutes !== a.stats.minutes) return b.stats.minutes - a.stats.minutes
        if (b.stats.apps !== a.stats.apps) return b.stats.apps - a.stats.apps
        if (a.dorsal !== null && b.dorsal !== null && a.dorsal !== b.dorsal) return a.dorsal - b.dorsal
        return a.name.localeCompare(b.name, 'es')
      })

    const source: SquadSource = 'players'

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
