'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'

type Team = {
  id: string
  nombre: string
  club?: string | null
  categoria?: string | null
  temporada?: string | null
  logo_url?: string | null
}

type EquiposResponse = {
  ok: boolean
  equipos?: Team[]
  error?: string
}

type QuickAction = {
  id: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  accent: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'entrenamientos',
    title: 'Entrenamientos',
    description: 'Planifica las sesiones y controla el rendimiento.',
    href: '/entrenamientos',
    icon: Calendar,
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'partidos',
    title: 'Partidos',
    description: 'Gestiona convocatorias, resultados y rivales.',
    href: '/partidos',
    icon: Swords,
    accent: 'from-rose-400 to-orange-500',
  },
  {
    id: 'jugadores',
    title: 'Jugadores',
    description: 'Revisa la plantilla y el estado del equipo.',
    href: '/jugadores',
    icon: Users,
    accent: 'from-indigo-500 to-violet-600',
  },
]

function TeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: Team[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">Selecciona equipo</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input-premium appearance-none pr-10"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.nombre}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  )
}

function QuickAccessCard({
  title,
  description,
  icon: Icon,
  accent,
  onClick,
  disabled,
}: {
  title: string
  description: string
  icon: LucideIcon
  accent: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`dashboard-card shadow-soft rounded-3xl p-5 text-left transition md:p-6 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1'
      }`}
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-soft`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
        Abrir
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')

  const loadTeams = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/equipos', { method: 'GET', cache: 'no-store' })
      const data = (await response.json()) as EquiposResponse

      if (!response.ok || !data.ok) {
        if (response.status === 401) {
          setError('No autorizado. Inicia sesion para continuar.')
        } else {
          setError(data.error || 'No se pudieron cargar tus equipos.')
        }
        setTeams([])
        setSelectedTeamId('')
        return
      }

      const nextTeams = Array.isArray(data.equipos) ? data.equipos : []
      setTeams(nextTeams)

      if (!nextTeams.length) {
        setSelectedTeamId('')
        return
      }

      const urlParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('equipo')
          : null

      if (urlParam && nextTeams.some((team) => team.id === urlParam)) {
        setSelectedTeamId(urlParam)
        return
      }

      setSelectedTeamId(nextTeams[0].id)
    } catch {
      setError('Error de conexion. Intenta nuevamente.')
      setTeams([])
      setSelectedTeamId('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTeams()
  }, [loadTeams])

  const selectedTeam = useMemo(() => {
    return teams.find((team) => team.id === selectedTeamId) || null
  }, [teams, selectedTeamId])

  const quickActions = useMemo(() => {
    if (!selectedTeamId) return QUICK_ACTIONS

    return QUICK_ACTIONS.map((action) => ({
      ...action,
      href: `${action.href}?equipo=${encodeURIComponent(selectedTeamId)}`,
    }))
  }, [selectedTeamId])

  const handleTeamChange = (value: string) => {
    setSelectedTeamId(value)

    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams()

    if (value) {
      params.set('equipo', value)
    } else {
      params.delete('equipo')
    }

    const query = params.toString()
    router.replace(query ? `/home?${query}` : '/home')
  }

  if (loading) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="dashboard-card h-24 animate-pulse rounded-3xl" />
          <div className="dashboard-card h-44 animate-pulse rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="dashboard-card h-44 animate-pulse rounded-3xl" />
            ))}
          </div>
          <div className="dashboard-card h-36 animate-pulse rounded-3xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="dashboard-card shadow-soft rounded-3xl border border-red-200 bg-red-50/70 p-6 text-center md:p-8">
            <h1 className="text-xl font-semibold text-red-600">No se pudo cargar el dashboard</h1>
            <p className="mt-2 text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadTeams()}
              className="mt-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:opacity-95"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!teams.length) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="dashboard-card shadow-soft-lg rounded-3xl p-8 text-center md:p-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
              <Trophy className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">Aun no tienes equipos</h1>
            <p className="mt-2 text-sm text-gray-500">
              Crea tu primer equipo y empieza a organizar entrenamientos, partidos y jugadores.
            </p>
            <button
              type="button"
              onClick={() => router.push('/crear-equipo')}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-semibold text-white shadow-soft transition hover:opacity-95"
            >
              Crear equipo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="dashboard-card shadow-soft-lg rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">Home</h1>
              <p className="mt-2 text-sm text-gray-500">Resumen del equipo</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{selectedTeam?.nombre}</p>
                <p className="text-xs text-gray-500">Equipo activo</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="dashboard-card shadow-soft rounded-3xl p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-soft">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Equipo principal</h2>
                <p className="text-sm text-gray-500">Selecciona el equipo para continuar.</p>
              </div>
            </div>

            <TeamSelect teams={teams} value={selectedTeamId} onChange={handleTeamChange} />

            {selectedTeam && (
              <div className="mt-5 rounded-2xl border border-indigo-100 bg-white/70 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-soft">
                    {selectedTeam.logo_url ? (
                      <img
                        src={selectedTeam.logo_url}
                        alt={selectedTeam.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {selectedTeam.nombre.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{selectedTeam.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {selectedTeam.club || 'Sin club'} - {selectedTeam.categoria || 'Sin categoria'} -{' '}
                      {selectedTeam.temporada || 'Sin temporada'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push(`/equipos?equipo=${encodeURIComponent(selectedTeamId)}`)}
              disabled={!selectedTeamId}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ir al equipo
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="dashboard-card shadow-soft rounded-3xl p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Codigos de invitacion</h2>
                <p className="text-sm text-gray-500">Invita jugadores o crea un nuevo equipo.</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.push('/unirse')}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Ir a Unirse
              </button>
              <button
                type="button"
                onClick={() => router.push('/crear-equipo')}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-95"
              >
                Crear equipo
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <QuickAccessCard
              key={action.id}
              title={action.title}
              description={action.description}
              icon={action.icon}
              accent={action.accent}
              disabled={!selectedTeamId}
              onClick={() => {
                if (!selectedTeamId) return
                router.push(action.href)
              }}
            />
          ))}
        </section>
      </div>
    </div>
  )
}
