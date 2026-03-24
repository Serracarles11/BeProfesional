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
    minutes: number
    goals: number
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

type ExternalPlayerRow = {
  id: string
  external_id: string | null
  nombre: string
  dorsal: number | null
  posicion: string | null
}

type ExternalParticipantRow = {
  jugador_externo_id: string
  partido_id: string
  minutos_jugados: number | null
  titular: boolean | null
}

type ExternalEventRow = {
  tipo: string | null
  jugador_externo_id: string | null
}

type ScraperPlayerRow = {
  id: string
  external_id: string | null
  name: string
  team: string
  position: string | null
  age: number | null
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

function teamsLikelyMatch(teamValue: string | null, equipoNombre: string, club: string | null) {
  if (!teamValue) return false

  const normalizedTeam = normalizeText(teamValue).replace(/\s+/g, '')
  const normalizedEquipo = normalizeText(equipoNombre).replace(/\s+/g, '')
  const normalizedClub = normalizeText(club).replace(/\s+/g, '')

  if (normalizedTeam && normalizedEquipo) {
    if (normalizedTeam.includes(normalizedEquipo) || normalizedEquipo.includes(normalizedTeam)) {
      return true
    }
  }

  if (normalizedTeam && normalizedClub) {
    if (normalizedTeam.includes(normalizedClub) || normalizedClub.includes(normalizedTeam)) {
      return true
    }
  }

  return false
}

function isGoalEvent(value: string | null | undefined) {
  return normalizeText(value).includes('GOL')
}

function isYellowEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes('AMAR') || normalized.includes('YELLOW')
}

