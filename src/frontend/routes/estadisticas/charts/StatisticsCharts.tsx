'use client'

import { useMemo, useState } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { Activity, AlertTriangle, ArrowDown, ArrowUp, HeartPulse, Minus, Timer, Users } from 'lucide-react'
import { EChart } from './EChart'
import type { StatisticsChartsPayload, PlayerRankingDatum, PlayerStatisticsDatum } from './types'

type StatisticsChartsProps = {
  data: StatisticsChartsPayload
}

const CHART_COLORS = {
  primary: '#1A73E8',
  secondary: '#60a5fa',
  against: '#ef4444',
  tertiary: '#f59e0b',
  grid: '#e8edf5',
  text: '#334155',
  muted: '#94a3b8',
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
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(value))
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)
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
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#dce8f8] bg-[#f8fbff] px-6 text-center">
      <div>
        <p className="[font-family:var(--font-plus-jakarta)] text-sm font-black text-[#181c20]">Sin datos suficientes</p>
        <p className="mt-1 text-sm font-semibold text-[#727785]">{title}</p>
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
  accent = '#1A73E8',
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  accent?: string
}) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-[0_4px_24px_rgba(26,115,232,0.07)] ${className}`}>
      <div className="border-b border-[#f0f4fa] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${accent}18`, color: accent }}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="[font-family:var(--font-plus-jakarta)] text-[15px] font-black text-[#181c20]">{title}</h2>
              <p className="mt-0.5 text-xs font-semibold text-[#94a3b8]">{subtitle}</p>
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </article>
  )
}

// ─── Fatigue zone helpers ──────────────────────────────────────

type FatigueZone = { label: string; color: string; bg: string; range: string }

function getFatigueZone(value: number | null): FatigueZone {
  if (value === null) return { label: 'Sin datos', color: '#94a3b8', bg: '#f1f5f9', range: '--' }
  if (value <= 3) return { label: 'Óptima', color: '#16a34a', bg: '#dcfce7', range: '0–3' }
  if (value <= 6) return { label: 'Moderada', color: '#ca8a04', bg: '#fef9c3', range: '4–6' }
  if (value <= 8) return { label: 'Alta', color: '#ea580c', bg: '#ffedd5', range: '7–8' }
  return { label: 'Extrema', color: '#dc2626', bg: '#fee2e2', range: '9–10' }
}

// ─── Fatigue chart option ──────────────────────────────────────

