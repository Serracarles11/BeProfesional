'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Calendar,
  ChevronRight,
  Dumbbell,
  Home,
  MessageSquare,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'

type EquipoActivo = {
  id: string
  nombre: string
  categoria: string | null
  temporada: string | null
}

type HomeApiResponse = {
  ok: boolean
  error?: string
  equipo: EquipoActivo | null
  kpis: {
    winRate: number
    pointsPerGame: number
    goals: number
    conceded: number
    possession: number
  }
  playerStats: Array<{
    id: string
    nombre: string
    posicion: string
    rating: number
    goals: number
    assists: number
    passAccuracy: number
  }>
  schedule: Array<{
    id: string
    tipo: 'Entrenamiento' | 'Partido'
    titulo: string
    fecha: string
    hora: string
    lugar: string
    rival?: string | null
  }>
  standings: Array<{
    pos: number
    team: string
    p: number
    w: number
    d: number
    l: number
    gd: number
    pts: number
  }>
  scores: Array<{
    id: string
    home: string
    away: string
    homeScore: number
    awayScore: number
    estado: string
  }>
}

type StatusState = 'loading' | 'ready' | 'error'

type ScheduleRow = {
  id: string
  tipo: string
  titulo: string
  fechaLabel: string
  hora: string
  lugar: string
  pillClass: string
  detailLine: string
}

type StandingRow = {
  id: string
  pos: number
  team: string
  record: string
  pts: number
  badgeClass: string
}

type ScoreRow = {
  id: string
  home: string
  away: string
  scoreLabel: string
  estado: string
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, active: true },
  { id: 'team', label: 'Equipo', icon: Users, active: false },
  { id: 'training', label: 'Entrenos', icon: Dumbbell, active: false },
  { id: 'matches', label: 'Partidos', icon: Trophy, active: false },
  { id: 'chat', label: 'Chat', icon: MessageSquare, active: false },
  { id: 'settings', label: 'Ajustes', icon: Settings, active: false },
]

const EMPTY_KPIS = {
  winRate: 0,
  pointsPerGame: 0,
  goals: 0,
  conceded: 0,
  possession: 0,
}

function DashboardCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="dashboard-card shadow-soft rounded-3xl p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white/70 px-3 py-1 text-xs font-medium text-gray-700"
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>
      {children}
    </section>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar-glass sticky top-6 hidden h-fit w-20 flex-col items-center gap-4 rounded-3xl p-4 md:flex">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
              item.active
                ? 'bg-gray-900 text-white shadow-soft'
                : 'bg-white/80 text-gray-500 hover:bg-white'
            }`}
            title={item.label}
          >
            <Icon className="h-5 w-5" />
          </button>
        )
      })}
    </aside>
  )
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[84px_1fr]">
        <div className="hidden md:block" />
        <div className="space-y-4">
          <div className="dashboard-card h-24 animate-pulse rounded-3xl" />
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="dashboard-card h-64 animate-pulse rounded-3xl" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="dashboard-card h-72 animate-pulse rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="dashboard-card rounded-3xl p-6 text-center">
          <p className="text-base font-medium text-red-600">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="dashboard-card rounded-3xl p-8 text-center md:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
            <Trophy className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Aun no tienes equipos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Crea tu primer equipo o unete con un codigo de invitacion para activar el dashboard.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCreate}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-soft"
            >
              Crear equipo
            </button>
            <button
              type="button"
              onClick={onJoin}
              className="rounded-2xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700"
            >
              Unirme con codigo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDateLabel(date: string) {
  const parsed = new Date(date)
  return parsed.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function buildScheduleRows(items: HomeApiResponse['schedule']): ScheduleRow[] {
  return items.map((item) => ({
    id: item.id,
    tipo: item.tipo,
    titulo: item.titulo,
    fechaLabel: formatDateLabel(item.fecha),
    hora: item.hora,
    lugar: item.lugar,
    pillClass:
      item.tipo === 'Partido'
        ? 'bg-indigo-100 text-indigo-700'
        : 'bg-emerald-100 text-emerald-700',
    detailLine: item.rival
      ? `${item.hora} · ${item.lugar} · vs ${item.rival}`
      : `${item.hora} · ${item.lugar}`,
  }))
}

function buildStandingRows(items: HomeApiResponse['standings']): StandingRow[] {
  return items.map((row) => {
    const badgeClass =
      row.pos === 1
        ? 'pos-1'
        : row.pos === 2
        ? 'pos-2'
        : row.pos === 3
        ? 'pos-3'
        : 'bg-gray-200 text-gray-700'

    return {
      id: `${row.team}-${row.pos}`,
      pos: row.pos,
      team: row.team,
      record: `${row.w}-${row.d}-${row.l}`,
      pts: row.pts,
      badgeClass,
    }
  })
}

function buildScoreRows(items: HomeApiResponse['scores']): ScoreRow[] {
  return items.map((score) => ({
    id: score.id,
    home: score.home,
    away: score.away,
    scoreLabel: `${score.homeScore} - ${score.awayScore}`,
    estado: score.estado,
  }))
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')

  const [payload, setPayload] = useState<HomeApiResponse | null>(null)
  const [status, setStatus] = useState<StatusState>('loading')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const query = equipoId ? `?equipo=${encodeURIComponent(equipoId)}` : ''
      const response = await fetch(`/api/home${query}`, { cache: 'no-store' })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = (await response.json()) as HomeApiResponse

      if (!response.ok || !data.ok) {
        setStatus('error')
        setError(data.error || 'No se pudo cargar el dashboard.')
        return
      }

      setPayload(data)
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('Error de conexion.')
    }
  }, [equipoId, router])

  useEffect(() => {
    let active = true

    const run = async () => {
      await loadData()
    }

    if (active) {
      void run()
    }

    return () => {
      active = false
    }
  }, [loadData])

  const headerSubtitle = useMemo(() => {
    if (!payload?.equipo) return ''
    const parts = [payload.equipo.categoria, payload.equipo.temporada].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Resumen general del equipo'
  }, [payload?.equipo])

  const kpiItems = useMemo(() => {
    const kpis = payload?.kpis ?? EMPTY_KPIS

    return [
      { label: 'Win rate', value: `${kpis.winRate}%` },
      { label: 'Points / game', value: kpis.pointsPerGame.toFixed(1) },
      { label: 'Goals', value: kpis.goals.toString() },
      { label: 'Conceded', value: kpis.conceded.toString() },
      { label: 'Possession', value: `${kpis.possession}%` },
    ]
  }, [payload?.kpis])

  const topPlayer = useMemo(() => {
    const [primary] = payload?.playerStats ?? []
    return primary || null
  }, [payload?.playerStats])

  const playerDisplay = useMemo(() => {
    return {
      nombre: topPlayer?.nombre ?? 'Sin datos',
      posicion: topPlayer?.posicion ?? 'Posicion',
      rating: topPlayer?.rating ?? 0,
      passAccuracy: topPlayer?.passAccuracy ?? 0,
      goals: topPlayer?.goals ?? 0,
      assists: topPlayer?.assists ?? 0,
    }
  }, [topPlayer])

  const scheduleRows = useMemo(() => buildScheduleRows(payload?.schedule ?? []), [payload?.schedule])
  const standingsRows = useMemo(() => buildStandingRows(payload?.standings ?? []), [payload?.standings])
  const scoreRows = useMemo(() => buildScoreRows(payload?.scores ?? []), [payload?.scores])

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
  }, [])

  if (status === 'loading') {
    return <DashboardSkeleton />
  }

  if (status === 'error') {
    return <DashboardError message={error || 'No se pudo cargar el dashboard.'} onRetry={loadData} />
  }

  if (!payload?.equipo) {
    return <EmptyState onCreate={() => router.push('/crear-equipo')} onJoin={() => router.push('/unirse')} />
  }

  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[84px_1fr]">
        <Sidebar />

        <div className="space-y-4">
          <header className="dashboard-card shadow-soft rounded-3xl p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Dashboard</p>
                <h1 className="text-2xl font-bold text-gray-900">{payload.equipo.nombre}</h1>
                <p className="mt-1 text-sm text-gray-500">{headerSubtitle}</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Hoy</p>
                  <p className="text-xs text-gray-500 capitalize">{todayLabel}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
            <DashboardCard title="Team KPIs">
              <div className="space-y-2">
                {kpiItems.map((item) => (
                  <div
                    key={item.label}
                    className="kpi-pill flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard title="Player Stats">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs uppercase text-gray-400">Jugador destacado</p>
                  <p className="text-lg font-bold text-gray-800">{playerDisplay.nombre}</p>
                  <p className="text-sm text-gray-500">{playerDisplay.posicion}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Rating</p>
                    <p className="text-lg font-semibold text-gray-800">{playerDisplay.rating}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Pass Acc</p>
                    <p className="text-lg font-semibold text-gray-800">{playerDisplay.passAccuracy}%</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Goals</p>
                    <p className="text-lg font-semibold text-gray-800">{playerDisplay.goals}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Assists</p>
                    <p className="text-lg font-semibold text-gray-800">{playerDisplay.assists}</p>
                  </div>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="Schedule">
              <div className="space-y-3">
                {scheduleRows.map((item) => (
                  <div key={item.id} className="event-card rounded-2xl bg-white/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.pillClass}`}>
                        {item.tipo}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">{item.fechaLabel}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-800">{item.titulo}</p>
                    <p className="text-xs text-gray-500">{item.detailLine}</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <DashboardCard title="League Standings">
              <div className="space-y-2 text-sm">
                {standingsRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[32px_1fr_60px_36px] items-center gap-2 rounded-2xl bg-white/80 px-3 py-2"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${row.badgeClass}`}
                    >
                      {row.pos}
                    </span>
                    <span className="truncate font-medium text-gray-800">{row.team}</span>
                    <span className="text-xs text-gray-500">{row.record}</span>
                    <span className="text-right font-semibold text-gray-800">{row.pts}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard title="Scores">
              <div className="space-y-2 text-sm">
                {scoreRows.map((score) => (
                  <div
                    key={score.id}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-white/80 px-3 py-2"
                  >
                    <span className="truncate text-right font-medium text-gray-700">{score.home}</span>
                    <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">
                      {score.scoreLabel}
                    </span>
                    <span className="truncate font-medium text-gray-700">{score.away}</span>
                    <span className="col-span-3 text-center text-[11px] uppercase tracking-wide text-gray-400">
                      {score.estado}
                    </span>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </section>
        </div>
      </div>
    </div>
  )
}
