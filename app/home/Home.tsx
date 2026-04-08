'use client'

import { useCallback, useEffect, useState } from 'react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { useSearchParams } from 'next/navigation'
import { HomeEmptyState, HomeErrorState, HomeLoadingState } from './components/HomeStates'
import { CoachMetricsGrid } from './components/CoachMetricsGrid'
import { InsightCard } from './components/InsightCard'
import { LeftNavigation } from './components/LeftNavigation'
import { MetricsGrid } from './components/MetricsGrid'
import { PlayerSpotlightPanel } from './components/PlayerSpotlightPanel'
import { TopNavigation } from './components/TopNavigation'
import type { DashboardHomeResponse, DashboardHomeSuccess } from './types'
import {
  buildMetrics,
  getEstimatedTopSpeed,
  getMorningBriefingSubtitle,
  getPassAccuracy,
  getSeasonLabel,
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
type WellbeingPatch = {
  mentalState?: number
  fatigue?: number
  attendingTraining?: boolean
}

type WellbeingUpdateResponse =
  | {
      ok: true
      wellbeing: DashboardHomeSuccess['wellbeing']
    }
  | {
      ok: false
      error: string
    }

type CreateTrainingResponse =
  | {
      ok: true
      training: {
        id: string
      }
    }
  | {
      ok: false
      error: string
    }

type CreateMatchResponse =
  | {
      ok: true
      match: {
        id: string
      }
    }
  | {
      ok: false
      error: string
    }

type TrainingType = 'FISICO' | 'TECNICO' | 'TACTICO' | 'RECUPERACION'
type EventFormType = 'entrenamiento' | 'partido'
type MatchHomeAway = 'CASA' | 'FUERA'

export default function Home() {
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')

  const [status, setStatus] = useState<HomeStatus>('loading')
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<DashboardHomeSuccess | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isSavingWellbeing, setIsSavingWellbeing] = useState(false)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [eventFormType, setEventFormType] = useState<EventFormType>('entrenamiento')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('18:00')
  const [eventPlace, setEventPlace] = useState('')
  const [trainingTitle, setTrainingTitle] = useState('Entrenamiento semanal')
  const [trainingType, setTrainingType] = useState<TrainingType>('TACTICO')
  const [matchOpponent, setMatchOpponent] = useState('')
  const [matchHomeAway, setMatchHomeAway] = useState<MatchHomeAway>('CASA')
  const [matchCompetition, setMatchCompetition] = useState('')
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)

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

  const updateWellbeing = useCallback(
    async (patch: WellbeingPatch) => {
      if (!payload?.equipo?.id) return

      const previousWellbeing = payload.wellbeing
      const equipoIdToSave = payload.equipo.id

      setSaveError('')
      setPayload((prev) =>
        prev
          ? {
              ...prev,
              wellbeing: {
                ...prev.wellbeing,
                ...patch,
              },
            }
          : prev
      )
      setIsSavingWellbeing(true)

      try {
        const response = await fetch('/api/dashboard/home/wellbeing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipoId: equipoIdToSave,
            ...patch,
          }),
        })

        const data = (await response.json()) as WellbeingUpdateResponse

        if (!response.ok || !data.ok) {
          throw new Error(data.ok ? 'No se pudo guardar el estado.' : data.error)
        }

        setPayload((prev) =>
          prev
            ? {
                ...prev,
                wellbeing: data.wellbeing,
              }
            : prev
        )
      } catch (saveErr) {
        setPayload((prev) =>
          prev
            ? {
                ...prev,
                wellbeing: previousWellbeing,
              }
            : prev
        )
        setSaveError(
          saveErr instanceof Error ? saveErr.message : 'No se pudo guardar el estado diario.'
        )
      } finally {
        setIsSavingWellbeing(false)
      }
    },
    [payload]
  )

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
  const isCoach = payload.isCoach
  const coachRole = isCoach ? 'ENTRENADOR' : payload.role || 'JUGADOR'
  const playerName = payload.playerSpotlight.nombre || 'Jugador'
  const playerPosition = isCoach ? 'Entrenador' : payload.playerSpotlight.posicion || 'Posicion por definir'
  const minutesPlayed = payload.playerSpotlight.minutesPlayed || payload.playerSpotlight.matchesPlayed * 90

  const briefingSubtitle = getMorningBriefingSubtitle(payload)
  const seasonLabel = getSeasonLabel(payload)
  const metrics = buildMetrics(payload)

  const passAccuracy = getPassAccuracy(payload)
  const topSpeed = getEstimatedTopSpeed(payload)

  const openCreateEventModal = (dateKey?: string) => {
    if (!isCoach) return
    setSaveError('')
    setEventDate(dateKey ?? new Date().toISOString().slice(0, 10))
    setEventTime('18:00')
    setEventPlace('')
    setEventFormType('entrenamiento')
    setTrainingTitle('Entrenamiento semanal')
    setTrainingType('TACTICO')
    setMatchOpponent('')
    setMatchHomeAway('CASA')
    setMatchCompetition('')
    setIsCreateEventOpen(true)
    setIsLoadingFields(true)

    const equipo = payload.equipo?.id
    const query = equipo ? `?equipo=${encodeURIComponent(equipo)}` : ''

    void fetch(`/api/dashboard/home/fields${query}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as { ok?: boolean; error?: string; fields?: string[] }
        if (!response.ok || !data.ok || !Array.isArray(data.fields)) {
          throw new Error(data.error || 'No se pudieron cargar los campos de futbol.')
        }
        setFieldOptions(data.fields)
      })
      .catch((err) => {
        setFieldOptions([])
        setSaveError(err instanceof Error ? err.message : 'No se pudieron cargar los campos de futbol.')
      })
      .finally(() => {
        setIsLoadingFields(false)
      })
  }

  const createEvent = async () => {
    if (!payload.equipo?.id) return
    if (!eventDate) {
      setSaveError('Debes indicar una fecha para el evento.')
      return
    }
    if (eventFormType === 'entrenamiento' && !trainingTitle.trim()) {
      setSaveError('Debes indicar fecha y titulo del entrenamiento.')
      return
    }
    if (eventFormType === 'partido' && !matchOpponent.trim()) {
      setSaveError('Debes indicar fecha y rival del partido.')
      return
    }

    setIsCreatingEvent(true)
    setSaveError('')

    try {
      if (eventFormType === 'entrenamiento') {
        const response = await fetch('/api/dashboard/home/trainings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipoId: payload.equipo.id,
            date: eventDate,
            time: eventTime,
            title: trainingTitle.trim(),
            type: trainingType,
            place: eventPlace.trim(),
          }),
        })

        const data = (await response.json()) as CreateTrainingResponse

        if (!response.ok || !data.ok) {
          throw new Error(data.ok ? 'No se pudo crear el entrenamiento.' : data.error)
        }
      } else {
        const response = await fetch('/api/dashboard/home/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipoId: payload.equipo.id,
            date: eventDate,
            time: eventTime,
            opponent: matchOpponent.trim(),
            homeAway: matchHomeAway,
            competition: matchCompetition.trim(),
            place: eventPlace.trim(),
          }),
        })

        const data = (await response.json()) as CreateMatchResponse

        if (!response.ok || !data.ok) {
          throw new Error(data.ok ? 'No se pudo crear el partido.' : data.error)
        }
      }

      setIsCreateEventOpen(false)
      await loadData()
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : eventFormType === 'entrenamiento'
            ? 'No se pudo crear el entrenamiento.'
            : 'No se pudo crear el partido.'
      )
    } finally {
      setIsCreatingEvent(false)
    }
  }

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)] text-[#181c20]`}>
      <TopNavigation equipoId={payload.equipo.id} avatarUrl={payload.playerSpotlight.foto_url} />

      <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1600px] flex-col xl:flex-row">
        <LeftNavigation equipoId={payload.equipo.id} teamName={teamName} />

        <section className="flex-1 px-4 py-6 lg:px-8 xl:h-[calc(100vh-64px)] xl:overflow-y-auto">
          <header className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-2 [font-family:var(--font-plus-jakarta)] text-4xl font-extrabold tracking-tight text-[#181c20]">
                BeProfesional
              </h1>
              <p className="text-[#5f6776]">{briefingSubtitle}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#3176d2]">{coachRole}</p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-[#d9e2ff] px-4 py-1.5 text-xs font-bold text-[#00337c]">
              {seasonLabel}
            </span>
          </header>

          {saveError && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
              {saveError}
            </p>
          )}

          <div className="space-y-8">
            {isCoach ? (
              <CoachMetricsGrid coachWellbeing={payload.coachWellbeing} />
            ) : (
              <MetricsGrid
                metrics={metrics}
                wellbeing={payload.wellbeing}
                isSaving={isSavingWellbeing}
                onUpdateWellbeing={updateWellbeing}
              />
            )}
            <InsightCard
              activities={payload.schedule.activityItems}
              isCoach={isCoach}
              onOpenCreateEvent={openCreateEventModal}
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

      {isCoach && isCreateEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#181c20]">
              Crear evento del calendario
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#677084]">
              Anade entrenamientos o partidos y se reflejaran al instante en el calendario del equipo.
            </p>

            <div className="mt-4 inline-flex rounded-xl bg-[#eef3fb] p-1">
              <button
                type="button"
                onClick={() => setEventFormType('entrenamiento')}
                className={[
                  'rounded-lg px-3 py-2 text-xs font-bold transition',
                  eventFormType === 'entrenamiento'
                    ? 'bg-white text-[#005db6] shadow-sm'
                    : 'text-[#5f6d86] hover:text-[#005db6]',
                ].join(' ')}
              >
                Entrenamiento
              </button>
              <button
                type="button"
                onClick={() => setEventFormType('partido')}
                className={[
                  'rounded-lg px-3 py-2 text-xs font-bold transition',
                  eventFormType === 'partido'
                    ? 'bg-white text-[#005db6] shadow-sm'
                    : 'text-[#5f6d86] hover:text-[#005db6]',
                ].join(' ')}
              >
                Partido
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                Fecha
                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                Hora de inicio
                <input
                  type="time"
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                  className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                />
              </label>

              {eventFormType === 'entrenamiento' ? (
                <>
                  <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                    Titulo
                    <input
                      type="text"
                      value={trainingTitle}
                      onChange={(event) => setTrainingTitle(event.target.value)}
                      placeholder="Entrenamiento semanal"
                      className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                    Tipo
                    <select
                      value={trainingType}
                      onChange={(event) => setTrainingType(event.target.value as TrainingType)}
                      className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                    >
                      <option value="FISICO">Fisico</option>
                      <option value="TECNICO">Tecnico</option>
                      <option value="TACTICO">Tactico</option>
                      <option value="RECUPERACION">Recuperacion</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                    Rival
                    <input
                      type="text"
                      value={matchOpponent}
                      onChange={(event) => setMatchOpponent(event.target.value)}
                      placeholder="Nombre del rival"
                      className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                    Condicion
                    <select
                      value={matchHomeAway}
                      onChange={(event) => setMatchHomeAway(event.target.value as MatchHomeAway)}
                      className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                    >
                      <option value="CASA">Casa</option>
                      <option value="FUERA">Fuera</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                    Competicion (opcional)
                    <input
                      type="text"
                      value={matchCompetition}
                      onChange={(event) => setMatchCompetition(event.target.value)}
                      placeholder="Liga / Copa / Amistoso"
                      className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                    />
                  </label>
                </>
              )}

              <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                Lugar (opcional)
                <input
                  type="text"
                  value={eventPlace}
                  onChange={(event) => setEventPlace(event.target.value)}
                  list="football-field-options"
                  placeholder={isLoadingFields ? 'Cargando campos...' : 'Campo principal'}
                  className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                />
                <datalist id="football-field-options">
                  {fieldOptions.map((fieldName) => (
                    <option key={fieldName} value={fieldName} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateEventOpen(false)}
                className="rounded-lg border border-[#d5dcea] px-3 py-2 text-xs font-bold text-[#4d5566] transition hover:bg-[#f4f7fb]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isCreatingEvent}
                onClick={() => void createEvent()}
                className="rounded-lg bg-[#005db6] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#004f9a] disabled:opacity-60"
              >
                {isCreatingEvent
                  ? 'Guardando...'
                  : eventFormType === 'entrenamiento'
                    ? 'Crear entrenamiento'
                    : 'Crear partido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
