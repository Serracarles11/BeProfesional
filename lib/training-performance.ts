import { createSupabaseServer } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServer>>

type TeamSummary = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  logoUrl: string | null
}

type RawProfile = {
  nombre: string | null
  foto_url: string | null
  posicion: string | null
}

type PerformancePlayerRow = {
  id: string
  nombre: string
  avatarUrl: string | null
  goles: number
  asistencias: number
  minutos: number
}

type PerformanceLinePoint = {
  label: string
  value: number
  highlighted?: boolean
}

type PerformanceBarPoint = {
  label: string
  value: number
  tooltip?: string
  highlighted?: boolean
}

type PerformanceKpi = {
  id: string
  title: string
  value: string
  changeLabel: string
  changeDirection: 'up' | 'down'
}

export type TrainingPerformanceData = {
  team: TeamSummary | null
  role: string | null
  kpis: PerformanceKpi[]
  charts: {
    ejercicios: {
      tabs: [string, string]
      caption?: string
      points: PerformanceLinePoint[]
      accentColor: string
    }
    golesAsistencias: {
      tabs: [string, string]
      points: PerformanceLinePoint[]
      accentColor: string
    }
    minutosJugados: {
      title: string
      bars: PerformanceBarPoint[]
      accentColor: string
    }
    fatiga: {
      title: string
      bars: PerformanceBarPoint[]
      accentColor: string
    }
  }
  players: PerformancePlayerRow[]
  meta: {
    isMock: boolean
    stepsSource: 'mock'
    minutesSource: 'mock' | 'estimated' | 'db'
    wellnessSource: 'mock' | 'db'
  }
}

export type LoadTrainingPerformanceResult =
  | { ok: true; data: TrainingPerformanceData }
  | { ok: false; error: string; code?: string | null; details?: string | null; hint?: string | null }

type OptionalMatchRow = {
  id: string
  fecha_hora: string
  estado: string | null
  jornada: string | number | null
}

type ParticipantRow = {
  usuario_id: string
  partido_id: string
  minutos_jugados: number | null
}

type EventStats = {
  goals: number
  assists: number
}

type PlayerBase = {
  usuarioId: string
  nombre: string
  avatarUrl: string | null
}

const MOCK_KPIS: PerformanceKpi[] = [
  { id: 'pasos', title: 'Pasos', value: '7,265', changeLabel: '+11.01%', changeDirection: 'up' },
  { id: 'racha', title: 'Racha de entrenos', value: '3,671', changeLabel: '-0.03%', changeDirection: 'down' },
  { id: 'animo', title: 'Estado de animo-semana', value: '256', changeLabel: '+15.03%', changeDirection: 'up' },
  { id: 'fatiga', title: 'Estado fatiga', value: '2,318', changeLabel: '+6.72%', changeDirection: 'up' },
]

const MOCK_EJERCICIOS_POINTS: PerformanceLinePoint[] = [
  { label: 'Jan', value: 26 },
  { label: 'Feb', value: 33, highlighted: true },
  { label: 'Mar', value: 21, highlighted: true },
  { label: 'Apr', value: 31 },
  { label: 'May', value: 44, highlighted: true },
  { label: 'Jun', value: 39 },
]

const MOCK_GOLES_POINTS: PerformanceLinePoint[] = [
  { label: 'Jan', value: 31, highlighted: true },
  { label: 'Feb', value: 22, highlighted: true },
  { label: 'Mar', value: 35, highlighted: true },
  { label: 'Apr', value: 48 },
  { label: 'May', value: 42, highlighted: true },
  { label: 'Jun', value: 47 },
]

const MOCK_MINUTES_BARS: PerformanceBarPoint[] = [
  { label: 'Jornada 1', value: 122000 },
  { label: 'Jornada 2', value: 188000 },
  { label: 'Jornada 3', value: 146000 },
  { label: 'Jornada 4', value: 214000 },
  { label: 'Jornada 5', value: 243000, tooltip: '243K', highlighted: true },
  { label: 'Jornada 6', value: 98000 },
]

