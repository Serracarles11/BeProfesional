import { NextRequest, NextResponse } from 'next/server'
import { notifyTeamMembers } from '@/lib/notifications'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const STAFF_ROLE_TOKENS = ['ENTREN', 'COACH', 'TECN', 'ADMIN', 'AUX', 'DELEG', 'STAFF']

const EVENT_GOAL = 'GOL'
const EVENT_ASSIST = 'ASISTENCIA'
const EVENT_YELLOW = 'AMARILLA'
const EVENT_RED = 'ROJA'
const PLAYER_STAT_EVENT_TYPES = [
  EVENT_GOAL,
  EVENT_ASSIST,
  EVENT_YELLOW,
  EVENT_RED,
]
const PLAYER_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000

type MembershipRow = {
  equipo_id: string
  rol: string | null
  fecha_alta: string | null
}

type TeamRow = {
  id: string
  nombre: string | null
  logo_url?: string | null
}

type TeamMemberRow = {
  usuario_id: string
  rol: string | null
  dorsal?: number | null
  perfiles?:
    | {
        nombre: string | null
        foto_url?: string | null
        posicion?: string | null
      }
    | {
        nombre: string | null
        foto_url?: string | null
        posicion?: string | null
      }[]
    | null
}

type MatchRow = {
  id: string
  equipo_id: string
  fecha_hora: string
  rival_nombre: string | null
  casa_fuera: string | null
  lugar: string | null
  competicion: string | null
  estado: string | null
  goles_favor: number | string | null
  goles_contra: number | string | null
}

type MatchScoreBody = {
  matchId?: unknown
  opponentGoals?: unknown
  opponentGoalMinutes?: unknown
}

type PlayerSubmission = {
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  updatedAt: string | null
}

type ParticipantRow = {
  id: string | null
  partidoId: string
  playerId: string
  minutes: number | null
}

type EventRow = {
  partidoId: string
  eventType: string | null
  playerId: string | null
  relatedPlayerId: string | null
}

type ParticipantPlayerColumn = 'usuario_id' | 'jugador_id'
type EventPlayerColumn = 'usuario_id' | 'jugador_id'
type EventRelatedColumn = 'usuario_relacionado_id' | 'jugador_relacionado_id'

type SubmitStatsBody = {
  matchId?: unknown
  playerId?: unknown
  minutes?: unknown
  goals?: unknown
  assists?: unknown
  yellowCards?: unknown
  redCards?: unknown
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function getErrorMessage(
  error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null | undefined,
  fallback: string
) {
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' | ') || fallback
}

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function isCoachRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return STAFF_ROLE_TOKENS.some((token) => normalized.includes(token))
}

function isPlayerRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  if (!normalized) return false
  return normalized === 'JUGADOR' || normalized.includes('JUGADOR') || normalized.includes('JUG')
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

function parseMatchTime(value: string | null | undefined) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function isMatchOpenForStats(
  fechaHora: string | null | undefined,
  now = new Date()
) {
  const matchTime = parseMatchTime(fechaHora)
  if (matchTime === null) return false
  const nowTime = now.getTime()
  return matchTime <= nowTime && nowTime - matchTime <= PLAYER_EDIT_WINDOW_MS
}

function canEditMatchStats(
  fechaHora: string | null | undefined,
  viewerIsCoach: boolean,
  now = new Date()
) {
  if (viewerIsCoach) return true
  return isMatchOpenForStats(fechaHora, now)
}

function getWeekRange(now = new Date()) {
  const start = new Date(now)
  const weekdayOffset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - weekdayOffset)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function pickWeekFeatured(matches: MatchRow[], now = new Date()) {
  if (matches.length === 0) return null

  const openMatches = matches.filter((match) => isMatchOpenForStats(match.fecha_hora, now))
  if (openMatches.length > 0) {
    return [...openMatches].sort((left, right) => {
      const leftTime = parseMatchTime(left.fecha_hora)
      const rightTime = parseMatchTime(right.fecha_hora)
      if (leftTime === null && rightTime === null) return 0
      if (leftTime === null) return 1
      if (rightTime === null) return -1
      return rightTime - leftTime
    })[0]
  }

  const upcomingMatches = matches
    .filter((match) => {
      const matchTime = parseMatchTime(match.fecha_hora)
      return matchTime !== null && matchTime > now.getTime()
    })
    .sort((left, right) => {
      const leftTime = parseMatchTime(left.fecha_hora) ?? Number.POSITIVE_INFINITY
      const rightTime = parseMatchTime(right.fecha_hora) ?? Number.POSITIVE_INFINITY
      return leftTime - rightTime
    })

  if (upcomingMatches.length > 0) {
    return upcomingMatches[0]
  }

  return [...matches].sort((left, right) => {
    const leftTime = parseMatchTime(left.fecha_hora)
    const rightTime = parseMatchTime(right.fecha_hora)
    if (leftTime === null && rightTime === null) return 0
    if (leftTime === null) return 1
    if (rightTime === null) return -1
    return rightTime - leftTime
  })[0]
}

