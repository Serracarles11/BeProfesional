'use client'

import { useCallback, useEffect, useState } from 'react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { useSearchParams } from 'next/navigation'
import { HomeEmptyState, HomeErrorState, HomeLoadingState } from './components/HomeStates'
import { InsightCard } from './components/InsightCard'
import { LeftNavigation } from './components/LeftNavigation'
import { MetricsGrid } from './components/MetricsGrid'
import { PlayerSpotlightPanel } from './components/PlayerSpotlightPanel'
import { TopNavigation } from './components/TopNavigation'
import { WeeklyCalendar } from './components/WeeklyCalendar'
import type { DashboardHomeResponse, DashboardHomeSuccess } from './types'
import {
  buildInsight,
  buildMetrics,
  buildWeekDays,
  getEstimatedTopSpeed,
  getMorningBriefingSubtitle,
  getPassAccuracy,
  getSeasonLabel,
  withEquipo,
} from './utils'

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

type HomeStatus = 'loading' | 'ready' | 'error'

export default function Home() {
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')

  const [status, setStatus] = useState<HomeStatus>('loading')
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<DashboardHomeSuccess | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  const loadData = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const query = equipoId ? `?equipo=${encodeURIComponent(equipoId)}` : ''
      const response = await fetch(`/api/dashboard/home${query}`, { cache: 'no-store' })
      const data = (await response.json()) as DashboardHomeResponse

      if (!response.ok || !data.ok) {
        setStatus('error')
        setError(('error' in data && data.error) || 'No se pudo cargar Home')
        return
      }

      setPayload(data)
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('Error de conexion al cargar Home')
    }
  }, [equipoId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  if (status === 'loading') {
    return <HomeLoadingState />
  }

  if (status === 'error') {
    return <HomeErrorState message={error} onRetry={() => void loadData()} />
  }

  if (!payload?.equipo) {
    return <HomeEmptyState />
  }

  const teamName = payload.equipo.nombre || 'Equipo'
  const coachRole = payload.coach?.rol || payload.role || 'Entrenador'
  const playerName = payload.playerSpotlight.nombre || 'Jugador'
  const playerPosition = payload.playerSpotlight.posicion || 'Posicion por definir'
  const minutesPlayed = payload.playerSpotlight.minutesPlayed || payload.playerSpotlight.matchesPlayed * 90

  const briefingSubtitle = getMorningBriefingSubtitle(payload)
  const seasonLabel = getSeasonLabel(payload)
  const metrics = buildMetrics(payload)
  const insight = buildInsight(payload)
  const weekDays = buildWeekDays(payload.schedule.calendarDays, payload.schedule.activityItems, weekOffset)

  const passAccuracy = getPassAccuracy(payload)
  const topSpeed = getEstimatedTopSpeed(payload)

  const insightHref = withEquipo('/estadisticas', payload.equipo?.id)

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)] text-[#181c20]`}>
      <TopNavigation equipoId={payload.equipo.id} avatarUrl={payload.playerSpotlight.foto_url} />

      <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1600px] flex-col xl:flex-row">
        <LeftNavigation equipoId={payload.equipo.id} teamName={teamName} />

        <section className="flex-1 px-4 py-6 lg:px-8 xl:h-[calc(100vh-64px)] xl:overflow-y-auto">
          <header className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-2 [font-family:var(--font-plus-jakarta)] text-4xl font-extrabold tracking-tight text-[#181c20]">
                Morning Briefing
              </h1>
              <p className="text-[#5f6776]">{briefingSubtitle}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#3176d2]">{coachRole}</p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-[#d9e2ff] px-4 py-1.5 text-xs font-bold text-[#00337c]">
              {seasonLabel}
            </span>
          </header>

          <div className="space-y-8">
            <MetricsGrid metrics={metrics} />
            <InsightCard title={insight.title} description={insight.description} actionHref={insightHref} />
            <WeeklyCalendar
              days={weekDays}
              onPrevWeek={() => setWeekOffset((prev) => prev - 1)}
              onNextWeek={() => setWeekOffset((prev) => prev + 1)}
            />
          </div>
        </section>

        <div className="xl:sticky xl:top-16 xl:h-[calc(100vh-64px)] xl:overflow-y-auto">
          <PlayerSpotlightPanel
            equipoId={payload.equipo.id}
            playerName={playerName}
            position={playerPosition}
            imageUrl={payload.playerSpotlight.foto_url}
            goals={payload.playerSpotlight.goals}
            assists={payload.playerSpotlight.assists}
            matches={payload.playerSpotlight.matchesPlayed}
            minutes={minutesPlayed}
            topSpeed={topSpeed}
            passAccuracy={passAccuracy}
          />
        </div>
      </main>
    </div>
  )
}
