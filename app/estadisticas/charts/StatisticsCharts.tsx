'use client'

import { useMemo, useState } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { Activity, HeartPulse, Timer, Users } from 'lucide-react'
import { EChart } from './EChart'
import type { StatisticsChartsPayload, PlayerRankingDatum, PlayerStatisticsDatum } from './types'

type StatisticsChartsProps = {
  data: StatisticsChartsPayload
}

const CHART_COLORS = {
  primary: '#005db6',
  secondary: '#759efd',
  against: '#ba1a1a',
  tertiary: '#caa900',
  grid: '#e6edf7',
  text: '#414754',
  muted: '#727785',
}

type ChartCallbackParam = {
  value?: unknown
  dataIndex: number
  seriesName?: string
}

function firstParam(params: unknown): ChartCallbackParam {
  const value = Array.isArray(params) ? params[0] : params
  return (value ?? { dataIndex: 0 }) as ChartCallbackParam
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 1,
  }).format(value)
}

function valueToNumber(value: unknown) {
  if (Array.isArray(value)) return valueToNumber(value[1])
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function EmptyChart({ title }: { title: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-[#c7d7ef] bg-[#f8fbff] px-6 text-center">
      <div>
        <p className="[font-family:var(--font-plus-jakarta)] text-sm font-black text-[#181c20]">
          Sin datos suficientes
        </p>
        <p className="mt-1 text-sm font-semibold text-[#727785]">
          {title}
        </p>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <article className={`rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_20px_40px_rgba(0,93,182,0.06)] ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d6e3ff] text-[#005db6]">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="[font-family:var(--font-plus-jakarta)] text-lg font-black text-[#181c20]">
              {title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#727785]">{subtitle}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </article>
  )
}

function buildFatigueOption(
  data: StatisticsChartsPayload['fatigueTrend'],
  selectedPlayer: PlayerStatisticsDatum | null
): EChartsCoreOption {
  const selectedPlayerValues = selectedPlayer
    ? data.map((row) => [row.from, row.playerValues[selectedPlayer.id] ?? null])
    : []
  const teamAverageValues = data.map((row) => [row.from, row.teamAverage])

  return {
    color: selectedPlayer ? [CHART_COLORS.primary, CHART_COLORS.against] : [CHART_COLORS.primary],
    animationDuration: 650,
    title: {
      left: 'center',
      top: 2,
      text: selectedPlayer ? `Fatiga: ${selectedPlayer.name}` : 'Fatiga media del equipo',
      textStyle: {
        color: CHART_COLORS.text,
        fontSize: 14,
        fontWeight: 900,
      },
    },
    legend: {
      top: 30,
      right: 4,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
      textStyle: {
        color: CHART_COLORS.text,
        fontWeight: 700,
      },
    },
    tooltip: {
      trigger: 'axis',
      position: (point: unknown) => {
        if (Array.isArray(point) && typeof point[0] === 'number') return [point[0], '10%']
        return ['50%', '10%']
      },
      axisPointer: { type: 'line' },
      borderColor: '#d9e4f7',
      borderWidth: 1,
      backgroundColor: 'rgba(255,255,255,0.96)',
      textStyle: { color: '#181c20', fontWeight: 700 },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? (params as ChartCallbackParam[]) : [params as ChartCallbackParam]
        const row = data[rows[0]?.dataIndex ?? 0]
        const lines = rows
          .map((item) => `${item.seriesName ?? 'Fatiga'}: ${formatDecimal(valueToNumber(item.value))}/10`)
          .join('<br/>')
        return `<strong>${row?.label ?? ''}</strong><br/>${lines}`
      },
      extraCssText: 'box-shadow:0 18px 40px rgba(0,93,182,0.12);border-radius:12px;',
    },
    grid: {
      top: 72,
      left: 44,
      right: 16,
      bottom: 92,
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: CHART_COLORS.grid } },
      axisLabel: {
        color: CHART_COLORS.muted,
        fontWeight: 700,
        formatter: (value: number) =>
          new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
          }).format(new Date(value)),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 10,
      boundaryGap: [0, '100%'],
      axisLabel: { color: CHART_COLORS.muted, fontWeight: 700 },
      splitLine: { lineStyle: { color: CHART_COLORS.grid, type: 'dashed' } },
    },
    series: [
      {
        name: 'Media equipo',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: teamAverageValues,
        lineStyle: { width: 4 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0,93,182,0.22)' },
              { offset: 1, color: 'rgba(0,93,182,0.02)' },
            ],
          },
        },
      },
      ...(selectedPlayer
        ? [
            {
              name: selectedPlayer.name,
              type: 'line',
              smooth: true,
              symbolSize: 8,
              data: selectedPlayerValues,
              lineStyle: { width: 3, type: 'dashed' },
              emphasis: { focus: 'series' },
            },
          ]
        : []),
    ],
  }
}

function PlayerSelect({
  players,
  selectedPlayerId,
  onChange,
}: {
  players: PlayerStatisticsDatum[]
  selectedPlayerId: string
  onChange: (playerId: string) => void
}) {
  return (
    <select
      value={selectedPlayerId}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 max-w-[210px] rounded-lg border border-[#c7d7ef] bg-white px-3 text-sm font-black text-[#181c20] outline-none transition focus:border-[#005db6]"
      aria-label="Seleccionar jugador"
    >
      <option value="team">Media equipo</option>
      {players.map((player) => (
        <option key={player.id} value={player.id}>
          {player.name}
        </option>
      ))}
    </select>
  )
}

function MinutesPlayerMenu({
  players,
  selectedPlayerId,
  onChange,
}: {
  players: PlayerStatisticsDatum[]
  selectedPlayerId: string
  onChange: (playerId: string) => void
}) {
  return (
    <select
      value={selectedPlayerId}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 max-w-[230px] rounded-lg border border-[#c7d7ef] bg-white px-3 text-sm font-black text-[#181c20] outline-none transition focus:border-[#005db6]"
      aria-label="Seleccionar jugador para minutos"
    >
      <option value="all">Todos los jugadores</option>
      {players.map((player) => (
        <option key={player.id} value={player.id}>
          {player.name} · {formatInteger(player.minutes)} min
        </option>
      ))}
    </select>
  )
}

function MinutesPlayerSummary({
  players,
  selectedPlayer,
}: {
  players: PlayerStatisticsDatum[]
  selectedPlayer: PlayerStatisticsDatum | null
}) {
  const totalMinutes = players.reduce((acc, player) => acc + player.minutes, 0)
  const rows = selectedPlayer ? [selectedPlayer] : players

  return (
    <div className="mt-4 rounded-xl bg-[#f8fbff] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#727785]">
          {selectedPlayer ? selectedPlayer.name : 'Total plantilla'}
        </p>
        <p className="[font-family:var(--font-plus-jakarta)] text-xl font-black text-[#181c20]">
          {formatInteger(selectedPlayer?.minutes ?? totalMinutes)} min
        </p>
      </div>

      {!selectedPlayer ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rows
            .filter((player) => player.minutes > 0)
            .slice(0, 6)
            .map((player) => (
              <div key={player.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                <span className="truncate text-xs font-black text-[#181c20]">{player.name}</span>
                <span className="shrink-0 text-xs font-black text-[#005db6]">
                  {formatInteger(player.minutes)} min
                </span>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  )
}

function RankingAvatars({ rows }: { rows: PlayerRankingDatum[] }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {rows.slice(0, 4).map((player) => (
        <div key={player.id} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d6e3ff] text-xs font-black text-[#00468c]">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
            ) : (
              player.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-[#181c20]">{player.name}</p>
            <p className="truncate text-[11px] font-bold text-[#727785]">{player.valueLabel}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function buildRankingOption({
  rows,
  color,
  unit,
}: {
  rows: PlayerRankingDatum[]
  color: string
  unit: string
}): EChartsCoreOption {
  const orderedRows = [...rows].sort((left, right) => left.value - right.value)

  return {
    color: [color],
    animationDuration: 650,
    grid: {
      top: 8,
      left: 12,
      right: 34,
      bottom: 8,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      borderColor: '#d9e4f7',
      backgroundColor: 'rgba(255,255,255,0.96)',
      textStyle: { color: '#181c20', fontWeight: 700 },
      formatter: (params: unknown) => {
        const item = firstParam(params)
        const row = orderedRows[item.dataIndex]
        return `<strong>${row?.name ?? ''}</strong><br/>${formatInteger(Number(item.value))} ${unit}`
      },
      extraCssText: 'box-shadow:0 18px 40px rgba(0,93,182,0.12);border-radius:12px;',
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: CHART_COLORS.muted, fontWeight: 700 },
      splitLine: { lineStyle: { color: CHART_COLORS.grid, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: orderedRows.map((row) => row.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: CHART_COLORS.text,
        fontWeight: 800,
        width: 112,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: orderedRows.map((row) => row.value),
        barMaxWidth: 14,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: ChartCallbackParam) => formatInteger(Number(params.value)),
          color: CHART_COLORS.text,
          fontWeight: 900,
        },
        emphasis: {
          itemStyle: {
            shadowColor: 'rgba(0,93,182,0.2)',
            shadowBlur: 16,
          },
        },
      },
    ],
  }
}

function buildAttendanceTrendOption(data: StatisticsChartsPayload['attendanceTrend']): EChartsCoreOption {
  return {
    color: [CHART_COLORS.secondary],
    animationDuration: 650,
    tooltip: {
      trigger: 'axis',
      borderColor: '#d9e4f7',
      backgroundColor: 'rgba(255,255,255,0.96)',
      textStyle: { color: '#181c20', fontWeight: 700 },
      formatter: (params: unknown) => {
        const item = firstParam(params)
        const row = data[item.dataIndex]
        return `<strong>${row?.label ?? ''}</strong><br/>${row?.attended ?? 0}/${row?.totalPlayers ?? 0} jugadores`
      },
      extraCssText: 'box-shadow:0 18px 40px rgba(0,93,182,0.12);border-radius:12px;',
    },
    grid: {
      top: 12,
      left: 34,
      right: 16,
      bottom: 32,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((row) => row.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: CHART_COLORS.grid } },
      axisLabel: { color: CHART_COLORS.muted, fontWeight: 700 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        color: CHART_COLORS.muted,
        fontWeight: 700,
        formatter: '{value}%',
      },
      splitLine: { lineStyle: { color: CHART_COLORS.grid, type: 'dashed' } },
    },
    series: [
      {
        name: 'Asistencia',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: data.map((row) => Math.round(row.percentage ?? 0)),
        lineStyle: { width: 4 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(117,158,253,0.28)' },
              { offset: 1, color: 'rgba(117,158,253,0.02)' },
            ],
          },
        },
      },
    ],
  }
}

export function StatisticsCharts({ data }: StatisticsChartsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('team')
  const [selectedMinutesPlayerId, setSelectedMinutesPlayerId] = useState('all')
  const selectedPlayer = useMemo(
    () => data.players.find((player) => player.id === selectedPlayerId) ?? null,
    [data.players, selectedPlayerId]
  )
  const selectedMinutesPlayer = useMemo(
    () => data.players.find((player) => player.id === selectedMinutesPlayerId) ?? null,
    [data.players, selectedMinutesPlayerId]
  )
  const fatigueOption = useMemo(
    () => buildFatigueOption(data.fatigueTrend, selectedPlayer),
    [data.fatigueTrend, selectedPlayer]
  )
  const attendanceOption = useMemo(
    () => buildRankingOption({ rows: data.attendanceRanking, color: CHART_COLORS.primary, unit: 'asistencias' }),
    [data.attendanceRanking]
  )
  const minutesOption = useMemo(
    () => buildRankingOption({ rows: data.minutesRanking, color: CHART_COLORS.tertiary, unit: 'minutos' }),
    [data.minutesRanking]
  )
  const attendanceTrendOption = useMemo(
    () => buildAttendanceTrendOption(data.attendanceTrend),
    [data.attendanceTrend]
  )

  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <ChartCard
        title="Fatiga del equipo"
        subtitle="Media del equipo y evolucion personalizada por jugador."
        icon={<HeartPulse className="h-5 w-5" />}
        action={
          <PlayerSelect
            players={data.players}
            selectedPlayerId={selectedPlayerId}
            onChange={setSelectedPlayerId}
          />
        }
        className="lg:col-span-12"
      >
        {data.fatigueTrend.some((row) => row.teamAverage !== null) ? (
          <EChart option={fatigueOption} height={380} />
        ) : (
          <EmptyChart title="Registra check-ins de fatiga para activar este analisis." />
        )}
      </ChartCard>

      <ChartCard
        title="Training Attendance Leaders"
        subtitle="Ranking descendente de jugadores con mas asistencias a entrenamientos."
        icon={<Users className="h-5 w-5" />}
        className="lg:col-span-6"
      >
        {data.attendanceRanking.length > 0 ? (
          <>
            <EChart option={attendanceOption} height={330} />
            <RankingAvatars rows={data.attendanceRanking} />
          </>
        ) : (
          <EmptyChart title="Aun no hay asistencias de entrenamiento suficientes." />
        )}
      </ChartCard>

      <ChartCard
        title="Minutes Played Leaders"
        subtitle="Carga competitiva acumulada por jugador en partidos registrados."
        icon={<Timer className="h-5 w-5" />}
        action={
          <MinutesPlayerMenu
            players={data.players}
            selectedPlayerId={selectedMinutesPlayerId}
            onChange={setSelectedMinutesPlayerId}
          />
        }
        className="lg:col-span-6"
      >
        {data.minutesRanking.length > 0 ? (
          <>
            <EChart option={minutesOption} height={330} />
            <MinutesPlayerSummary selectedPlayer={selectedMinutesPlayer} players={data.players} />
            <RankingAvatars rows={data.minutesRanking} />
          </>
        ) : (
          <EmptyChart title="Registra minutos por partido para ver el ranking." />
        )}
      </ChartCard>

      {data.attendanceTrend.length > 1 ? (
        <ChartCard
          title="Attendance Trend"
          subtitle="Evolucion de asistencia del equipo en las ultimas sesiones."
          icon={<Activity className="h-5 w-5" />}
          className="lg:col-span-12"
        >
          <EChart option={attendanceTrendOption} height={300} />
        </ChartCard>
      ) : null}
    </section>
  )
}