function toScraperPlayerRow(raw: Record<string, unknown>): ScraperPlayerRow | null {
  const id = typeof raw.id === 'string' || typeof raw.id === 'number' ? String(raw.id) : ''
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const team = typeof raw.team === 'string' ? raw.team.trim() : ''

  if (!id || !name || !team) return null

  return {
    id,
    external_id: typeof raw.external_id === 'string' ? raw.external_id : null,
    name,
    team,
    position: typeof raw.position === 'string' ? raw.position : null,
    age:
      typeof raw.age === 'number' || typeof raw.age === 'string'
        ? toNumber(raw.age as number | string)
        : null,
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

async function loadExternalParticipants(
  supabase: SupabaseClient,
  matchIds: string[],
  externalIds: string[]
): Promise<ExternalParticipantRow[]> {
  if (matchIds.length === 0 || externalIds.length === 0) return []

  const primary = await supabase
    .from('participantes_partido')
    .select('jugador_externo_id, partido_id, minutos_jugados, titular')
    .in('partido_id', matchIds)
    .in('jugador_externo_id', externalIds)

  if (!primary.error) {
    return (primary.data ?? [])
      .map((row) => ({
        jugador_externo_id:
          typeof row.jugador_externo_id === 'string' ? row.jugador_externo_id : '',
        partido_id: typeof row.partido_id === 'string' ? row.partido_id : '',
        minutos_jugados: toNumber(row.minutos_jugados),
        titular: typeof row.titular === 'boolean' ? row.titular : null,
      }))
      .filter((row) => row.jugador_externo_id && row.partido_id)
  }

  const fallback = await supabase
    .from('participantes_partido')
    .select('jugador_externo_id, partido_id, minutos_jugados')
    .in('partido_id', matchIds)
    .in('jugador_externo_id', externalIds)

  if (fallback.error) return []

  return (fallback.data ?? [])
    .map((row) => ({
      jugador_externo_id:
        typeof row.jugador_externo_id === 'string' ? row.jugador_externo_id : '',
      partido_id: typeof row.partido_id === 'string' ? row.partido_id : '',
      minutos_jugados: toNumber(row.minutos_jugados),
      titular: null,
    }))
    .filter((row) => row.jugador_externo_id && row.partido_id)
}

async function loadExternalEvents(
  supabase: SupabaseClient,
  matchIds: string[]
): Promise<ExternalEventRow[]> {
  if (matchIds.length === 0) return []

  const result = await supabase
    .from('eventos_partido')
    .select('tipo, jugador_externo_id')
    .in('partido_id', matchIds)

  if (result.error) return []
  return (result.data ?? []) as ExternalEventRow[]
}

async function loadPlayersForExternal(
  supabase: SupabaseClient,
  equipo: EquipoActivo,
  externalRows: ExternalPlayerRow[]
): Promise<ScraperPlayerRow[]> {
  const externalIds = externalRows
    .map((row) => row.external_id)
    .filter((value): value is string => Boolean(value))

  const names = externalRows.map((row) => row.nombre)

  const [byExternal, byNames, byTeam, byClub] = await Promise.all([
    externalIds.length > 0
      ? supabase
          .from('players')
          .select('id, external_id, name, team, position, age, minutes_total, goals_total, yellows_total, starts_total')
          .in('external_id', externalIds)
          .limit(1500)
      : Promise.resolve({ data: [], error: null }),
    names.length > 0
      ? supabase
          .from('players')
          .select('id, external_id, name, team, position, age, minutes_total, goals_total, yellows_total, starts_total')
          .in('name', names)
          .limit(1500)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('players')
      .select('id, external_id, name, team, position, age, minutes_total, goals_total, yellows_total, starts_total')
      .ilike('team', `%${equipo.nombre}%`)
      .limit(1500),
    equipo.club && normalizeText(equipo.club) !== normalizeText(equipo.nombre)
      ? supabase
          .from('players')
          .select('id, external_id, name, team, position, age, minutes_total, goals_total, yellows_total, starts_total')
          .ilike('team', `%${equipo.club}%`)
          .limit(1500)
      : Promise.resolve({ data: [], error: null }),
  ])

  const rawRows = [
    ...((byExternal.error ? [] : byExternal.data ?? []) as Array<Record<string, unknown>>),
    ...((byNames.error ? [] : byNames.data ?? []) as Array<Record<string, unknown>>),
    ...((byTeam.error ? [] : byTeam.data ?? []) as Array<Record<string, unknown>>),
    ...((byClub.error ? [] : byClub.data ?? []) as Array<Record<string, unknown>>),
  ]

  const rows = rawRows
    .map((raw) => toScraperPlayerRow(raw))
    .filter((row): row is ScraperPlayerRow => row !== null)

  const deduped = new Map<string, ScraperPlayerRow>()

  for (const row of rows) {
    const key = row.external_id ? `ext:${row.external_id}` : `name:${normalizeText(row.name)}`
    if (!deduped.has(key)) {
      deduped.set(key, row)
      continue
    }

    const current = deduped.get(key)
    if (current && row.minutes_total > current.minutes_total) {
      deduped.set(key, row)
    }
  }

  return [...deduped.values()]
}

async function loadPlayersByTeamOnly(
  supabase: SupabaseClient,
  equipo: EquipoActivo
): Promise<ScraperPlayerRow[]> {
  const [byTeam, byClub] = await Promise.all([
    supabase
      .from('players')
      .select('id, external_id, name, team, position, age, minutes_total, goals_total, yellows_total, starts_total')
      .ilike('team', `%${equipo.nombre}%`)
      .limit(1500),
    equipo.club && normalizeText(equipo.club) !== normalizeText(equipo.nombre)
      ? supabase
          .from('players')
          .select('id, external_id, name, team, position, age, minutes_total, goals_total, yellows_total, starts_total')
          .ilike('team', `%${equipo.club}%`)
          .limit(1500)
      : Promise.resolve({ data: [], error: null }),
  ])

  const rawRows = [
    ...((byTeam.error ? [] : byTeam.data ?? []) as Array<Record<string, unknown>>),
    ...((byClub.error ? [] : byClub.data ?? []) as Array<Record<string, unknown>>),
  ]

  const rows = rawRows
    .map((raw) => toScraperPlayerRow(raw))
    .filter((row): row is ScraperPlayerRow => row !== null)
    .filter((row) => teamsLikelyMatch(row.team, equipo.nombre, equipo.club))

  const deduped = new Map<string, ScraperPlayerRow>()
  for (const row of rows) {
    const key = row.external_id ? `ext:${row.external_id}` : `name:${normalizeText(row.name)}::${normalizeText(row.team)}`
    if (!deduped.has(key)) {
      deduped.set(key, row)
      continue
    }
    const current = deduped.get(key)
    if (current && row.minutes_total > current.minutes_total) {
      deduped.set(key, row)
    }
  }

  return [...deduped.values()]
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

    const [externalPlayersResult, matchesResult, nextMatchResult, checkinsResult, trainingsResult] = await Promise.all([
      supabase
        .from('jugadores_externos')
        .select('id, external_id, nombre, dorsal, posicion')
        .eq('equipo_id', activeTeam.id),
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
    ])

    const externalPlayers = externalPlayersResult.error
      ? []
      : ((externalPlayersResult.data ?? []) as ExternalPlayerRow[])

    const matches = matchesResult.error ? [] : ((matchesResult.data ?? []) as MatchRow[])
    const matchIds = matches.map((match) => match.id)

    let players: SquadPlayer[] = []
    let source: SquadSource = 'fallback'

    if (externalPlayers.length > 0) {
      source = 'jugadores_externos'

      const [scraperRows, participants, events] = await Promise.all([
        loadPlayersForExternal(supabase, activeTeam, externalPlayers),
        loadExternalParticipants(
          supabase,
          matchIds,
          externalPlayers.map((player) => player.id)
        ),
        loadExternalEvents(supabase, matchIds),
      ])

      const scraperByExternalId = new Map<string, ScraperPlayerRow>()
      const scraperByName = new Map<string, ScraperPlayerRow[]>()

      for (const row of scraperRows) {
        if (row.external_id) {
          scraperByExternalId.set(row.external_id, row)
        }

        const nameKey = normalizeText(row.name)
        if (!scraperByName.has(nameKey)) {
          scraperByName.set(nameKey, [])
        }
        scraperByName.get(nameKey)?.push(row)
      }

      const participationByExternal = new Map<string, { minutes: number; starts: number }>()
      for (const row of participants) {
        const current = participationByExternal.get(row.jugador_externo_id) ?? { minutes: 0, starts: 0 }
        current.minutes += row.minutos_jugados ?? 90
        if (row.titular === true) current.starts += 1
        participationByExternal.set(row.jugador_externo_id, current)
      }

      const goalsByExternal = new Map<string, number>()
      const yellowsByExternal = new Map<string, number>()

      for (const row of events) {
        if (!row.jugador_externo_id) continue

        if (isGoalEvent(row.tipo)) {
          goalsByExternal.set(row.jugador_externo_id, (goalsByExternal.get(row.jugador_externo_id) ?? 0) + 1)
        }

        if (isYellowEvent(row.tipo)) {
          yellowsByExternal.set(row.jugador_externo_id, (yellowsByExternal.get(row.jugador_externo_id) ?? 0) + 1)
        }
      }

      players = externalPlayers
        .map((external) => {
          const byExternal = external.external_id ? scraperByExternalId.get(external.external_id) : null
          const byNameCandidates = scraperByName.get(normalizeText(external.nombre)) ?? []
          const byName = byNameCandidates.find((row) => teamsLikelyMatch(row.team, activeTeam.nombre, activeTeam.club)) ?? byNameCandidates[0] ?? null

          const enriched = byExternal ?? byName ?? null

          const participation = participationByExternal.get(external.id) ?? { minutes: 0, starts: 0 }

          return {
            id: external.id,
            name: external.nombre,
            team: enriched?.team ?? activeTeam.nombre,
            position: external.posicion ?? enriched?.position ?? null,
            age: enriched?.age ?? null,
            dorsal: external.dorsal ?? null,
            avatarUrl: null,
            stats: {
              minutes:
                participation.minutes > 0
                  ? participation.minutes
                  : Math.max(enriched?.minutes_total ?? 0, 0),
              goals:
                (goalsByExternal.get(external.id) ?? 0) > 0
                  ? goalsByExternal.get(external.id) ?? 0
                  : Math.max(enriched?.goals_total ?? 0, 0),
              yellows:
                (yellowsByExternal.get(external.id) ?? 0) > 0
                  ? yellowsByExternal.get(external.id) ?? 0
                  : Math.max(enriched?.yellows_total ?? 0, 0),
              starts:
                participation.starts > 0
                  ? participation.starts
                  : Math.max(enriched?.starts_total ?? 0, 0),
            },
          }
        })
        .sort((a, b) => {
          if (b.stats.goals !== a.stats.goals) return b.stats.goals - a.stats.goals
          if (b.stats.starts !== a.stats.starts) return b.stats.starts - a.stats.starts
          if (b.stats.minutes !== a.stats.minutes) return b.stats.minutes - a.stats.minutes
          return a.name.localeCompare(b.name, 'es')
        })
    } else {
      const teamPlayers = await loadPlayersByTeamOnly(supabase, activeTeam)
      if (teamPlayers.length > 0) {
        source = 'players'
        players = teamPlayers
          .sort((a, b) => {
            if (b.goals_total !== a.goals_total) return b.goals_total - a.goals_total
            if (b.starts_total !== a.starts_total) return b.starts_total - a.starts_total
            if (b.minutes_total !== a.minutes_total) return b.minutes_total - a.minutes_total
            return a.name.localeCompare(b.name, 'es')
          })
          .map((row) => ({
            id: row.external_id ? `ext:${row.external_id}` : `players:${row.id}`,
            name: row.name,
            team: row.team,
            position: row.position,
            age: row.age,
            dorsal: null,
            avatarUrl: null,
            stats: {
              minutes: Math.max(row.minutes_total, 0),
              goals: Math.max(row.goals_total, 0),
              yellows: Math.max(row.yellows_total, 0),
              starts: Math.max(row.starts_total, 0),
            },
          }))
      }
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