function isGoalEvent(value: string | null | undefined) {
  return normalizeText(value).includes('GOL')
}

function isAssistEvent(value: string | null | undefined) {
  return normalizeText(value).includes('ASIST')
}

function isYellowCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes('AMAR') || normalized.includes('YELLOW')
}

function isRedCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes('ROJA') || normalized.includes('RED')
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function parseMinutes(value: unknown) {
  if (!isNonNegativeInteger(value)) return null
  return clamp(value, 0, 130)
}

function parseCounter(value: unknown) {
  if (!isNonNegativeInteger(value)) return null
  return clamp(value, 0, 30)
}

function parseOptionalMinuteList(value: unknown) {
  if (!Array.isArray(value)) return null

  const minutes: number[] = []
  for (const item of value) {
    if (!isNonNegativeInteger(item)) return null
    minutes.push(clamp(item, 0, 130))
  }

  return minutes
}

function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  column: string
) {
  const message = error?.message?.toLowerCase() ?? ''
  const code = error?.code ?? ''
  return (
    code === '42703' ||
    message.includes(`column ${column.toLowerCase()}`) ||
    message.includes(`'${column.toLowerCase()}' column`)
  )
}

function isUniqueViolation(error: { code?: string | null; message?: string | null } | null | undefined) {
  const code = error?.code ?? ''
  const message = error?.message?.toLowerCase() ?? ''
  return code === '23505' || message.includes('duplicate key') || message.includes('unique constraint')
}

function isRlsViolation(error: { code?: string | null; message?: string | null } | null | undefined) {
  const code = error?.code ?? ''
  const message = error?.message?.toLowerCase() ?? ''
  return code === '42501' || message.includes('row-level security policy')
}

async function insertEventRowsWithFallback(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  eventRows: Record<string, unknown>[]
) {
  if (eventRows.length === 0) return { error: null }

  const directInsert = await supabase.from('eventos_partido').insert(eventRows)
  if (!directInsert.error) return { error: null }

  return { error: directInsert.error }
}

async function syncMatchScoreFromEvents(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  matchId: string
) {
  const matchResult = await supabase
    .from('partidos')
    .select('fecha_hora, goles_contra')
    .eq('id', matchId)
    .maybeSingle()

  const eventsResult = await readEvents(supabase, [matchId])
  const goalsFor = eventsResult.rows.filter((event) => isGoalEvent(event.eventType)).length
  const matchTime = parseMatchTime(matchResult.data?.fecha_hora)
  const updatePayload: Record<string, unknown> = {
    goles_favor: goalsFor,
    goles_contra: toNumber(matchResult.data?.goles_contra),
  }

  if (matchTime !== null && matchTime <= Date.now()) {
    updatePayload.estado = 'FINALIZADO'
  }

  const updateResult = await supabase
    .from('partidos')
    .update(updatePayload)
    .eq('id', matchId)

  if (updateResult.error) {
    console.error('POST /api/partidos - score sync failed:', updateResult.error)
  }
}

async function resolveParticipantPlayerColumn(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>
): Promise<ParticipantPlayerColumn | null> {
  const byJugadorId = await supabase.from('participantes_partido').select('jugador_id').limit(1)
  if (!byJugadorId.error || !isMissingColumnError(byJugadorId.error, 'jugador_id')) return 'jugador_id'

  const byUsuarioId = await supabase.from('participantes_partido').select('usuario_id').limit(1)
  if (!byUsuarioId.error || !isMissingColumnError(byUsuarioId.error, 'usuario_id')) return 'usuario_id'

  return null
}

async function resolveEventColumns(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>
): Promise<{ player: EventPlayerColumn; related: EventRelatedColumn | null } | null> {
  const playerJugador = await supabase.from('eventos_partido').select('jugador_id').limit(1)
  if (!playerJugador.error || !isMissingColumnError(playerJugador.error, 'jugador_id')) {
    const relatedJugador = await supabase
      .from('eventos_partido')
      .select('jugador_relacionado_id')
      .limit(1)
    return {
      player: 'jugador_id',
      related:
        !relatedJugador.error || !isMissingColumnError(relatedJugador.error, 'jugador_relacionado_id')
          ? 'jugador_relacionado_id'
          : null,
    }
  }

  const playerUsuario = await supabase.from('eventos_partido').select('usuario_id').limit(1)
  if (!playerUsuario.error || !isMissingColumnError(playerUsuario.error, 'usuario_id')) {
    const relatedUsuario = await supabase
      .from('eventos_partido')
      .select('usuario_relacionado_id')
      .limit(1)
    return {
      player: 'usuario_id',
      related:
        !relatedUsuario.error || !isMissingColumnError(relatedUsuario.error, 'usuario_relacionado_id')
          ? 'usuario_relacionado_id'
          : null,
    }
  }

  return null
}