const MOCK_FATIGUE_BARS: PerformanceBarPoint[] = [
  { label: 'Jornada 1', value: 122 },
  { label: 'Jornada 2', value: 188 },
  { label: 'Jornada 3', value: 166 },
  { label: 'Jornada 4', value: 94 },
  { label: 'Jornada 5', value: 214, highlighted: true },
  { label: 'Jornada 6', value: 126 },
]

const MOCK_PLAYERS: PerformancePlayerRow[] = [
  { id: 'mock-1', nombre: 'ByeWind', avatarUrl: null, goles: 12, asistencias: 10, minutos: 1001 },
  { id: 'mock-2', nombre: 'Natali Craig', avatarUrl: null, goles: 8, asistencias: 11, minutos: 502 },
  { id: 'mock-3', nombre: 'Drew Cano', avatarUrl: null, goles: 9, asistencias: 5, minutos: 404 },
  { id: 'mock-4', nombre: 'Orlando Diggs', avatarUrl: null, goles: 4, asistencias: 8, minutos: 800 },
  { id: 'mock-5', nombre: 'Andi Lane', avatarUrl: null, goles: 6, asistencias: 7, minutos: 750 },
]

function getErrorMeta(error: unknown) {
  const value = (error ?? {}) as { code?: string | null; details?: string | null; hint?: string | null }
  return {
    code: value.code ?? null,
    details: value.details ?? null,
    hint: value.hint ?? null,
  }
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values: Array<number | null | undefined>, digits = 2) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  return round(valid.reduce((sum, value) => sum + value, 0) / valid.length, digits)
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

function isGoalEvent(value: string | null | undefined) {
  return normalizeText(value).includes('GOL')
}

function isAssistEvent(value: string | null | undefined) {
  return normalizeText(value).includes('ASIST')
}

function safeCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 0,
  })
    .format(value)
    .toUpperCase()
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function formatSignedPercent(value: number | null, fallback: string) {
  if (value === null || Number.isNaN(value)) return fallback
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function directionFromChange(value: number | null, fallback: 'up' | 'down') {
  if (value === null || Number.isNaN(value)) return fallback
  return value < 0 ? 'down' : 'up'
}

function percentageChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null
  return round(((current - previous) / Math.abs(previous)) * 100, 2)
}

function monthKeyFromDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

