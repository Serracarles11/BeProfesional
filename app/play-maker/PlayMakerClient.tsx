'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  Dumbbell,
  FileText,
  Loader2,
  Play,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'
import { withEquipo } from '@/app/home/utils'
import type { RoutineSummary } from '@/lib/playmaker/routines'
import type { ExerciseCatalogSearchResult } from '@/lib/exercisedb-types'

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

type TrainingItem = {
  id: string
  fecha: string
  hora_inicio: string | null
  titulo: string
  tipo: string | null
  lugar: string | null
}

type TrainingAssistantClientProps = {
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
    logo_url: string | null
  } | null
  role: string | null
  isCoach: boolean
  playerName: string
  routines: RoutineSummary[]
  upcomingTrainings: TrainingItem[]
}

type AssistantTab = 'LIBRARY' | 'AI_COACH' | 'PHYSICAL_STATUS'
type FilterCategory = 'Todos' | 'Estiramientos' | 'Rendimiento Fisico' | 'Rehabilitacion'
type AudienceMode = 'all' | 'selected'
type TeamPlayerOption = {
  id: string
  name: string
}

const FILTERS: FilterCategory[] = ['Todos', 'Estiramientos', 'Rendimiento Fisico', 'Rehabilitacion']

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function resolveCategory(routine: RoutineSummary): FilterCategory {
  const type = normalizeText(routine.category)
  const objective = normalizeText(routine.title)
  const description = normalizeText(routine.description)
  const pool = `${type} ${objective} ${description}`

  if (pool.includes('REHAB') || pool.includes('RECUP') || pool.includes('LESION')) {
    return 'Rehabilitacion'
  }
  if (pool.includes('MOVIL') || pool.includes('ESTIR') || pool.includes('FLEX')) {
    return 'Estiramientos'
  }
  return 'Rendimiento Fisico'
}