async function readParticipants(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  matchIds: string[]
) {
  if (matchIds.length === 0) {
    return {
      rows: [] as ParticipantRow[],
      column: null as ParticipantPlayerColumn | null,
    }
  }

  const byUsuarioId = await supabase
    .from('participantes_partido')
    .select('id, partido_id, minutos_jugados, usuario_id')
    .in('partido_id', matchIds)

  if (!byUsuarioId.error) {
    const rows = (byUsuarioId.data ?? [])
      .map((row) => ({
        id: typeof row.id === 'string' ? row.id : null,
        partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
        playerId: typeof row.usuario_id === 'string' ? row.usuario_id : '',
        minutes:
          typeof row.minutos_jugados === 'number' || typeof row.minutos_jugados === 'string'
            ? toNumber(row.minutos_jugados as number | string)
            : null,
      }))
      .filter((row) => Boolean(row.partidoId && row.playerId))

    return { rows, column: 'usuario_id' as const }
  }

  const byJugadorId = await supabase
    .from('participantes_partido')
    .select('id, partido_id, minutos_jugados, jugador_id')
    .in('partido_id', matchIds)

  if (!byJugadorId.error) {
    const rows = (byJugadorId.data ?? [])
      .map((row) => ({
        id: typeof row.id === 'string' ? row.id : null,
        partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
        playerId: typeof row.jugador_id === 'string' ? row.jugador_id : '',
        minutes:
          typeof row.minutos_jugados === 'number' || typeof row.minutos_jugados === 'string'
            ? toNumber(row.minutos_jugados as number | string)
            : null,
      }))
      .filter((row) => Boolean(row.partidoId && row.playerId))

    return { rows, column: 'jugador_id' as const }
  }

  return {
    rows: [] as ParticipantRow[],
    column: null as ParticipantPlayerColumn | null,
  }
}

async function readEvents(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  matchIds: string[]
) {
  if (matchIds.length === 0) {
    return {
      rows: [] as EventRow[],
      columns: null as { player: EventPlayerColumn; related: EventRelatedColumn | null } | null,
    }
  }

  const byJugadorId = await supabase
    .from('eventos_partido')
    .select('partido_id, tipo, jugador_id, jugador_relacionado_id')
    .in('partido_id', matchIds)

  if (!byJugadorId.error) {
    const rows = (byJugadorId.data ?? []).map((row) => ({
      partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
      eventType: typeof row.tipo === 'string' ? row.tipo : null,
      playerId: typeof row.jugador_id === 'string' ? row.jugador_id : null,
      relatedPlayerId:
        typeof row.jugador_relacionado_id === 'string' ? row.jugador_relacionado_id : null,
    }))

    return {
      rows,
      columns: { player: 'jugador_id' as const, related: 'jugador_relacionado_id' as const },
    }
  }

  const byUsuarioId = await supabase
    .from('eventos_partido')
    .select('partido_id, tipo, usuario_id, usuario_relacionado_id')
    .in('partido_id', matchIds)

  if (!byUsuarioId.error) {
    const rows = (byUsuarioId.data ?? []).map((row) => ({
      partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
      eventType: typeof row.tipo === 'string' ? row.tipo : null,
      playerId: typeof row.usuario_id === 'string' ? row.usuario_id : null,
      relatedPlayerId:
        typeof row.usuario_relacionado_id === 'string' ? row.usuario_relacionado_id : null,
    }))

    return {
      rows,
      columns: { player: 'usuario_id' as const, related: 'usuario_relacionado_id' as const },
    }
  }

  return {
    rows: [] as EventRow[],
    columns: null as { player: EventPlayerColumn; related: EventRelatedColumn | null } | null,
  }
}

async function readOpponentGoalMinutes(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  matchIds: string[]
) {
  const minutesByMatch = new Map<string, number[]>()
  if (matchIds.length === 0) return minutesByMatch

  const result = await supabase
    .from('partidos')
    .select('id, goles_contra_minutos')
    .in('id', matchIds)

  if (result.error) {
    if (!isMissingColumnError(result.error, 'goles_contra_minutos')) {
      console.error('GET /api/partidos - opponent goal minutes query failed:', result.error)
    }
    return minutesByMatch
  }

  for (const row of result.data ?? []) {
    if (typeof row.id !== 'string' || !Array.isArray(row.goles_contra_minutos)) continue
    minutesByMatch.set(
      row.id,
      row.goles_contra_minutos
        .map((minute: unknown) =>
          typeof minute === 'number' || typeof minute === 'string' ? toNumber(minute) : null
        )
        .filter((minute: number | null): minute is number => minute !== null && minute >= 0 && minute <= 130)
    )
  }

  return minutesByMatch
}

function mapMatchForClient(
  match: MatchRow,
  eventGoalsByMatch?: Map<string, number>,
  opponentGoalMinutesByMatch?: Map<string, number[]>
) {
  const eventGoals = eventGoalsByMatch?.get(match.id)

  return {
    id: match.id,
    fechaHora: match.fecha_hora,
    rival: match.rival_nombre,
    casaFuera: match.casa_fuera,
    lugar: match.lugar,
    competicion: match.competicion,
    estado: match.estado,
    golesFavor:
      typeof match.goles_favor === 'number' || typeof match.goles_favor === 'string'
        ? toNumber(match.goles_favor)
        : eventGoals ?? null,
    golesContra:
      typeof match.goles_contra === 'number' || typeof match.goles_contra === 'string'
        ? toNumber(match.goles_contra)
        : null,
    golesContraMinutos: opponentGoalMinutesByMatch?.get(match.id) ?? [],
  }
}

