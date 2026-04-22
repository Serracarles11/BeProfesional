import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Dumbbell,
  Filter,
  Search,
  Target,
  Trophy,
} from 'lucide-react'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServer } from '@/lib/supabase/server'
import { mapStatisticsToCharts } from './charts/chart-mappers'
import { StatisticsCharts } from './charts/StatisticsCharts'
import type { AttendanceTrendDatum, FatigueTrendDatum } from './charts/types'

export const dynamic = 'force-dynamic'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
})

type SearchParamsInput = Record<string, string | string[] | undefined>

type EquipoRow = {
  id: string
  nombre: string
  categoria: string | null
  temporada: string | null
  club: string | null
  logo_url: string | null
}

type PerfilRow = {
  nombre: string | null
  foto_url: string | null
  posicion: string | null
}

type MiembroJugadorRow = {
  usuario_id: string | null
  dorsal: string | number | null
  perfiles: unknown
}

type PartidoRow = {
  id: string
  fecha_hora: string | null
  rival_nombre: string | null
  goles_favor: number | string | null
  goles_contra: number | string | null
  estado: string | null
}

type EventoRow = {
  partidoId: string
  tipo: string | null
  playerId: string | null
  relatedPlayerId: string | null
}

type ParticipantRow = {
  jugador_id?: string | null
  usuario_id?: string | null
  minutos_jugados?: number | string | null
}

type AttendanceRow = {
  entrenamiento_id?: string | null
  usuario_id?: string | null
  jugador_id?: string | null
  asiste?: boolean | null
  estado?: string | null
}

type TrainingRow = {
  id: string
  fecha: string | null
  estado: string | null
}

type CheckinRow = {
  jugador_id: string | null
  fecha: string | null
  fatiga: number | string | null
}

type HomeWellbeingRow = {
  usuario_id: string | null
  fecha: string | null
  fatiga: number | string | null
}

type MinimalEventRow = {
  partido_id: string | null
  tipo: string | null
}

