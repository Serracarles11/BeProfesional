'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Bot,
  Calendar,
  ChevronRight,
  Dumbbell,
  Home,
  MessageSquare,
  Send,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'

type EquipoActivo = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  logo_url: string | null
}

type HomeSuccessResponse = {
  ok: true
  equipo: EquipoActivo | null
  role: string | null
  kpis: {
    winrate: number
    pointsPerGame: number
    goalsFor: number
    goalsAgainst: number
    possession: number | null
  }
  playerSpotlight: {
    nombre: string
    foto_url: string | null
    posicion: string | null
    matchesPlayed: number
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

type HomeApiResponse = HomeSuccessResponse | HomeErrorResponse

type StatusState = 'loading' | 'ready' | 'error'

type CalendarCell = { date: string; hasEvent: boolean; isToday: boolean } | null

type StandingRow = {
  id: string
  posicion: number
  nombre: string
  puntos: number
  record: string
  badgeClass: string
}

type ScoreRow = {
  id: string
  equipo: string
  rival: string
  marcador: string
  fechaLabel: string
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, active: true },
  { id: 'team', label: 'Equipo', icon: Users, active: false },
  { id: 'training', label: 'Entrenos', icon: Dumbbell, active: false },
  { id: 'matches', label: 'Partidos', icon: Trophy, active: false },
  { id: 'chat', label: 'Chat', icon: MessageSquare, active: false },
  { id: 'settings', label: 'Ajustes', icon: Settings, active: false },
]

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function DashboardCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="dashboard-card shadow-soft flex flex-col overflow-hidden rounded-3xl p-4 md:p-5">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white/70 px-3 py-1 text-xs font-medium text-gray-700"
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar-glass hidden h-fit w-20 flex-col items-center gap-4 rounded-3xl p-4 md:flex">
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

function formatDateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString('es-ES', options)
}

function formatNumber(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) return '—'
  return `${value}${suffix}`
}

function buildCalendarCells(days: Array<{ date: string; hasEvent: boolean }>, todayKey: string) {
  if (!days.length) return [] as CalendarCell[]

  const firstDate = new Date(days[0].date)
  const startOffset = (firstDate.getDay() + 6) % 7
  const cells: CalendarCell[] = []

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null)
  }

  for (const day of days) {
    cells.push({
      date: day.date,
      hasEvent: day.hasEvent,
      isToday: day.date === todayKey,
    })
  }

  return cells
}

function buildStandingsRows(rows: HomeSuccessResponse['standings']) {
  return rows.map((row) => {
    const badgeClass =
      row.posicion === 1
        ? 'pos-1'
        : row.posicion === 2
        ? 'pos-2'
        : row.posicion === 3
        ? 'pos-3'
        : 'bg-gray-200 text-gray-700'

    return {
      id: `${row.nombre}-${row.posicion}`,
      posicion: row.posicion,
      nombre: row.nombre,
      puntos: row.puntos,
      record: `${row.v}-${row.e}-${row.d}`,
      badgeClass,
    }
  })
}