function buildFatigueOption(
  data: StatisticsChartsPayload['fatigueTrend'],
  selectedPlayer: PlayerStatisticsDatum | null
): EChartsCoreOption {
  const teamAverageValues = data.map((row) => [row.from, row.teamAverage])
  const selectedPlayerValues = selectedPlayer
    ? data.map((row) => [row.from, row.playerValues[selectedPlayer.id] ?? null])
    : []

  return {
    animationDuration: 700,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      position: (point: unknown) => {
        if (Array.isArray(point) && typeof point[0] === 'number') return [point[0], '6%']
        return ['50%', '6%']
      },
      axisPointer: { type: 'line', lineStyle: { color: '#1A73E8', width: 1.5, type: 'dashed' } },
      borderColor: '#dce8f8',
      borderWidth: 1,
      backgroundColor: 'rgba(255,255,255,0.98)',
      padding: [10, 14],
      textStyle: { color: '#181c20', fontWeight: 700, fontSize: 12 },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? (params as ChartCallbackParam[]) : [params as ChartCallbackParam]
        const row = data[rows[0]?.dataIndex ?? 0]
        const lines = rows
          .map((item) => {
            const val = valueToNumber(item.value)
            const zone = getFatigueZone(val)
            return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.seriesName === 'Media equipo' ? '#1A73E8' : '#ef4444'};margin-right:6px"></span>${item.seriesName ?? 'Fatiga'}: <strong>${formatDecimal(val)}/10</strong> <span style="color:${zone.color};font-size:11px">(${zone.label})</span>`
          })
          .join('<br/>')
        return `<div style="font-size:11px;color:#64748b;margin-bottom:4px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em">${row?.label ?? ''}</div>${lines}`
      },
      extraCssText: 'box-shadow:0 20px 48px rgba(26,115,232,0.14);border-radius:14px;',
    },
    legend: {
      top: 8,
      right: 8,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 18,
      textStyle: { color: '#475569', fontWeight: 700, fontSize: 12 },
    },
    grid: { top: 48, left: 16, right: 20, bottom: 24, containLabel: true },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: {
        color: '#94a3b8',
        fontWeight: 700,
        fontSize: 11,
        formatter: (value: number) =>
          new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(value)),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 10,
      interval: 2,
      axisLabel: { color: '#94a3b8', fontWeight: 700, fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed', width: 1.5 } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Media equipo',
        type: 'line',
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        emphasis: { scale: true, focus: 'series' },
        data: teamAverageValues,
        lineStyle: { width: 3, color: '#1A73E8', shadowBlur: 8, shadowColor: 'rgba(26,115,232,0.30)' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(26,115,232,0.18)' },
              { offset: 0.7, color: 'rgba(26,115,232,0.04)' },
              { offset: 1, color: 'rgba(26,115,232,0)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 7, name: 'Zona de riesgo' }],
          lineStyle: { color: '#f97316', type: 'dashed', width: 1.5, opacity: 0.7 },
          label: {
            show: true,
            position: 'insideEndTop',
            color: '#f97316',
            fontWeight: 800,
            fontSize: 10,
            formatter: 'Zona de riesgo',
          },
        },
        markArea: {
          silent: true,
          data: [
            [
              { yAxis: 0, itemStyle: { color: 'rgba(22,163,74,0.045)' } },
              { yAxis: 3 },
            ],
            [
              { yAxis: 3, itemStyle: { color: 'rgba(202,138,4,0.045)' } },
              { yAxis: 6 },
            ],
            [
              { yAxis: 6, itemStyle: { color: 'rgba(249,115,22,0.06)' } },
              { yAxis: 8 },
            ],
            [
              { yAxis: 8, itemStyle: { color: 'rgba(220,38,38,0.07)' } },
              { yAxis: 10 },
            ],
          ],
        },
      },
      ...(selectedPlayer
        ? [
            {
              name: selectedPlayer.name,
              type: 'line' as const,
              smooth: 0.4,
              symbol: 'circle',
              symbolSize: 7,
              data: selectedPlayerValues,
              lineStyle: { width: 2.5, color: '#ef4444', type: 'dashed' as const },
              itemStyle: { color: '#ef4444' },
              emphasis: { focus: 'series' as const },
            },
          ]
        : []),
    ],
  }
}

// ─── Player pill selector ──────────────────────────────────────

