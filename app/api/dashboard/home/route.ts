import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type EquipoActivo = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  logo_url: string | null
  creado_por: string | null
}

type ActivityItem = {
  id: string
  type: 'partido' | 'entrenamiento'
  title: string
  subtitle: string | null
  date: string
  time: string | null
  status: string | null
  location: string | null
  opponent: string | null
  homeAway: string | null
  competition: string | null
}

type HomeSuccessResponse = {
  ok: true
  isCoach: boolean
  equipo: EquipoActivo | null
  role: string | null
  inviteCodes: {
    player: string | null
    coach: string | null
  }
  teamSummary: {
    totalMembers: number
    playerCount: number
    staffCount: number
  }
  coach: {
    nombre: string
    rol: string
  } | null
  wellbeing: {
    date: string
    mentalState: number | null
    mentalStateUpdatedAt: string | null
    fatigue: number | null
    fatigueUpdatedAt: string | null
    attendanceDate: string | null
    attendanceTrainingId: string | null
    attendanceTrainingLabel: string | null
    attendanceOptions: Array<{
      id: string
      label: string
      date: string
      time: string | null
      attending: boolean | null
      attendingCount: number
    }>
    attendingTraining: boolean | null
    attendingCount: number
  }
  coachWellbeing: {
    date: string
    mentalPct: number | null
    fatiguePct: number | null
    availabilityPct: number
    players: Array<{
      id: string
      name: string
      mentalState: number | null
      fatigue: number | null
      attendingTraining: boolean | null
    }>
  }
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
    activityItems: ActivityItem[]
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

type HomeErrorResponse = {
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
        creado_por: string | null
      }
    | null
    | {
        id: string
        nombre: string
        club: string | null
        categoria: string | null
        temporada: string | null
        logo_url: string | null
        creado_por: string | null
      }[]
}

type CoachCandidate = {
  usuario_id: string
  rol: string | null
  perfiles:
    | {
        nombre: string | null
      }
    | null
    | {
        nombre: string | null
      }[]
}

type TrainingAudienceRow = {
  entrenamiento_id: string
  usuario_id: string
}

type WellbeingRow = {
  estado_mental: number | null
  estado_mental_actualizado_en: string | null
  fatiga: number | null
  fatiga_actualizada_en: string | null
  asiste_entrenamiento: boolean | null
}

type TeamWellbeingRow = {
  usuario_id: string
  estado_mental: number | null
  fatiga: number | null
  asiste_entrenamiento: boolean | null
}

type TeamAttendanceRow = {
  entrenamiento_id: string
  usuario_id: string
  asiste: boolean
}

type MatchParticipantRow = {
  partido_id: string
  player_id: string
  minutes: number | null
}

type InviteCodeRow = {
  codigo: string | null
  rol_asignado: string | null
  usos_maximos: number | null
  usos_actuales: number | null
  caduca_en: string | null
  activo: boolean | null
  creado_en: string | null
}

const EMPTY_SUCCESS: HomeSuccessResponse = {
  ok: true,
  isCoach: false,
  equipo: null,
  role: null,
  inviteCodes: {
    player: null,
    coach: null,
  },
  teamSummary: {
    totalMembers: 0,
    playerCount: 0,
    staffCount: 0,
  },
  coach: null,
  wellbeing: {
    date: new Date().toISOString().slice(0, 10),
    mentalState: null,
    mentalStateUpdatedAt: null,
    fatigue: null,
    fatigueUpdatedAt: null,
    attendanceDate: null,
    attendanceTrainingId: null,
    attendanceTrainingLabel: null,
    attendanceOptions: [],
    attendingTraining: null,
    attendingCount: 0,
  },
  coachWellbeing: {
    date: new Date().toISOString().slice(0, 10),
    mentalPct: null,
    fatiguePct: null,
    availabilityPct: 0,
    players: [],
  },
  kpis: {
    winrate: 0,
    pointsPerGame: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    yellowCards: 0,
    position: null,
    possession: null,
  },
  playerSpotlight: {
    nombre: 'Tu perfil',
    foto_url: null,
    posicion: null,
    teamName: null,
    matchesPlayed: 0,
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    avgRating: null,
    goalsAssistsPct: null,
    passAccPct: null,
  },
  schedule: {
    monthLabel: new Date().toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    }),
    nextMatch: null,
    calendarDays: [],
    activityItems: [],
  },
  standings: [],
  scores: [],
}

