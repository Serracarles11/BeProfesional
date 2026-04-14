'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  ChartColumn,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Save,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'
import { withEquipo } from '@/app/home/utils'
import type { ReactNode } from 'react'

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

type MatchItem = {
  id: string
  fechaHora: string
  rival: string | null
  casaFuera: string | null
  lugar: string | null
  competicion: string | null
  estado: string | null
  golesFavor: number | null
  golesContra: number | null
}

type MatchSubmission = {
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  updatedAt: string | null
}

type CoachPlayerSubmission = {
  playerId: string
  name: string
  avatarUrl?: string | null
  position?: string | null
  dorsal?: number | null
  submission: MatchSubmission | null
}

type MatchesPayload =
  | {
      ok: true
      equipoId: string | null
      teamName: string
      role: string | null
      isCoach: boolean
      featuredMatch: MatchItem | null
      featuredMeta: {
        totalPlayers: number
        submittedPlayers: number
        progressPct: number
        canSubmit: boolean
        isOpenForStats: boolean
        mySubmission: MatchSubmission | null
        playerSubmissions: CoachPlayerSubmission[]
        totals: {
          goals: number
          assists: number
          yellows: number
          reds: number
          minutes: number
        }
      }
      history: MatchItem[]
    }
  | {
      ok: false
      error: string
    }

type SubmitResponse =
  | {
      ok: true
      submission: MatchSubmission
    }
  | {
      ok: false
      error: string
    }

type Status = 'loading' | 'ready' | 'error'

type StatsFormState = {
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

type CoachDraftRow = StatsFormState & {
  playerId: string
  name: string
  avatarUrl: string | null
  position: string | null
  dorsal: number | null
}

type NumericStatsField = keyof StatsFormState

const INITIAL_FORM: StatsFormState = {
  minutes: 0,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
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

function formatMatchDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMatchTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusPillLabel(match: MatchItem) {
  const normalized = normalizeText(match.estado)
  if (normalized === 'FINALIZADO') return 'Closed'
  if (normalized === 'PROGRAMADO') return 'Scheduled'
  return match.estado?.trim() || 'Open'
}

function featuredBadgeLabel(openForStats: boolean) {
  return openForStats ? 'Open for Stats' : 'Match Pending'
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.trunc(value), min), max)
}

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PL'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function buildReviewHref(equipoId: string | null, matchId: string) {
  const params = new URLSearchParams()
  params.set('review', matchId)
  if (equipoId) params.set('equipo', equipoId)
  return `/partidos?${params.toString()}`
}

function toCoachDraftRows(players: CoachPlayerSubmission[]): CoachDraftRow[] {
  return players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    avatarUrl: player.avatarUrl ?? null,
    position: player.position ?? null,
    dorsal: player.dorsal ?? null,
    minutes: player.submission?.minutes ?? 0,
    goals: player.submission?.goals ?? 0,
    assists: player.submission?.assists ?? 0,
    yellowCards: player.submission?.yellowCards ?? 0,
    redCards: player.submission?.redCards ?? 0,
  }))
}

function calculatePlayerRating(row: StatsFormState) {
  const rating =
    6 +
    Math.min(row.minutes, 90) / 90 +
    row.goals * 0.9 +
    row.assists * 0.6 -
    row.yellowCards * 0.25 -
    row.redCards * 1.1

  return Math.max(1, Math.min(10, Number(rating.toFixed(1))))
}

function SummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: string
  helper: string
  tone: 'primary' | 'tertiary'
}) {
  return (
    <div className="rounded-xl border border-white/40 bg-white p-6 shadow-[0px_20px_40px_rgba(0,93,182,0.02)]">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`[font-family:var(--font-plus-jakarta)] text-3xl font-extrabold ${tone === 'primary' ? 'text-[#005db6]' : 'text-[#705d00]'}`}>
          {value}
        </span>
        <span className="text-xs font-bold text-slate-400">{helper}</span>
      </div>
    </div>
  )
}

function SummaryHighlight({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#005db6] to-[#2b5bb5] p-6 shadow-xl shadow-[#005db6]/10">
      <div className="relative z-10">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/70">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="[font-family:var(--font-plus-jakarta)] text-3xl font-extrabold text-white">{value}</span>
        </div>
        <p className="mt-1 text-[10px] font-medium text-white/60">{helper}</p>
      </div>
      <span className="absolute -bottom-2 -right-2 select-none text-7xl text-white/10">●</span>
    </div>
  )
}

