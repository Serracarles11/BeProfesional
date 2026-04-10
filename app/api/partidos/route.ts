import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const STAFF_ROLE_TOKENS = ['ENTREN', 'COACH', 'TECN', 'ADMIN', 'AUX', 'DELEG', 'STAFF']

const EVENT_GOAL = 'GOL'
const EVENT_ASSIST = 'ASISTENCIA'
const EVENT_YELLOW = 'TARJETA_AMARILLA'
const EVENT_RED = 'TARJETA_ROJA'
const PLAYER_STAT_EVENT_TYPES = [EVENT_GOAL, EVENT_ASSIST, EVENT_YELLOW, EVENT_RED]

type MembershipRow = {
  equipo_id: string
  rol: string | null
  fecha_alta: string | null
}

type TeamRow = {
  id: string
  nombre: string | null
}

type TeamMemberRow = {
  usuario_id: string
  rol: string | null
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
  minutes?: unknown
  goals?: unknown
  assists?: unknown
  yellowCards?: unknown
  redCards?: unknown
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
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

  return [...matches]
    .sort((left, right) => {
      const leftTime = new Date(left.fecha_hora).getTime()
      const rightTime = new Date(right.fecha_hora).getTime()
      const leftDistance = Math.abs(leftTime - now.getTime())
      const rightDistance = Math.abs(rightTime - now.getTime())
      return leftDistance - rightDistance
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

async function resolveParticipantPlayerColumn(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>
): Promise<ParticipantPlayerColumn | null> {
  const byUsuarioId = await supabase.from('participantes_partido').select('usuario_id').limit(1)
  if (!byUsuarioId.error) return 'usuario_id'

  const byJugadorId = await supabase.from('participantes_partido').select('jugador_id').limit(1)
  if (!byJugadorId.error) return 'jugador_id'

  return null
}

async function resolveEventColumns(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>
): Promise<{ player: EventPlayerColumn; related: EventRelatedColumn | null } | null> {
  const playerUsuario = await supabase.from('eventos_partido').select('usuario_id').limit(1)
  if (!playerUsuario.error) {
    const relatedUsuario = await supabase
      .from('eventos_partido')
      .select('usuario_relacionado_id')
      .limit(1)
    return { player: 'usuario_id', related: relatedUsuario.error ? null : 'usuario_relacionado_id' }
  }

  const playerJugador = await supabase.from('eventos_partido').select('jugador_id').limit(1)
  if (!playerJugador.error) {
    const relatedJugador = await supabase
      .from('eventos_partido')
      .select('jugador_relacionado_id')
      .limit(1)
    return { player: 'jugador_id', related: relatedJugador.error ? null : 'jugador_relacionado_id' }
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

function mapMatchForClient(match: MatchRow) {
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
        : null,
    golesContra:
      typeof match.goles_contra === 'number' || typeof match.goles_contra === 'string'
        ? toNumber(match.goles_contra)
        : null,
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const requestedTeamId = request.nextUrl.searchParams.get('equipo')?.trim() ?? null

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
        featuredMatch: null,
        featuredMeta: {
          totalPlayers: 0,
          submittedPlayers: 0,
          progressPct: 0,
          canSubmit: false,
          isOpenForStats: false,
          mySubmission: null,
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
      supabase.from('equipos').select('id, nombre').eq('id', equipoId).maybeSingle(),
      supabase
        .from('miembros_equipo')
        .select('usuario_id, rol')
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

    const now = new Date()
    const { start: weekStart, end: weekEnd } = getWeekRange(now)

    const [weekMatchesResult, nextMatchResult, historyMatchesResult] = await Promise.all([
      supabase
        .from('partidos')
        .select(
          'id, equipo_id, fecha_hora, rival_nombre, casa_fuera, lugar, competicion, estado, goles_favor, goles_contra'
        )
        .eq('equipo_id', equipoId)
        .gte('fecha_hora', weekStart.toISOString())
        .lte('fecha_hora', weekEnd.toISOString())
        .order('fecha_hora', { ascending: true }),
      supabase
        .from('partidos')
        .select(
          'id, equipo_id, fecha_hora, rival_nombre, casa_fuera, lugar, competicion, estado, goles_favor, goles_contra'
        )
        .eq('equipo_id', equipoId)
        .gte('fecha_hora', now.toISOString())
        .order('fecha_hora', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('partidos')
        .select(
          'id, equipo_id, fecha_hora, rival_nombre, casa_fuera, lugar, competicion, estado, goles_favor, goles_contra'
        )
        .eq('equipo_id', equipoId)
        .eq('estado', 'FINALIZADO')
        .order('fecha_hora', { ascending: false })
        .limit(8),
    ])

    if (weekMatchesResult.error || historyMatchesResult.error) {
      return createErrorResponse('No se pudieron cargar los partidos.', 500)
    }

    const weekMatches = (weekMatchesResult.data ?? []) as MatchRow[]
    const historyMatches = (historyMatchesResult.data ?? []) as MatchRow[]
    const nextMatch = nextMatchResult.error || !nextMatchResult.data
      ? null
      : (nextMatchResult.data as MatchRow)

    const featuredMatch = pickWeekFeatured(weekMatches, now) ?? nextMatch ?? historyMatches[0] ?? null
    const history = historyMatches.filter((match) => match.id !== featuredMatch?.id)

    const featuredMatchIds = featuredMatch ? [featuredMatch.id] : []
    const [participantsResult, eventsResult] = await Promise.all([
      readParticipants(supabase, featuredMatchIds),
      readEvents(supabase, featuredMatchIds),
    ])

    const participants = participantsResult.rows
    const events = eventsResult.rows

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
      (normalizeText(featuredMatch.estado) === 'FINALIZADO' ||
        new Date(featuredMatch.fecha_hora).getTime() <= now.getTime())

    const mySubmission = featuredMatch
      ? getSubmissionFromRows(user.id, participants, events, featuredMatch.id)
      : null

    return NextResponse.json({
      ok: true,
      equipoId,
      teamName,
      role,
      isCoach: viewerIsCoach,
      featuredMatch: featuredMatch ? mapMatchForClient(featuredMatch) : null,
      featuredMeta: {
        totalPlayers,
        submittedPlayers,
        progressPct,
        canSubmit: viewerIsPlayer,
        isOpenForStats: featuredIsOpen,
        mySubmission,
      },
      history: history.map(mapMatchForClient),
    })
  } catch (error) {
    console.error('Error en GET /api/partidos:', error)
    return createErrorResponse('No se pudo cargar la seccion de partidos.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const body = (await request.json()) as SubmitStatsBody
    const matchId = typeof body.matchId === 'string' ? body.matchId.trim() : ''
    const minutes = parseMinutes(body.minutes)
    const goals = parseCounter(body.goals)
    const assists = parseCounter(body.assists)
    const yellowCards = parseCounter(body.yellowCards)
    const redCards = parseCounter(body.redCards)

    if (!matchId) return createErrorResponse('matchId invalido.', 400)
    if (minutes === null || goals === null || assists === null || yellowCards === null || redCards === null) {
      return createErrorResponse('Estadisticas invalidas.', 400)
    }

    const matchResult = await supabase
      .from('partidos')
      .select('id, equipo_id, fecha_hora, estado')
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

    if (!isPlayerRole(membershipResult.data.rol)) {
      return createErrorResponse('Solo los jugadores pueden registrar estadisticas.', 403)
    }

    const now = new Date()
    const isOpenForStats =
      normalizeText(match.estado) === 'FINALIZADO' ||
      new Date(match.fecha_hora).getTime() <= now.getTime()

    if (!isOpenForStats) {
      return createErrorResponse('Solo puedes registrar estadisticas despues del partido.', 400)
    }

    const participantColumn = await resolveParticipantPlayerColumn(supabase)
    if (!participantColumn) {
      return createErrorResponse('No se pudo resolver la estructura de participantes.', 500)
    }

    const existingParticipantResult = await supabase
      .from('participantes_partido')
      .select(`id, ${participantColumn}`)
      .eq('partido_id', matchId)
      .eq(participantColumn, user.id)
      .maybeSingle()

    if (existingParticipantResult.error) {
      return createErrorResponse('No se pudo validar tu participacion actual.', 500)
    }

    if (existingParticipantResult.data?.id) {
      const updateResult = await supabase
        .from('participantes_partido')
        .update({ minutos_jugados: minutes })
        .eq('id', existingParticipantResult.data.id)

      if (updateResult.error) {
        return createErrorResponse('No se pudieron actualizar tus minutos.', 500)
      }
    } else {
      const insertPayload: Record<string, unknown> = {
        partido_id: matchId,
        minutos_jugados: minutes,
        [participantColumn]: user.id,
      }

      const insertResult = await supabase.from('participantes_partido').insert(insertPayload)
      if (insertResult.error) {
        return createErrorResponse('No se pudo registrar tu participacion.', 500)
      }
    }

    const eventColumns = await resolveEventColumns(supabase)
    if (!eventColumns) {
      return createErrorResponse('No se pudo resolver la estructura de eventos.', 500)
    }

    const removeResult = await supabase
      .from('eventos_partido')
      .delete()
      .eq('partido_id', matchId)
      .eq(eventColumns.player, user.id)
      .in('tipo', PLAYER_STAT_EVENT_TYPES)

    if (removeResult.error) {
      return createErrorResponse('No se pudieron actualizar tus eventos.', 500)
    }

    const eventRows: Record<string, unknown>[] = []

    const pushEventRows = (type: string, count: number) => {
      for (let index = 0; index < count; index += 1) {
        const eventPayload: Record<string, unknown> = {
          partido_id: matchId,
          tipo: type,
          minuto: index + 1,
          [eventColumns.player]: user.id,
        }

        if (type === EVENT_ASSIST && eventColumns.related) {
          eventPayload[eventColumns.related] = user.id
        }

        eventRows.push(eventPayload)
      }
    }

    pushEventRows(EVENT_GOAL, goals)
    pushEventRows(EVENT_ASSIST, assists)
    pushEventRows(EVENT_YELLOW, yellowCards)
    pushEventRows(EVENT_RED, redCards)

    if (eventRows.length > 0) {
      const insertEventsResult = await supabase.from('eventos_partido').insert(eventRows)
      if (insertEventsResult.error) {
        return createErrorResponse('No se pudieron registrar tus estadisticas de partido.', 500)
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