type JugadorEstadistica = {
  usuarioId: string
  nombre: string
  fotoUrl: string | null
  posicion: string | null
  dorsal: string
  goles: number
  asistencias: number
  contribucion: number
  minutos: number
  asistenciaPct: number | null
  asistenciasEntreno: number
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function buildEquipoHref(path: string, equipoId: string | null) {
  if (!equipoId) return path
  return `${path}?equipo=${encodeURIComponent(equipoId)}`
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

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatDorsal(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function normalizeProfile(raw: unknown): PerfilRow | null {
  const profile = Array.isArray(raw) ? raw[0] : raw
  if (!profile || typeof profile !== 'object') return null

  const row = profile as Record<string, unknown>
  return {
    nombre: typeof row.nombre === 'string' ? row.nombre : null,
    foto_url: typeof row.foto_url === 'string' ? row.foto_url : null,
    posicion: typeof row.posicion === 'string' ? row.posicion : null,
  }
}

function isCancelled(value: string | null | undefined) {
  return normalizeText(value).includes('CANCEL')
}

function isPresentAttendanceState(value: string | null | undefined) {
  const state = normalizeText(value)
  if (!state) return false
  if (state.includes('AUSEN') || state.includes('NO_ASIST') || state.includes('FALTA')) return false
  return state.includes('ASIST') || state.includes('PRES') || state === 'CONFIRMADO' || state === 'OK'
}

function isGoalEvent(value: string | null | undefined) {
  return normalizeText(value).includes('GOL')
}

function isAssistEvent(value: string | null | undefined) {
  return normalizeText(value).includes('ASIST')
}

function topRows(
  rows: JugadorEstadistica[],
  selector: (row: JugadorEstadistica) => number
) {
  return [...rows]
    .sort((a, b) => {
      const diff = selector(b) - selector(a)
      if (diff !== 0) return diff
      return a.nombre.localeCompare(b.nombre, 'es')
    })
    .slice(0, 5)
}

function formatPercent(value: number | null) {
  if (value === null) return '-'
  return `${Math.round(value)}%`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-ES').format(Math.round(value))
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Sesion'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function average(values: number[]) {
  if (values.length === 0) return null
  const total = values.reduce((acc, value) => acc + value, 0)
  return Number((total / values.length).toFixed(1))
}

function buildFatigueTrend(
  checkins: CheckinRow[],
  players: Array<{ usuarioId: string }>,
  now = new Date()
): FatigueTrendDatum[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 41)

  const buckets = Array.from({ length: 6 }, (_, index) => {
    const from = new Date(start)
    from.setDate(start.getDate() + index * 7)
    const to = new Date(from)
    to.setDate(from.getDate() + 6)

    return {
      id: `week-${index + 1}`,
      label: `${formatShortDate(formatDateKey(from))}`,
      from: formatDateKey(from),
      to: formatDateKey(to),
      teamValues: [] as number[],
      playerValues: new Map<string, number[]>(),
    }
  })

  for (const player of players) {
    for (const bucket of buckets) {
      bucket.playerValues.set(player.usuarioId, [])
    }
  }

  for (const checkin of checkins) {
    const playerId = checkin.jugador_id
    const fatigue = toNumber(checkin.fatiga)
    if (!playerId || fatigue <= 0 || !checkin.fecha) continue

    const date = new Date(`${checkin.fecha}T00:00:00`)
    if (Number.isNaN(date.getTime()) || date < start || date > now) continue

    const daysFromStart = Math.floor((date.getTime() - start.getTime()) / 86400000)
    const bucketIndex = Math.min(5, Math.max(0, Math.floor(daysFromStart / 7)))
    const bucket = buckets[bucketIndex]
    if (!bucket) continue

    bucket.teamValues.push(fatigue)
    bucket.playerValues.get(playerId)?.push(fatigue)
  }

  return buckets.map((bucket) => {
    const playerValues: Record<string, number | null> = {}
    for (const player of players) {
      playerValues[player.usuarioId] = average(bucket.playerValues.get(player.usuarioId) ?? [])
    }

    return {
      id: bucket.id,
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      teamAverage: average(bucket.teamValues),
      playerValues,
    }
  })
}

function mergeFatigueRows(checkins: CheckinRow[], wellbeingRows: HomeWellbeingRow[]) {
  const rowsByPlayerDate = new Map<string, CheckinRow>()

  for (const checkin of checkins) {
    if (!checkin.jugador_id || !checkin.fecha) continue
    rowsByPlayerDate.set(`${checkin.jugador_id}:${checkin.fecha}`, checkin)
  }

  for (const row of wellbeingRows) {
    if (!row.usuario_id || !row.fecha || row.fatiga === null) continue
    const key = `${row.usuario_id}:${row.fecha}`
    if (rowsByPlayerDate.has(key)) continue
    rowsByPlayerDate.set(key, {
      jugador_id: row.usuario_id,
      fecha: row.fecha,
      fatiga: row.fatiga,
    })
  }

  return Array.from(rowsByPlayerDate.values())
}

async function loadAttendanceByPlayer(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  equipoId: string,
  playerIds: Set<string>
) {
  const today = new Date().toISOString().slice(0, 10)
  const from = new Date()
  from.setDate(from.getDate() - 180)
  const fromKey = from.toISOString().slice(0, 10)

  const { data: trainingsData, error: trainingsError } = await supabase
    .from('entrenamientos_equipo')
    .select('id, fecha, estado')
    .eq('equipo_id', equipoId)
    .gte('fecha', fromKey)
    .lte('fecha', today)

  if (trainingsError) {
    return { byPlayer: new Map<string, number>(), totalTrainings: 0, trend: [] as AttendanceTrendDatum[] }
  }

  const trainings = ((trainingsData ?? []) as TrainingRow[]).filter(
    (training) => training.id && training.fecha && !isCancelled(training.estado)
  )
  const trainingIds = trainings.map((training) => training.id)

  if (trainingIds.length === 0) {
    return { byPlayer: new Map<string, number>(), totalTrainings: 0, trend: [] as AttendanceTrendDatum[] }
  }

  const byPlayer = new Map<string, number>()
  const attendanceByTraining = new Map<string, number>()

  const currentAttendance = await supabase
    .from('entrenamiento_asistencias')
    .select('entrenamiento_id, usuario_id, asiste')
    .in('entrenamiento_id', trainingIds)

  if (!currentAttendance.error) {
    for (const raw of (currentAttendance.data ?? []) as AttendanceRow[]) {
      const playerId = raw.usuario_id ?? null
      if (!playerId || !playerIds.has(playerId) || raw.asiste !== true) continue
      byPlayer.set(playerId, (byPlayer.get(playerId) ?? 0) + 1)
      const trainingId = raw.entrenamiento_id
      if (trainingId) attendanceByTraining.set(trainingId, (attendanceByTraining.get(trainingId) ?? 0) + 1)
    }
    return {
      byPlayer,
      totalTrainings: trainings.length,
      trend: trainings.map((training) => {
        const attended = attendanceByTraining.get(training.id) ?? 0
        return {
          id: training.id,
          label: formatShortDate(training.fecha),
          date: training.fecha ?? '',
          attended,
          totalPlayers: playerIds.size,
          percentage: playerIds.size > 0 ? (attended / playerIds.size) * 100 : null,
        }
      }),
    }
  }

  const legacyAttendance = await supabase
    .from('asistencia_entrenamientos')
    .select('entrenamiento_id, jugador_id, estado')
    .in('entrenamiento_id', trainingIds)

  if (legacyAttendance.error) {
    return { byPlayer, totalTrainings: trainings.length, trend: [] as AttendanceTrendDatum[] }
  }

  for (const raw of (legacyAttendance.data ?? []) as AttendanceRow[]) {
    const playerId = raw.jugador_id ?? null
    if (!playerId || !playerIds.has(playerId) || !isPresentAttendanceState(raw.estado)) continue
    byPlayer.set(playerId, (byPlayer.get(playerId) ?? 0) + 1)
    const trainingId = raw.entrenamiento_id
    if (trainingId) attendanceByTraining.set(trainingId, (attendanceByTraining.get(trainingId) ?? 0) + 1)
  }

  return {
    byPlayer,
    totalTrainings: trainings.length,
    trend: trainings.map((training) => {
      const attended = attendanceByTraining.get(training.id) ?? 0
      return {
        id: training.id,
        label: formatShortDate(training.fecha),
        date: training.fecha ?? '',
        attended,
        totalPlayers: playerIds.size,
        percentage: playerIds.size > 0 ? (attended / playerIds.size) * 100 : null,
      }
    }),
  }
}

async function loadMatchEvents(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  matchIds: string[]
) {
  if (matchIds.length === 0) {
    return {
      minimalRows: [] as MinimalEventRow[],
      playerRows: [] as EventoRow[],
      error: null as string | null,
    }
  }

  const minimalResult = await supabase
    .from('eventos_partido')
    .select('partido_id, tipo')
    .in('partido_id', matchIds)

  const minimalRows = minimalResult.error
    ? []
    : ((minimalResult.data ?? []) as MinimalEventRow[]).filter((row) => row.partido_id)

  const jugadorFull = await supabase
    .from('eventos_partido')
    .select('partido_id, tipo, jugador_id, jugador_relacionado_id')
    .in('partido_id', matchIds)

  if (!jugadorFull.error) {
    return {
      minimalRows,
      playerRows: (jugadorFull.data ?? []).map((row) => ({
        partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
        tipo: typeof row.tipo === 'string' ? row.tipo : null,
        playerId: typeof row.jugador_id === 'string' ? row.jugador_id : null,
        relatedPlayerId:
          typeof row.jugador_relacionado_id === 'string' ? row.jugador_relacionado_id : null,
      })).filter((row) => row.partidoId),
      error: null,
    }
  }

  const jugadorBasic = await supabase
    .from('eventos_partido')
    .select('partido_id, tipo, jugador_id')
    .in('partido_id', matchIds)

  if (!jugadorBasic.error) {
    return {
      minimalRows,
      playerRows: (jugadorBasic.data ?? []).map((row) => ({
        partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
        tipo: typeof row.tipo === 'string' ? row.tipo : null,
        playerId: typeof row.jugador_id === 'string' ? row.jugador_id : null,
        relatedPlayerId: null,
      })).filter((row) => row.partidoId),
      error: null,
    }
  }

  const usuarioFull = await supabase
    .from('eventos_partido')
    .select('partido_id, tipo, usuario_id, usuario_relacionado_id')
    .in('partido_id', matchIds)

  if (!usuarioFull.error) {
    return {
      minimalRows,
      playerRows: (usuarioFull.data ?? []).map((row) => ({
        partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
        tipo: typeof row.tipo === 'string' ? row.tipo : null,
        playerId: typeof row.usuario_id === 'string' ? row.usuario_id : null,
        relatedPlayerId:
          typeof row.usuario_relacionado_id === 'string' ? row.usuario_relacionado_id : null,
      })).filter((row) => row.partidoId),
      error: null,
    }
  }

  const usuarioBasic = await supabase
    .from('eventos_partido')
    .select('partido_id, tipo, usuario_id')
    .in('partido_id', matchIds)

  if (!usuarioBasic.error) {
    return {
      minimalRows,
      playerRows: (usuarioBasic.data ?? []).map((row) => ({
        partidoId: typeof row.partido_id === 'string' ? row.partido_id : '',
        tipo: typeof row.tipo === 'string' ? row.tipo : null,
        playerId: typeof row.usuario_id === 'string' ? row.usuario_id : null,
        relatedPlayerId: null,
      })).filter((row) => row.partidoId),
      error: null,
    }
  }

  return {
    minimalRows,
    playerRows: [] as EventoRow[],
    error: minimalResult.error
      ? 'No se pudieron leer los eventos de goles del equipo.'
      : 'No se pudieron leer los eventos individuales del equipo.',
  }
}

async function loadStatsData(equipoId: string, userId: string) {
  const supabase = await createSupabaseServer()
  const readSupabase = createSupabaseAdmin() ?? supabase

  const { data: membership, error: membershipError } = await supabase
    .from('miembros_equipo')
    .select('equipo_id, rol')
    .eq('equipo_id', equipoId)
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  if (membershipError) {
    return { error: 'No se pudo validar el equipo activo.' } as const
  }

  if (!membership) {
    return { error: 'No perteneces al equipo solicitado.' } as const
  }

  const [equipoResult, jugadoresResult, partidosResult] = await Promise.all([
    readSupabase
      .from('equipos')
      .select('id, nombre, categoria, temporada, club, logo_url')
      .eq('id', equipoId)
      .maybeSingle(),
    readSupabase
      .from('miembros_equipo')
      .select('usuario_id, dorsal, perfiles(nombre, foto_url, posicion)')
      .eq('equipo_id', equipoId)
      .eq('rol', 'JUGADOR')
      .eq('estado', 'ACTIVO'),
    readSupabase
      .from('partidos')
      .select('id, fecha_hora, rival_nombre, goles_favor, goles_contra, estado')
      .eq('equipo_id', equipoId)
      .order('fecha_hora', { ascending: true }),
  ])

  if (equipoResult.error) {
    return { error: 'No se pudo cargar el equipo.' } as const
  }

  if (!equipoResult.data) {
    return { error: 'No encontramos ese equipo.' } as const
  }

  if (jugadoresResult.error) {
    return { error: 'No se pudieron cargar los jugadores.' } as const
  }

  if (partidosResult.error) {
    return { error: 'No se pudieron cargar los partidos del equipo.' } as const
  }

  const equipo = equipoResult.data as EquipoRow
  const partidos = (partidosResult.data ?? []) as PartidoRow[]
  const jugadoresRaw = (jugadoresResult.data ?? []) as MiembroJugadorRow[]

  const jugadoresBase = jugadoresRaw
    .map((row) => {
      const usuarioId = row.usuario_id
      if (!usuarioId) return null

      const profile = normalizeProfile(row.perfiles)

      return {
        usuarioId,
        nombre: profile?.nombre ?? 'Jugador sin nombre',
        fotoUrl: profile?.foto_url ?? null,
        posicion: profile?.posicion ?? null,
        dorsal: formatDorsal(row.dorsal),
      }
    })
    .filter((row): row is Omit<JugadorEstadistica, 'goles' | 'asistencias' | 'contribucion' | 'minutos' | 'asistenciaPct' | 'asistenciasEntreno'> => row !== null)

  const playerIds = new Set(jugadoresBase.map((player) => player.usuarioId))
  const matchIds = partidos.map((partido) => partido.id)

  let eventos: EventoRow[] = []
  let eventosMarcador: MinimalEventRow[] = []
  let eventosWarning: string | null = null
  let participants: ParticipantRow[] = []

  if (matchIds.length > 0) {
    const [eventosResult, participantsResult] = await Promise.all([
      loadMatchEvents(readSupabase, matchIds),
      readSupabase
        .from('participantes_partido')
        .select('jugador_id, usuario_id, minutos_jugados')
        .in('partido_id', matchIds),
    ])

    eventos = eventosResult.playerRows
    eventosMarcador = eventosResult.minimalRows
    eventosWarning = eventosResult.error

    if (!participantsResult.error) {
      participants = (participantsResult.data ?? []) as ParticipantRow[]
    }
  }

  const attendance = await loadAttendanceByPlayer(readSupabase, equipoId, playerIds)
  const fatigueFromDate = formatDateKey(new Date(Date.now() - 41 * 86400000))
  const [checkinsResult, homeWellbeingResult] = await Promise.all([
    readSupabase
      .from('checkins_diarios')
      .select('jugador_id, fecha, fatiga')
      .eq('equipo_id', equipoId)
      .gte('fecha', fatigueFromDate),
    readSupabase
      .from('home_bienestar_diario')
      .select('usuario_id, fecha, fatiga')
      .eq('equipo_id', equipoId)
      .gte('fecha', fatigueFromDate),
  ])

  const statsByPlayer = new Map<string, { goles: number; asistencias: number }>()
  const minutesByPlayer = new Map<string, number>()
  const goalsByMatch = new Map<string, number>()

  for (const player of jugadoresBase) {
    statsByPlayer.set(player.usuarioId, { goles: 0, asistencias: 0 })
  }

  for (const event of eventosMarcador) {
    const eventType = event.tipo ?? ''

    if (isGoalEvent(eventType)) {
      const matchId = event.partido_id
      if (matchId) {
        goalsByMatch.set(matchId, (goalsByMatch.get(matchId) ?? 0) + 1)
      }
    }
  }

  for (const event of eventos) {
    const eventType = event.tipo ?? ''

    if (isGoalEvent(eventType)) {
      if (event.playerId && statsByPlayer.has(event.playerId)) {
        const current = statsByPlayer.get(event.playerId)
        if (current) current.goles += 1
      }
    }

    if (isAssistEvent(eventType)) {
      const assistPlayerId = event.relatedPlayerId ?? event.playerId
      if (assistPlayerId && statsByPlayer.has(assistPlayerId)) {
        const current = statsByPlayer.get(assistPlayerId)
        if (current) current.asistencias += 1
      }
    }
  }

  for (const row of participants) {
    const playerId = row.jugador_id ?? row.usuario_id
    if (!playerId || !playerIds.has(playerId)) continue
    minutesByPlayer.set(playerId, (minutesByPlayer.get(playerId) ?? 0) + toNumber(row.minutos_jugados ?? 90))
  }

  const jugadores = jugadoresBase
    .map((player) => {
      const stat = statsByPlayer.get(player.usuarioId) ?? { goles: 0, asistencias: 0 }
      const asistenciasEntreno = attendance.byPlayer.get(player.usuarioId) ?? 0

      return {
        ...player,
        goles: stat.goles,
        asistencias: stat.asistencias,
        contribucion: stat.goles + stat.asistencias,
        minutos: Math.round(minutesByPlayer.get(player.usuarioId) ?? 0),
        asistenciaPct:
          attendance.totalTrainings > 0
            ? (asistenciasEntreno / attendance.totalTrainings) * 100
            : null,
        asistenciasEntreno,
      }
    })
    .sort((a, b) => {
      if (b.contribucion !== a.contribucion) return b.contribucion - a.contribucion
      if (b.minutos !== a.minutos) return b.minutos - a.minutos
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  const totalPartidos = partidos.length
  const partidosConMarcador = partidos.map((partido) => ({
    ...partido,
    goles_favor: goalsByMatch.has(partido.id)
      ? goalsByMatch.get(partido.id) ?? 0
      : partido.goles_favor,
    goles_contra:
      goalsByMatch.has(partido.id) && partido.goles_contra === null
        ? 0
        : partido.goles_contra,
  }))
  const golesFavor = partidosConMarcador.reduce((acc, row) => acc + toNumber(row.goles_favor), 0)
  const golesContra = partidosConMarcador.reduce((acc, row) => acc + toNumber(row.goles_contra), 0)
  const mediaGoles = totalPartidos > 0 ? (golesFavor / totalPartidos).toFixed(2) : '0.00'
  const totalMinutos = jugadores.reduce((acc, row) => acc + row.minutos, 0)
  const asistenciaMedia =
    jugadores.length > 0
      ? jugadores.reduce((acc, row) => acc + (row.asistenciaPct ?? 0), 0) /
        jugadores.length
      : null

  return {
    equipo,
    role: typeof (membership as Record<string, unknown>).rol === 'string'
      ? normalizeText((membership as Record<string, unknown>).rol as string)
      : null,
    partidos: partidosConMarcador,
    jugadores,
    totalPartidos,
    golesFavor,
    golesContra,
    mediaGoles,
    totalMinutos,
    asistenciaMedia,
    attendanceTrend: attendance.trend,
    charts: mapStatisticsToCharts({
      matches: partidosConMarcador,
      players: jugadores,
      fatigueTrend: buildFatigueTrend(
        mergeFatigueRows(
          checkinsResult.error ? [] : ((checkinsResult.data ?? []) as CheckinRow[]),
          homeWellbeingResult.error ? [] : ((homeWellbeingResult.data ?? []) as HomeWellbeingRow[])
        ),
        jugadoresBase
      ),
      attendanceTrend: attendance.trend,
    }),
    topAsistencia: topRows(jugadores, (row) => row.asistenciaPct ?? -1),
    topMinutos: topRows(jugadores, (row) => row.minutos),
    topContribucion: topRows(jugadores, (row) => row.contribucion),
    noEvents: eventos.length === 0,
    eventosWarning,
  } as const
}

function Avatar({ player, size = 'md' }: { player: Pick<JugadorEstadistica, 'nombre' | 'fotoUrl'>; size?: 'sm' | 'md' }) {
  const classes = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12'

  return (
    <div className={`${classes} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d6e3ff] text-sm font-black text-[#00468c]`}>
      {player.fotoUrl ? (
        <img src={player.fotoUrl} alt={player.nombre} className="h-full w-full object-cover" />
      ) : (
        player.nombre.charAt(0).toUpperCase()
      )}
    </div>
  )
}

function EmptyState({ equipoId }: { equipoId: string | null }) {
  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} flex min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)]`}>
      <LeftNavigation equipoId={equipoId ?? undefined} teamName="Equipo" />
      <main className="flex min-h-screen flex-1 items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-xl border border-[#dfe3e8] bg-white p-8 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
          <h1 className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">
            Selecciona un equipo
          </h1>
          <p className="mt-2 text-sm font-medium text-[#5f6776]">
            Necesitamos un equipo en la URL para mostrar estadisticas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/equipos" className="rounded-full bg-[#005db6] px-5 py-3 text-sm font-black text-white">
              Ir a equipos
            </Link>
            <Link href="/home" className="rounded-full border border-[#c1c6d6] bg-white px-5 py-3 text-sm font-black text-[#414754]">
              Volver al home
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function ErrorState({ equipoId, message }: { equipoId: string; message: string }) {
  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} flex min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)]`}>
      <LeftNavigation equipoId={equipoId} teamName="Equipo" />
      <main className="flex min-h-screen flex-1 items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-xl border border-[#dfe3e8] bg-white p-8 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
          <h1 className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">
            No se pudieron cargar las estadisticas
          </h1>
          <p className="mt-2 text-sm font-bold text-[#ba1a1a]">{message}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={buildEquipoHref('/home', equipoId)} className="rounded-full bg-[#005db6] px-5 py-3 text-sm font-black text-white">
              Volver al dashboard
            </Link>
            <Link href="/equipos" className="rounded-full border border-[#c1c6d6] bg-white px-5 py-3 text-sm font-black text-[#414754]">
              Cambiar equipo
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: SearchParamsInput | Promise<SearchParamsInput>
}) {
  const resolvedSearchParams = await searchParams
  const equipoId = getQueryValue(resolvedSearchParams.equipo)
  const supabase = await createSupabaseServer()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  if (!equipoId) {
    return <EmptyState equipoId={null} />
  }

  const stats = await loadStatsData(equipoId, session.user.id)

  if ('error' in stats) {
    return <ErrorState equipoId={equipoId} message={stats.error ?? 'Error desconocido'} />
  }

  const seasonLabel = [stats.equipo.club, stats.equipo.categoria, stats.equipo.temporada]
    .filter(Boolean)
    .join(' / ') || 'Temporada activa'
  const efficiencyLeader =
    [...stats.jugadores]
      .filter((row) => row.minutos > 0 && row.goles > 0)
      .sort((a, b) => (b.goles / b.minutos) - (a.goles / a.minutos))[0] ??
    stats.topContribucion[0] ??
    null
  const goalEfficiency = efficiencyLeader?.minutos
    ? ((efficiencyLeader.goles / efficiencyLeader.minutos) * 90).toFixed(2)
    : '0.00'

  const kpis = [
    { label: 'Partidos', value: stats.totalPartidos, icon: Trophy },
    { label: 'Goles favor', value: stats.golesFavor, icon: Target },
    { label: 'Media gol/partido', value: stats.mediaGoles, icon: Activity },
    { label: 'Asistencia media', value: formatPercent(stats.asistenciaMedia), icon: Dumbbell },
  ]

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} flex min-h-screen bg-[#f7f9fe] text-[#181c20] [font-family:var(--font-manrope)]`}>
      <LeftNavigation
        equipoId={equipoId}
        teamName={stats.equipo.nombre}
        isCoach={stats.role === 'ENTRENADOR'}
      />

      <main className="min-w-0 flex-1 overflow-y-auto pb-24 xl:pb-0">
        <header className="sticky top-0 z-20 border-b border-[#dfe3e8]/70 bg-[#f7f9fe]/92 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="[font-family:var(--font-plus-jakarta)] text-xl font-black italic tracking-tight text-[#005db6] sm:text-2xl">
                PULSE ANALYTICS
              </p>
              <p className="mt-0.5 truncate text-xs font-bold uppercase tracking-[0.14em] text-[#727785]">
                {stats.equipo.nombre}
              </p>
            </div>

            <div className="hidden min-w-[220px] max-w-xs flex-1 items-center rounded-full bg-[#f1f4f9] px-4 py-2 text-[#414754] lg:flex">
              <Search className="mr-2 h-4 w-4" />
              <span className="text-sm font-semibold">Buscar jugadores...</span>
            </div>

            <div className="flex items-center gap-2">
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#414754] shadow-[0_4px_10px_rgba(0,0,0,0.03)] transition hover:text-[#005db6]" type="button" aria-label="Filtrar">
                <Filter className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#005db6] to-[#3176d2] px-4 py-2 text-sm font-black text-white shadow-[0_10px_20px_rgba(0,93,182,0.15)] transition hover:opacity-90" type="button">
                <ArrowDownToLine className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1920px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#414754]">Squad Analysis</p>
              <h1 className="mt-1 [font-family:var(--font-plus-jakarta)] text-4xl font-black tracking-tight text-[#181c20] sm:text-5xl">
                Performance Metrics
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#5f6776]">{seasonLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kpis.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.label} className="rounded-xl bg-white px-4 py-3 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#d6e3ff] text-[#005db6]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#727785]">{item.label}</p>
                    <p className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">{item.value}</p>
                  </article>
                )
              })}
            </div>
          </section>

          <StatisticsCharts data={stats.charts} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article className="rounded-xl bg-gradient-to-br from-[#005db6] to-[#2b5bb5] p-6 text-white shadow-[0_20px_40px_rgba(0,93,182,0.1)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">
                Goal Efficiency
              </p>
              <p className="mt-3 [font-family:var(--font-plus-jakarta)] text-4xl font-black tracking-tight">
                {goalEfficiency}
              </p>
              <p className="mt-1 truncate text-sm font-black text-[#ffe170]">
                {efficiencyLeader?.nombre ?? 'Sin datos'}
              </p>
            </article>
            <article className="rounded-xl border border-[#dfe8f6] bg-white p-6 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#727785]">
                Total minutos
              </p>
              <p className="mt-3 [font-family:var(--font-plus-jakarta)] text-4xl font-black text-[#181c20]">
                {formatNumber(stats.totalMinutos)}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#727785]">Carga competitiva acumulada</p>
            </article>
            <article className="rounded-xl border border-[#dfe8f6] bg-white p-6 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#727785]">
                Top contribucion
              </p>
              <p className="mt-3 [font-family:var(--font-plus-jakarta)] text-4xl font-black text-[#181c20]">
                {stats.topContribucion[0]?.contribucion ?? 0}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#727785]">
                {stats.topContribucion[0]?.nombre ?? 'Sin datos'}
              </p>
            </article>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="[font-family:var(--font-plus-jakarta)] text-xl font-black text-[#181c20]">Squad Table</h2>
                <p className="text-sm font-semibold text-[#727785]">Goles, asistencias, minutos y asistencia a entrenamientos.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f4f9] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#414754]">
                <BarChart3 className="h-3.5 w-3.5" />
                {stats.jugadores.length} jugadores
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs font-black uppercase tracking-[0.14em] text-[#727785]">
                    <th className="px-3 py-2">Jugador</th>
                    <th className="px-3 py-2">Posicion</th>
                    <th className="px-3 py-2">Dorsal</th>
                    <th className="px-3 py-2">Goles</th>
                    <th className="px-3 py-2">Asist.</th>
                    <th className="px-3 py-2">Minutos</th>
                    <th className="px-3 py-2">Entreno</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.jugadores.map((player) => (
                    <tr key={player.usuarioId} className="bg-[#f7f9fe] text-[#414754]">
                      <td className="rounded-l-xl px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar player={player} size="sm" />
                          <span className="[font-family:var(--font-plus-jakarta)] font-black text-[#181c20]">{player.nombre}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold">{player.posicion || '-'}</td>
                      <td className="px-3 py-3 font-semibold">{player.dorsal}</td>
                      <td className="px-3 py-3 font-black text-[#005db6]">{player.goles}</td>
                      <td className="px-3 py-3 font-black text-[#005db6]">{player.asistencias}</td>
                      <td className="px-3 py-3 font-black">{formatNumber(player.minutos)}</td>
                      <td className="rounded-r-xl px-3 py-3 font-black">{formatPercent(player.asistenciaPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(stats.noEvents || stats.eventosWarning) && (
              <p className="mt-4 text-xs font-semibold text-[#727785]">
                {stats.eventosWarning ||
                  'Aun no hay eventos registrados para este equipo. Goles y asistencias se muestran en 0.'}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
