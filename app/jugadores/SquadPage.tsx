'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { useSearchParams } from 'next/navigation'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'
import { SquadHeader } from './components/SquadHeader'
import { SquadHighlights } from './components/SquadHighlights'
import { SquadMobileNav } from './components/SquadMobileNav'
import { PlayerGrid } from './components/PlayerGrid'
import { SquadEmptyState, SquadErrorState, SquadLoadingState } from './components/SquadStates'
import { SquadTopBar } from './components/SquadTopBar'
import type { PositionFilter, SquadApiResponse, SquadSuccessResponse } from './types'
import { filterPlayers } from './utils'

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

type Status = 'loading' | 'ready' | 'error'

export default function SquadPage() {
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<SquadSuccessResponse | null>(null)
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = useCallback(async () => {
    setStatus('loading')
    setError('')

    try {
      const query = equipoId ? `?equipo=${encodeURIComponent(equipoId)}` : ''
      const response = await fetch(`/api/dashboard/squad${query}`, { cache: 'no-store' })
      const data = (await response.json()) as SquadApiResponse

      if (!response.ok || !data.ok) {
        setStatus('error')
        setError(('error' in data && data.error) || 'No se pudo cargar el squad')
        return
      }

      setPayload(data)
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('Error de conexion al cargar jugadores')
    }
  }, [equipoId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  const visiblePlayers = useMemo(() => {
    if (!payload) return []
    return filterPlayers(payload.players, positionFilter, searchTerm)
  }, [payload, positionFilter, searchTerm])

  if (status === 'loading') {
    return <SquadLoadingState />
  }

  if (status === 'error') {
    return <SquadErrorState message={error} onRetry={() => void loadData()} />
  }

  if (!payload?.equipo) {
    return <SquadErrorState message="Sin equipo activo" onRetry={() => void loadData()} />
  }

  const avatarUrl = payload.players.find((player) => player.avatarUrl)?.avatarUrl ?? null

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f7f9fe] pb-20 [font-family:var(--font-manrope)] text-[#181c20] md:pb-0`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <LeftNavigation equipoId={payload.equipo.id} teamName={payload.equipo.nombre} />

        <div className="flex min-w-0 flex-1 flex-col">
          <SquadTopBar
            equipoId={payload.equipo.id}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            avatarUrl={avatarUrl}
          />

          <main className="flex-grow px-5 py-6 lg:px-8">
            <SquadHeader
              seasonLabel={payload.summary.seasonLabel}
              selectedFilter={positionFilter}
              onFilterChange={setPositionFilter}
            />

            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#727785]">
              Source: {payload.source}
            </p>

            {visiblePlayers.length > 0 ? (
              <PlayerGrid players={visiblePlayers} equipoId={payload.equipo.id} />
            ) : (
              <SquadEmptyState />
            )}

            <SquadHighlights summary={payload.summary} equipoId={payload.equipo.id} />
          </main>
        </div>
      </div>

      <SquadMobileNav equipoId={payload.equipo.id} />
    </div>
  )
}
