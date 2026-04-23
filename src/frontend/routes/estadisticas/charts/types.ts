export type MatchChartDatum = {
  id: string
  label: string
  opponent: string | null
  date: string | null
  goalsFor: number
  goalsAgainst: number
}

export type PlayerRankingDatum = {
  id: string
  name: string
  avatarUrl: string | null
  position: string | null
  value: number
  valueLabel: string
  helperLabel?: string
}

export type AttendanceTrendDatum = {
  id: string
  label: string
  date: string
  attended: number
  totalPlayers: number
  percentage: number | null
}

export type PlayerStatisticsDatum = {
  id: string
  name: string
  avatarUrl: string | null
  position: string | null
  goals: number
  assists: number
  minutes: number
  attendancePct: number | null
  trainingAttendances: number
  contribution: number
}

export type FatigueTrendDatum = {
  id: string
  label: string
  from: string
  to: string
  teamAverage: number | null
  playerValues: Record<string, number | null>
}

export type StatisticsChartsPayload = {
  matches: MatchChartDatum[]
  players: PlayerStatisticsDatum[]
  fatigueTrend: FatigueTrendDatum[]
  attendanceRanking: PlayerRankingDatum[]
  minutesRanking: PlayerRankingDatum[]
  attendanceTrend: AttendanceTrendDatum[]
}