function getMemberProfile(raw: TeamMemberRow['perfiles']) {
  const profile = Array.isArray(raw) ? raw[0] : raw
  return {
    name: typeof profile?.nombre === 'string' ? profile.nombre : null,
    avatarUrl: typeof profile?.foto_url === 'string' ? profile.foto_url : null,
    position: typeof profile?.posicion === 'string' ? profile.posicion : null,
  }
}

function getSubmissionFromRows(
  userId: string,
  participants: ParticipantRow[],
  events: EventRow[],
  featuredMatchId: string
): PlayerSubmission | null {
  const participant = participants.find(
    (row) => row.partidoId === featuredMatchId && row.playerId === userId
  )

  let goals = 0
  let assists = 0
  let yellowCards = 0
  let redCards = 0

  for (const event of events) {
    if (event.partidoId !== featuredMatchId) continue

    if (isGoalEvent(event.eventType) && event.playerId === userId) goals += 1

    const assistPlayer = event.relatedPlayerId ?? event.playerId
    if (isAssistEvent(event.eventType) && assistPlayer === userId) assists += 1

    if (isYellowCardEvent(event.eventType) && event.playerId === userId) yellowCards += 1
    if (isRedCardEvent(event.eventType) && event.playerId === userId) redCards += 1
  }

  const hasAnyData =
    participant !== undefined ||
    goals > 0 ||
    assists > 0 ||
    yellowCards > 0 ||
    redCards > 0

  if (!hasAnyData) return null

  return {
    minutes: participant?.minutes ?? 0,
    goals,
    assists,
    yellowCards,
    redCards,
    updatedAt: null,
  }
}