function difficultyLabel(value: number | null) {
  if (!value || value <= 1) return 'Inicial'
  if (value <= 3) return 'Media'
  if (value === 4) return 'Alta'
  return 'Expert'
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mapRoutineToTrainingType(routine: RoutineSummary): 'FISICO' | 'TECNICO' | 'TACTICO' | 'RECUPERACION' {
  const pool = `${routine.trainingCategory} ${routine.category} ${routine.title}`.toUpperCase()
  if (pool.includes('RECUP') || pool.includes('REHAB')) return 'RECUPERACION'
  if (pool.includes('TACT')) return 'TACTICO'
  if (pool.includes('TECN')) return 'TECNICO'
  return 'FISICO'
}

export default function TrainingAssistantClient({
  equipo,
  role,
  isCoach,
  playerName,
  routines,
  upcomingTrainings,
}: TrainingAssistantClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AssistantTab>('LIBRARY')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Todos')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'difficulty'>('popular')
  const [localRoutines, setLocalRoutines] = useState<RoutineSummary[]>(routines)
  const [catalogResults, setCatalogResults] = useState<ExerciseCatalogSearchResult[]>([])
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [sendRoutine, setSendRoutine] = useState<RoutineSummary | null>(null)
  const [sendDate, setSendDate] = useState(() => getLocalDateKey(new Date()))
  const [sendTime, setSendTime] = useState('18:00')
  const [sendPlace, setSendPlace] = useState('')
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('all')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [playerOptions, setPlayerOptions] = useState<TeamPlayerOption[]>([])
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [isSendingRoutine, setIsSendingRoutine] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState('')

  const visibleRoutines = useMemo(() => {
    const filtered = localRoutines.filter((routine) => {
      const category = resolveCategory(routine)
      const haystack = `${routine.title} ${routine.description} ${routine.phase} ${routine.category}`.toLowerCase()
      const queryMatch = query.trim() ? haystack.includes(query.trim().toLowerCase()) : true
      const filterMatch = activeFilter === 'Todos' ? true : category === activeFilter
      return queryMatch && filterMatch
    })

    return [...filtered].sort((left, right) => {
      if (sortBy === 'difficulty') {
        return right.difficulty - left.difficulty
      }
      if (sortBy === 'recent') {
        return right.duration - left.duration
      }
      return left.title.localeCompare(right.title, 'es')
    })
  }, [activeFilter, localRoutines, query, sortBy])

  const heroCopy = isCoach
    ? 'Optimiza la planificacion del grupo con una biblioteca de ejercicios conectada a tu equipo.'
    : 'Optimiza tu rendimiento fisico con rutinas conectadas a tu equipo y sesiones preparadas por profesionales.'

  const previewRoutines = useMemo(() => {
    return (visibleRoutines.length > 0 ? visibleRoutines : localRoutines).slice(0, 4)
  }, [localRoutines, visibleRoutines])

  const previewDuration = useMemo(() => {
    return previewRoutines.reduce((acc, routine) => acc + routine.duration, 0)
  }, [previewRoutines])

  const previewVolume = useMemo(() => {
    const estimated = previewRoutines.reduce((acc, routine) => {
      return acc + routine.difficulty * Math.max(routine.duration, 10) * 18
    }, 0)
    return `${(estimated / 1000).toFixed(1)}K KG`
  }, [previewRoutines])

  const previewIntensity = useMemo(() => {
    const avgDifficulty =
      previewRoutines.reduce((acc, routine) => acc + routine.difficulty, 0) / Math.max(previewRoutines.length, 1)
    if (avgDifficulty >= 4) return 'HIGH'
    if (avgDifficulty >= 3) return 'MEDIUM'
    return 'LOW'
  }, [previewRoutines])

  const suggestionChips = useMemo(() => {
    const derived = [
      'Recuperar piernas',
      'Mejorar potencia explosiva',
      'Cardio zona 2',
      upcomingTrainings[0]?.tipo ? `Preparar ${upcomingTrainings[0].tipo}` : null,
    ].filter((value): value is string => Boolean(value))

    return derived.slice(0, 4)
  }, [upcomingTrainings])

  const aiCreateHref = withEquipo('/play-maker/create', equipo?.id)

  async function deleteRoutine(routine: RoutineSummary) {
    if (!equipo?.id) return
    const confirmed = window.confirm(`Quieres eliminar "${routine.title}"?`)
    if (!confirmed) return

    setDeletingRoutineId(routine.id)
    setDeleteError('')

    try {
      const params = new URLSearchParams({
        equipoId: equipo.id,
        routineId: routine.id,
      })
      const response = await fetch(`/api/play-maker/exercises?${params.toString()}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'No se pudo eliminar la rutina.')
      }

      setLocalRoutines((current) => current.filter((item) => item.id !== routine.id))
      router.refresh()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudo eliminar la rutina.')
    } finally {
      setDeletingRoutineId(null)
    }
  }

  async function openSendRoutineModal(routine: RoutineSummary) {
    if (!isCoach || !equipo?.id) return

    setSendRoutine(routine)
    setSendDate(getLocalDateKey(new Date()))
    setSendTime('18:00')
    setSendPlace('')
    setAudienceMode('all')
    setSelectedPlayerIds([])
    setSendError('')
    setSendSuccess('')
    setIsLoadingPlayers(true)

    try {
      const response = await fetch(`/api/dashboard/home/fields?equipo=${encodeURIComponent(equipo.id)}`, {
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        fields?: string[]
        players?: TeamPlayerOption[]
      } | null

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'No se pudieron cargar los jugadores.')
      }

      setFieldOptions(payload.fields ?? [])
      setPlayerOptions(payload.players ?? [])
    } catch (error) {
      setFieldOptions([])
      setPlayerOptions([])
      setSendError(error instanceof Error ? error.message : 'No se pudieron cargar los jugadores.')
    } finally {
      setIsLoadingPlayers(false)
    }
  }

  async function sendRoutineToPlayers() {
    if (!sendRoutine || !equipo?.id) return
    if (!sendDate) {
      setSendError('Debes indicar una fecha.')
      return
    }
    if (audienceMode === 'selected' && selectedPlayerIds.length === 0) {
      setSendError('Selecciona al menos un jugador o envia a todos.')
      return
    }

    setIsSendingRoutine(true)
    setSendError('')
    setSendSuccess('')

    try {
      const response = await fetch('/api/dashboard/home/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId: equipo.id,
          date: sendDate,
          time: sendTime,
          title: sendRoutine.title,
          type: mapRoutineToTrainingType(sendRoutine),
          place: sendPlace.trim(),
          targetPlayerIds: audienceMode === 'all' ? [] : selectedPlayerIds,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'No se pudo enviar el entrenamiento.')
      }

      setSendSuccess(`Entrenamiento enviado: ${sendRoutine.title}`)
      setSendRoutine(null)
      router.refresh()
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'No se pudo enviar el entrenamiento.')
    } finally {
      setIsSendingRoutine(false)
    }
  }

  useEffect(() => {
    const search = query.trim()
    if (activeTab !== 'LIBRARY' || search.length < 2 || !equipo?.id) {
      setCatalogResults([])
      setCatalogError('')
      setIsCatalogLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsCatalogLoading(true)
      setCatalogError('')

      try {
        const params = new URLSearchParams({
          query: search,
          equipoId: equipo.id,
        })
        const response = await fetch(`/api/play-maker/exercise-catalog?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean
          error?: string
          results?: ExerciseCatalogSearchResult[]
        } | null

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || 'No se pudo buscar en ExerciseDB.')
        }

        if (!cancelled) setCatalogResults(payload.results ?? [])
      } catch (error) {
        if (cancelled || controller.signal.aborted) return
        setCatalogResults([])
        setCatalogError(error instanceof Error ? error.message : 'No se pudo buscar en ExerciseDB.')
      } finally {
        if (!cancelled) setIsCatalogLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [activeTab, equipo?.id, query])

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f7f9fe] [font-family:var(--font-manrope)] text-[#181c20]`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <LeftNavigation equipoId={equipo?.id} teamName={equipo?.nombre ?? 'Equipo'} isCoach={isCoach} />

        <main className="min-w-0 flex-1">
          <header
            className={[
              'z-30 flex h-16 items-center justify-between border-b border-[#dfe3e8] bg-white/80 px-6 backdrop-blur-md lg:px-10',
              activeTab === 'PHYSICAL_STATUS' ? 'sticky top-0' : 'relative',
            ].join(' ')}
          >
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black italic tracking-tighter text-[#1A73E8] [font-family:var(--font-plus-jakarta)] lg:hidden">
                Beprofessional
              </h1>
            </div>
            <div className="flex items-center gap-6">
              {activeTab !== 'AI_COACH' ? (
                <div className="hidden items-center rounded-full border border-[#c1c6d6]/30 bg-[#f1f4f9] px-4 py-2 md:flex">
                  <Search className="mr-2 h-4 w-4 text-[#727785]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-48 border-none bg-transparent text-sm placeholder:text-[#727785]/60 focus:outline-none"
                    placeholder="Buscar ejercicios..."
                  />
                </div>
              ) : null}
              <button className="text-slate-500 transition-colors hover:text-[#1A73E8]">
                <Bell className="h-5 w-5" />
              </button>
              <button className="text-slate-500 transition-colors hover:text-[#1A73E8]">
                <Settings className="h-5 w-5" />
              </button>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#1A73E8]/10 bg-[#d6e3ff] text-sm font-bold text-[#1A73E8]">
                {playerName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </header>

          <nav
            className={[
              'z-20 flex h-14 items-center border-b border-[#e5e8ed] bg-[#f7f9fe]/90 px-6 backdrop-blur-md lg:px-10',
              activeTab === 'PHYSICAL_STATUS' ? 'sticky top-16' : 'relative',
            ].join(' ')}
          >
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => setActiveTab('LIBRARY')}
                className={`relative h-full px-1 text-sm tracking-tight ${activeTab === 'LIBRARY' ? 'font-bold text-[#1A73E8]' : 'font-semibold text-[#44474E]/70'}`}
              >
                Library
                {activeTab === 'LIBRARY' ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#1A73E8]" /> : null}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AI_COACH')}
                className={`h-full px-1 text-sm tracking-tight ${activeTab === 'AI_COACH' ? 'font-bold text-[#1A73E8]' : 'font-semibold text-[#44474E]/70'}`}
              >
                AI Coach
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PHYSICAL_STATUS')}
                className={`h-full px-1 text-sm tracking-tight ${activeTab === 'PHYSICAL_STATUS' ? 'font-bold text-[#1A73E8]' : 'font-semibold text-[#44474E]/70'}`}
              >
                Physical Status
              </button>
            </div>
          </nav>

          <div className="mx-auto max-w-7xl px-6 pb-20 pt-12 lg:px-10">
            {activeTab === 'PHYSICAL_STATUS' ? (
              <section className="relative mb-14">
                <div className="pointer-events-none absolute -right-8 -top-16 select-none text-[9rem] font-black uppercase tracking-tighter text-[#1A73E8]/5 lg:text-[15rem]">
                  Athletic
                </div>
                <div className="relative z-10">
                  <h2 className="mb-4 text-5xl font-extrabold tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)] lg:text-7xl">
                    Entrenamientos <span className="italic text-[#1A73E8]">de Elite</span>
                  </h2>
                  <p className="max-w-2xl text-lg font-medium leading-relaxed text-[#44474E]">
                    {heroCopy}
                  </p>
                  <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#727785]">
                    {equipo?.nombre ?? 'Equipo'} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {role ?? 'Jugador'}
                  </p>
                </div>
              </section>
            ) : null}

            {activeTab === 'LIBRARY' ? (
              <>
                <div className="mb-12 flex flex-wrap items-center gap-3 overflow-x-auto pb-2">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={[
                        'rounded-full px-6 py-2.5 text-sm transition-all',
                        activeFilter === filter
                          ? 'bg-[#1A73E8] font-bold text-white shadow-md shadow-[#1A73E8]/20'
                          : 'border border-[#e5e8ed] bg-white font-semibold text-[#44474E] hover:bg-[#3176d2] hover:text-white',
                      ].join(' ')}
                    >
                      {filter}
                    </button>
                  ))}

                  <div className="ml-auto flex items-center gap-3 rounded-full border border-[#e5e8ed] bg-white px-4 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#727785]">Ordenar por</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSortBy((current) =>
                          current === 'popular' ? 'recent' : current === 'recent' ? 'difficulty' : 'popular'
                        )
                      }
                      className="flex items-center gap-2 text-xs font-bold text-[#181c20]"
                    >
                      {sortBy === 'popular' ? 'Mas Populares' : sortBy === 'recent' ? 'Recientes' : 'Dificultad'}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-3">
                  {deleteError ? (
                    <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {deleteError}
                    </div>
                  ) : null}
                  {sendSuccess ? (
                    <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      {sendSuccess}
                    </div>
                  ) : null}

                  <Link
                    href={withEquipo('/play-maker/create', equipo?.id)}
                    className="group flex min-h-[440px] flex-col justify-between overflow-hidden rounded-lg border border-dashed border-[#1A73E8]/25 bg-[linear-gradient(135deg,rgba(26,115,232,0.10),rgba(255,255,255,0.98))] p-8 transition-all duration-500 hover:-translate-y-1 hover:border-[#1A73E8]/50 hover:shadow-[0_20px_40px_rgba(26,115,232,0.10)]"
                  >
                    <div>
                      <div className="mb-6 flex items-start justify-between">
                        <span className="rounded-md bg-[#1A73E8] px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white">
                          Nuevo
                        </span>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#1A73E8] shadow-[0_12px_24px_rgba(26,115,232,0.12)]">
                          <Plus className="h-6 w-6" />
                        </div>
                      </div>
                      <h3 className="mb-3 text-3xl font-extrabold tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)]">
                        Crear ejercicio
                      </h3>
                      <p className="max-w-sm text-sm font-medium leading-relaxed text-[#44474E]">
                        Anade una nueva rutina para el equipo, organiza el objetivo de trabajo y deja preparada la sesion desde tu area de entrenamientos.
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <InfoMini label="Accion" value="Alta manual" />
                        <InfoMini label="Destino" value="Creador visual" />
                      </div>
                      <div className="flex items-center justify-between border-t border-[#d6e3ff] pt-5">
                        <div className="flex items-center gap-1.5 text-[#44474E]">
                          <Sparkles className="h-4 w-4 text-[#1A73E8]" />
                          <span className="text-xs font-bold">Biblioteca conectada</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1A73E8] to-[#0056b3] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-[#1A73E8]/20 transition-all group-hover:-translate-y-0.5">
                          <span>CREAR EJERCICIO</span>
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>

                  {query.trim().length >= 2 ? (
                    <>
                      {isCatalogLoading ? (
                        <article className="flex min-h-[260px] flex-col justify-center rounded-lg border border-[#d6e3ff] bg-white p-8 text-center shadow-[0_20px_40px_rgba(26,115,232,0.06)]">
                          <Sparkles className="mx-auto mb-4 h-7 w-7 animate-pulse text-[#1A73E8]" />
                          <h3 className="text-lg font-extrabold text-[#181c20] [font-family:var(--font-plus-jakarta)]">Buscando en ExerciseDB</h3>
                          <p className="mt-2 text-sm font-medium text-[#727785]">Combinando biblioteca local con ejercicios externos.</p>
                        </article>
                      ) : null}

                      {catalogError ? (
                        <article className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
                          {catalogError}
                        </article>
                      ) : null}

                      {catalogResults.map((result) => {
                        const createHref = equipo?.id
                          ? `/play-maker/create?equipo=${encodeURIComponent(equipo.id)}&exerciseId=${encodeURIComponent(result.exerciseId ?? '')}&exerciseName=${encodeURIComponent(result.name)}`
                          : `/play-maker/create?exerciseId=${encodeURIComponent(result.exerciseId ?? '')}&exerciseName=${encodeURIComponent(result.name)}`

                        return (
                          <ExerciseCatalogCard
                            key={`${result.source}-${result.exerciseId ?? result.localId ?? result.name}`}
                            result={result}
                            createHref={createHref}
                          />
                        )
                      })}
                    </>
                  ) : null}

                  {visibleRoutines.length > 0 ? (
                    visibleRoutines.map((routine) => {
                      const category = resolveCategory(routine)
                      const viewHref = withEquipo(`/play-maker/routine/${routine.id}`, equipo?.id)
                      const editHref = equipo?.id
                        ? `/play-maker/create?equipo=${encodeURIComponent(equipo.id)}&routine=${encodeURIComponent(routine.id)}`
                        : `/play-maker/create?routine=${encodeURIComponent(routine.id)}`

                      return (
                        <RoutineDarkCard
                          key={routine.id}
                          routine={routine}
                          category={category}
                          viewHref={viewHref}
                          editHref={editHref}
                          isDeleting={deletingRoutineId === routine.id}
                          onDelete={() => void deleteRoutine(routine)}
                          canSend={isCoach}
                          onSend={() => void openSendRoutineModal(routine)}
                        />
                      )
                    })
                  ) : (
                    <EmptyState
                      title="No hay rutinas disponibles"
                      description="Todavia no hay ejercicios cargados para este equipo o no coinciden con tu filtro actual."
                    />
                  )}
                </div>
              </>
            ) : activeTab === 'AI_COACH' ? (
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr_0.9fr]">
                <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
                  <div className="border-b border-[#dfe3e8]/60 px-8 py-8">
                    <div className="mb-2 flex items-center gap-2 text-[#005db6]">
                      <Sparkles className="h-5 w-5" />
                      <span className="text-sm font-bold uppercase tracking-[0.18em]">AI Coach Integrado</span>
                    </div>
                    <h3 className="text-3xl font-extrabold tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)]">
                      Genera la rutina dentro del creador real
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
                      La generacion por IA ahora vive en el creador de rutinas. La IA construye una sesion completa, la deja editable y mantiene el contexto para que puedas seguir refinandola antes de guardar.
                    </p>
                  </div>

                  <div className="grid gap-8 px-8 py-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                      <div className="rounded-[24px] border border-[#dbe7ff] bg-[linear-gradient(135deg,rgba(26,115,232,0.08),rgba(255,255,255,0.98))] p-6">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1A73E8]">Flujo real</p>
                        <div className="mt-4 space-y-4 text-sm text-[#334155]">
                          <p>1. Pides una sesion completa a la IA.</p>
                          <p>2. La rutina aparece en el creador con fases, bloques y detalles editables.</p>
                          <p>3. Sigues chateando para ajustar intensidad, duracion, jugadores o ejercicios concretos.</p>
                          <p>4. Guardas la rutina como una normal. Si viene de IA, se muestra como <strong>Hecha por IA</strong>.</p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#727785]">Prompts rapidos</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestionChips.map((chip) => (
                            <Link key={chip} href={aiCreateHref} className="rounded-full border border-[#005db6]/20 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#005db6] transition-all hover:bg-[#005db6] hover:text-white">
                              {chip}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-[24px] bg-gradient-to-br from-[#005db6] to-[#2b5bb5] p-7 text-white shadow-xl shadow-blue-900/20">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">Rutina editable con IA</p>
                        <h4 className="mt-3 text-2xl font-extrabold tracking-tight [font-family:var(--font-plus-jakarta)]">Lista para generar, ajustar y guardar</h4>
                        <div className="mt-6 grid grid-cols-3 gap-4">
                          <AiStat label="Duration" value={`${previewDuration || 0} MIN`} />
                          <AiStat label="Volume" value={previewVolume} bordered />
                          <AiStat label="Intensity" value={previewIntensity} />
                        </div>
                        <Link href={aiCreateHref} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-xs font-bold uppercase tracking-widest text-[#005db6] transition hover:bg-[#e8f0fe]">
                          <Sparkles className="h-4 w-4" />
                          <span>Abrir creador con IA</span>
                        </Link>
                      </div>

                      <div className="rounded-[24px] bg-white p-6 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
                        <h5 className="mb-6 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">Biblioteca disponible para la IA</h5>
                        <div className="space-y-4">
                          {previewRoutines.length > 0 ? (
                            previewRoutines.map((routine) => (
                              <div key={routine.id} className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-[#f1f4f9]">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d6e3ff] to-[#ebeef3] text-[#005db6]">
                                  <Dumbbell className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-[#181c20]">{routine.title}</p>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{routine.blockCount} bloques x {routine.duration ?? 10} min</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-[#005db6]">{routine.category || difficultyLabel(routine.difficulty)}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <EmptyState title="Sin biblioteca" description="Carga rutinas para que la IA tenga mas contexto al generar nuevas sesiones." compact />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                <StatusCard title="Carga semanal" value={`${Math.min(localRoutines.length * 8, 100)}%`} helper="Basado en la biblioteca activa" />
                <StatusCard title="Variedad de trabajo" value={`${new Set(localRoutines.map(resolveCategory)).size}/3`} helper="Categorias activas" />
                <StatusCard title="Sesiones proximas" value={String(upcomingTrainings.length)} helper="Visible para tu perfil" />
              </div>
            )}

            <div className="mt-20 flex flex-col items-center">
              <button className="group flex flex-col items-center gap-3 text-[#44474E]/60 transition-all hover:text-[#1A73E8]">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">Cargar mas rutinas</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e8ed] transition-colors group-hover:border-[#1A73E8]">
                  <ChevronDown className="h-5 w-5" />
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>

      {sendRoutine ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_40px_90px_rgba(15,23,42,0.35)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1A73E8]">Enviar entrenamiento</p>
                <h3 className="mt-2 text-xl font-extrabold text-[#111827] [font-family:var(--font-plus-jakarta)]">
                  {sendRoutine.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-[#64748B]">
                  Programa esta rutina para todos o para jugadores concretos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSendRoutine(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d7e1f1] text-[#64748B] transition hover:bg-[#f8fbff]"
                aria-label="Cerrar envio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sendError ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {sendError}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Fecha</span>
                <input
                  type="date"
                  value={sendDate}
                  onChange={(event) => setSendDate(event.target.value)}
                  className="w-full rounded-lg border border-[#DDE5F0] px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#1A73E8]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Hora</span>
                <input
                  type="time"
                  value={sendTime}
                  onChange={(event) => setSendTime(event.target.value)}
                  className="w-full rounded-lg border border-[#DDE5F0] px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#1A73E8]"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Lugar</span>
                <input
                  value={sendPlace}
                  onChange={(event) => setSendPlace(event.target.value)}
                  list="play-maker-field-options"
                  placeholder="Campo principal"
                  className="w-full rounded-lg border border-[#DDE5F0] px-3 py-2 text-sm font-semibold text-[#111827] outline-none focus:border-[#1A73E8]"
                />
                <datalist id="play-maker-field-options">
                  {fieldOptions.map((fieldName) => (
                    <option key={fieldName} value={fieldName} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="mt-5 rounded-xl border border-[#DDE5F0] bg-[#F8FAFC] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-extrabold text-[#111827]">Destinatarios</p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    {isLoadingPlayers ? 'Cargando jugadores...' : `${playerOptions.length} jugadores disponibles`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAudienceMode('all')
                    setSelectedPlayerIds([])
                  }}
                  className={[
                    'rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition',
                    audienceMode === 'all'
                      ? 'bg-[#1A73E8] text-white'
                      : 'bg-white text-[#475569] hover:bg-[#eef4ff]',
                  ].join(' ')}
                >
                  Todos
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {playerOptions.map((player) => {
                  const selected = audienceMode === 'selected' && selectedPlayerIds.includes(player.id)
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => {
                        setAudienceMode('selected')
                        setSelectedPlayerIds((current) =>
                          current.includes(player.id)
                            ? current.filter((id) => id !== player.id)
                            : [...current, player.id]
                        )
                      }}
                      className={[
                        'rounded-lg border px-3 py-2 text-left text-xs font-bold transition',
                        selected
                          ? 'border-[#1A73E8] bg-[#e8f0ff] text-[#1A73E8]'
                          : 'border-[#DDE5F0] bg-white text-[#475569] hover:border-[#bfd0ef]',
                      ].join(' ')}
                    >
                      {player.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSendRoutine(null)}
                className="rounded-lg border border-[#DDE5F0] px-4 py-2 text-sm font-bold text-[#475569] transition hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void sendRoutineToPlayers()}
                disabled={isSendingRoutine}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1557B0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingRoutine ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function splitDisplayTitle(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 2) {
    return {
      first: words.join(' ') || 'Rutina',
      second: 'Entrenamiento',
    }
  }

  const splitAt = Math.min(3, Math.max(2, Math.ceil(words.length / 2)))
  return {
    first: words.slice(0, splitAt).join(' '),
    second: words.slice(splitAt).join(' '),
  }
}

function getRoutineAccent(category: FilterCategory) {
  if (category === 'Rehabilitacion' || category === 'Estiramientos') {
    return {
      badgeClass: 'bg-[#f97316] text-white',
      textClass: 'text-[#fb923c]',
      primaryHoverClass: 'hover:bg-[#fff2e8] hover:text-[#f97316]',
    }
  }

  return {
    badgeClass: 'bg-[#16a34a] text-white',
    textClass: 'text-[#22c55e]',
    primaryHoverClass: 'hover:bg-[#ecfdf3] hover:text-[#16a34a]',
  }
}

function RoutineDarkCard({
  routine,
  category,
  viewHref,
  editHref,
  isDeleting,
  onDelete,
  canSend,
  onSend,
}: {
  routine: RoutineSummary
  category: FilterCategory
  viewHref: string
  editHref: string
  isDeleting: boolean
  onDelete: () => void
  canSend: boolean
  onSend: () => void
}) {
  const title = splitDisplayTitle(routine.title)
  const badge = category === 'Rehabilitacion' ? 'REHAB' : category === 'Estiramientos' ? 'MOVILIDAD' : 'RENDIMIENTO'
  const accent = getRoutineAccent(category)

  return (
    <article className="group flex min-h-[560px] flex-col rounded-md bg-[#111820] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_72px_rgba(15,23,42,0.24)]">
      <div className="mb-7 flex items-start justify-between gap-4">
        <span className={`rounded-md px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${accent.badgeClass}`}>
          {badge}
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/60 transition hover:border-red-400/50 hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Eliminar ${routine.title}`}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      <h3 className="mb-5 max-w-[18rem] text-[2.05rem] font-black uppercase italic leading-[0.94] tracking-normal [font-family:var(--font-plus-jakarta)]">
        <span className="block text-white">{title.first}</span>
        <span className={`block ${accent.textClass}`}>{title.second}</span>
      </h3>

      <p className="mb-9 max-w-[19rem] text-base font-semibold leading-relaxed text-white/78">
        {routine.description || routine.phase || 'Rutina conectada a tu biblioteca del equipo.'}
      </p>

      <div className="mt-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <DarkMetric label="Duracion" value={`${routine.duration || 20} min`} />
          <DarkMetric label="Intensidad" value={difficultyLabel(routine.difficulty)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href={viewHref} className={`flex h-[50px] items-center justify-center gap-2 rounded-lg bg-white px-4 text-xs font-black uppercase tracking-widest text-[#111820] transition ${accent.primaryHoverClass}`}>
            <span>Ver</span>
            <FileText className="h-4 w-4" />
          </Link>
          <Link href={editHref} className="flex h-[50px] items-center justify-center gap-2 rounded-lg border border-white/16 bg-white/5 px-4 text-xs font-black uppercase tracking-widest text-white transition hover:border-white/30 hover:bg-white/12">
            <span>Editar</span>
            <Play className="h-4 w-4" />
          </Link>
        </div>
        {canSend ? (
          <button
            type="button"
            onClick={onSend}
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[#1A73E8] px-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#1557B0]"
          >
            <span>Enviar a jugadores</span>
            <SendHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </article>
  )
}

function ExerciseCatalogCard({ result, createHref }: { result: ExerciseCatalogSearchResult; createHref: string }) {
  const title = splitDisplayTitle(result.name)
  const tags = [...result.targetMuscles, ...result.equipments].slice(0, 2)

  return (
    <article className="group flex min-h-[560px] flex-col rounded-md bg-[#111820] p-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_72px_rgba(15,23,42,0.24)]">
      <div className="mb-7 flex items-start justify-between gap-4">
        <span className="rounded-md bg-[#1A73E8] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
          {result.source === 'local' ? 'LOCAL' : 'EXDB'}
        </span>
        {result.imageUrl ? (
          <img src={result.imageUrl} alt={result.name} className="h-10 w-10 rounded-lg object-cover opacity-80" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/60">
            <Dumbbell className="h-4 w-4" />
          </div>
        )}
      </div>

      <h3 className="mb-5 max-w-[18rem] text-[2.05rem] font-black uppercase italic leading-[0.94] tracking-normal [font-family:var(--font-plus-jakarta)]">
        <span className="block text-white">{title.first}</span>
        <span className="block text-[#1A73E8]">{title.second}</span>
      </h3>

      <p className="mb-9 max-w-[19rem] text-base font-semibold leading-relaxed text-white/78">
        {result.subtitle}
      </p>

      <div className="mt-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <DarkMetric label="Origen" value={result.source === 'local' ? 'Local' : 'ExerciseDB'} />
          <DarkMetric label="Tipo" value={tags[0] ?? result.exerciseType ?? 'General'} />
        </div>

        <Link href={createHref} className="flex h-[50px] items-center justify-center gap-2 rounded-lg bg-white px-4 text-xs font-black uppercase tracking-widest text-[#111820] transition hover:bg-[#e8f0ff] hover:text-[#1A73E8]">
          <span>Usar en rutina</span>
          <Plus className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/[0.045] p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-white/48">{label}</p>
      <p className="truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function InfoMini({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${dark ? 'border-white/10 bg-white/5' : 'border-[#f1f4f9] bg-[#f7f9fe]'}`}>
      <span className={`mb-1 block text-[9px] font-bold uppercase tracking-wider ${dark ? 'text-white/50' : 'text-[#727785]'}`}>
        {label}
      </span>
      <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-[#181c20]'}`}>{value}</span>
    </div>
  )
}

function AiStat({
  label,
  value,
  bordered = false,
}: {
  label: string
  value: string
  bordered?: boolean
}) {
  return (
    <div className={`text-center ${bordered ? 'border-x border-white/10' : ''}`}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-200">{label}</p>
      <p className="text-lg font-bold tracking-tight text-white">{value}</p>
    </div>
  )
}

function StatusCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-[#e5e8ed] bg-white p-8 shadow-[0_18px_35px_rgba(0,93,182,0.05)]">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#727785]">{title}</p>
      <p className="text-4xl font-black text-[#1A73E8] [font-family:var(--font-plus-jakarta)]">{value}</p>
      <p className="mt-3 text-sm font-medium text-[#44474E]">{helper}</p>
    </div>
  )
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string
  description: string
  compact?: boolean
}) {
  return (
    <div className={`rounded-[24px] border border-dashed border-[#c1c6d6] bg-white/60 text-center ${compact ? 'p-6' : 'p-10'}`}>
      <p className="text-sm font-semibold text-[#414754]">{title}</p>
      <p className="mt-2 text-xs text-[#727785]">{description}</p>
    </div>
  )
}