function buildScoreRows(rows: HomeSuccessResponse['scores']) {
  return rows.map((row, index) => ({
    id: `${row.equipo_nombre}-${row.rival_nombre ?? 'rival'}-${index}`,
    equipo: row.equipo_nombre,
    rival: row.rival_nombre ?? 'Rival',
    marcador: `${row.goles_favor} - ${row.goles_contra}`,
    fechaLabel: formatDateLabel(row.fecha_hora, { day: '2-digit', month: 'short' }),
  }))
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')

  const [payload, setPayload] = useState<HomeSuccessResponse | null>(null)
  const [status, setStatus] = useState<StatusState>('loading')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const query = equipoId ? `?equipo=${encodeURIComponent(equipoId)}` : ''
      const response = await fetch(`/api/dashboard/home${query}`, { cache: 'no-store' })
      const data = (await response.json()) as HomeApiResponse

      if (!response.ok || !data.ok) {
        setStatus('error')
        setError(data.ok ? 'No se pudo cargar el dashboard.' : data.error)
        return
      }

      setPayload(data)
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('No se pudo cargar el dashboard.')
    }
  }, [equipoId])

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

  const teamInitial = useMemo(() => {
    return payload?.equipo?.nombre?.charAt(0).toUpperCase() ?? 'E'
  }, [payload?.equipo?.nombre])

  const headerSubtitle = useMemo(() => {
    if (!payload?.equipo) return ''
    const parts = [payload.equipo.categoria, payload.equipo.temporada].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Resumen general del equipo'
  }, [payload?.equipo])

  const kpiItems = useMemo(() => {
    if (!payload?.kpis) return []
    return [
      { label: 'Win rate', value: formatNumber(payload.kpis.winrate, '%') },
      { label: 'Points / game', value: formatNumber(payload.kpis.pointsPerGame) },
      { label: 'Goals for', value: formatNumber(payload.kpis.goalsFor) },
      { label: 'Goals against', value: formatNumber(payload.kpis.goalsAgainst) },
      { label: 'Possession', value: formatNumber(payload.kpis.possession, '%') },
    ]
  }, [payload?.kpis])

  const spotlightStats = useMemo(() => {
    const spotlight = payload?.playerSpotlight

    if (!spotlight) {
      return {
        nombre: 'Sin jugadores',
        posicion: '—',
        matchesPlayed: '0',
        avgRating: '—',
        goalsAssistsPct: '—',
        passAccPct: '—',
      }
    }

    return {
      nombre: spotlight.nombre || 'Sin jugadores',
      posicion: spotlight.posicion || '—',
      matchesPlayed: formatNumber(spotlight.matchesPlayed),
      avgRating: formatNumber(spotlight.avgRating),
      goalsAssistsPct: formatNumber(spotlight.goalsAssistsPct, '%'),
      passAccPct: formatNumber(spotlight.passAccPct, '%'),
    }
  }, [payload?.playerSpotlight])

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const calendarCells = useMemo(() => {
    return buildCalendarCells(payload?.schedule?.calendarDays ?? [], todayKey)
  }, [payload?.schedule?.calendarDays, todayKey])

  const standingsRows = useMemo(() => {
    return buildStandingsRows(payload?.standings ?? [])
  }, [payload?.standings])

  const scoreRows = useMemo(() => {
    return buildScoreRows(payload?.scores ?? [])
  }, [payload?.scores])

  const nextMatchInfo = useMemo(() => {
    if (!payload?.schedule?.nextMatch) return null
    const match = payload.schedule.nextMatch

    return {
      fecha: formatDateLabel(match.fecha_hora, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }),
      rival: match.rival_nombre ?? 'Rival por confirmar',
      lugar: match.lugar ?? 'Lugar por definir',
      casaFuera: match.casa_fuera ? match.casa_fuera.toUpperCase() : null,
    }
  }, [payload?.schedule?.nextMatch])

  if (status === 'loading') {
    return <DashboardSkeleton />
  }

  if (status === 'error') {
    return <DashboardError message={error} onRetry={loadData} />
  }

  if (!payload?.equipo) {
    return <EmptyState onCreate={() => router.push('/crear-equipo')} onJoin={() => router.push('/unirse')} />
  }

  return (
    <div className="dashboard-bg h-screen overflow-hidden p-4 md:p-6">
      <div className="mx-auto grid h-full max-w-7xl gap-3 md:grid-cols-[84px_1fr]">
        <Sidebar />

        <div className="flex h-full flex-col gap-3 overflow-hidden">
          <header className="dashboard-card shadow-soft shrink-0 rounded-3xl p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Dashboard</p>
                <h1 className="text-2xl font-bold text-gray-900">{payload.equipo.nombre}</h1>
                <p className="mt-1 text-sm text-gray-500">{headerSubtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-600">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
                    {payload.equipo.logo_url ? (
                      <img
                        src={payload.equipo.logo_url}
                        alt={payload.equipo.nombre}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold">{teamInitial}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Equipo activo</p>
                    <p className="text-xs text-gray-500">{payload.equipo.club || 'Sin club'}</p>
                  </div>
                </div>
                {payload.role && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {payload.role}
                  </span>
                )}
              </div>
            </div>
          </header>

          <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.1fr_1fr_1fr]">
            <DashboardCard title="Team KPIs">
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
                    {payload.equipo.logo_url ? (
                      <img
                        src={payload.equipo.logo_url}
                        alt={payload.equipo.nombre}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">{teamInitial}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{payload.equipo.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {[payload.equipo.categoria, payload.equipo.temporada].filter(Boolean).join(' · ') || 'Sin categoria'}
                    </p>
                  </div>
                </div>
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
              </div>
            </DashboardCard>

            <DashboardCard title="Player Stats">
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs uppercase text-gray-400">Jugador destacado</p>
                  <p className="text-lg font-bold text-gray-800">{spotlightStats.nombre}</p>
                  <p className="text-sm text-gray-500">{spotlightStats.posicion}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Matches</p>
                    <p className="text-lg font-semibold text-gray-800">{spotlightStats.matchesPlayed}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Avg Rating</p>
                    <p className="text-lg font-semibold text-gray-800">{spotlightStats.avgRating}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Goals + Assists</p>
                    <p className="text-lg font-semibold text-gray-800">{spotlightStats.goalsAssistsPct}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="text-xs text-gray-400">Pass Acc</p>
                    <p className="text-lg font-semibold text-gray-800">{spotlightStats.passAccPct}</p>
                  </div>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="Schedule">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="capitalize">{payload.schedule.monthLabel}</span>
                  </div>
                  <span className="text-xs text-gray-400">Calendario</span>
                </div>

                {calendarCells.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400">
                      {WEEKDAYS.map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {calendarCells.map((cell, index) => {
                        if (!cell) {
                          return <span key={`empty-${index}`} className="h-8" />
                        }

                        const dayNumber = Number(cell.date.split('-')[2])
                        const baseClass = cell.isToday
                          ? 'bg-indigo-500 text-white'
                          : cell.hasEvent
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-white/80 text-gray-700'

                        return (
                          <span
                            key={cell.date}
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${baseClass}`}
                          >
                            {dayNumber}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/80 p-4 text-center text-sm text-gray-500">
                    Sin calendario disponible
                  </div>
                )}

                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs uppercase text-gray-400">Today&#39;s Match</p>
                  {nextMatchInfo ? (
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      <p className="font-semibold text-gray-800">{nextMatchInfo.rival}</p>
                      <p className="capitalize">{nextMatchInfo.fecha}</p>
                      <p>{nextMatchInfo.lugar}</p>
                      {nextMatchInfo.casaFuera && (
                        <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          {nextMatchInfo.casaFuera}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Sin partidos programados</p>
                  )}
                </div>
              </div>
            </DashboardCard>
          </section>

          <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
            <section className="dashboard-card shadow-soft flex flex-col overflow-hidden rounded-3xl p-4 md:p-5">
              <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </header>
              <div className="min-h-0 flex-1 space-y-3">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-white/80 px-3 py-2 text-sm text-gray-700">
                      Hola! Soy tu asistente deportivo. Puedo ayudarte con tacticas, analisis y mas.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2 text-sm text-white">
                      Analiza mi ultimo partido
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-white/80 px-3 py-2 text-sm text-gray-700">
                      Claro! Revisemos las estadisticas de tu equipo...
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/chat')}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:shadow-lg"
                >
                  <Send className="h-4 w-4" />
                  Abrir chat con IA
                </button>
              </div>
            </section>

            <DashboardCard title="Scores">
              {scoreRows.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {scoreRows.map((score) => (
                    <div
                      key={score.id}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-white/80 px-3 py-2"
                    >
                      <span className="truncate text-right font-medium text-gray-700">{score.equipo}</span>
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">
                        {score.marcador}
                      </span>
                      <span className="truncate font-medium text-gray-700">{score.rival}</span>
                      <span className="col-span-3 text-center text-[11px] uppercase tracking-wide text-gray-400">
                        {score.fechaLabel}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/80 p-4 text-center text-sm text-gray-500">
                  Sin resultados recientes
                </div>
              )}
            </DashboardCard>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeContent />
    </Suspense>
  )
}