function buildMonthBuckets(now = new Date(), count = 6) {
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(startOfMonth(now), index - (count - 1))
    return {
      key: `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
    }
  })
}

function buildMockPerformanceData(): TrainingPerformanceData {
  return {
    team: null,
    role: null,
    kpis: MOCK_KPIS,
    charts: {
      ejercicios: {
        tabs: ['Ejercicios hechos', 'Projects'],
        caption: 'Operating Status',
        points: MOCK_EJERCICIOS_POINTS,
        accentColor: '#d4c1ff',
      },
      golesAsistencias: {
        tabs: ['Goles/asistencias', 'Projects'],
        points: MOCK_GOLES_POINTS,
        accentColor: '#d4c1ff',
      },
      minutosJugados: {
        title: 'Minutos jugados',
        bars: MOCK_MINUTES_BARS,
        accentColor: '#7ab5ff',
      },
      fatiga: {
        title: 'Fatiga',
        bars: MOCK_FATIGUE_BARS,
        accentColor: '#6fd88c',
      },
    },
    players: MOCK_PLAYERS,
    meta: {
      isMock: true,
      stepsSource: 'mock',
      minutesSource: 'mock',
      wellnessSource: 'mock',
    },
  }
}

function parseProfile(raw: unknown): RawProfile | null {
  const profile = Array.isArray(raw) ? raw[0] : raw
  if (!profile || typeof profile !== 'object') return null

  const row = profile as Record<string, unknown>
  return {
    nombre: typeof row.nombre === 'string' ? row.nombre : null,
    foto_url: typeof row.foto_url === 'string' ? row.foto_url : null,
    posicion: typeof row.posicion === 'string' ? row.posicion : null,
  }
}

function parseTeam(raw: unknown): TeamSummary | null {
  if (!raw || typeof raw !== 'object') return null

  const row = raw as Record<string, unknown>
  const equipo = Array.isArray(row.equipo) ? row.equipo[0] : row.equipo
  if (!equipo || typeof equipo !== 'object') return null

  const value = equipo as Record<string, unknown>
  const id = typeof value.id === 'string' ? value.id : null
  const nombre = typeof value.nombre === 'string' ? value.nombre : null

  if (!id || !nombre) return null

  return {
    id,
    nombre,
    club: typeof value.club === 'string' ? value.club : null,
    categoria: typeof value.categoria === 'string' ? value.categoria : null,
    temporada: typeof value.temporada === 'string' ? value.temporada : null,
    logoUrl: typeof value.logo_url === 'string' ? value.logo_url : null,
  }
}

async function safeArrayQuery<T>(
  promise: PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const response = await promise
  if (response.error) return []
  return response.data ?? []
}

async function loadMatchesWithOptionalJornada(
  supabase: SupabaseClient,
  equipoId: string,
  fromIso: string
): Promise<OptionalMatchRow[]> {
  const response = await supabase
    .from('partidos')
    .select('id, fecha_hora, estado, jornada')
    .eq('equipo_id', equipoId)
    .gte('fecha_hora', fromIso)
    .order('fecha_hora', { ascending: true })

  if (!response.error) {
    return (response.data ?? [])
      .map((row) => ({
        id: typeof row.id === 'string' ? row.id : '',
        fecha_hora: typeof row.fecha_hora === 'string' ? row.fecha_hora : '',
        estado: typeof row.estado === 'string' ? row.estado : null,
        jornada:
          typeof row.jornada === 'number' || typeof row.jornada === 'string'
            ? row.jornada
            : null,
      }))
      .filter((row) => row.id && row.fecha_hora)
  }

  const fallback = await supabase
    .from('partidos')
    .select('id, fecha_hora, estado')
    .eq('equipo_id', equipoId)
    .gte('fecha_hora', fromIso)
    .order('fecha_hora', { ascending: true })

  if (fallback.error) return []

  return (fallback.data ?? [])
    .map((row) => ({
      id: typeof row.id === 'string' ? row.id : '',
      fecha_hora: typeof row.fecha_hora === 'string' ? row.fecha_hora : '',
      estado: typeof row.estado === 'string' ? row.estado : null,
      jornada: null,
    }))
    .filter((row) => row.id && row.fecha_hora)
}

async function loadParticipantsWithOptionalMinutes(
  supabase: SupabaseClient,
  matchIds: string[]
): Promise<{ rows: ParticipantRow[]; source: 'estimated' | 'db' | 'mock' }> {
  if (matchIds.length === 0) {
    return { rows: [], source: 'mock' }
  }

  const response = await supabase
    .from('participantes_partido')
    .select('usuario_id, partido_id, minutos_jugados')
    .in('partido_id', matchIds)

  if (!response.error) {
    return {
      source: 'db',
      rows: (response.data ?? [])
        .map((row) => ({
          usuario_id: typeof row.usuario_id === 'string' ? row.usuario_id : '',
          partido_id: typeof row.partido_id === 'string' ? row.partido_id : '',
          minutos_jugados: toNumber(row.minutos_jugados),
        }))
        .filter((row) => row.usuario_id && row.partido_id),
    }
  }

  const fallback = await supabase
    .from('participantes_partido')
    .select('usuario_id, partido_id')
    .in('partido_id', matchIds)

  if (fallback.error) {
    return { rows: [], source: 'mock' }
  }

  return {
    source: 'estimated',
    rows: (fallback.data ?? [])
      .map((row) => ({
        usuario_id: typeof row.usuario_id === 'string' ? row.usuario_id : '',
        partido_id: typeof row.partido_id === 'string' ? row.partido_id : '',
        minutos_jugados: null,
      }))
      .filter((row) => row.usuario_id && row.partido_id),
  }
}

function computeTrainingStreak(trainingDates: string[]) {
  if (trainingDates.length === 0) return 0

  const uniqueDates = [...new Set(trainingDates)].sort((a, b) => (a < b ? 1 : -1))
  let streak = 0
  let cursor = new Date(`${uniqueDates[0]}T00:00:00`)

  for (const value of uniqueDates) {
    const currentKey = dateKey(cursor)
    if (value !== currentKey) {
      break
    }

    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

function buildLinePointsFromBuckets(
  countsByKey: Map<string, number>,
  fallbackPoints: PerformanceLinePoint[],
  now = new Date()
): PerformanceLinePoint[] {
  const buckets = buildMonthBuckets(now, 6)
  const values = buckets.map((bucket, index) => ({
    label: bucket.label,
    value: countsByKey.get(bucket.key) ?? 0,
    highlighted: index === 1 || index === 3 || index === 4,
  }))

  const hasAnyValue = values.some((point) => point.value > 0)
  return hasAnyValue ? values : fallbackPoints
}

function buildFatigueBars(checkins: Array<Record<string, unknown>>, now = new Date()): PerformanceBarPoint[] {
  if (checkins.length === 0) {
    return MOCK_FATIGUE_BARS
  }

  const start = addDays(now, -41)
  const buckets = Array.from({ length: 6 }, (_, index) => ({
    label: `Jornada ${index + 1}`,
    values: [] as number[],
  }))

  for (const row of checkins) {
    const fecha = typeof row.fecha === 'string' ? row.fecha : null
    const fatiga = toNumber(row.fatiga)
    if (!fecha || fatiga === null) continue

    const date = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(date.getTime()) || date < start || date > now) continue

    const daysFromStart = Math.floor((date.getTime() - start.getTime()) / 86400000)
    const bucketIndex = Math.min(5, Math.max(0, Math.floor(daysFromStart / 7)))
    buckets[bucketIndex]?.values.push(fatiga)
  }

  const values = buckets.map((bucket) => average(bucket.values, 1))
  if (values.every((value) => value === null)) {
    return MOCK_FATIGUE_BARS
  }

  const maxValue = Math.max(...values.map((value) => value ?? 0))

  return buckets.map((bucket, index) => {
    const value = values[index] ?? 0
    return {
      label: bucket.label,
      value,
      highlighted: value === maxValue && maxValue > 0,
    }
  })
}

function buildMinutesBars(matches: OptionalMatchRow[], participants: ParticipantRow[]): PerformanceBarPoint[] {
  const finishedMatches = matches
    .filter((match) => normalizeText(match.estado) === 'FINALIZADO')
    .slice(-6)

  if (finishedMatches.length === 0 || participants.length === 0) {
    return MOCK_MINUTES_BARS
  }

  const bars = finishedMatches.map((match, index) => {
    const rows = participants.filter((participant) => participant.partido_id === match.id)
    const total = rows.reduce((sum, row) => sum + (row.minutos_jugados ?? 90), 0)
    const label =
      match.jornada !== null && match.jornada !== ''
        ? `Jornada ${match.jornada}`
        : `Jornada ${index + 1}`

    return {
      label,
      value: total,
    }
  })

  const maxValue = Math.max(...bars.map((bar) => bar.value))

  return bars.map((bar) => ({
    ...bar,
    highlighted: bar.value === maxValue && maxValue > 0,
    tooltip: bar.value === maxValue && maxValue > 0 ? safeCompactNumber(bar.value) : undefined,
  }))
}

function buildPlayerRows(
  players: PlayerBase[],
  eventStatsByPlayer: Map<string, EventStats>,
  participants: ParticipantRow[]
): PerformancePlayerRow[] {
  if (players.length === 0) {
    return MOCK_PLAYERS
  }

  const minutesByPlayer = new Map<string, number>()

  for (const row of participants) {
    const current = minutesByPlayer.get(row.usuario_id) ?? 0
    minutesByPlayer.set(row.usuario_id, current + (row.minutos_jugados ?? 90))
  }

  const rows = players
    .map((player) => {
      const stats = eventStatsByPlayer.get(player.usuarioId) ?? { goals: 0, assists: 0 }
      return {
        id: player.usuarioId,
        nombre: player.nombre,
        avatarUrl: player.avatarUrl,
        goles: stats.goals,
        asistencias: stats.assists,
        minutos: Math.round(minutesByPlayer.get(player.usuarioId) ?? 0),
      }
    })
    .sort((a, b) => {
      if (b.goles !== a.goles) return b.goles - a.goles
      if (b.asistencias !== a.asistencias) return b.asistencias - a.asistencias
      if (b.minutos !== a.minutos) return b.minutos - a.minutos
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  return rows.slice(0, 5)
}

function buildKpis(params: {
  trainings: Array<{ fecha: string }>
  checkins: Array<Record<string, unknown>>
  fallback: PerformanceKpi[]
}) {
  const { trainings, checkins, fallback } = params
  const now = new Date()
  const recentFrom = dateKey(addDays(now, -6))
  const previousFrom = dateKey(addDays(now, -13))
  const previousTo = dateKey(addDays(now, -7))

  const recentMood = average(
    checkins
      .filter((row) => typeof row.fecha === 'string' && row.fecha >= recentFrom)
      .map((row) => toNumber(row.animo)),
    1
  )

  const previousMood = average(
    checkins
      .filter(
        (row) =>
          typeof row.fecha === 'string' &&
          row.fecha >= previousFrom &&
          row.fecha <= previousTo
      )
      .map((row) => toNumber(row.animo)),
    1
  )

  const recentFatigue = average(
    checkins
      .filter((row) => typeof row.fecha === 'string' && row.fecha >= recentFrom)
      .map((row) => toNumber(row.fatiga)),
    1
  )

  const previousFatigue = average(
    checkins
      .filter(
        (row) =>
          typeof row.fecha === 'string' &&
          row.fecha >= previousFrom &&
          row.fecha <= previousTo
      )
      .map((row) => toNumber(row.fatiga)),
    1
  )

  const recentTrainingCount = trainings.filter((training) => training.fecha >= recentFrom).length
  const previousTrainingCount = trainings.filter(
    (training) => training.fecha >= previousFrom && training.fecha <= previousTo
  ).length

  const streak = computeTrainingStreak(trainings.map((training) => training.fecha))
  const streakChange = percentageChange(recentTrainingCount, previousTrainingCount)
  const moodChange = percentageChange(recentMood, previousMood)
  const fatigueChange = percentageChange(recentFatigue, previousFatigue)

  return [
    fallback[0],
    {
      id: 'racha',
      title: 'Racha de entrenos',
      value: streak > 0 ? formatInteger(streak) : fallback[1].value,
      changeLabel: formatSignedPercent(streakChange, fallback[1].changeLabel),
      changeDirection: directionFromChange(streakChange, fallback[1].changeDirection),
    },
    {
      id: 'animo',
      title: 'Estado de animo-semana',
      value: recentMood !== null ? formatInteger(recentMood) : fallback[2].value,
      changeLabel: formatSignedPercent(moodChange, fallback[2].changeLabel),
      changeDirection: directionFromChange(moodChange, fallback[2].changeDirection),
    },
    {
      id: 'fatiga',
      title: 'Estado fatiga',
      value: recentFatigue !== null ? formatInteger(recentFatigue) : fallback[3].value,
      changeLabel: formatSignedPercent(fatigueChange, fallback[3].changeLabel),
      changeDirection: directionFromChange(fatigueChange, fallback[3].changeDirection),
    },
  ]
}

export async function loadTrainingPerformanceData({
  supabase,
  equipoId,
  userId,
}: {
  supabase: SupabaseClient
  equipoId?: string | null
  userId: string
}): Promise<LoadTrainingPerformanceResult> {
  if (!equipoId) {
    return { ok: true, data: buildMockPerformanceData() }
  }

  const membership = await supabase
    .from('miembros_equipo')
    .select('rol, equipo:equipos(id, nombre, club, categoria, temporada, logo_url)')
    .eq('equipo_id', equipoId)
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  if (membership.error) {
    return {
      ok: false,
      error: 'No se pudo validar el equipo activo.',
      ...getErrorMeta(membership.error),
    }
  }

  if (!membership.data) {
    return {
      ok: false,
      error: 'No perteneces al equipo solicitado.',
      code: 'TEAM_FORBIDDEN',
    }
  }

  const team = parseTeam(membership.data)
  if (!team) {
    return {
      ok: false,
      error: 'No se pudo cargar el equipo seleccionado.',
      code: 'TEAM_NOT_FOUND',
    }
  }

  const now = new Date()
  const monthWindowStart = addMonths(startOfMonth(now), -5).toISOString()
  const trainingWindowStart = dateKey(addDays(now, -180))
  const checkinWindowStart = dateKey(addDays(now, -41))

  const [playersRaw, trainingsRaw, checkinsRaw, matches] = await Promise.all([
    safeArrayQuery(
      supabase
        .from('miembros_equipo')
        .select('usuario_id, perfiles(nombre, foto_url, posicion)')
        .eq('equipo_id', equipoId)
        .eq('rol', 'JUGADOR')
        .eq('estado', 'ACTIVO')
    ),
    safeArrayQuery(
      supabase
        .from('entrenamientos_equipo')
        .select('id, fecha, estado')
        .eq('equipo_id', equipoId)
        .gte('fecha', trainingWindowStart)
        .order('fecha', { ascending: true })
    ),
    safeArrayQuery(
      supabase
        .from('checkins_diarios')
        .select('fecha, animo, fatiga')
        .eq('equipo_id', equipoId)
        .gte('fecha', checkinWindowStart)
        .lte('fecha', dateKey(now))
        .order('fecha', { ascending: true })
    ),
    loadMatchesWithOptionalJornada(supabase, equipoId, monthWindowStart),
  ])

  const matchIds = matches.map((match) => match.id)

  const [eventsRaw, participantsResult] = await Promise.all([
    matchIds.length > 0
      ? safeArrayQuery(
          supabase
            .from('eventos_partido')
            .select('partido_id, tipo, jugador_id, jugador_relacionado_id')
            .in('partido_id', matchIds)
        )
      : Promise.resolve([] as Array<Record<string, unknown>>),
    loadParticipantsWithOptionalMinutes(supabase, matchIds),
  ])

  const players = (playersRaw as Array<Record<string, unknown>>)
    .map((row) => {
      const usuarioId = typeof row.usuario_id === 'string' ? row.usuario_id : null
      if (!usuarioId) return null
      const profile = parseProfile(row.perfiles)
      return {
        usuarioId,
        nombre: profile?.nombre ?? 'Jugador',
        avatarUrl: profile?.foto_url ?? null,
      }
    })
    .filter((row): row is PlayerBase => row !== null)

  const trainings = (trainingsRaw as Array<Record<string, unknown>>)
    .map((row) => ({
      id: typeof row.id === 'string' ? row.id : '',
      fecha: typeof row.fecha === 'string' ? row.fecha : '',
      estado: typeof row.estado === 'string' ? row.estado : null,
    }))
    .filter((row) => row.id && row.fecha)
    .filter((row) => row.fecha <= dateKey(now))

  const completedTrainings = trainings.filter(
    (training) => !normalizeText(training.estado).includes('CANCEL')
  )

  const trainingsByMonth = new Map<string, number>()
  for (const training of completedTrainings) {
    const key = monthKeyFromDate(`${training.fecha}T00:00:00`)
    if (!key) continue
    trainingsByMonth.set(key, (trainingsByMonth.get(key) ?? 0) + 1)
  }

  const matchDateById = new Map(matches.map((match) => [match.id, match.fecha_hora]))
  const eventStatsByPlayer = new Map<string, EventStats>()
  const contributionByMonth = new Map<string, number>()

  for (const raw of eventsRaw as Array<Record<string, unknown>>) {
    const tipo = typeof raw.tipo === 'string' ? raw.tipo : null
    const partidoId = typeof raw.partido_id === 'string' ? raw.partido_id : null
    const primaryPlayerId = typeof raw.jugador_id === 'string' ? raw.jugador_id : null
    const assistPlayerId =
      typeof raw.jugador_relacionado_id === 'string'
        ? raw.jugador_relacionado_id
        : primaryPlayerId

    if (isGoalEvent(tipo) && primaryPlayerId) {
      const current = eventStatsByPlayer.get(primaryPlayerId) ?? { goals: 0, assists: 0 }
      current.goals += 1
      eventStatsByPlayer.set(primaryPlayerId, current)
    }

    if (isAssistEvent(tipo) && assistPlayerId) {
      const current = eventStatsByPlayer.get(assistPlayerId) ?? { goals: 0, assists: 0 }
      current.assists += 1
      eventStatsByPlayer.set(assistPlayerId, current)
    }

    if (partidoId && (isGoalEvent(tipo) || isAssistEvent(tipo))) {
      const matchDate = matchDateById.get(partidoId)
      if (!matchDate) continue
      const monthKey = monthKeyFromDate(matchDate)
      if (!monthKey) continue
      contributionByMonth.set(monthKey, (contributionByMonth.get(monthKey) ?? 0) + 1)
    }
  }

  const minutesBars = buildMinutesBars(matches, participantsResult.rows)
  const playersTable = buildPlayerRows(players, eventStatsByPlayer, participantsResult.rows)
  const fatigueBars = buildFatigueBars(checkinsRaw as Array<Record<string, unknown>>, now)
  const kpis = buildKpis({
    trainings: completedTrainings,
    checkins: checkinsRaw as Array<Record<string, unknown>>,
    fallback: MOCK_KPIS,
  })

  const mockData = buildMockPerformanceData()
  const exercisePoints = buildLinePointsFromBuckets(
    trainingsByMonth,
    MOCK_EJERCICIOS_POINTS,
    now
  )
  const contributionPoints = buildLinePointsFromBuckets(
    contributionByMonth,
    MOCK_GOLES_POINTS,
    now
  )

  return {
    ok: true,
    data: {
      team,
      role:
        typeof (membership.data as Record<string, unknown>).rol === 'string'
          ? normalizeText((membership.data as Record<string, unknown>).rol as string)
          : null,
      kpis,
      charts: {
        ejercicios: {
          tabs: ['Ejercicios hechos', 'Projects'],
          caption: 'Operating Status',
          points: exercisePoints,
          accentColor: '#d4c1ff',
        },
        golesAsistencias: {
          tabs: ['Goles/asistencias', 'Projects'],
          points: contributionPoints,
          accentColor: '#d4c1ff',
        },
        minutosJugados: {
          title: 'Minutos jugados',
          bars: minutesBars,
          accentColor: '#7ab5ff',
        },
        fatiga: {
          title: 'Fatiga',
          bars: fatigueBars,
          accentColor: '#6fd88c',
        },
      },
      players: playersTable,
      meta: {
        isMock:
          playersTable === MOCK_PLAYERS &&
          exercisePoints === MOCK_EJERCICIOS_POINTS &&
          contributionPoints === MOCK_GOLES_POINTS,
        stepsSource: 'mock',
        minutesSource: participantsResult.source,
        wellnessSource:
          fatigueBars === mockData.charts.fatiga.bars && kpis[2].value === MOCK_KPIS[2].value
            ? 'mock'
            : 'db',
      },
    },
  }
}
