'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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

type EquipoItem = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  rol: string
}

type HomePayload = {
  ok: boolean
  error?: string
  usuario?: {
    id: string
    nombre: string
    email: string | null
  }
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
  } | null
  rolUsuario: string | null
  proximoEntreno: {
    id: string
    fecha: string
    lugar: string | null
  } | null
  proximoPartido: {
    id: string
    fechaHora: string
    rival: string | null
    lugar: string | null
  } | null
  kpis: {
    winrate: number
    pointsPerGame: number
    goals: number
    conceded: number
    possession: number
  }
  playerStats: Array<{
    id: string
    nombre: string
    rating: number
    passAcc: number
    goals: number
    assists: number
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
  }>
  recentForm: Array<{
    match: number
    value: number
  }>
  equiposDelUsuario: EquipoItem[]
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="dashboard-card shadow-soft rounded-3xl p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700"
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
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'entrenos', label: 'Entrenos', icon: Dumbbell },
    { id: 'partidos', label: 'Partidos', icon: Trophy },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ]

  return (
    <aside className="sidebar-glass hidden w-20 flex-col items-center gap-4 rounded-3xl p-4 md:flex">
      {items.map((item, index) => {
        const Icon = item.icon
        const active = index === 0

        return (
          <button
            key={item.id}
            type="button"
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
              active
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

export default function HomePage() {
  const router = useRouter()

  const [payload, setPayload] = useState<HomePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [equipoId, setEquipoId] = useState<string | null>(null)

  useEffect(() => {
    const resolveEquipoFromUrl = () =>
      new URLSearchParams(window.location.search).get('equipo')

    setEquipoId(resolveEquipoFromUrl())

    const handlePopState = () => {
      setEquipoId(resolveEquipoFromUrl())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const query = equipoId ? `?equipo=${encodeURIComponent(equipoId)}` : ''
        const response = await fetch(`/api/home${query}`, { cache: 'no-store' })

        if (response.status === 401) {
          router.push('/login')
          return
        }

        const data = (await response.json()) as HomePayload

        if (!response.ok || !data.ok) {
          setError(data.error ?? 'No se pudo cargar el dashboard.')
          return
        }

        if (!cancelled) {
          setPayload(data)
        }
      } catch {
        if (!cancelled) {
          setError('Error de conexion.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [equipoId, router])

  const weekDays = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now)
      day.setDate(now.getDate() - now.getDay() + index)
      return day
    })
  }, [])

  const selectedEventDay = useMemo(() => {
    if (payload?.proximoPartido) {
      return new Date(payload.proximoPartido.fechaHora).getDate()
    }

    if (payload?.proximoEntreno) {
      return new Date(payload.proximoEntreno.fecha).getDate()
    }

    return null
  }, [payload?.proximoEntreno, payload?.proximoPartido])

  const firstPlayer = payload?.playerStats[0]

  if (loading) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="dashboard-card h-20 animate-pulse rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="dashboard-card h-56 animate-pulse rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-xl">
          <div className="dashboard-card rounded-3xl p-6 text-center">
            <p className="text-base font-medium text-red-600">{error || 'No se pudo cargar el dashboard.'}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!payload.equipo) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="dashboard-card rounded-3xl p-8 text-center md:p-10">
            <h1 className="text-2xl font-bold text-gray-800">Aun no tienes equipos</h1>
            <p className="mt-2 text-gray-500">
              Crea tu primer equipo o unete con un codigo de invitacion.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push('/crear-equipo')}
                className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-soft"
              >
                Crear equipo
              </button>
              <button
                type="button"
                onClick={() => router.push('/unirse')}
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

  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 md:grid-cols-[84px_1fr]">
          <Sidebar />

          <div className="space-y-4">
            <header className="dashboard-card shadow-soft rounded-3xl p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{payload.equipo.nombre}</h1>
                  <p className="text-sm text-gray-500">
                    {payload.equipo.club || 'Sin club'} · {payload.equipo.categoria || 'Sin categoria'} ·{' '}
                    {payload.equipo.temporada || 'Sin temporada'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    Rol: {payload.rolUsuario || 'jugador'}
                  </span>

                  {payload.equiposDelUsuario.length > 1 && (
                    <select
                      value={payload.equipo.id}
                      onChange={(event) => {
                        const nextEquipoId = event.target.value
                        setEquipoId(nextEquipoId)
                        router.push(`/home?equipo=${nextEquipoId}`)
                      }}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                    >
                      {payload.equiposDelUsuario.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card title="Team KPIs">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                    <span>Winrate</span>
                    <strong>{payload.kpis.winrate}%</strong>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                    <span>Points per game</span>
                    <strong>{payload.kpis.pointsPerGame}</strong>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                    <span>Goals</span>
                    <strong>{payload.kpis.goals}</strong>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                    <span>Conceded</span>
                    <strong>{payload.kpis.conceded}</strong>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                    <span>Possession</span>
                    <strong>{payload.kpis.possession}%</strong>
                  </li>
                </ul>
              </Card>

              <Card title="Player Stats">
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white/80 p-4">
                    <p className="text-sm text-gray-500">Jugador destacado</p>
                    <p className="text-lg font-bold text-gray-800">{firstPlayer?.nombre || 'Sin datos'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-gray-500">Rating</p>
                      <p className="font-semibold text-gray-800">{firstPlayer?.rating ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-gray-500">Pass Acc</p>
                      <p className="font-semibold text-gray-800">{firstPlayer?.passAcc ?? 0}%</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-gray-500">Goals</p>
                      <p className="font-semibold text-gray-800">{firstPlayer?.goals ?? 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-gray-500">Assists</p>
                      <p className="font-semibold text-gray-800">{firstPlayer?.assists ?? 0}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Schedule">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {new Date().toLocaleDateString('es-ES', {
                      weekday: 'long',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {weekDays.map((day) => {
                      const isActive = selectedEventDay === day.getDate()

                      return (
                        <div key={day.toISOString()} className="space-y-1">
                          <p className="text-[11px] text-gray-400">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <div
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                              isActive ? 'bg-emerald-500 text-white' : 'bg-white/80 text-gray-700'
                            }`}
                          >
                            {day.getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="rounded-xl bg-white/80 px-3 py-2 text-gray-700">
                      Entreno: {payload.proximoEntreno ? payload.proximoEntreno.fecha : 'Sin fecha'}
                    </p>
                    <p className="rounded-xl bg-white/80 px-3 py-2 text-gray-700">
                      Partido:{' '}
                      {payload.proximoPartido
                        ? `${payload.proximoPartido.rival || 'Rival pendiente'} - ${payload.proximoPartido.fechaHora}`
                        : 'Sin fecha'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="Recent Form">
                <div className="space-y-4">
                  <div className="flex h-28 items-end gap-2">
                    {payload.recentForm.map((item) => (
                      <div key={item.match} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="chart-bar w-full rounded-t-lg bg-gradient-to-t from-emerald-300 to-emerald-500"
                          style={{ height: `${Math.max(item.value, 1) * 24}px` }}
                        />
                        <span className="text-[11px] text-gray-500">#{item.match}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="League Standings">
                <div className="space-y-2 text-sm">
                  {payload.standings.map((row) => (
                    <div key={`${row.team}-${row.pos}`} className="grid grid-cols-[24px_1fr_40px] items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
                      <span className="text-gray-500">{row.pos}</span>
                      <span className="truncate font-medium text-gray-800">{row.team}</span>
                      <span className="text-right font-semibold text-gray-700">{row.pts}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Scores">
                <div className="space-y-2 text-sm">
                  {payload.scores.map((score) => (
                    <div key={score.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
                      <span className="truncate text-right font-medium text-gray-700">{score.home}</span>
                      <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-bold text-white">
                        {score.homeScore} - {score.awayScore}
                      </span>
                      <span className="truncate font-medium text-gray-700">{score.away}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="dashboard-card flex items-center justify-between rounded-3xl p-4 text-xs text-gray-500 md:hidden">
              <span className="inline-flex items-center gap-1">
                <Home className="h-4 w-4" /> Home
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" /> Equipo
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-4 w-4" /> Chat
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
