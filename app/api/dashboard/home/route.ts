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
}

type HomeSuccessResponse = {
  ok: true
  isCoach: boolean
  equipo: EquipoActivo | null
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
  wellbeing: {
    date: string
    mentalState: number | null
    fatigue: number | null
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

type WellbeingRow = {
  estado_mental: number | null
  fatiga: number | null
  asiste_entrenamiento: boolean | null
}

type TeamWellbeingRow = {
  usuario_id: string
  estado_mental: number | null
  fatiga: number | null
  asiste_entrenamiento: boolean | null
}

const EMPTY_SUCCESS: HomeSuccessResponse = {
  ok: true,
  isCoach: false,
  equipo: null,
  role: null,
  teamSummary: {
    totalMembers: 0,
    playerCount: 0,
    staffCount: 0,
  },
  coach: null,
  wellbeing: {
    date: new Date().toISOString().slice(0, 10),
    mentalState: null,
    fatigue: null,
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

function getMadridDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
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
    const futureLimit = new Date(now)
    futureLimit.setDate(futureLimit.getDate() + 30)

    const [
      clasificacionResult,
      finalizadosResult,
      nextMatchesResult,
      monthMatchesResult,
      teamMembersResult,
      profileResult,
      upcomingTrainingsResult,
      monthTrainingsResult,
      wellbeingResult,
      teamWellbeingResult,
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
        .select('id, fecha_hora, rival_nombre, casa_fuera, lugar, estado')
        .eq('equipo_id', activeTeam!.id)
        .gte('fecha_hora', now.toISOString())
        .neq('estado', 'FINALIZADO')
        .order('fecha_hora', { ascending: true })
        .limit(4),
      supabase
        .from('partidos')
        .select('fecha_hora')
        .eq('equipo_id', activeTeam!.id)
        .gte('fecha_hora', start.toISOString())
        .lte('fecha_hora', end.toISOString()),
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
        .select('id, fecha, hora_inicio, titulo, tipo, estado')
        .eq('equipo_id', activeTeam!.id)
        .gte('fecha', now.toISOString().slice(0, 10))
        .lte('fecha', futureLimit.toISOString().slice(0, 10))
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
        .limit(4),
      supabase
        .from('entrenamientos_equipo')
        .select('fecha')
        .eq('equipo_id', activeTeam!.id)
        .gte('fecha', start.toISOString().slice(0, 10))
        .lte('fecha', end.toISOString().slice(0, 10)),
      supabase
        .from('home_bienestar_diario')
        .select('estado_mental, fatiga, asiste_entrenamiento')
        .eq('equipo_id', activeTeam!.id)
        .eq('usuario_id', user.id)
        .eq('fecha', todayDateKey)
        .maybeSingle(),
      supabase
        .from('home_bienestar_diario')
        .select('usuario_id, estado_mental, fatiga, asiste_entrenamiento')
        .eq('equipo_id', activeTeam!.id)
        .eq('fecha', todayDateKey),
    ])

    const clasificacionRow = clasificacionResult.error ? null : clasificacionResult.data
    if (clasificacionResult.error) {
      logOptionalQueryError('clasificacion_liga', clasificacionResult.error)
    }

    const finalizados = finalizadosResult.error ? [] : finalizadosResult.data ?? []
    if (finalizadosResult.error) {
      logOptionalQueryError('partidos finalizados', finalizadosResult.error)
    }

    const nextMatches = nextMatchesResult.error ? [] : nextMatchesResult.data ?? []
    if (nextMatchesResult.error) {
      logOptionalQueryError('proximos partidos', nextMatchesResult.error)
    }

    const monthMatches = monthMatchesResult.error ? [] : monthMatchesResult.data ?? []
    if (monthMatchesResult.error) {
      logOptionalQueryError('partidos del mes', monthMatchesResult.error)
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

    const upcomingTrainings = upcomingTrainingsResult.error
      ? []
      : (upcomingTrainingsResult.data ?? [])
    if (upcomingTrainingsResult.error) {
      logOptionalQueryError('entrenamientos proximos', upcomingTrainingsResult.error)
    }

    const monthTrainings = monthTrainingsResult.error ? [] : monthTrainingsResult.data ?? []
    if (monthTrainingsResult.error) {
      logOptionalQueryError('entrenamientos del mes', monthTrainingsResult.error)
    }

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

    const finalizadosChronological = [...finalizados].reverse()
    const matchIds = finalizadosChronological.map((match) => match.id)

    let events:
      | Array<{
          tipo: string | null
          jugador_id: string | null
          jugador_relacionado_id: string | null
        }>
      | [] = []

    if (matchIds.length > 0) {
      const eventsResult = await supabase
        .from('eventos_partido')
        .select('tipo, jugador_id, jugador_relacionado_id')
        .in('partido_id', matchIds)

      if (eventsResult.error) {
        logOptionalQueryError('eventos_partido', eventsResult.error)
      } else {
        events = eventsResult.data ?? []
      }
    }

    let participations:
      | Array<{
          partido_id: string
        }>
      | [] = []

    if (matchIds.length > 0) {
      const participationsResult = await supabase
        .from('participantes_partido')
        .select('partido_id')
        .eq('usuario_id', user.id)
        .in('partido_id', matchIds)

      if (participationsResult.error) {
        logOptionalQueryError('participantes_partido', participationsResult.error)
      } else {
        participations = participationsResult.data ?? []
      }
    }

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

    const coachPlayers = teamMembers
      .filter((member) => isPlayerRole(member.rol))
      .map((member, index) => {
        const row = wellbeingByUser.get(member.usuario_id)
        const playerName = normalizeProfileName(member.perfiles) ?? `Jugador ${index + 1}`

        return {
          id: member.usuario_id,
          name: playerName,
          mentalState: row?.estado_mental ?? null,
          fatigue: row?.fatiga ?? null,
          attendingTraining: row?.asiste_entrenamiento ?? null,
        }
      })

    const validMentalScores = coachPlayers
      .map((player) => player.mentalState)
      .filter((value): value is number => typeof value === 'number')
    const validFatigueScores = coachPlayers
      .map((player) => player.fatigue)
      .filter((value): value is number => typeof value === 'number')
    const playersAttending = coachPlayers.filter((player) => player.attendingTraining === true).length

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
      matchesPlayed: participations.length,
      minutesPlayed: participations.length * 90,
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
    for (const item of monthMatches) {
      if (item.fecha_hora) {
        eventDates.add(toDateKey(item.fecha_hora))
      }
    }
    for (const item of monthTrainings) {
      if (item.fecha) {
        eventDates.add(item.fecha)
      }
    }

    const activityItems: ActivityItem[] = [
      ...nextMatches.map((item) => ({
        id: `match-${item.id}`,
        type: 'partido' as const,
        title: item.rival_nombre ? `Partido vs ${item.rival_nombre}` : 'Partido por confirmar',
        subtitle: item.lugar ?? (item.casa_fuera ? `Modalidad ${item.casa_fuera}` : null),
        date: item.fecha_hora,
        time: new Date(item.fecha_hora).toISOString(),
        status: item.estado ?? null,
      })),
      ...upcomingTrainings.map((item) => ({
        id: `training-${item.id}`,
        type: 'entrenamiento' as const,
        title: item.titulo || 'Entrenamiento',
        subtitle: item.tipo ?? null,
        date: item.fecha,
        time: item.hora_inicio ? `${item.fecha}T${item.hora_inicio}` : null,
        status: item.estado ?? null,
      })),
    ]
      .sort((a, b) => {
        const dateA = a.time ?? a.date
        const dateB = b.time ?? b.date
        return dateA.localeCompare(dateB)
      })
      .slice(0, 4)

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

    const response: HomeSuccessResponse = {
      ok: true,
      isCoach: viewerIsCoach,
      equipo: activeTeam ?? null,
      role,
      teamSummary: {
        totalMembers,
        playerCount,
        staffCount,
      },
      coach,
      wellbeing: {
        date: todayDateKey,
        mentalState: wellbeing?.estado_mental ?? null,
        fatigue: wellbeing?.fatiga ?? null,
        attendingTraining: wellbeing?.asiste_entrenamiento ?? null,
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
