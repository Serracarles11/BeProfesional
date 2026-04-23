import type {
  AttendanceTrendDatum,
  FatigueTrendDatum,
  MatchChartDatum,
  PlayerRankingDatum,
  PlayerStatisticsDatum,
  StatisticsChartsPayload,
} from './types'

type MatchInput = {
  id: string
  fecha_hora?: string | null
  rival_nombre?: string | null
  goles_favor?: number | string | null
  goles_contra?: number | string | null
  estado?: string | null
}

type PlayerInput = {
  usuarioId: string
  nombre: string
  fotoUrl: string | null
  posicion: string | null
  goles: number
  asistencias: number
  contribucion: number
  minutos: number
  asistenciasEntreno: number
  asistenciaPct: number | null
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatMatchDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function hasValue(value: number | string | null | undefined) {
  return value !== null && value !== undefined && value !== ''
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

function normalizePlayerRanking(
  players: PlayerInput[],
  valueSelector: (player: PlayerInput) => number,
  valueLabel: (value: number, player: PlayerInput) => string,
  helperLabel?: (player: PlayerInput) => string
): PlayerRankingDatum[] {
  return [...players]
    .map((player) => {
      const value = valueSelector(player)
      return {
        id: player.usuarioId,
        name: player.nombre,
        avatarUrl: player.fotoUrl,
        position: player.posicion,
        value,
        valueLabel: valueLabel(value, player),
        helperLabel: helperLabel?.(player),
      }
    })
    .filter((player) => Number.isFinite(player.value) && player.value > 0)
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'es'))
    .slice(0, 8)
}

export function mapStatisticsToCharts({
  matches,
  players,
  fatigueTrend,
  attendanceTrend,
}: {
  matches: MatchInput[]
  players: PlayerInput[]
  fatigueTrend: FatigueTrendDatum[]
  attendanceTrend: AttendanceTrendDatum[]
}): StatisticsChartsPayload {
  const matchData = [...matches]
    .filter((match) => {
      if (!match.id) return false

      const hasStoredScore = hasValue(match.goles_favor) || hasValue(match.goles_contra)
      const isFinished = normalizeText(match.estado) === 'FINALIZADO'

      return hasStoredScore || isFinished
    })
    .sort((left, right) => {
      const leftDate = left.fecha_hora ?? ''
      const rightDate = right.fecha_hora ?? ''
      return leftDate.localeCompare(rightDate)
    })
    .map<MatchChartDatum>((match, index) => {
      const dateLabel = formatMatchDate(match.fecha_hora)
      const opponent = match.rival_nombre?.trim() || null

      return {
        id: match.id,
        label: opponent ? `${index + 1}. ${opponent}` : `Partido ${index + 1}`,
        opponent,
        date: dateLabel,
        goalsFor: toNumber(match.goles_favor),
        goalsAgainst: toNumber(match.goles_contra),
      }
    })

  return {
    matches: matchData,
    players: players.map<PlayerStatisticsDatum>((player) => ({
      id: player.usuarioId,
      name: player.nombre,
      avatarUrl: player.fotoUrl,
      position: player.posicion,
      goals: player.goles,
      assists: player.asistencias,
      minutes: player.minutos,
      attendancePct: player.asistenciaPct,
      trainingAttendances: player.asistenciasEntreno,
      contribution: player.contribucion,
    })),
    fatigueTrend,
    attendanceRanking: normalizePlayerRanking(
      players,
      (player) => player.asistenciaPct ?? 0,
      (value, player) => `${formatInteger(value)}% / ${formatInteger(player.asistenciasEntreno)} asist.`,
      (player) => player.posicion ?? 'Jugador'
    ),
    minutesRanking: normalizePlayerRanking(
      players,
      (player) => player.minutos,
      (value) => `${formatInteger(value)} min`,
      (player) => player.posicion ?? 'Jugador'
    ),
    attendanceTrend,
  }
}
