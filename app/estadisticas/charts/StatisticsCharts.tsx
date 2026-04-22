'use client'

import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { Activity, Timer, TrendingUp, Users } from 'lucide-react'
import { EChart } from './EChart'
import type { StatisticsChartsPayload, PlayerRankingDatum } from './types'

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
  children,
  className = '',
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
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
      </div>
      {children}
    </article>
  )
}

function buildGoalsOption(data: StatisticsChartsPayload['matches']): EChartsCoreOption {
  return {
    color: [CHART_COLORS.primary, CHART_COLORS.against],
    animationDuration: 650,
    dataset: {
      source: data.map((match) => ({
        match: match.label,
        date: match.date ?? '',
        opponent: match.opponent ?? match.label,
        favor: match.goalsFor,
        against: match.goalsAgainst,
      })),
    },
    legend: {
      top: 0,
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
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(0,93,182,0.06)' },
      },
      borderColor: '#d9e4f7',
      borderWidth: 1,
      backgroundColor: 'rgba(255,255,255,0.96)',
      textStyle: { color: '#181c20', fontWeight: 700 },
      valueFormatter: (value: unknown) => `${value} goles`,
      extraCssText: 'box-shadow:0 18px 40px rgba(0,93,182,0.12);border-radius:12px;',
    },
    grid: {
      top: 52,
      left: 44,
      right: 16,
      bottom: 74,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      axisTick: { show: false },
      axisLine: { lineStyle: { color: CHART_COLORS.grid } },
      axisLabel: {
        color: CHART_COLORS.muted,
        fontWeight: 700,
        rotate: data.length > 5 ? 28 : 0,
        interval: 0,
        formatter: (value: string) => {
          const label = value.replace(/^\d+\.\s*/, '')
          return label.length > 15 ? `${label.slice(0, 15)}...` : label
        },
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: CHART_COLORS.muted, fontWeight: 700 },
      splitLine: { lineStyle: { color: CHART_COLORS.grid, type: 'dashed' } },
    },
    series: [
      {
        name: 'Goles a favor',
        type: 'bar',
        encode: { x: 'match', y: 'favor' },
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: { focus: 'series' },
      },
      {
        name: 'Goles en contra',
        type: 'bar',
        encode: { x: 'match', y: 'against' },
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: { focus: 'series' },
      },
    ],
  }
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
  const goalsOption = useMemo(() => buildGoalsOption(data.matches), [data.matches])
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
        title="Goals For vs Goals Against"
        subtitle="Comparativa partido a partido del balance ofensivo y defensivo."
        icon={<TrendingUp className="h-5 w-5" />}
        className="lg:col-span-12"
      >
        {data.matches.length > 0 ? (
          <EChart option={goalsOption} height={380} />
        ) : (
          <EmptyChart title="Registra resultados de partidos para activar este analisis." />
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
        className="lg:col-span-6"
      >
        {data.minutesRanking.length > 0 ? (
          <>
            <EChart option={minutesOption} height={330} />
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
