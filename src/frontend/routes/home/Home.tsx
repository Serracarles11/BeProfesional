'use client'

import { useCallback, useEffect, useState } from 'react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { useSearchParams } from 'next/navigation'
import { Camera, Loader2, Save, UserRound, X } from 'lucide-react'
import { HomeEmptyState, HomeErrorState, HomeLoadingState } from './components/HomeStates'
import { CoachMetricsGrid } from './components/CoachMetricsGrid'
import { InsightCard } from './components/InsightCard'
import { LeftNavigation } from './components/LeftNavigation'
import { MetricsGrid } from './components/MetricsGrid'
import { PlayerSpotlightPanel } from './components/PlayerSpotlightPanel'
import type { DashboardHomeResponse, DashboardHomeSuccess } from './types'
import {
  buildMetrics,
  getMorningBriefingSubtitle,
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
  trainingId?: string
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

type CreateWeeklyTrainingsResponse =
  | {
      ok: true
      createdCount: number
      skippedCount: number
    }
  | {
      ok: false
      error: string
    }

type TrainingType = 'FISICO' | 'TECNICO' | 'TACTICO' | 'RECUPERACION'
type EventFormType = 'entrenamiento' | 'partido'
type MatchHomeAway = 'CASA' | 'FUERA'
type EditingEvent = {
  id: string
  type: EventFormType
} | null
type LoadDataOptions = {
  silent?: boolean
}
type SettingsProfile = {
  nombre: string
  genero: string
  edad: string
  peso_kg: string
  altura_cm: string
  posicion: string
  pie_dominante: string
  telefono: string
  ciudad: string
  pais: string
  bio: string
  instagram: string
  objetivo: string
  foto_url: string | null
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 7, label: 'D' },
]

const EMPTY_SETTINGS_PROFILE: SettingsProfile = {
  nombre: '',
  genero: '',
  edad: '',
  peso_kg: '',
  altura_cm: '',
  posicion: '',
  pie_dominante: '',
  telefono: '',
  ciudad: '',
  pais: '',
  bio: '',
  instagram: '',
  objetivo: '',
  foto_url: null,
}