function AvatarChip({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return avatarUrl ? (
    <img className="h-6 w-6 rounded-full border-2 border-white object-cover" src={avatarUrl} alt={name} />
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#d6e3ff] text-[10px] font-bold text-[#005db6]">
      {getInitials(name)}
    </div>
  )
}

function CounterControl({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-[#005db6] hover:text-[#005db6]"
      >
        -
      </button>
      <span className="min-w-[12px] text-center text-sm font-bold">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-[#005db6] hover:text-[#005db6]"
      >
        +
      </button>
    </div>
  )
}

function CoachPlayerRowView({
  player,
  onDraftChange,
}: {
  player: CoachDraftRow
  onDraftChange: (playerId: string, field: NumericStatsField, value: number) => void
}) {
  const rating = calculatePlayerRating(player)

  return (
    <tr className="transition-colors hover:bg-slate-50/50">
      <td className="px-8 py-5">
        <div className="flex items-center gap-3">
          {player.avatarUrl ? (
            <img alt={player.name} className="h-10 w-10 rounded-full object-cover" src={player.avatarUrl} />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d6e3ff] text-sm font-bold text-[#005db6]">
              {getInitials(player.name)}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-[#181c20]">
              {player.dorsal ? `${player.dorsal}. ` : ''}
              {player.name}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {player.position || 'Player'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-5">
        <input
          className="w-16 rounded-lg border-2 border-[#005db6]/10 bg-white px-2 py-1.5 text-sm font-bold outline-none transition focus:border-[#005db6]"
          type="number"
          min={0}
          max={130}
          value={player.minutes}
          onChange={(event) => onDraftChange(player.playerId, 'minutes', clampInt(Number(event.target.value), 0, 130))}
        />
      </td>
      <td className="px-4 py-5">
        <CounterControl value={player.goals} onChange={(next) => onDraftChange(player.playerId, 'goals', clampInt(next, 0, 30))} />
      </td>
      <td className="px-4 py-5">
        <CounterControl value={player.assists} onChange={(next) => onDraftChange(player.playerId, 'assists', clampInt(next, 0, 30))} />
      </td>
      <td className="px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-3 rounded-sm bg-yellow-400" />
            <CounterControl
              value={player.yellowCards}
              onChange={(next) => onDraftChange(player.playerId, 'yellowCards', clampInt(next, 0, 30))}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-3 rounded-sm bg-red-600" />
            <CounterControl
              value={player.redCards}
              onChange={(next) => onDraftChange(player.playerId, 'redCards', clampInt(next, 0, 30))}
            />
          </div>
        </div>
      </td>
      <td className="px-8 py-5">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className={`text-sm ${index < Math.round(rating / 2) ? 'text-[#caa900]' : 'text-slate-200'}`}>
              ★
            </span>
          ))}
          <span className="ml-2 text-sm font-bold text-[#181c20]">{rating}</span>
        </div>
      </td>
    </tr>
  )
}

function MetricPanel({
  title,
  badge,
  rows,
}: {
  title: string
  badge: string
  rows: Array<{ label: string; value: number }>
}) {
  return (
    <div className="rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(0,93,182,0.02)]">
      <div className="mb-6 flex items-center justify-between">
        <h4 className="[font-family:var(--font-plus-jakarta)] font-bold text-[#181c20]">{title}</h4>
        <span className="rounded bg-[#005db6]/5 px-2 py-1 text-xs font-bold text-[#005db6]">{badge}</span>
      </div>
      <div className="space-y-6">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex justify-between text-xs font-bold">
              <span className="uppercase tracking-wider text-slate-500">{row.label}</span>
              <span className="text-[#005db6]">{row.value}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#a9c7ff]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#005db6] to-[#2b5bb5]"
                style={{ width: `${row.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoachMatchReview({
  payload,
  featuredMatch,
  drafts,
  isSubmitting,
  submitError,
  onDraftChange,
  onDiscard,
  onSave,
}: {
  payload: Extract<MatchesPayload, { ok: true }>
  featuredMatch: MatchItem
  drafts: CoachDraftRow[]
  isSubmitting: boolean
  submitError: string
  onDraftChange: (playerId: string, field: NumericStatsField, value: number) => void
  onDiscard: () => void
  onSave: () => void
}) {
  const totals = useMemo(
    () =>
      drafts.reduce(
        (acc, row) => {
          acc.goals += row.goals
          acc.assists += row.assists
          acc.minutes += row.minutes
          if (row.minutes > 0 || row.goals > 0 || row.assists > 0 || row.yellowCards > 0 || row.redCards > 0) {
            acc.reported += 1
          }
          acc.reds += row.redCards
          acc.ratingTotal += calculatePlayerRating(row)
          return acc
        },
        { goals: 0, assists: 0, minutes: 0, reported: 0, reds: 0, ratingTotal: 0 }
      ),
    [drafts]
  )

  const avgRating = drafts.length > 0 ? (totals.ratingTotal / drafts.length).toFixed(1) : '0.0'
  const participationLabel = `${totals.reported}/${payload.featuredMeta.totalPlayers}`

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
      <LeftNavigation equipoId={payload.equipoId ?? undefined} teamName={payload.teamName} />

      <section className="min-w-0 flex-1 bg-[#f7f9fe] px-4 pb-24 pt-8 md:px-8 md:pb-8 xl:px-10">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <nav className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                <span>Matches</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-semibold text-[#005db6]">Match Review</span>
              </nav>
              <h1 className="[font-family:var(--font-plus-jakarta)] text-3xl font-extrabold tracking-tight text-[#181c20]">
                Review Match Stats:{' '}
                <span className="text-[#005db6]">
                  {payload.teamName} vs {featuredMatch.rival || 'Rival'}
                </span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onDiscard}
                disabled={isSubmitting}
                className="rounded-full border-2 border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#005db6] to-[#2b5bb5] px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#005db6]/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Finalize and Save'}
              </button>
            </div>
          </div>

          <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-4">
            <SummaryCard label="Total Goals" value={String(totals.goals)} helper={`${featuredMatch.golesFavor ?? totals.goals} official`} tone="primary" />
            <SummaryCard label="Total Assists" value={String(totals.assists)} helper="In-match play" tone="primary" />
            <SummaryCard label="Avg Rating" value={avgRating} helper="Team Consistency" tone="tertiary" />
            <SummaryHighlight label="Participation" value={participationLabel} helper="Players with reported stats" />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-50 bg-white shadow-[0px_20px_40px_rgba(0,93,182,0.04)]">
            <div className="flex flex-col gap-4 border-b border-slate-50 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
              <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#181c20]">
                Match Roster & Performance
              </h3>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <div className="flex -space-x-2">
                  {drafts.slice(0, 4).map((player) => (
                    <AvatarChip key={player.playerId} name={player.name} avatarUrl={player.avatarUrl} />
                  ))}
                </div>
                <span className="ml-2">+{Math.max(drafts.length - 4, 0)} more</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="bg-slate-50/60">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Player</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Minutes</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Goals</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Assists</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Cards</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {drafts.map((player) => (
                    <CoachPlayerRowView
                      key={player.playerId}
                      player={player}
                      onDraftChange={onDraftChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-slate-50/50 px-8 py-4">
              <span className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-400">
                Roster Synced
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Showing {drafts.length} of {payload.featuredMeta.totalPlayers} Players
              </span>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            <MetricPanel
              title="Team Stamina Load"
              badge="High Intensity"
              rows={[
                {
                  label: 'Attack Phase Efficiency',
                  value: clampInt(Math.round((totals.goals * 18 + totals.assists * 12 + 40) / Math.max(drafts.length, 1)), 0, 100),
                },
                {
                  label: 'Defensive Transition',
                  value: clampInt(100 - totals.reds * 20 - totals.goals * 2, 35, 100),
                },
              ]}
            />

            <div className="rounded-xl bg-white p-8 shadow-[0px_20px_40px_rgba(0,93,182,0.02)]">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="[font-family:var(--font-plus-jakarta)] font-bold text-[#181c20]">Match Highlights</h4>
                <Link
                  href={withEquipo('/estadisticas', payload.equipoId)}
                  className="flex items-center gap-1 text-xs font-bold text-[#005db6] hover:underline"
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {drafts
                  .filter((player) => player.goals > 0 || player.assists > 0)
                  .slice(0, 4)
                  .map((player, index) => (
                    <div key={player.playerId} className="rounded-lg bg-slate-50 p-3 transition-all hover:bg-[#005db6]/5">
                      <div className="mb-2 flex aspect-video items-center justify-center rounded-md bg-gradient-to-br from-[#d6e3ff] to-[#759efd]">
                        <span className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#005db6]">
                          {player.goals > 0 ? 'GOAL' : 'ASSIST'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Highlight {index + 1}: {player.name}
                      </p>
                    </div>
                  ))}
                {drafts.filter((player) => player.goals > 0 || player.assists > 0).length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Todavia no hay acciones destacadas registradas en este partido.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {submitError ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {submitError}
            </div>
          ) : null}
      </section>
    </div>
  )
}

function PlayerPartidosView({
  payload,
  featuredMatch,
  featuredMeta,
  matchHistory,
  isModalOpen,
  form,
  isSubmitting,
  submitError,
  canSubmitStats,
  openStatsModal,
  closeModal,
  setFormValue,
  submitStats,
}: {
  payload: Extract<MatchesPayload, { ok: true }>
  featuredMatch: MatchItem | null
  featuredMeta: Extract<MatchesPayload, { ok: true }>['featuredMeta'] | null
  matchHistory: MatchItem[]
  isModalOpen: boolean
  form: StatsFormState
  isSubmitting: boolean
  submitError: string
  canSubmitStats: boolean
  openStatsModal: () => void
  closeModal: () => void
  setFormValue: (key: NumericStatsField, value: number) => void
  submitStats: () => void
}) {
  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <LeftNavigation equipoId={payload.equipoId ?? undefined} teamName={payload.teamName} />

        <main className="w-full px-4 pb-24 pt-8 md:px-8 md:pb-8 xl:px-10">
          <header className="mx-auto mb-8 w-full max-w-6xl">
            <h1 className="[font-family:var(--font-plus-jakarta)] text-4xl font-black tracking-tight md:text-5xl">
              Partidos
            </h1>
            <p className="mt-2 text-base font-medium text-[#414754]">
              Gestiona encuentros y registra estadisticas individuales sin salir de Beprofessional.
            </p>
          </header>

          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              {featuredMatch ? (
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#005db6] to-[#2b5bb5] p-8 text-white shadow-[0px_20px_40px_rgba(0,93,182,0.22)]">
                  <div className="absolute -right-24 -top-24 opacity-10">
                    <span className="[font-family:var(--font-plus-jakarta)] text-[280px] font-black">O</span>
                  </div>

                  <div className="relative z-10">
                    <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row">
                      <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 backdrop-blur-md">
                          <span className="text-xs font-bold uppercase tracking-[0.14em]">
                            Match of the Week
                          </span>
                        </div>
                        <h2 className="[font-family:var(--font-plus-jakarta)] text-4xl font-black italic tracking-tight md:text-5xl">
                          {featuredMatch.rival || 'Rival pendiente'}
                        </h2>
                        <p className="mt-2 text-lg font-medium text-white/80">
                          {featuredMatch.lugar || 'Sede por confirmar'} |{' '}
                          {featuredMatch.casaFuera || 'Condicion por confirmar'}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="[font-family:var(--font-plus-jakarta)] text-4xl font-black">
                          {formatMatchTime(featuredMatch.fechaHora)}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#d9e2ff]">
                          {formatMatchDate(featuredMatch.fechaHora)}
                        </p>
                        <span className="mt-4 inline-flex rounded-xl bg-[#ffe170] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#221b00]">
                          {featuredMatch.competicion || 'Competicion'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-white/20 pt-7 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/20 text-center text-[26px] leading-10">
                          ✓
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                            Estado
                          </p>
                          <p className="text-lg font-bold">
                            {featuredBadgeLabel(Boolean(featuredMeta?.isOpenForStats))}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {payload.isCoach ? (
                          <Link
                            href={buildReviewHref(payload.equipoId, featuredMatch.id)}
                            className="rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-[#005db6] shadow-lg transition hover:bg-[#d9e2ff]"
                          >
                            Ver datos
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={openStatsModal}
                            disabled={!canSubmitStats}
                            className="rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-[#005db6] shadow-lg transition hover:bg-[#d9e2ff] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Registrar mis estadisticas
                          </button>
                        )}
                        <Link
                          href={withEquipo('/estadisticas', payload.equipoId)}
                          className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-3xl border border-[#dfe3e8] bg-white p-8">
                  <h2 className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">
                    Sin partido destacado
                  </h2>
                  <p className="mt-2 text-sm text-[#5f6776]">
                    No hay partidos cargados para esta semana todavia.
                  </p>
                </section>
              )}

              <section className="rounded-3xl bg-white p-8 shadow-[0px_20px_40px_rgba(0,93,182,0.08)]">
                <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#005db6]">
                      Participacion del Equipo
                    </h3>
                    <p className="text-sm font-medium text-[#414754]">
                      {featuredMeta?.submittedPlayers ?? 0} de {featuredMeta?.totalPlayers ?? 0}{' '}
                      jugadores han subido datos del partido.
                    </p>
                  </div>
                  <span className="[font-family:var(--font-plus-jakarta)] text-4xl font-black text-[#005db6]">
                    {featuredMeta?.progressPct ?? 0}%
                  </span>
                </div>

                <div className="mb-6 h-4 w-full overflow-hidden rounded-full bg-[#dfe3e8]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#005db6] to-[#2b5bb5]"
                    style={{ width: `${featuredMeta?.progressPct ?? 0}%` }}
                  />
                </div>

                {!featuredMeta?.canSubmit ? (
                  <p className="text-xs font-semibold text-[#5f6776]">
                    No tienes permisos para editar estadisticas en este flujo.
                  </p>
                ) : !featuredMeta.isOpenForStats ? (
                  <p className="text-xs font-semibold text-[#5f6776]">
                    Podras cargar tus datos cuando el partido haya comenzado o finalizado.
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-[#5f6776]">
                    Tus datos se pueden actualizar para corregir minutos o tarjetas.
                  </p>
                )}
              </section>
            </div>

            <aside className="space-y-4 lg:col-span-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="[font-family:var(--font-plus-jakarta)] text-xl font-black text-[#181c20]">
                  Historial Reciente
                </h3>
                <Link
                  href={withEquipo('/estadisticas', payload.equipoId)}
                  className="text-sm font-bold text-[#005db6] hover:underline"
                >
                  Ver todo
                </Link>
              </div>

              {matchHistory.length === 0 ? (
                <div className="rounded-3xl border border-[#dfe3e8] bg-white p-5 text-sm text-[#5f6776]">
                  Aun no hay partidos finalizados.
                </div>
              ) : (
                matchHistory.map((match) => {
                  const hasScore = match.golesFavor !== null && match.golesContra !== null

                  return (
                    <article
                      key={match.id}
                      className="group rounded-3xl border border-transparent bg-white p-6 shadow-sm transition-all hover:border-[#005db6]/15"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <span className="rounded-full bg-[#ebeef3] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#414754]">
                          {statusPillLabel(match)}
                        </span>
                        <span className="text-xs font-bold text-[#5f6776]">
                          {formatMatchDate(match.fechaHora)}
                        </span>
                      </div>

                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#727785]">VS</p>
                          <p className="[font-family:var(--font-plus-jakarta)] text-2xl font-black leading-tight">
                            {match.rival || 'Rival'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl font-black text-[#005db6]">
                            {hasScore ? match.golesFavor : '-'}
                          </span>
                          <span className="text-lg font-bold text-[#b8beca]">-</span>
                          <span className="text-4xl font-black text-[#414754]">
                            {hasScore ? match.golesContra : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#ebeef3] pt-4">
                        <span className="text-xs font-bold text-[#727785]">
                          {match.competicion || 'Competicion'}
                        </span>
                        <Link
                          href={
                            payload.isCoach
                              ? buildReviewHref(payload.equipoId, match.id)
                              : withEquipo('/estadisticas', payload.equipoId)
                          }
                          className="inline-flex items-center gap-1 text-sm font-black text-[#005db6] transition-all group-hover:gap-2"
                        >
                          {payload.isCoach ? 'Ver datos' : 'Ver resumen'}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </article>
                  )
                })
              )}
            </aside>
          </div>
        </main>
      </div>

      <MobileMatchesNav equipoId={payload.equipoId} />

      {isModalOpen && featuredMatch ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#181c20]/40 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">
                  Registrar Estadisticas
                </h2>
                <p className="mt-1 text-sm text-[#5f6776]">
                  {featuredMatch.rival || 'Rival'} · {formatMatchDate(featuredMatch.fechaHora)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-[#727785] transition hover:bg-[#f1f4f9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="Minutos" value={form.minutes} onChange={(value) => setFormValue('minutes', value)} min={0} max={130} />
              <FieldInput label="Goles" value={form.goals} onChange={(value) => setFormValue('goals', value)} min={0} max={30} />
              <FieldInput label="Asistencias" value={form.assists} onChange={(value) => setFormValue('assists', value)} min={0} max={30} />
              <FieldInput label="Tarjetas amarillas" value={form.yellowCards} onChange={(value) => setFormValue('yellowCards', value)} min={0} max={30} />
              <div className="col-span-2 sm:col-span-1">
                <FieldInput label="Tarjetas rojas" value={form.redCards} onChange={(value) => setFormValue('redCards', value)} min={0} max={30} />
              </div>
            </div>

            {submitError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {submitError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-[#ebeef3] px-5 py-2.5 text-sm font-bold text-[#181c20] transition hover:bg-[#dfe3e8]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submitStats()}
                className="rounded-full bg-gradient-to-r from-[#005db6] to-[#2b5bb5] px-6 py-2.5 text-sm font-black text-white shadow-[0_10px_20px_rgba(0,93,182,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar estadisticas'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default function PartidosPage() {
  const searchParams = useSearchParams()
  const requestedTeamId = searchParams.get('equipo')
  const requestedReviewMatchId = searchParams.get('review')

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<Extract<MatchesPayload, { ok: true }> | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<StatsFormState>(INITIAL_FORM)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coachDrafts, setCoachDrafts] = useState<CoachDraftRow[]>([])

  const loadData = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const params = new URLSearchParams()
      if (requestedTeamId) params.set('equipo', requestedTeamId)
      if (requestedReviewMatchId) params.set('matchId', requestedReviewMatchId)
      const query = params.size > 0 ? `?${params.toString()}` : ''
      const response = await fetch(`/api/partidos${query}`, { cache: 'no-store' })
      const data = (await response.json()) as MatchesPayload

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'No se pudo cargar Partidos.' : data.error)
      }

      setPayload(data)
      setStatus('ready')
    } catch (loadError) {
      setStatus('error')
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar Partidos.')
    }
  }, [requestedReviewMatchId, requestedTeamId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!payload?.isCoach) {
      setCoachDrafts([])
      return
    }

    setCoachDrafts(toCoachDraftRows(payload.featuredMeta.playerSubmissions))
  }, [payload])

  const featuredMatch = payload?.featuredMatch ?? null
  const featuredMeta = payload?.featuredMeta ?? null
  const matchHistory = useMemo(() => payload?.history ?? [], [payload])

  const canSubmitStats =
    Boolean(featuredMatch) &&
    Boolean(featuredMeta?.canSubmit) &&
    Boolean(featuredMeta?.isOpenForStats)

  const openStatsModal = () => {
    if (!featuredMatch || !featuredMeta?.canSubmit || !featuredMeta.isOpenForStats) return

    const initial = featuredMeta.mySubmission
      ? {
          minutes: featuredMeta.mySubmission.minutes,
          goals: featuredMeta.mySubmission.goals,
          assists: featuredMeta.mySubmission.assists,
          yellowCards: featuredMeta.mySubmission.yellowCards,
          redCards: featuredMeta.mySubmission.redCards,
        }
      : INITIAL_FORM

    setForm(initial)
    setSubmitError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setIsModalOpen(false)
  }

  const setFormValue = (key: NumericStatsField, value: number) => {
    const max = key === 'minutes' ? 130 : 30
    const next = Number.isFinite(value) ? clampInt(value, 0, max) : 0
    setForm((current) => ({ ...current, [key]: next }))
  }

  const submitStats = async () => {
    if (!featuredMatch) return

    setSubmitError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/partidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: featuredMatch.id,
          minutes: form.minutes,
          goals: form.goals,
          assists: form.assists,
          yellowCards: form.yellowCards,
          redCards: form.redCards,
        }),
      })

      const data = (await response.json()) as SubmitResponse
      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'No se pudo registrar la estadistica.' : data.error)
      }

      setIsModalOpen(false)
      await loadData()
    } catch (submitErr) {
      setSubmitError(
        submitErr instanceof Error ? submitErr.message : 'No se pudieron guardar tus estadisticas.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const onCoachDraftChange = (playerId: string, field: NumericStatsField, value: number) => {
    setCoachDrafts((current) =>
      current.map((row) => {
        if (row.playerId !== playerId) return row
        const max = field === 'minutes' ? 130 : 30
        return { ...row, [field]: clampInt(value, 0, max) }
      })
    )
  }

  const discardCoachChanges = () => {
    if (!payload?.isCoach) return
    setCoachDrafts(toCoachDraftRows(payload.featuredMeta.playerSubmissions))
    setSubmitError('')
  }

  const saveCoachReview = async () => {
    if (!payload?.isCoach || !featuredMatch) return

    setSubmitError('')
    setIsSubmitting(true)

    try {
      for (const row of coachDrafts) {
        const response = await fetch('/api/partidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: featuredMatch.id,
            playerId: row.playerId,
            minutes: row.minutes,
            goals: row.goals,
            assists: row.assists,
            yellowCards: row.yellowCards,
            redCards: row.redCards,
          }),
        })

        const data = (await response.json()) as SubmitResponse
        if (!response.ok || !data.ok) {
          throw new Error(data.ok ? 'No se pudo guardar la review del partido.' : data.error)
        }
      }

      await loadData()
    } catch (saveErr) {
      setSubmitError(
        saveErr instanceof Error ? saveErr.message : 'No se pudieron guardar las estadisticas del partido.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f7f9fe] px-4 py-8">
        <p className="text-sm font-semibold text-[#5f6776]">Cargando partidos...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#f7f9fe] px-4 py-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-3 rounded-lg bg-[#005db6] px-4 py-2 text-xs font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!payload || !payload.equipoId) {
    return (
      <div className="min-h-screen bg-[#f7f9fe] px-4 py-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#dfe3e8] bg-white p-6">
          <h1 className="[font-family:var(--font-plus-jakarta)] text-xl font-black text-[#181c20]">
            Sin equipo activo
          </h1>
          <p className="mt-2 text-sm text-[#5f6776]">
            No encontramos un equipo para mostrar esta seccion.
          </p>
        </div>
      </div>
    )
  }

  if (payload.isCoach && featuredMatch && requestedReviewMatchId) {
    return (
      <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen [font-family:var(--font-manrope)] text-[#181c20]`}>
        <CoachMatchReview
          payload={payload}
          featuredMatch={featuredMatch}
          drafts={coachDrafts}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onDraftChange={onCoachDraftChange}
          onDiscard={discardCoachChanges}
          onSave={() => void saveCoachReview()}
        />
      </div>
    )
  }

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)] text-[#181c20]`}>
      <PlayerPartidosView
        payload={payload}
        featuredMatch={featuredMatch}
        featuredMeta={featuredMeta}
        matchHistory={matchHistory}
        isModalOpen={isModalOpen}
        form={form}
        isSubmitting={isSubmitting}
        submitError={submitError}
        canSubmitStats={canSubmitStats}
        openStatsModal={openStatsModal}
        closeModal={closeModal}
        setFormValue={setFormValue}
        submitStats={() => void submitStats()}
      />
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#5f6776]">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-[#dfe3e8] bg-[#f7f9fe] px-3 py-2.5 text-sm font-semibold text-[#181c20] outline-none transition focus:border-[#759efd]"
      />
    </label>
  )
}

function MobileMatchesNav({ equipoId }: { equipoId?: string | null }) {
  return (
    <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-between bg-white/90 px-8 py-3 backdrop-blur-lg md:hidden">
      <MobileNavLink href={withEquipo('/home', equipoId)} label="Home" icon={<LayoutDashboard className="h-4 w-4" />} />
      <MobileNavLink href={withEquipo('/jugadores', equipoId)} label="Players" icon={<Users className="h-4 w-4" />} />
      <MobileNavLink href={withEquipo('/partidos', equipoId)} label="Matches" icon={<CalendarDays className="h-4 w-4" />} active />
      <MobileNavLink href={withEquipo('/estadisticas', equipoId)} label="Reports" icon={<ChartColumn className="h-4 w-4" />} />
      <MobileNavLink href={withEquipo('/chat', equipoId)} label="Chat" icon={<MessageSquare className="h-4 w-4" />} />
    </nav>
  )
}

function MobileNavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string
  label: string
  icon: ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 ${active ? 'text-[#005db6]' : 'text-[#727785]'}`}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </Link>
  )
}