const COACH_ROLE_PRIORITY = ['ENTRENADOR', 'COACH', 'TECNICO', 'ADMIN', 'CAPITAN']
const STAFF_ROLE_TOKENS = ['ENTREN', 'COACH', 'TECN', 'ADMIN', 'AUX', 'DELEG', 'STAFF']

function buildErrorResponse(
  message: string,
  status: number,
  error?: { code?: string | null; details?: string | null; hint?: string | null }
) {
  const payload: HomeErrorResponse = {
    ok: false,
    error: message,
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  }

  console.error('API /api/dashboard/home error:', message, error ?? null)
  return NextResponse.json(payload, { status })
}

function normalizeEquipo(row: MembershipRow): EquipoActivo | null {
  const rawEquipo = row.equipo
  const equipo = Array.isArray(rawEquipo) ? rawEquipo[0] : rawEquipo

  if (!equipo?.id) {
    return null
  }

  return {
    id: equipo.id,
    nombre: equipo.nombre,
    club: equipo.club,
    categoria: equipo.categoria,
    temporada: equipo.temporada,
    logo_url: equipo.logo_url,
    creado_por: (equipo as { creado_por?: string | null }).creado_por ?? null,
  }
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

function normalizeProfileName(raw: CoachCandidate['perfiles']) {
  const profile = Array.isArray(raw) ? raw[0] : raw
  if (!profile?.nombre) return null
  return String(profile.nombre)
}

function toDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function getMadridDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getMadridTimeValue(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function getNextTrainingDateKey(
  trainings: Array<{ fecha: string | null; hora_inicio: string | null }>,
  now: Date
) {
  const todayDateKey = getMadridDateKey(now)
  const currentTime = getMadridTimeValue(now)

  for (const training of trainings) {
    if (!training.fecha) continue
    if (training.fecha > todayDateKey) return training.fecha
    if (training.fecha < todayDateKey) continue
    if (!training.hora_inicio || training.hora_inicio >= currentTime) return training.fecha
  }

  return null
}

function buildCalendarDays(date: Date, eventDates: Set<string>) {
  const { start, end } = getMonthRange(date)
  const days: Array<{ date: string; hasEvent: boolean }> = []
  const cursor = new Date(start)

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    days.push({ date: key, hasEvent: eventDates.has(key) })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function getCoach(candidates: CoachCandidate[]) {
  const normalized = candidates
    .map((candidate) => ({
      nombre: normalizeProfileName(candidate.perfiles),
      rol: candidate.rol,
      normalizedRole: normalizeText(candidate.rol),
    }))
    .filter((candidate) => candidate.nombre)

  for (const role of COACH_ROLE_PRIORITY) {
    const match = normalized.find((candidate) => candidate.normalizedRole === role)
    if (match?.nombre && match.rol) {
      return {
        nombre: match.nombre,
        rol: match.rol,
      }
    }
  }

  return null
}

function isStaffRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  if (!normalized) return false
  return STAFF_ROLE_TOKENS.some((token) => normalized.includes(token))
}

function isCoachRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  if (!normalized) return false
  return normalized.includes('ENTREN') || normalized.includes('COACH') || normalized === 'ADMIN'
}

function isPlayerRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  if (!normalized) return false
  return normalized === 'JUGADOR' || normalized.includes('JUGADOR') || normalized.includes('JUG')
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

function logOptionalQueryError(context: string, error: unknown) {
  console.error(`Home optional query failed: ${context}`, error)
}

async function loadMatchParticipants(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  matchIds: string[]
): Promise<MatchParticipantRow[]> {
  if (matchIds.length === 0) return []

  const byJugadorId = await supabase
    .from('participantes_partido')
    .select('partido_id, jugador_id, minutos_jugados')
    .in('partido_id', matchIds)

  if (!byJugadorId.error) {
    return (byJugadorId.data ?? [])
      .map((row) => ({
        partido_id: typeof row.partido_id === 'string' ? row.partido_id : '',
        player_id: typeof row.jugador_id === 'string' ? row.jugador_id : '',
        minutes:
          typeof row.minutos_jugados === 'number' || typeof row.minutos_jugados === 'string'
            ? toNumber(row.minutos_jugados)
            : null,
      }))
      .filter((row) => row.partido_id && row.player_id)
  }

  const byUsuarioId = await supabase
    .from('participantes_partido')
    .select('partido_id, usuario_id, minutos_jugados')
    .in('partido_id', matchIds)

  if (!byUsuarioId.error) {
    return (byUsuarioId.data ?? [])
      .map((row) => ({
        partido_id: typeof row.partido_id === 'string' ? row.partido_id : '',
        player_id: typeof row.usuario_id === 'string' ? row.usuario_id : '',
        minutes:
          typeof row.minutos_jugados === 'number' || typeof row.minutos_jugados === 'string'
            ? toNumber(row.minutos_jugados)
            : null,
      }))
      .filter((row) => row.partido_id && row.player_id)
  }

  logOptionalQueryError('participantes_partido', {
    jugador_id: byJugadorId.error,
    usuario_id: byUsuarioId.error,
  })
  return []
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
      .select('rol, fecha_alta, equipo:equipos(id, nombre, club, categoria, temporada, logo_url, creado_por)')
      .eq('usuario_id', user.id)
      .order('fecha_alta', { ascending: false })

    if (membershipError) {
      return buildErrorResponse(
        'No se pudieron obtener los equipos del usuario.',
        500,
        membershipError
      )
    }

    const equipos = (memberships ?? [])
      .map((row) => normalizeEquipo(row as MembershipRow))
      .filter((equipo): equipo is EquipoActivo => equipo !== null)

    if (equipos.length === 0) {
      return NextResponse.json(EMPTY_SUCCESS)
    }

    const activeTeam = requestedTeamId
      ? equipos.find((team) => team.id === requestedTeamId)
      : equipos[0]

    if (requestedTeamId && !activeTeam) {
      return buildErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    const activeMembership = (memberships ?? []).find((row) => {
      const equipo = normalizeEquipo(row as MembershipRow)
      return equipo?.id === activeTeam?.id
    }) as MembershipRow | undefined

    const role = activeMembership?.rol ? String(activeMembership.rol) : null
    const viewerIsCoach = isCoachRole(role) || activeTeam?.creado_por === user.id
    const now = new Date()
    const todayDateKey = getMadridDateKey(now)
    const { start, end } = getMonthRange(now)
    const calendarWindowStart = addMonths(now, -1)
    const calendarWindowEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999)

    const [
      clasificacionResult,
      finalizadosResult,
      statMatchesResult,
      nextMatchesResult,
      calendarMatchesResult,
      teamMembersResult,
      profileResult,
      calendarTrainingsResult,
      wellbeingResult,
      teamWellbeingResult,
      inviteCodesResult,
    ] = await Promise.all([
      supabase
        .from('clasificacion_liga')
        .select(
          'posicion, puntos, partidos_jugados, victorias, empates, derrotas, goles_favor, goles_contra'
        )
        .eq('equipo_id', activeTeam!.id)
        .maybeSingle(),
      supabase
        .from('partidos')
        .select('id, fecha_hora, goles_favor, goles_contra, rival_nombre')
        .eq('equipo_id', activeTeam!.id)
        .eq('estado', 'FINALIZADO')
        .order('fecha_hora', { ascending: false }),
      supabase
        .from('partidos')
        .select('id, fecha_hora')
        .eq('equipo_id', activeTeam!.id)
        .lte('fecha_hora', now.toISOString())
        .order('fecha_hora', { ascending: false }),
      supabase
        .from('partidos')
        .select('id, fecha_hora, rival_nombre, casa_fuera, lugar, estado')
        .eq('equipo_id', activeTeam!.id)
        .gte('fecha_hora', now.toISOString())
        .neq('estado', 'FINALIZADO')
        .order('fecha_hora', { ascending: true })
        .limit(4),
      supabase
        .from('partidos')
        .select('id, fecha_hora, rival_nombre, casa_fuera, lugar, estado, competicion')
        .eq('equipo_id', activeTeam!.id)
        .gte('fecha_hora', calendarWindowStart.toISOString())
        .lte('fecha_hora', calendarWindowEnd.toISOString())
        .order('fecha_hora', { ascending: true }),
      supabase
        .from('miembros_equipo')
        .select('usuario_id, rol, perfiles(nombre)')
        .eq('equipo_id', activeTeam!.id)
        .eq('estado', 'ACTIVO'),
      supabase
        .from('perfiles')
        .select('nombre, foto_url, posicion')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('entrenamientos_equipo')
        .select('id, fecha, hora_inicio, titulo, tipo, estado, lugar')
        .eq('equipo_id', activeTeam!.id)
        .gte('fecha', calendarWindowStart.toISOString().slice(0, 10))
        .lte('fecha', calendarWindowEnd.toISOString().slice(0, 10))
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true }),
      supabase
        .from('home_bienestar_diario')
        .select('estado_mental, estado_mental_actualizado_en, fatiga, fatiga_actualizada_en, asiste_entrenamiento')
        .eq('equipo_id', activeTeam!.id)
        .eq('usuario_id', user.id)
        .eq('fecha', todayDateKey)
        .maybeSingle(),
      supabase
        .from('home_bienestar_diario')
        .select('usuario_id, estado_mental, fatiga, asiste_entrenamiento')
        .eq('equipo_id', activeTeam!.id)
        .eq('fecha', todayDateKey),
      supabase
        .from('codigos_invitacion_equipo')
        .select('codigo, rol_asignado, usos_maximos, usos_actuales, caduca_en, activo, creado_en')
        .eq('equipo_id', activeTeam!.id)
        .eq('activo', true)
        .order('creado_en', { ascending: false }),
    ])

    const clasificacionRow = clasificacionResult.error ? null : clasificacionResult.data
    if (clasificacionResult.error) {
      logOptionalQueryError('clasificacion_liga', clasificacionResult.error)
    }

    const finalizados = finalizadosResult.error ? [] : finalizadosResult.data ?? []
    if (finalizadosResult.error) {
      logOptionalQueryError('partidos finalizados', finalizadosResult.error)
    }

    const statMatches = statMatchesResult.error ? [] : statMatchesResult.data ?? []
    if (statMatchesResult.error) {
      logOptionalQueryError('partidos disputados para estadisticas de jugador', statMatchesResult.error)
    }

    const nextMatches = nextMatchesResult.error ? [] : nextMatchesResult.data ?? []
    if (nextMatchesResult.error) {
      logOptionalQueryError('proximos partidos', nextMatchesResult.error)
    }

    const calendarMatches = calendarMatchesResult.error ? [] : calendarMatchesResult.data ?? []
    if (calendarMatchesResult.error) {
      logOptionalQueryError('partidos calendario', calendarMatchesResult.error)
    }

    const teamMembers = teamMembersResult.error
      ? []
      : ((teamMembersResult.data ?? []) as CoachCandidate[])
    if (teamMembersResult.error) {
      logOptionalQueryError('miembros_equipo coach', teamMembersResult.error)
    }

    const profile = profileResult.error ? null : profileResult.data
    if (profileResult.error) {
      logOptionalQueryError('perfil usuario', profileResult.error)
    }

    const calendarTrainingsRaw = calendarTrainingsResult.error ? [] : calendarTrainingsResult.data ?? []
    if (calendarTrainingsResult.error) {
      logOptionalQueryError('entrenamientos calendario', calendarTrainingsResult.error)
    }

    const calendarTrainingsIds = calendarTrainingsRaw.map((item) => item.id)
    const trainingAudienceResult = calendarTrainingsIds.length > 0
      ? await supabase
          .from('entrenamiento_destinatarios')
          .select('entrenamiento_id, usuario_id')
          .in('entrenamiento_id', calendarTrainingsIds)
      : { data: [], error: null }

    const trainingAudienceRows = trainingAudienceResult.error
      ? []
      : ((trainingAudienceResult.data ?? []) as TrainingAudienceRow[])
    if (trainingAudienceResult.error) {
      logOptionalQueryError('destinatarios de entrenamientos', trainingAudienceResult.error)
    }

    const audienceByTraining = new Map<string, string[]>()
    for (const row of trainingAudienceRows) {
      const bucket = audienceByTraining.get(row.entrenamiento_id) ?? []
      bucket.push(row.usuario_id)
      audienceByTraining.set(row.entrenamiento_id, bucket)
    }

    const calendarTrainings = viewerIsCoach
      ? calendarTrainingsRaw
      : calendarTrainingsRaw.filter((training) => {
          const audience = audienceByTraining.get(training.id) ?? []
          if (audience.length === 0) return true
          return audience.includes(user.id)
        })

    const wellbeing = wellbeingResult.error
      ? null
      : (wellbeingResult.data as WellbeingRow | null)
    if (wellbeingResult.error) {
      logOptionalQueryError('home_bienestar_diario usuario', wellbeingResult.error)
    }

    const teamWellbeingRows = teamWellbeingResult.error
      ? []
      : ((teamWellbeingResult.data ?? []) as TeamWellbeingRow[])
    if (teamWellbeingResult.error) {
      logOptionalQueryError('home_bienestar_diario equipo del dia', teamWellbeingResult.error)
    }

    const inviteCodeRows = inviteCodesResult.error
      ? []
      : ((inviteCodesResult.data ?? []) as InviteCodeRow[])
    if (inviteCodesResult.error) {
      logOptionalQueryError('codigos_invitacion_equipo', inviteCodesResult.error)
    }

    let coachInviteCode: string | null = null
    let playerInviteCode: string | null = null

    for (const row of inviteCodeRows) {
      const code = typeof row.codigo === 'string' ? row.codigo.trim() : ''
      if (!code) continue

      const expiresAt = row.caduca_en ? new Date(row.caduca_en) : null
      if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) continue

      const maxUses = toNumber(row.usos_maximos)
      const currentUses = toNumber(row.usos_actuales)
      if (maxUses > 0 && currentUses >= maxUses) continue

      const assignedRole = normalizeText(row.rol_asignado)
      if (!coachInviteCode && assignedRole.includes('ENTREN')) {
        coachInviteCode = code
        continue
      }
      if (!playerInviteCode && assignedRole.includes('JUG')) {
        playerInviteCode = code
      }
    }

    const nextTrainingDateKey = getNextTrainingDateKey(
      calendarTrainings.map((training) => ({
        fecha: training.fecha ?? null,
        hora_inicio: training.hora_inicio ?? null,
      })),
      now
    )
    const nextVisibleTraining =
      calendarTrainings.find((training) => {
        if (!training.fecha || training.fecha !== nextTrainingDateKey) return false
        if (training.fecha > todayDateKey) return true
        return !training.hora_inicio || training.hora_inicio >= getMadridTimeValue(now)
      }) ?? null

    const visibleTrainingIds = calendarTrainings.map((training) => training.id)
    const attendanceRowsResult = visibleTrainingIds.length > 0
      ? await supabase
          .from('entrenamiento_asistencias')
          .select('entrenamiento_id, usuario_id, asiste')
          .eq('equipo_id', activeTeam!.id)
          .in('entrenamiento_id', visibleTrainingIds)
      : { data: [], error: null }

    const teamAttendanceRows = attendanceRowsResult.error
      ? []
      : ((attendanceRowsResult.data ?? []) as TeamAttendanceRow[])
    if (attendanceRowsResult.error) {
      logOptionalQueryError('entrenamiento_asistencias visibles', attendanceRowsResult.error)
    }

    const finalizadosChronological = [...finalizados].reverse()
    const playerStatMatchIds = statMatches.map((match) => match.id)

    let events:
      | Array<{
          tipo: string | null
          jugador_id: string | null
          jugador_relacionado_id: string | null
        }>
      | [] = []

    if (playerStatMatchIds.length > 0) {
      const eventsResult = await supabase
        .from('eventos_partido')
        .select('tipo, jugador_id, jugador_relacionado_id')
        .in('partido_id', playerStatMatchIds)

      if (eventsResult.error) {
        logOptionalQueryError('eventos_partido', eventsResult.error)
      } else {
        events = eventsResult.data ?? []
      }
    }

    const playerParticipations = (await loadMatchParticipants(supabase, playerStatMatchIds)).filter(
      (row) => row.player_id === user.id
    )
    const playerMatchIds = new Set(playerParticipations.map((row) => row.partido_id))
    const playerMinutesPlayed = playerParticipations.reduce((total, row) => {
      return total + Math.max(row.minutes ?? 0, 0)
    }, 0)

    let wins = 0
    let draws = 0
    let goalsForFromMatches = 0
    let goalsAgainstFromMatches = 0

    for (const match of finalizadosChronological) {
      const gf = toNumber(match.goles_favor)
      const ga = toNumber(match.goles_contra)

      goalsForFromMatches += gf
      goalsAgainstFromMatches += ga

      if (gf > ga) wins += 1
      else if (gf === ga) draws += 1
    }

    const matchesFinalizados = finalizadosChronological.length
    const puntos = toNumber(clasificacionRow?.puntos) || wins * 3 + draws
    const partidosJugados = toNumber(clasificacionRow?.partidos_jugados) || matchesFinalizados
    const goalsFor = toNumber(clasificacionRow?.goles_favor) || goalsForFromMatches
    const goalsAgainst = toNumber(clasificacionRow?.goles_contra) || goalsAgainstFromMatches

    let yellowCards = 0
    let playerGoals = 0
    let playerAssists = 0

    for (const event of events) {
      if (isYellowCardEvent(event.tipo)) {
        yellowCards += 1
      }

      if (isGoalEvent(event.tipo) && event.jugador_id === user.id) {
        playerGoals += 1
      }

      const assistPlayerId = event.jugador_relacionado_id ?? event.jugador_id
      if (isAssistEvent(event.tipo) && assistPlayerId === user.id) {
        playerAssists += 1
      }
    }

    const coach = getCoach(teamMembers)
    const staffCount = teamMembers.reduce((count, member) => {
      return isStaffRole(member.rol) ? count + 1 : count
    }, 0)
    const totalMembers = teamMembers.length
    const playerCount = Math.max(totalMembers - staffCount, 0)
    const wellbeingByUser = new Map(teamWellbeingRows.map((item) => [item.usuario_id, item]))
    const teamMemberNames = new Map(
      teamMembers.map((member, index) => [
        member.usuario_id,
        normalizeProfileName(member.perfiles) ?? `Jugador ${index + 1}`,
      ])
    )
    const attendanceByTraining = new Map<string, TeamAttendanceRow[]>()
    for (const row of teamAttendanceRows) {
      const bucket = attendanceByTraining.get(row.entrenamiento_id) ?? []
      bucket.push(row)
      attendanceByTraining.set(row.entrenamiento_id, bucket)
    }

    const coachPlayers = teamMembers
      .filter((member) => isPlayerRole(member.rol))
      .map((member, index) => {
        const row = wellbeingByUser.get(member.usuario_id)
        const attendanceRow = nextVisibleTraining
          ? (attendanceByTraining.get(nextVisibleTraining.id) ?? []).find(
              (item) => item.usuario_id === member.usuario_id
            )
          : null
        const playerName = normalizeProfileName(member.perfiles) ?? `Jugador ${index + 1}`

        return {
          id: member.usuario_id,
          name: playerName,
          mentalState: row?.estado_mental ?? null,
          fatigue: row?.fatiga ?? null,
          attendingTraining: attendanceRow?.asiste ?? null,
        }
      })

    const validMentalScores = coachPlayers
      .map((player) => player.mentalState)
      .filter((value): value is number => typeof value === 'number')
    const validFatigueScores = coachPlayers
      .map((player) => player.fatigue)
      .filter((value): value is number => typeof value === 'number')
    const selectedAttendanceTraining = nextVisibleTraining
    const selectedAttendanceRows = selectedAttendanceTraining
      ? attendanceByTraining.get(selectedAttendanceTraining.id) ?? []
      : []
    const playersAttending = selectedAttendanceRows.filter((row) => row.asiste).length

    const mentalPct =
      validMentalScores.length > 0
        ? Math.round((validMentalScores.reduce((sum, value) => sum + value, 0) / validMentalScores.length) * 10)
        : null
    const fatiguePct =
      validFatigueScores.length > 0
        ? Math.round((validFatigueScores.reduce((sum, value) => sum + value, 0) / validFatigueScores.length) * 10)
        : null
    const availabilityPct =
      coachPlayers.length > 0 ? Math.round((playersAttending / coachPlayers.length) * 100) : 0

    const playerSpotlight = {
      nombre:
        profile?.nombre ??
        (typeof user.user_metadata?.nombre === 'string' ? user.user_metadata.nombre : null) ??
        user.email?.split('@')[0] ??
        'Tu perfil',
      foto_url: profile?.foto_url ?? null,
      posicion: profile?.posicion ?? null,
      teamName: activeTeam!.nombre,
      matchesPlayed: playerMatchIds.size,
      minutesPlayed: playerMinutesPlayed,
      goals: playerGoals,
      assists: playerAssists,
      avgRating: null,
      goalsAssistsPct: null,
      passAccPct: null,
    }

    const kpis = {
      winrate: matchesFinalizados > 0 ? Math.round((wins / matchesFinalizados) * 100) : 0,
      pointsPerGame: partidosJugados > 0 ? Number((puntos / partidosJugados).toFixed(2)) : 0,
      goalsFor,
      goalsAgainst,
      yellowCards,
      position: clasificacionRow?.posicion ? Number(clasificacionRow.posicion) : null,
      possession: null,
    }

    const eventDates = new Set<string>()
    for (const item of calendarMatches) {
      if (item.fecha_hora) {
        const key = toDateKey(item.fecha_hora)
        if (key >= start.toISOString().slice(0, 10) && key <= end.toISOString().slice(0, 10)) {
          eventDates.add(key)
        }
      }
    }
    for (const item of calendarTrainings) {
      if (item.fecha) {
        if (item.fecha >= start.toISOString().slice(0, 10) && item.fecha <= end.toISOString().slice(0, 10)) {
          eventDates.add(item.fecha)
        }
      }
    }

    const activityItems: ActivityItem[] = [
      ...calendarMatches.map((item) => ({
        id: `match-${item.id}`,
        type: 'partido' as const,
        title: item.rival_nombre ? `Partido vs ${item.rival_nombre}` : 'Partido por confirmar',
        subtitle: item.lugar ?? (item.casa_fuera ? `Modalidad ${item.casa_fuera}` : null),
        date: toDateKey(item.fecha_hora),
        time: item.fecha_hora,
        status: item.estado ?? null,
        location: item.lugar ?? null,
        opponent: item.rival_nombre ?? null,
        homeAway: item.casa_fuera ?? null,
        competition: item.competicion ?? null,
      })),
      ...calendarTrainings.map((item) => {
        const attendees = (attendanceByTraining.get(item.id) ?? [])
          .filter((row) => row.asiste)
          .map((row) => ({
            id: row.usuario_id,
            name: teamMemberNames.get(row.usuario_id) ?? 'Jugador',
            attending: row.asiste,
          }))
          .sort((left, right) => left.name.localeCompare(right.name, 'es-ES'))

        return {
          id: `training-${item.id}`,
          type: 'entrenamiento' as const,
          title: item.titulo || 'Entrenamiento',
          subtitle: item.tipo ?? null,
          date: item.fecha,
          time: item.hora_inicio ? `${item.fecha}T${item.hora_inicio}` : null,
          status: item.estado ?? null,
          location: item.lugar ?? null,
          opponent: null,
          homeAway: null,
          competition: null,
          attendees,
        }
      }),
    ]
      .sort((a, b) => {
        const dateA = a.time ?? a.date
        const dateB = b.time ?? b.date
        return dateA.localeCompare(dateB)
      })

    let standings: HomeSuccessResponse['standings'] = []
    if (activeTeam!.temporada) {
      const standingsResult = await supabase
        .from('clasificacion_liga')
        .select(
          'posicion, puntos, partidos_jugados, victorias, empates, derrotas, goles_favor, goles_contra, equipos(nombre, temporada)'
        )
        .eq('equipos.temporada', activeTeam!.temporada)
        .order('posicion', { ascending: true })
        .limit(10)

      if (standingsResult.error) {
        logOptionalQueryError('clasificacion completa', standingsResult.error)
      } else {
        standings = (standingsResult.data ?? []).map((row) => {
          const equipoRow = Array.isArray(row.equipos) ? row.equipos[0] : row.equipos
          return {
            posicion: Number(row.posicion ?? 0),
            nombre: String(equipoRow?.nombre ?? 'Equipo'),
            puntos: Number(row.puntos ?? 0),
            pj: Number(row.partidos_jugados ?? 0),
            v: Number(row.victorias ?? 0),
            e: Number(row.empates ?? 0),
            d: Number(row.derrotas ?? 0),
            gf: Number(row.goles_favor ?? 0),
            gc: Number(row.goles_contra ?? 0),
          }
        })
      }
    }

    const scores: HomeSuccessResponse['scores'] = finalizados
      .slice(0, 5)
      .map((row) => ({
        equipo_nombre: activeTeam!.nombre,
        rival_nombre: row.rival_nombre ?? null,
        goles_favor: Number(row.goles_favor ?? 0),
        goles_contra: Number(row.goles_contra ?? 0),
        fecha_hora: row.fecha_hora,
      }))

    const attendanceOptions = calendarTrainings
      .filter((training) => {
        if (!training.fecha) return false
        if (training.fecha > todayDateKey) return true
        if (training.fecha < todayDateKey) return false
        return !training.hora_inicio || training.hora_inicio >= getMadridTimeValue(now)
      })
      .map((training) => {
        const rows = attendanceByTraining.get(training.id) ?? []
        const userAttendance = rows.find((row) => row.usuario_id === user.id)
        const timeLabel = training.hora_inicio ? training.hora_inicio.slice(0, 5) : null

        return {
          id: training.id,
          label: `${training.titulo || 'Entrenamiento'}${timeLabel ? ` · ${timeLabel}` : ''}`,
          date: training.fecha,
          time: training.hora_inicio ? `${training.fecha}T${training.hora_inicio}` : null,
          attending: userAttendance?.asiste ?? null,
          attendingCount: rows.filter((row) => row.asiste).length,
        }
      })

    const selectedAttendanceOption =
      (selectedAttendanceTraining
        ? attendanceOptions.find((option) => option.id === selectedAttendanceTraining.id)
        : null) ?? attendanceOptions[0] ?? null

    const response: HomeSuccessResponse = {
      ok: true,
      isCoach: viewerIsCoach,
      equipo: activeTeam ?? null,
      role,
      inviteCodes: {
        player: playerInviteCode,
        coach: viewerIsCoach ? coachInviteCode : null,
      },
      teamSummary: {
        totalMembers,
        playerCount,
        staffCount,
      },
      coach,
      wellbeing: {
        date: todayDateKey,
        mentalState: wellbeing?.estado_mental ?? null,
        mentalStateUpdatedAt: wellbeing?.estado_mental_actualizado_en ?? null,
        fatigue: wellbeing?.fatiga ?? null,
        fatigueUpdatedAt: wellbeing?.fatiga_actualizada_en ?? null,
        attendanceDate: selectedAttendanceOption?.date ?? null,
        attendanceTrainingId: selectedAttendanceOption?.id ?? null,
        attendanceTrainingLabel: selectedAttendanceOption?.label ?? null,
        attendanceOptions,
        attendingTraining: selectedAttendanceOption?.attending ?? null,
        attendingCount: playersAttending,
      },
      coachWellbeing: {
        date: todayDateKey,
        mentalPct,
        fatiguePct,
        availabilityPct,
        players: coachPlayers,
      },
      kpis,
      playerSpotlight,
      schedule: {
        monthLabel: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        nextMatch: nextMatches[0]
          ? {
              fecha_hora: nextMatches[0].fecha_hora,
              rival_nombre: nextMatches[0].rival_nombre ?? null,
              casa_fuera: nextMatches[0].casa_fuera ?? null,
              lugar: nextMatches[0].lugar ?? null,
            }
          : null,
        calendarDays: buildCalendarDays(now, eventDates),
        activityItems,
      },
      standings,
      scores,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error en GET /api/dashboard/home:', error)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