function toStringOrEmpty(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function normalizeProfile(raw: Record<string, unknown> | null | undefined): SettingsProfile {
  if (!raw) return { ...EMPTY_SETTINGS_PROFILE }

  return {
    nombre: toStringOrEmpty(raw.nombre),
    genero: toStringOrEmpty(raw.genero),
    edad: toStringOrEmpty(raw.edad),
    peso_kg: toStringOrEmpty(raw.peso_kg),
    altura_cm: toStringOrEmpty(raw.altura_cm),
    posicion: toStringOrEmpty(raw.posicion),
    pie_dominante: toStringOrEmpty(raw.pie_dominante),
    telefono: toStringOrEmpty(raw.telefono),
    ciudad: toStringOrEmpty(raw.ciudad),
    pais: toStringOrEmpty(raw.pais),
    bio: toStringOrEmpty(raw.bio),
    instagram: toStringOrEmpty(raw.instagram),
    objetivo: toStringOrEmpty(raw.objetivo),
    foto_url: typeof raw.foto_url === 'string' ? raw.foto_url : null,
  }
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEventDatabaseId(event: { id: string; type: 'partido' | 'entrenamiento' }) {
  const prefix = event.type === 'partido' ? 'match-' : 'training-'
  return event.id.startsWith(prefix) ? event.id.slice(prefix.length) : event.id
}

function getTimeValue(value: string | null) {
  if (!value) return '18:00'
  const timePart = value.includes('T') ? value.split('T')[1] : value
  return timePart.slice(0, 5)
}

export default function Home() {
  const searchParams = useSearchParams()
  const equipoId = searchParams.get('equipo')

  const [status, setStatus] = useState<HomeStatus>('loading')
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<DashboardHomeSuccess | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isSavingWellbeing, setIsSavingWellbeing] = useState(false)
  const [isInviteCodesOpen, setIsInviteCodesOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsProfile, setSettingsProfile] = useState<SettingsProfile>({ ...EMPTY_SETTINGS_PROFILE })
  const [settingsEmail, setSettingsEmail] = useState('')
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [isSettingsSaving, setIsSettingsSaving] = useState(false)
  const [isPhotoUploading, setIsPhotoUploading] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EditingEvent>(null)
  const [isWeeklyTrainingOpen, setIsWeeklyTrainingOpen] = useState(false)
  const [isCreatingWeeklyTraining, setIsCreatingWeeklyTraining] = useState(false)
  const [eventFormType, setEventFormType] = useState<EventFormType>('entrenamiento')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('18:00')
  const [eventPlace, setEventPlace] = useState('')
  const [trainingTitle, setTrainingTitle] = useState('Entrenamiento semanal')
  const [trainingType, setTrainingType] = useState<TrainingType>('TACTICO')
  const [weeklyTrainingDays, setWeeklyTrainingDays] = useState<number[]>([1, 3])
  const [weeklyTrainingTime, setWeeklyTrainingTime] = useState('18:00')
  const [weeklyTrainingPlace, setWeeklyTrainingPlace] = useState('')
  const [weeklyTrainingTitle, setWeeklyTrainingTitle] = useState('Entrenamiento semanal')
  const [weeklyTrainingType, setWeeklyTrainingType] = useState<TrainingType>('TACTICO')
  const [matchOpponent, setMatchOpponent] = useState('')
  const [matchHomeAway, setMatchHomeAway] = useState<MatchHomeAway>('CASA')
  const [matchCompetition, setMatchCompetition] = useState('')
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)

  const loadData = useCallback(async (options?: LoadDataOptions) => {
    const silent = options?.silent ?? false

    if (!silent) {
      setStatus('loading')
      setError('')
    }

    try {
      const query = equipoId ? `?equipo=${encodeURIComponent(equipoId)}` : ''
      const response = await fetch(`/api/dashboard/home${query}`, { cache: 'no-store' })
      const data = (await response.json()) as DashboardHomeResponse

      if (!response.ok || !data.ok) {
        if (silent) {
          throw new Error(('error' in data && data.error) || 'No se pudo refrescar Home')
        }
        setStatus('error')
        setError(('error' in data && data.error) || 'No se pudo cargar Home')
        return
      }

      setPayload(data)
      setStatus('ready')
    } catch (loadError) {
      if (silent) {
        throw loadError instanceof Error
          ? loadError
          : new Error('Error de conexion al refrescar Home')
      }
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
      const isSelectionOnly =
        patch.trainingId !== undefined &&
        patch.attendingTraining === undefined &&
        patch.mentalState === undefined &&
        patch.fatigue === undefined

      if (isSelectionOnly) {
        setSaveError('')
        setPayload((prev) => {
          if (!prev) return prev

          const selectedOption =
            prev.wellbeing.attendanceOptions.find((option) => option.id === patch.trainingId) ?? null

          return {
            ...prev,
            wellbeing: {
              ...prev.wellbeing,
              attendanceTrainingId: selectedOption?.id ?? null,
              attendanceTrainingLabel: selectedOption?.label ?? null,
              attendanceDate: selectedOption?.date ?? null,
              attendingTraining: selectedOption?.attending ?? null,
              attendingCount: selectedOption?.attendingCount ?? 0,
            },
          }
        })
        return
      }

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
  const minutesPlayed = payload.playerSpotlight.minutesPlayed

  const briefingSubtitle = getMorningBriefingSubtitle(payload)
  const seasonLabel = getSeasonLabel(payload)
  const metrics = buildMetrics(payload)
  const spotlightStats = isCoach
    ? [
        { label: 'GOLES', value: payload.coachSeasonStats.goalsFor },
        { label: 'GOLES EN CONTRA', value: payload.coachSeasonStats.goalsAgainst },
        { label: 'PARTIDOS', value: payload.coachSeasonStats.matches },
        { label: 'VICTORIAS', value: payload.coachSeasonStats.wins },
      ]
    : undefined

  const inviteCodeItems = isCoach
    ? [
        { key: 'coach', label: 'Codigo entrenador', code: payload.inviteCodes.coach },
        { key: 'player', label: 'Codigo jugador', code: payload.inviteCodes.player },
      ]
    : [{ key: 'player', label: 'Codigo jugador', code: payload.inviteCodes.player }]

  const openCreateEventModal = (dateKey?: string) => {
    if (!isCoach) return
    setSaveError('')
    setEditingEvent(null)
    setEventDate(dateKey ?? getLocalDateKey(new Date()))
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

  const openEditEventModal = (event: DashboardHomeSuccess['schedule']['activityItems'][number]) => {
    if (!isCoach) return
    setSaveError('')
    setEditingEvent({
      id: getEventDatabaseId(event),
      type: event.type === 'partido' ? 'partido' : 'entrenamiento',
    })
    setEventDate(event.date)
    setEventTime(getTimeValue(event.time))
    setEventPlace(event.location ?? '')
    setEventFormType(event.type === 'partido' ? 'partido' : 'entrenamiento')

    if (event.type === 'entrenamiento') {
      setTrainingTitle(event.title)
      setTrainingType((event.subtitle as TrainingType | null) ?? 'TACTICO')
      setMatchOpponent('')
      setMatchCompetition('')
      setMatchHomeAway('CASA')
    } else {
      setTrainingTitle('Entrenamiento semanal')
      setTrainingType('TACTICO')
      setMatchOpponent(event.opponent ?? '')
      setMatchCompetition(event.competition ?? '')
      setMatchHomeAway(event.homeAway === 'FUERA' ? 'FUERA' : 'CASA')
    }

    setIsCreateEventOpen(true)
  }

  const openWeeklyTrainingModal = () => {
    if (!isCoach) return
    setSaveError('')
    setWeeklyTrainingDays((current) => (current.length > 0 ? current : [1, 3]))
    setWeeklyTrainingTime('18:00')
    setWeeklyTrainingPlace('')
    setWeeklyTrainingTitle('Entrenamiento semanal')
    setWeeklyTrainingType('TACTICO')
    setIsWeeklyTrainingOpen(true)
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

  const toggleWeeklyTrainingDay = (day: number) => {
    setWeeklyTrainingDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day)
      }

      return [...current, day].sort((left, right) => left - right)
    })
  }

  const openSettingsModal = async () => {
    setIsSettingsOpen(true)
    setSettingsError('')
    setSettingsSuccess('')

    if (hasLoadedSettings) return

    setIsSettingsLoading(true)
    try {
      const response = await fetch('/api/profile/settings', { cache: 'no-store' })
      const data = (await response.json()) as {
        ok?: boolean
        error?: string
        profile?: Record<string, unknown>
        email?: string
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo cargar ajustes.')
      }

      const normalized = normalizeProfile(data.profile)
      setSettingsProfile(normalized)
      setSettingsEmail(data.email || '')
      setHasLoadedSettings(true)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'No se pudo cargar ajustes.')
    } finally {
      setIsSettingsLoading(false)
    }
  }

  const setSettingsField = (field: keyof SettingsProfile, value: string) => {
    setSettingsProfile((current) => ({ ...current, [field]: value }))
  }

  const handleSaveSettings = async () => {
    setIsSettingsSaving(true)
    setSettingsError('')
    setSettingsSuccess('')

    try {
      const response = await fetch('/api/profile/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsProfile),
      })

      const data = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo guardar ajustes.')
      }

      setSettingsSuccess('Ajustes guardados correctamente.')
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'No se pudo guardar ajustes.')
    } finally {
      setIsSettingsSaving(false)
    }
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const input = event.target
    if (!file) return

    setSettingsError('')
    setSettingsSuccess('')

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSettingsError('Formato no valido. Usa JPG, PNG o WEBP.')
      input.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setSettingsError('La foto supera el maximo de 5 MB.')
      input.value = ''
      return
    }

    setIsPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('next', '/home')

      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as { ok?: boolean; error?: string; foto_url?: string }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo subir la foto.')
      }

      setSettingsProfile((current) => ({ ...current, foto_url: data.foto_url ?? current.foto_url }))
      setSettingsSuccess('Foto de perfil actualizada.')
      await loadData({ silent: true })
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'No se pudo subir la foto.')
    } finally {
      setIsPhotoUploading(false)
      input.value = ''
    }
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
          method: editingEvent?.type === 'entrenamiento' ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipoId: payload.equipo.id,
            trainingId: editingEvent?.type === 'entrenamiento' ? editingEvent.id : undefined,
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
          method: editingEvent?.type === 'partido' ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipoId: payload.equipo.id,
            matchId: editingEvent?.type === 'partido' ? editingEvent.id : undefined,
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
      setEditingEvent(null)
      await loadData({ silent: true })
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

  const deleteCalendarEvent = async (event: DashboardHomeSuccess['schedule']['activityItems'][number]) => {
    if (!payload.equipo?.id) return
    const confirmed = window.confirm(`Quieres eliminar "${event.title}"?`)
    if (!confirmed) return

    setSaveError('')
    const eventId = getEventDatabaseId(event)
    const endpoint =
      event.type === 'entrenamiento'
        ? `/api/dashboard/home/trainings?equipoId=${encodeURIComponent(payload.equipo.id)}&trainingId=${encodeURIComponent(eventId)}`
        : `/api/dashboard/home/matches?equipoId=${encodeURIComponent(payload.equipo.id)}&matchId=${encodeURIComponent(eventId)}`

    try {
      const response = await fetch(endpoint, { method: 'DELETE' })
      const data = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo eliminar el evento.')
      }
      await loadData({ silent: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo eliminar el evento.')
    }
  }

  const createWeeklyTrainings = async () => {
    if (!payload.equipo?.id) return
    if (weeklyTrainingDays.length === 0) {
      setSaveError('Selecciona al menos un dia de entrenamiento.')
      return
    }

    setIsCreatingWeeklyTraining(true)
    setSaveError('')

    try {
      const response = await fetch('/api/dashboard/home/trainings/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId: payload.equipo.id,
          weekdays: weeklyTrainingDays,
          time: weeklyTrainingTime,
          title: weeklyTrainingTitle.trim(),
          type: weeklyTrainingType,
          place: weeklyTrainingPlace.trim(),
          weeks: 12,
        }),
      })

      const data = (await response.json()) as CreateWeeklyTrainingsResponse

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'No se pudieron crear los entrenamientos.' : data.error)
      }

      setIsWeeklyTrainingOpen(false)
      await loadData({ silent: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudieron crear los entrenamientos semanales.')
    } finally {
      setIsCreatingWeeklyTraining(false)
    }
  }

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)] text-[#181c20]`}>
      <main className="flex min-h-screen w-full flex-col xl:flex-row">
        <LeftNavigation
          equipoId={payload.equipo.id}
          teamName={teamName}
          isCoach={isCoach}
          isCodesActive={isInviteCodesOpen}
          onOpenCodes={() => setIsInviteCodesOpen(true)}
          isSettingsActive={isSettingsOpen}
          onOpenSettings={() => void openSettingsModal()}
        />

        <section className="flex-1 px-4 py-6 lg:px-8 xl:h-screen xl:overflow-y-auto">
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
              onOpenWeeklyTraining={openWeeklyTrainingModal}
              onEditEvent={openEditEventModal}
              onDeleteEvent={(event) => void deleteCalendarEvent(event)}
            />
          </div>
        </section>

        <div className="xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto">
          <PlayerSpotlightPanel
            playerName={playerName}
            position={playerPosition}
            imageUrl={payload.playerSpotlight.foto_url}
            goals={payload.playerSpotlight.goals}
            assists={payload.playerSpotlight.assists}
            matches={payload.playerSpotlight.matchesPlayed}
            minutes={minutesPlayed}
            stats={spotlightStats}
          />
        </div>
      </main>

      {isInviteCodesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#181c20]">
                  Codigos de acceso
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#677084]">
                  Comparte estos codigos para unirse al equipo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteCodesOpen(false)}
                className="rounded-lg p-1 text-[#6b7487] transition hover:bg-[#eef3fb] hover:text-[#005db6]"
                aria-label="Cerrar codigos"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {inviteCodeItems.map((item) => (
                <article key={item.key} className="rounded-xl border border-[#dbe5f4] bg-[#f8fbff] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6a7386]">
                    {item.label}
                  </p>
                  <p className="mt-1 rounded-lg bg-white px-3 py-2 font-mono text-sm font-extrabold tracking-[0.08em] text-[#005db6]">
                    {item.code ?? 'No disponible'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#181c20]">
                  Settings
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#677084]">
                  Edita tu perfil y actualiza tu foto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg p-1 text-[#6b7487] transition hover:bg-[#eef3fb] hover:text-[#005db6]"
                aria-label="Cerrar ajustes"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isSettingsLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-[#5f6776]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando ajustes...
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-4 rounded-xl border border-[#dbe5f4] bg-[#f8fbff] p-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-[#dbe5f4]">
                    {settingsProfile.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settingsProfile.foto_url} alt={settingsProfile.nombre || 'Perfil'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#4f5b70]">
                        <UserRound className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1f2530]">{settingsProfile.nombre || 'Tu perfil'}</p>
                    <p className="text-xs text-[#677084]">{settingsEmail || 'Sin email'}</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c8d8f7] bg-white px-3 py-2 text-xs font-bold text-[#005db6] transition hover:bg-[#eef3fb]">
                    <Camera className="h-4 w-4" />
                    {isPhotoUploading ? 'Subiendo...' : 'Cambiar foto'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoChange}
                      disabled={isPhotoUploading}
                    />
                  </label>
                </div>

                {settingsError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {settingsError}
                  </p>
                ) : null}
                {settingsSuccess ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    {settingsSuccess}
                  </p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Nombre</span>
                    <input value={settingsProfile.nombre} onChange={(e) => setSettingsField('nombre', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Genero</span>
                    <input value={settingsProfile.genero} onChange={(e) => setSettingsField('genero', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Edad</span>
                    <input value={settingsProfile.edad} onChange={(e) => setSettingsField('edad', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Peso (kg)</span>
                    <input value={settingsProfile.peso_kg} onChange={(e) => setSettingsField('peso_kg', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Altura (cm)</span>
                    <input value={settingsProfile.altura_cm} onChange={(e) => setSettingsField('altura_cm', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Posicion</span>
                    <input value={settingsProfile.posicion} onChange={(e) => setSettingsField('posicion', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Pie dominante</span>
                    <input value={settingsProfile.pie_dominante} onChange={(e) => setSettingsField('pie_dominante', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Telefono</span>
                    <input value={settingsProfile.telefono} onChange={(e) => setSettingsField('telefono', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Ciudad</span>
                    <input value={settingsProfile.ciudad} onChange={(e) => setSettingsField('ciudad', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Pais</span>
                    <input value={settingsProfile.pais} onChange={(e) => setSettingsField('pais', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Instagram</span>
                    <input value={settingsProfile.instagram} onChange={(e) => setSettingsField('instagram', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Bio</span>
                    <textarea rows={3} value={settingsProfile.bio} onChange={(e) => setSettingsField('bio', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7386]">Objetivo</span>
                    <textarea rows={3} value={settingsProfile.objetivo} onChange={(e) => setSettingsField('objetivo', e.target.value)} className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2 text-sm" />
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="rounded-lg border border-[#d5dcea] px-3 py-2 text-xs font-bold text-[#4d5566] transition hover:bg-[#f4f7fb]"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveSettings()}
                    disabled={isSettingsSaving || isPhotoUploading}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#005db6] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#004f9a] disabled:opacity-60"
                  >
                    {isSettingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar cambios
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isCoach && isCreateEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#181c20]">
              {editingEvent ? 'Modificar evento del calendario' : 'Crear evento del calendario'}
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#677084]">
              Anade entrenamientos o partidos y se reflejaran al instante en el calendario del equipo.
            </p>

            <div className="mt-4 inline-flex rounded-xl bg-[#eef3fb] p-1">
              <button
                type="button"
                onClick={() => {
                  if (!editingEvent) setEventFormType('entrenamiento')
                }}
                disabled={Boolean(editingEvent)}
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
                onClick={() => {
                  if (!editingEvent) setEventFormType('partido')
                }}
                disabled={Boolean(editingEvent)}
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
                onClick={() => {
                  setIsCreateEventOpen(false)
                  setEditingEvent(null)
                }}
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
                  : editingEvent
                    ? 'Guardar cambios'
                    : eventFormType === 'entrenamiento'
                    ? 'Crear entrenamiento'
                    : 'Crear partido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCoach && isWeeklyTrainingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#181c20]">
              Entrenamientos fijos semanales
            </h3>
            <p className="mt-1 text-xs font-semibold text-[#677084]">
              Marca que dias de la semana hay entrenamiento y se crearan para las proximas 12 semanas.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#4d5566]">
                  Dias de entrenamiento
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const active = weeklyTrainingDays.includes(day.value)

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleWeeklyTrainingDay(day.value)}
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition',
                          active
                            ? 'bg-[#005db6] text-white shadow-[0_12px_24px_rgba(0,93,182,0.22)]'
                            : 'border border-[#d5dcea] bg-white text-[#5f6776] hover:border-[#005db6] hover:text-[#005db6]',
                        ].join(' ')}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                  Hora
                  <input
                    type="time"
                    value={weeklyTrainingTime}
                    onChange={(event) => setWeeklyTrainingTime(event.target.value)}
                    className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                  Tipo
                  <select
                    value={weeklyTrainingType}
                    onChange={(event) => setWeeklyTrainingType(event.target.value as TrainingType)}
                    className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                  >
                    <option value="FISICO">Fisico</option>
                    <option value="TECNICO">Tecnico</option>
                    <option value="TACTICO">Tactico</option>
                    <option value="RECUPERACION">Recuperacion</option>
                  </select>
                </label>

                <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                  Titulo
                  <input
                    type="text"
                    value={weeklyTrainingTitle}
                    onChange={(event) => setWeeklyTrainingTitle(event.target.value)}
                    placeholder="Entrenamiento semanal"
                    className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                  />
                </label>

                <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-semibold text-[#4d5566]">
                  Lugar (opcional)
                  <input
                    type="text"
                    value={weeklyTrainingPlace}
                    onChange={(event) => setWeeklyTrainingPlace(event.target.value)}
                    list="weekly-football-field-options"
                    placeholder={isLoadingFields ? 'Cargando campos...' : 'Campo principal'}
                    className="rounded-lg border border-[#d5dcea] bg-white px-3 py-2 text-sm text-[#1f2530]"
                  />
                  <datalist id="weekly-football-field-options">
                    {fieldOptions.map((fieldName) => (
                      <option key={fieldName} value={fieldName} />
                    ))}
                  </datalist>
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsWeeklyTrainingOpen(false)}
                className="rounded-lg border border-[#d5dcea] px-3 py-2 text-xs font-bold text-[#4d5566] transition hover:bg-[#f4f7fb]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isCreatingWeeklyTraining}
                onClick={() => void createWeeklyTrainings()}
                className="rounded-lg bg-[#005db6] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#004f9a] disabled:opacity-60"
              >
                {isCreatingWeeklyTraining ? 'Guardando...' : 'Crear entrenamientos fijos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