function submissionsAreEqual(
  previous: PlayerSubmission | null,
  next: Omit<PlayerSubmission, 'updatedAt'>
) {
  return (
    (previous?.minutes ?? 0) === next.minutes &&
    (previous?.goals ?? 0) === next.goals &&
    (previous?.assists ?? 0) === next.assists &&
    (previous?.yellowCards ?? 0) === next.yellowCards &&
    (previous?.redCards ?? 0) === next.redCards
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const adminSupabase = createSupabaseAdmin()
    const db = adminSupabase ?? supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const requestedTeamId = request.nextUrl.searchParams.get('equipo')?.trim() ?? null
    const requestedMatchId = request.nextUrl.searchParams.get('matchId')?.trim() ?? null
    const requestedAllPlayed = request.nextUrl.searchParams.get('all') === '1'

    const membershipsResult = await supabase
      .from('miembros_equipo')
      .select('equipo_id, rol, fecha_alta')
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .order('fecha_alta', { ascending: false })

    if (membershipsResult.error) {
      return createErrorResponse('No se pudo validar el equipo activo.', 500)
    }

    const memberships = (membershipsResult.data ?? []) as MembershipRow[]
    if (memberships.length === 0) {
      return NextResponse.json({
        ok: true,
        equipoId: null,
        teamName: 'Equipo',
        role: null,
        isCoach: false,
        showingAllPlayed: false,
        featuredMatch: null,
        featuredMeta: {
          totalPlayers: 0,
          submittedPlayers: 0,
          progressPct: 0,
          canSubmit: false,
          isOpenForStats: false,
          mySubmission: null,
          playerSubmissions: [],
          totals: {
            goals: 0,
            assists: 0,
            yellows: 0,
            reds: 0,
            minutes: 0,
          },
        },
        history: [],
      })
    }

    const activeMembership = requestedTeamId
      ? memberships.find((membership) => membership.equipo_id === requestedTeamId)
      : memberships[0]

    if (!activeMembership) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    const equipoId = activeMembership.equipo_id
    const role = activeMembership.rol ?? null
    const viewerIsCoach = isCoachRole(role)
    const viewerIsPlayer = isPlayerRole(role)

    const [teamResult, teamMembersResult] = await Promise.all([
      db.from('equipos').select('id, nombre').eq('id', equipoId).maybeSingle(),
      db
        .from('miembros_equipo')
        .select('usuario_id, rol, dorsal, perfiles(nombre, foto_url, posicion)')
        .eq('equipo_id', equipoId)
        .eq('estado', 'ACTIVO'),
    ])

    const teamName =
      !teamResult.error && teamResult.data
        ? ((teamResult.data as TeamRow).nombre?.trim() || 'Equipo')
        : 'Equipo'

    const teamMembers = teamMembersResult.error
      ? ([] as TeamMemberRow[])
      : ((teamMembersResult.data ?? []) as TeamMemberRow[])

    const totalPlayers = teamMembers.reduce((count, member) => {
      return isPlayerRole(member.rol) ? count + 1 : count
    }, 0)
    const playerMembers = teamMembers.filter((member) => isPlayerRole(member.rol))

    const now = new Date()
    const { start: weekStart, end: weekEnd } = getWeekRange(now)

    let matchesListQuery = db
      .from('partidos')
      .select(
        'id, equipo_id, fecha_hora, rival_nombre, casa_fuera, lugar, competicion, estado, goles_favor, goles_contra'
      )
      .eq('equipo_id', equipoId)
      .order('fecha_hora', { ascending: false })

    if (!requestedAllPlayed) {
      matchesListQuery = matchesListQuery.limit(3)
    }

    const [weekMatchesResult, nextMatchResult, matchesListResult, requestedMatchResult] = await Promise.all([
      db
        .from('partidos')
        .select(
          'id, equipo_id, fecha_hora, rival_nombre, casa_fuera, lugar, competicion, estado, goles_favor, goles_contra'
        )
        .eq('equipo_id', equipoId)
        .gte('fecha_hora', weekStart.toISOString())
        .lte('fecha_hora', weekEnd.toISOString())
        .order('fecha_hora', { ascending: true }),
      db
        .from('partidos')
        .select(
          'id, equipo_id, fecha_hora, rival_nombre, casa_fuera, lugar, competicion, estado, goles_favor, goles_contra'
        )
        .eq('equipo_id', equipoId)
        .gte('fecha_hora', now.toISOString())
        .order('fecha_hora', { ascending: true })
        .limit(1)
        .maybeSingle(),
      matchesListQuery,
      requestedMatchId
        ? db
            .from('partidos')
            .select(
              'id, equipo_id, fecha_hora, rival_nombre, casa_fuera, lugar, competicion, estado, goles_favor, goles_contra'
            )
            .eq('equipo_id', equipoId)
            .eq('id', requestedMatchId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (weekMatchesResult.error || matchesListResult.error || requestedMatchResult.error) {
      return createErrorResponse('No se pudieron cargar los partidos.', 500)
    }

    const weekMatches = (weekMatchesResult.data ?? []) as MatchRow[]
    const listedMatches = (matchesListResult.data ?? []) as MatchRow[]
    const nextMatch = nextMatchResult.error || !nextMatchResult.data
      ? null
      : (nextMatchResult.data as MatchRow)
    const requestedMatch = requestedMatchResult.data ? (requestedMatchResult.data as MatchRow) : null

    const selectedMatch =
      requestedMatchId
        ? requestedMatch ?? [...weekMatches, ...listedMatches].find((match) => match.id === requestedMatchId) ?? null
        : null

    const featuredMatch = selectedMatch ?? pickWeekFeatured(weekMatches, now) ?? nextMatch ?? listedMatches[0] ?? null
    const matchList =
      requestedAllPlayed
        ? listedMatches
        : listedMatches.filter((match) => match.id !== featuredMatch?.id)

    const featuredMatchIds = featuredMatch ? [featuredMatch.id] : []
    const listMatchIds = Array.from(new Set(matchList.map((match) => match.id)))
    const allVisibleMatchIds = Array.from(new Set([...featuredMatchIds, ...listMatchIds]))
    const [participantsResult, eventsResult, opponentGoalMinutesByMatch] = await Promise.all([
      readParticipants(db, featuredMatchIds),
      readEvents(db, featuredMatchIds),
      readOpponentGoalMinutes(db, allVisibleMatchIds),
    ])
    const listEventsResult = await readEvents(db, listMatchIds)

    const participants = participantsResult.rows
    const events = eventsResult.rows
    const eventGoalsByMatch = new Map<string, number>()
    for (const event of listEventsResult.rows) {
      if (!isGoalEvent(event.eventType)) continue
      eventGoalsByMatch.set(event.partidoId, (eventGoalsByMatch.get(event.partidoId) ?? 0) + 1)
    }

    const submittedPlayerIds = new Set<string>()
    for (const row of participants) {
      if (row.partidoId !== featuredMatch?.id) continue
      submittedPlayerIds.add(row.playerId)
    }
    for (const event of events) {
      if (event.partidoId !== featuredMatch?.id) continue
      if (event.playerId) submittedPlayerIds.add(event.playerId)
      if (event.relatedPlayerId) submittedPlayerIds.add(event.relatedPlayerId)
    }

    const submittedPlayers = submittedPlayerIds.size
    const progressPct =
      totalPlayers > 0 ? clamp(Math.round((submittedPlayers / totalPlayers) * 100), 0, 100) : 0

    const featuredIsOpen =
      !!featuredMatch &&
      canEditMatchStats(featuredMatch.fecha_hora, viewerIsCoach, now)

    const mySubmission = featuredMatch
      ? getSubmissionFromRows(user.id, participants, events, featuredMatch.id)
      : null
    const playerSubmissions =
      featuredMatch && viewerIsCoach
        ? playerMembers.map((member, index) => {
            const profile = getMemberProfile(member.perfiles)
            return {
              playerId: member.usuario_id,
              name: profile.name ?? `Jugador ${index + 1}`,
              avatarUrl: profile.avatarUrl,
              position: profile.position,
              dorsal: typeof member.dorsal === 'number' ? member.dorsal : null,
              submission: getSubmissionFromRows(member.usuario_id, participants, events, featuredMatch.id),
            }
          })
        : []
    const totals = {
      goals: events.filter((event) => event.partidoId === featuredMatch?.id && isGoalEvent(event.eventType)).length,
      assists: events.filter((event) => event.partidoId === featuredMatch?.id && isAssistEvent(event.eventType)).length,
      yellows: events.filter((event) => event.partidoId === featuredMatch?.id && isYellowCardEvent(event.eventType)).length,
      reds: events.filter((event) => event.partidoId === featuredMatch?.id && isRedCardEvent(event.eventType)).length,
      minutes: participants
        .filter((row) => row.partidoId === featuredMatch?.id)
        .reduce((sum, row) => sum + Math.max(row.minutes ?? 0, 0), 0),
    }

    return NextResponse.json({
      ok: true,
      equipoId,
      teamName,
      role,
      isCoach: viewerIsCoach,
      showingAllPlayed: requestedAllPlayed,
      featuredMatch: featuredMatch ? mapMatchForClient(featuredMatch, undefined, opponentGoalMinutesByMatch) : null,
      featuredMeta: {
        totalPlayers,
        submittedPlayers,
        progressPct,
        canSubmit: viewerIsPlayer || viewerIsCoach,
        isOpenForStats: featuredIsOpen,
        mySubmission,
        playerSubmissions,
        totals,
      },
      history: matchList.map((match) => mapMatchForClient(match, eventGoalsByMatch, opponentGoalMinutesByMatch)),
    })
  } catch (error) {
    console.error('Error en GET /api/partidos:', error)
    return createErrorResponse('No se pudo cargar la seccion de partidos.', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const adminSupabase = createSupabaseAdmin()
    const db = adminSupabase ?? supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const body = (await request.json()) as MatchScoreBody
    const matchId = typeof body.matchId === 'string' ? body.matchId.trim() : ''
    const opponentGoals = parseCounter(body.opponentGoals)
    const opponentGoalMinutes = parseOptionalMinuteList(body.opponentGoalMinutes)

    if (!matchId) return createErrorResponse('matchId invalido.', 400)
    if (opponentGoals === null || opponentGoalMinutes === null) {
      return createErrorResponse('Resultado invalido.', 400)
    }
    if (opponentGoalMinutes.length > opponentGoals) {
      return createErrorResponse('Hay mas minutos de gol que goles en contra.', 400)
    }

    const matchResult = await db
      .from('partidos')
      .select('id, equipo_id, fecha_hora')
      .eq('id', matchId)
      .maybeSingle()

    if (matchResult.error || !matchResult.data) {
      return createErrorResponse('Partido no encontrado.', 404)
    }

    const match = matchResult.data as {
      id: string
      equipo_id: string
      fecha_hora: string
    }

    const membershipResult = await supabase
      .from('miembros_equipo')
      .select('rol')
      .eq('equipo_id', match.equipo_id)
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .maybeSingle()

    if (membershipResult.error) {
      return createErrorResponse('No se pudo validar tu equipo.', 500)
    }

    if (!membershipResult.data || !isCoachRole(membershipResult.data.rol)) {
      return createErrorResponse('Solo un entrenador puede editar el resultado.', 403)
    }

    const updatePayload: Record<string, unknown> = {
      goles_contra: opponentGoals,
      goles_contra_minutos: opponentGoalMinutes,
    }
    const matchTime = parseMatchTime(match.fecha_hora)
    if (matchTime !== null && matchTime <= Date.now()) {
      updatePayload.estado = 'FINALIZADO'
    }

    let updateResult = await db
      .from('partidos')
      .update(updatePayload)
      .eq('id', matchId)
      .eq('equipo_id', match.equipo_id)

    if (updateResult.error && isMissingColumnError(updateResult.error, 'goles_contra_minutos')) {
      const fallbackPayload = { ...updatePayload }
      delete fallbackPayload.goles_contra_minutos
      updateResult = await db
        .from('partidos')
        .update(fallbackPayload)
        .eq('id', matchId)
        .eq('equipo_id', match.equipo_id)
    }

    if (updateResult.error) {
      console.error('PATCH /api/partidos - score update failed:', updateResult.error)
      return createErrorResponse(
        `No se pudo guardar el resultado. ${getErrorMessage(updateResult.error, '')}`.trim(),
        isRlsViolation(updateResult.error) ? 403 : 500
      )
    }

    return NextResponse.json({
      ok: true,
      match: {
        id: matchId,
        golesContra: opponentGoals,
        golesContraMinutos: opponentGoalMinutes,
      },
    })
  } catch (error) {
    console.error('Error en PATCH /api/partidos:', error)
    return createErrorResponse('No se pudo guardar el resultado.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const adminSupabase = createSupabaseAdmin()
    const db = adminSupabase ?? supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const body = (await request.json()) as SubmitStatsBody
    const matchId = typeof body.matchId === 'string' ? body.matchId.trim() : ''
    const requestedPlayerId = typeof body.playerId === 'string' ? body.playerId.trim() : ''
    const minutes = parseMinutes(body.minutes)
    const goals = parseCounter(body.goals)
    const assists = parseCounter(body.assists)
    const yellowCards = parseCounter(body.yellowCards)
    const redCards = parseCounter(body.redCards)

    if (!matchId) return createErrorResponse('matchId invalido.', 400)
    if (minutes === null || goals === null || assists === null || yellowCards === null || redCards === null) {
      return createErrorResponse('Estadisticas invalidas.', 400)
    }

    const matchResult = await db
      .from('partidos')
      .select('id, equipo_id, fecha_hora, estado, rival_nombre')
      .eq('id', matchId)
      .maybeSingle()

    if (matchResult.error || !matchResult.data) {
      return createErrorResponse('Partido no encontrado.', 404)
    }

    const match = matchResult.data as {
      id: string
      equipo_id: string
      fecha_hora: string
      estado: string | null
      rival_nombre: string | null
    }

    const membershipResult = await supabase
      .from('miembros_equipo')
      .select('rol')
      .eq('equipo_id', match.equipo_id)
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .maybeSingle()

    if (membershipResult.error) {
      return createErrorResponse('No se pudo validar tu equipo.', 500)
    }

    if (!membershipResult.data) {
      return createErrorResponse('No perteneces al equipo de este partido.', 403)
    }

    const viewerIsPlayer = isPlayerRole(membershipResult.data.rol)
    const viewerIsCoach = isCoachRole(membershipResult.data.rol)

    if (!viewerIsPlayer && !viewerIsCoach) {
      return createErrorResponse('No tienes permiso para editar estadisticas.', 403)
    }

    const targetPlayerId = viewerIsCoach ? requestedPlayerId : user.id
    if (!targetPlayerId) {
      return createErrorResponse('Debes seleccionar un jugador.', 400)
    }

    if (viewerIsCoach) {
      const targetMembership = await supabase
        .from('miembros_equipo')
        .select('usuario_id')
        .eq('equipo_id', match.equipo_id)
        .eq('usuario_id', targetPlayerId)
        .eq('estado', 'ACTIVO')
        .eq('rol', 'JUGADOR')
        .maybeSingle()

      if (targetMembership.error) {
        return createErrorResponse('No se pudo validar el jugador seleccionado.', 500)
      }

      if (!targetMembership.data) {
        return createErrorResponse('El jugador seleccionado no pertenece al equipo.', 404)
      }
    }

    const now = new Date()
    const isOpenForStats = canEditMatchStats(match.fecha_hora, viewerIsCoach, now)

    if (!isOpenForStats) {
      return createErrorResponse(
        viewerIsCoach
          ? 'No se pudieron habilitar las estadisticas de este partido.'
          : 'Solo puedes modificar tus estadisticas durante las 48 horas posteriores al partido.',
        400
      )
    }

    const [previousParticipantsResult, previousEventsResult] = await Promise.all([
      readParticipants(db, [matchId]),
      readEvents(db, [matchId]),
    ])
    const previousSubmission = getSubmissionFromRows(
      targetPlayerId,
      previousParticipantsResult.rows,
      previousEventsResult.rows,
      matchId
    )
    const nextSubmission = {
      minutes,
      goals,
      assists,
      yellowCards,
      redCards,
    }
    const statsChanged = !submissionsAreEqual(previousSubmission, nextSubmission)

    const participantColumn = await resolveParticipantPlayerColumn(db)
    if (!participantColumn) {
      return createErrorResponse('No se pudo resolver la estructura de participantes.', 500)
    }

    const existingParticipantResult = await db
      .from('participantes_partido')
      .select('id')
      .eq('partido_id', matchId)
      .eq(participantColumn, targetPlayerId)
      .order('id', { ascending: true })
      .limit(1)

    if (existingParticipantResult.error) {
      console.error('POST /api/partidos - existing participant query failed:', existingParticipantResult.error)
      return createErrorResponse('No se pudo validar tu participacion actual.', 500)
    }

    const existingParticipantId =
      Array.isArray(existingParticipantResult.data) && typeof existingParticipantResult.data[0]?.id === 'string'
        ? existingParticipantResult.data[0].id
        : null

    if (existingParticipantId) {
      const updateResult = await db
        .from('participantes_partido')
        .update({ minutos_jugados: minutes })
        .eq('id', existingParticipantId)

      if (updateResult.error) {
        console.error('POST /api/partidos - participant update failed:', updateResult.error)
        return createErrorResponse(
          `No se pudieron actualizar tus minutos. ${getErrorMessage(updateResult.error, '')}`.trim(),
          isRlsViolation(updateResult.error) ? 403 : 500
        )
      }
    } else {
      const insertPayload: Record<string, unknown> = {
        partido_id: matchId,
        convocado: true,
        titular: false,
        minutos_jugados: minutes,
        [participantColumn]: targetPlayerId,
      }

      const insertResult = await db.from('participantes_partido').insert(insertPayload)
      if (insertResult.error) {
        if (isUniqueViolation(insertResult.error)) {
          // If another process/user already created this participant row, update minutes instead of failing.
          const recoverUpdate = await db
            .from('participantes_partido')
            .update({ minutos_jugados: minutes })
            .eq('partido_id', matchId)
            .eq(participantColumn, targetPlayerId)

          if (!recoverUpdate.error) {
            // Participant row recovered, continue with event upsert.
          } else {
            console.error(
              'POST /api/partidos - recover update after duplicate participant failed:',
              recoverUpdate.error
            )
          }

          if (!recoverUpdate.error) {
            // Avoid returning early so goals/cards are still persisted below.
          } else {
            return createErrorResponse(
              `No se pudo registrar tu participacion. ${getErrorMessage(recoverUpdate.error, '')}`.trim(),
              isRlsViolation(recoverUpdate.error) ? 403 : 500
            )
          }
        } else {
          console.error('POST /api/partidos - participant insert failed:', insertResult.error)
          return createErrorResponse(
            `No se pudo registrar tu participacion. ${getErrorMessage(insertResult.error, '')}`.trim(),
            isRlsViolation(insertResult.error) ? 403 : 500
          )
        }
      }
    }

    const eventColumns = await resolveEventColumns(db)
    if (!eventColumns) {
      return createErrorResponse('No se pudo resolver la estructura de eventos.', 500)
    }

    const removeResult = await db
      .from('eventos_partido')
      .delete()
      .eq('partido_id', matchId)
      .eq(eventColumns.player, targetPlayerId)
      .in('tipo', PLAYER_STAT_EVENT_TYPES)

    if (removeResult.error) {
      console.error('POST /api/partidos - remove events failed:', removeResult.error)
      return createErrorResponse(
        `No se pudieron actualizar tus eventos. ${getErrorMessage(removeResult.error, '')}`.trim(),
        isRlsViolation(removeResult.error) ? 403 : 500
      )
    }

    const eventRows: Record<string, unknown>[] = []

    const pushEventRows = (type: string, count: number) => {
      for (let index = 0; index < count; index += 1) {
        const eventPayload: Record<string, unknown> = {
          partido_id: matchId,
          tipo: type,
          minuto: index + 1,
          [eventColumns.player]: targetPlayerId,
        }

        eventRows.push(eventPayload)
      }
    }

    pushEventRows(EVENT_GOAL, goals)
    pushEventRows(EVENT_ASSIST, assists)
    pushEventRows(EVENT_YELLOW, yellowCards)
    pushEventRows(EVENT_RED, redCards)

    if (eventRows.length > 0) {
      const insertEventsResult = await insertEventRowsWithFallback(db, eventRows)
      if (insertEventsResult.error) {
        console.error('POST /api/partidos - insert events failed:', insertEventsResult.error)
        return createErrorResponse(
          `No se pudieron registrar tus estadisticas de partido. ${getErrorMessage(insertEventsResult.error, '')}`.trim(),
          isRlsViolation(insertEventsResult.error) ? 403 : 500
        )
      }
    }

    await syncMatchScoreFromEvents(db, matchId)

    if (statsChanged) {
      const rivalLabel = match.rival_nombre?.trim() || 'el partido'

      if (viewerIsCoach && targetPlayerId !== user.id) {
        await notifyTeamMembers(db, match.equipo_id, {
          tipo: 'estadisticas_actualizadas',
          titulo: 'Estadisticas actualizadas',
          mensaje: `El entrenador ha actualizado tus estadisticas contra ${rivalLabel}.`,
          enlace: `/partidos?equipo=${encodeURIComponent(match.equipo_id)}&matchId=${encodeURIComponent(matchId)}`,
        })
      } else if (!viewerIsCoach) {
        const profileResult = await supabase
          .from('perfiles')
          .select('nombre')
          .eq('id', user.id)
          .maybeSingle()
        const playerName = profileResult.data?.nombre?.trim() || 'Un jugador'

        await notifyTeamMembers(db, match.equipo_id, {
          tipo: 'partido_actualizado',
          titulo: 'Estadisticas de partido actualizadas',
          mensaje: `${playerName} ha actualizado sus estadisticas contra ${rivalLabel}.`,
          enlace: `/partidos?equipo=${encodeURIComponent(match.equipo_id)}&matchId=${encodeURIComponent(matchId)}`,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      submission: {
        minutes,
        goals,
        assists,
        yellowCards,
        redCards,
        updatedAt: now.toISOString(),
      } satisfies PlayerSubmission,
    })
  } catch (error) {
    console.error('Error en POST /api/partidos:', error)
    return createErrorResponse('No se pudieron guardar tus estadisticas.', 500)
  }
}