function PlayerPills({
  players,
  selectedPlayerId,
  onChange,
}: {
  players: PlayerStatisticsDatum[]
  selectedPlayerId: string
  onChange: (id: string) => void
}) {
  const visible = players.slice(0, 5)
  const hasMore = players.length > 5

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onChange('team')}
        className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest transition-all ${
          selectedPlayerId === 'team'
            ? 'bg-[#1A73E8] text-white shadow-[0_4px_12px_rgba(26,115,232,0.30)]'
            : 'border border-[#e8edf5] bg-white text-[#44474E] hover:border-[#1A73E8]/30 hover:bg-[#f0f6ff] hover:text-[#1A73E8]'
        }`}
      >
        Equipo
      </button>
      {visible.map((player) => (
        <button
          key={player.id}
          onClick={() => onChange(player.id)}
          className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
            selectedPlayerId === player.id
              ? 'bg-[#ef4444] text-white shadow-[0_4px_12px_rgba(239,68,68,0.28)]'
              : 'border border-[#e8edf5] bg-white text-[#44474E] hover:border-red-200 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          {player.name.split(' ')[0]}
        </button>
      ))}
      {hasMore && (
        <span className="rounded-full border border-[#e8edf5] bg-[#f8fbff] px-3 py-1.5 text-[11px] font-bold text-[#94a3b8]">
          +{players.length - 5} más
        </span>
      )}
    </div>
  )
}

// ─── Fatigue KPI bar ──────────────────────────────────────────

function FatigueKpiBar({
  fatigueTrend,
  players,
  selectedPlayerId,
}: {
  fatigueTrend: StatisticsChartsPayload['fatigueTrend']
  players: PlayerStatisticsDatum[]
  selectedPlayerId: string
}) {
  const validRows = fatigueTrend.filter((r) => r.teamAverage !== null)
  const lastRow = validRows.at(-1) ?? null
  const prevRow = validRows.at(-2) ?? null

  const currentAvg = lastRow?.teamAverage ?? null
  const prevAvg = prevRow?.teamAverage ?? null
  const trend = currentAvg !== null && prevAvg !== null ? currentAvg - prevAvg : null

  const atRiskCount = lastRow
    ? Object.values(lastRow.playerValues).filter((v) => v !== null && (v as number) > 7).length
    : 0

  const zone = getFatigueZone(currentAvg)

  const selectedPlayer = selectedPlayerId !== 'team'
    ? players.find((p) => p.id === selectedPlayerId) ?? null
    : null

  const playerLatest = selectedPlayer && lastRow
    ? lastRow.playerValues[selectedPlayer.id] ?? null
    : null

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Current level */}
      <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fbff] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">Fatiga media</p>
        <div className="mt-2 flex items-end gap-1.5">
          <span className="[font-family:var(--font-plus-jakarta)] text-3xl font-black leading-none text-[#181c20]">
            {currentAvg !== null ? formatDecimal(currentAvg) : '--'}
          </span>
          <span className="mb-0.5 text-sm font-bold text-[#94a3b8]">/10</span>
        </div>
        <span
          className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-black"
          style={{ background: zone.bg, color: zone.color }}
        >
          {zone.label}
        </span>
      </div>

      {/* Trend */}
      <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fbff] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">Tendencia</p>
        <div className="mt-2 flex items-center gap-2">
          {trend === null ? (
            <Minus className="h-7 w-7 text-[#94a3b8]" />
          ) : trend > 0.3 ? (
            <ArrowUp className="h-7 w-7 text-[#ef4444]" />
          ) : trend < -0.3 ? (
            <ArrowDown className="h-7 w-7 text-[#16a34a]" />
          ) : (
            <Minus className="h-7 w-7 text-[#ca8a04]" />
          )}
          <span
            className="[font-family:var(--font-plus-jakarta)] text-2xl font-black"
            style={{
              color: trend === null ? '#94a3b8' : trend > 0.3 ? '#ef4444' : trend < -0.3 ? '#16a34a' : '#ca8a04',
            }}
          >
            {trend === null ? '--' : trend > 0.3 ? 'Subiendo' : trend < -0.3 ? 'Bajando' : 'Estable'}
          </span>
        </div>
        {trend !== null && (
          <p className="mt-1.5 text-[10px] font-bold text-[#94a3b8]">
            {trend > 0 ? '+' : ''}{formatDecimal(trend)} vs semana anterior
          </p>
        )}
      </div>

      {/* At risk */}
      <div className={`rounded-2xl border p-4 ${atRiskCount > 0 ? 'border-orange-200 bg-orange-50' : 'border-[#e8edf5] bg-[#f8fbff]'}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${atRiskCount > 0 ? 'text-orange-400' : 'text-[#94a3b8]'}`}>
          En riesgo
        </p>
        <div className="mt-2 flex items-center gap-2">
          {atRiskCount > 0 && <AlertTriangle className="h-5 w-5 text-orange-500" />}
          <span className={`[font-family:var(--font-plus-jakarta)] text-3xl font-black leading-none ${atRiskCount > 0 ? 'text-orange-600' : 'text-[#181c20]'}`}>
            {atRiskCount}
          </span>
        </div>
        <p className="mt-1.5 text-[10px] font-bold text-[#94a3b8]">
          {atRiskCount === 0 ? 'Ninguno supera 7/10' : `jugador${atRiskCount !== 1 ? 'es' : ''} con fatiga > 7`}
        </p>
      </div>

      {/* Selected player or periods */}
      <div className="rounded-2xl border border-[#e8edf5] bg-[#f8fbff] p-4">
        {selectedPlayer ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">
              {selectedPlayer.name.split(' ')[0]}
            </p>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="[font-family:var(--font-plus-jakarta)] text-3xl font-black leading-none text-[#181c20]">
                {playerLatest !== null ? formatDecimal(playerLatest as number) : '--'}
              </span>
              <span className="mb-0.5 text-sm font-bold text-[#94a3b8]">/10</span>
            </div>
            {playerLatest !== null && (
              <span
                className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-black"
                style={{ background: getFatigueZone(playerLatest as number).bg, color: getFatigueZone(playerLatest as number).color }}
              >
                {getFatigueZone(playerLatest as number).label}
              </span>
            )}
          </>
        ) : (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">Periodos</p>
            <span className="[font-family:var(--font-plus-jakarta)] mt-2 block text-3xl font-black leading-none text-[#181c20]">
              {validRows.length}
            </span>
            <p className="mt-1.5 text-[10px] font-bold text-[#94a3b8]">semanas con datos</p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Zone legend ───────────────────────────────────────────────

function FatigueZoneLegend() {
  const zones = [
    { label: 'Óptima', range: '0–3', color: '#16a34a', bg: '#dcfce7' },
    { label: 'Moderada', range: '4–6', color: '#ca8a04', bg: '#fef9c3' },
    { label: 'Alta', range: '7–8', color: '#ea580c', bg: '#ffedd5' },
    { label: 'Extrema', range: '9–10', color: '#dc2626', bg: '#fee2e2' },
  ]
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Zonas:</span>
      {zones.map(({ label, range, color, bg }) => (
        <span
          key={label}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black"
          style={{ background: bg, color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          {label} ({range})
        </span>
      ))}
    </div>
  )
}

// ─── PlayerSelect (native, used for minutes) ──────────────────

function PlayerSelect({
  players,
  selectedPlayerId,
  onChange,
}: {
  players: PlayerStatisticsDatum[]
  selectedPlayerId: string
  onChange: (id: string) => void
}) {
  return (
    <select
      value={selectedPlayerId}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 max-w-[210px] rounded-xl border border-[#e8edf5] bg-white px-3 text-xs font-bold text-[#181c20] outline-none transition focus:border-[#1A73E8]"
    >
      <option value="team">Media equipo</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
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
  onChange: (id: string) => void
}) {
  return (
    <select
      value={selectedPlayerId}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 max-w-[230px] rounded-xl border border-[#e8edf5] bg-white px-3 text-xs font-bold text-[#181c20] outline-none transition focus:border-[#1A73E8]"
    >
      <option value="all">Todos los jugadores</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>{p.name} · {formatInteger(p.minutes)} min</option>
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
  const totalMinutes = players.reduce((acc, p) => acc + p.minutes, 0)
  const rows = selectedPlayer ? [selectedPlayer] : players

  return (
    <div className="mt-4 rounded-2xl bg-[#f8fbff] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8]">
          {selectedPlayer ? selectedPlayer.name : 'Total plantilla'}
        </p>
        <p className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">
          {formatInteger(selectedPlayer?.minutes ?? totalMinutes)} min
        </p>
      </div>
      {!selectedPlayer && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rows.filter((p) => p.minutes > 0).slice(0, 6).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <span className="truncate text-xs font-bold text-[#181c20]">{p.name}</span>
              <span className="shrink-0 text-xs font-black text-[#1A73E8]">{formatInteger(p.minutes)} min</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RankingAvatars({ rows }: { rows: PlayerRankingDatum[] }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {rows.slice(0, 4).map((player, i) => (
        <div key={player.id} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] px-3 py-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dce8f8] text-xs font-black text-[#1A73E8]">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
            ) : (
              player.name.charAt(0).toUpperCase()
            )}
            {i < 3 && (
              <span className={`absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-white ${
                i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'
              }`}>
                {i + 1}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-[#181c20]">{player.name}</p>
            <p className="truncate text-[11px] font-bold text-[#94a3b8]">{player.valueLabel}</p>
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
  const orderedRows = [...rows].sort((l, r) => l.value - r.value)

  return {
    color: [color],
    animationDuration: 700,
    animationEasing: 'cubicOut',
    grid: { top: 8, left: 12, right: 40, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      borderColor: '#dce8f8',
      backgroundColor: 'rgba(255,255,255,0.98)',
      textStyle: { color: '#181c20', fontWeight: 700 },
      formatter: (params: unknown) => {
        const item = firstParam(params)
        const row = orderedRows[item.dataIndex]
        const fv = `${formatInteger(Number(item.value))}${unit === '%' ? '%' : ` ${unit}`}`
        return `<strong>${row?.name ?? ''}</strong><br/>${fv}`
      },
      extraCssText: 'box-shadow:0 20px 48px rgba(26,115,232,0.14);border-radius:14px;',
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', fontWeight: 700, fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: orderedRows.map((r) => r.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#475569', fontWeight: 800, fontSize: 12, width: 110, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: orderedRows.map((r) => r.value),
        barMaxWidth: 12,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
        label: {
          show: true,
          position: 'right',
          formatter: (params: ChartCallbackParam) => formatInteger(Number(params.value)),
          color: '#475569',
          fontWeight: 900,
          fontSize: 11,
        },
        emphasis: { itemStyle: { shadowColor: 'rgba(26,115,232,0.2)', shadowBlur: 16 } },
      },
    ],
  }
}

function buildAttendanceTrendOption(data: StatisticsChartsPayload['attendanceTrend']): EChartsCoreOption {
  return {
    color: [CHART_COLORS.secondary],
    animationDuration: 700,
    tooltip: {
      trigger: 'axis',
      borderColor: '#dce8f8',
      backgroundColor: 'rgba(255,255,255,0.98)',
      textStyle: { color: '#181c20', fontWeight: 700 },
      formatter: (params: unknown) => {
        const item = firstParam(params)
        const row = data[item.dataIndex]
        return `<strong>${row?.label ?? ''}</strong><br/>${row?.attended ?? 0}/${row?.totalPlayers ?? 0} jugadores`
      },
      extraCssText: 'box-shadow:0 20px 48px rgba(26,115,232,0.14);border-radius:14px;',
    },
    grid: { top: 12, left: 34, right: 16, bottom: 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((r) => r.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8', fontWeight: 700, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#94a3b8', fontWeight: 700, fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Asistencia',
        type: 'line',
        smooth: 0.4,
        symbolSize: 8,
        data: data.map((r) => Math.round(r.percentage ?? 0)),
        lineStyle: { width: 3, shadowBlur: 6, shadowColor: 'rgba(96,165,250,0.25)' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(96,165,250,0.22)' },
              { offset: 1, color: 'rgba(96,165,250,0)' },
            ],
          },
        },
      },
    ],
  }
}

// ─── Main export ───────────────────────────────────────────────

export function StatisticsCharts({ data }: StatisticsChartsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('team')
  const [selectedMinutesPlayerId, setSelectedMinutesPlayerId] = useState('all')

  const selectedPlayer = useMemo(
    () => data.players.find((p) => p.id === selectedPlayerId) ?? null,
    [data.players, selectedPlayerId]
  )
  const selectedMinutesPlayer = useMemo(
    () => data.players.find((p) => p.id === selectedMinutesPlayerId) ?? null,
    [data.players, selectedMinutesPlayerId]
  )
  const fatigueOption = useMemo(
    () => buildFatigueOption(data.fatigueTrend, selectedPlayer),
    [data.fatigueTrend, selectedPlayer]
  )
  const attendanceOption = useMemo(
    () => buildRankingOption({ rows: data.attendanceRanking, color: CHART_COLORS.primary, unit: '%' }),
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

  const hasFatigueData = data.fatigueTrend.some((r) => r.teamAverage !== null)

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">

      {/* ── Fatigue card ── */}
      <article className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-[0_4px_24px_rgba(26,115,232,0.07)] lg:col-span-12">
        {/* Header */}
        <div className="border-b border-[#f0f4fa] px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fee2e2] text-[#dc2626]">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h2 className="[font-family:var(--font-plus-jakarta)] text-[15px] font-black text-[#181c20]">
                  Fatiga del equipo
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-[#94a3b8]">
                  Media del equipo y evolución personalizada por jugador
                </p>
              </div>
            </div>
            {/* Player pills */}
            {hasFatigueData && data.players.length > 0 && (
              <PlayerPills
                players={data.players}
                selectedPlayerId={selectedPlayerId}
                onChange={setSelectedPlayerId}
              />
            )}
          </div>
        </div>

        <div className="p-6">
          {hasFatigueData ? (
            <>
              <FatigueKpiBar
                fatigueTrend={data.fatigueTrend}
                players={data.players}
                selectedPlayerId={selectedPlayerId}
              />
              <FatigueZoneLegend />
              <EChart option={fatigueOption} height={360} />
            </>
          ) : (
            <EmptyChart title="Registra check-ins de fatiga para activar este análisis." />
          )}
        </div>
      </article>

      {/* ── Attendance ranking ── */}
      <ChartCard
        title="Asistencias"
        subtitle="Ranking por % de entrenamientos asistidos."
        icon={<Users className="h-5 w-5" />}
        className="lg:col-span-6"
        accent="#1A73E8"
      >
        {data.attendanceRanking.length > 0 ? (
          <>
            <EChart option={attendanceOption} height={320} />
            <RankingAvatars rows={data.attendanceRanking} />
          </>
        ) : (
          <EmptyChart title="Aun no hay asistencias de entrenamiento suficientes." />
        )}
      </ChartCard>

      {/* ── Minutes ranking ── */}
      <ChartCard
        title="Minutos jugados"
        subtitle="Carga competitiva acumulada por jugador."
        icon={<Timer className="h-5 w-5" />}
        action={
          <MinutesPlayerMenu
            players={data.players}
            selectedPlayerId={selectedMinutesPlayerId}
            onChange={setSelectedMinutesPlayerId}
          />
        }
        className="lg:col-span-6"
        accent="#f59e0b"
      >
        {data.minutesRanking.length > 0 ? (
          <>
            <EChart option={minutesOption} height={320} />
            <MinutesPlayerSummary selectedPlayer={selectedMinutesPlayer} players={data.players} />
            <RankingAvatars rows={data.minutesRanking} />
          </>
        ) : (
          <EmptyChart title="Registra minutos por partido para ver el ranking." />
        )}
      </ChartCard>

      {/* ── Attendance trend ── */}
      {data.attendanceTrend.length > 1 && (
        <ChartCard
          title="Tendencia de asistencia"
          subtitle="Evolución de asistencia del equipo en las últimas sesiones."
          icon={<Activity className="h-5 w-5" />}
          className="lg:col-span-12"
          accent="#60a5fa"
        >
          <EChart option={attendanceTrendOption} height={280} />
        </ChartCard>
      )}
    </section>
  )
}
