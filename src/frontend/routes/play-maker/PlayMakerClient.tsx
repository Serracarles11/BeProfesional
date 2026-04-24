'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  Copy,
  Dumbbell,
  Eye,
  FileText,
  Globe2,
  Heart,
  Loader2,
  LockKeyhole,
  Play,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'
import { withEquipo } from '@/app/home/utils'
import { normalizeRoutineDisplayTitle, type RoutineSummary } from '@/lib/playmaker/routines'
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
  publicRoutines: RoutineSummary[]
  upcomingTrainings: TrainingItem[]
}

type AssistantTab = 'LIBRARY' | 'AI_COACH' | 'EXERCISES'
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

function formatNumber(value: number) {
  if (value >= 1000) {
    const formatted = (value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.0', '')
    return `${formatted}k`
  }
  return String(value)
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
  publicRoutines,
  upcomingTrainings,
}: TrainingAssistantClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AssistantTab>('LIBRARY')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Todos')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'difficulty'>('popular')
  const [localRoutines, setLocalRoutines] = useState<RoutineSummary[]>(routines)
  const [localPublicRoutines, setLocalPublicRoutines] = useState<RoutineSummary[]>(publicRoutines)
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
  const [savingVisibilityIds, setSavingVisibilityIds] = useState<string[]>([])
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

  const previewRoutines = useMemo(() => {
    return (visibleRoutines.length > 0 ? visibleRoutines : localRoutines).slice(0, 4)
  }, [localRoutines, visibleRoutines])

  const visiblePublicRoutines = useMemo(() => {
    const filtered = localPublicRoutines.filter((routine) => {
      const category = resolveCategory(routine)
      const haystack = `${routine.title} ${routine.description} ${routine.phase} ${routine.category}`.toLowerCase()
      const queryMatch = query.trim() ? haystack.includes(query.trim().toLowerCase()) : true
      const filterMatch = activeFilter === 'Todos' ? true : category === activeFilter
      return queryMatch && filterMatch
    })

    return [...filtered].sort((left, right) => {
      if (sortBy === 'difficulty') return right.difficulty - left.difficulty
      if (sortBy === 'recent') {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
        return rightTime - leftTime
      }
      return right.likeCount - left.likeCount
    })
  }, [activeFilter, localPublicRoutines, query, sortBy])

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
          routineId: sendRoutine.id,
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

  async function toggleRoutineVisibility(routine: RoutineSummary) {
    if (!equipo?.id || savingVisibilityIds.includes(routine.id)) return

    const nextVisibility = routine.visibility === 'public' ? 'private' : 'public'
    setSavingVisibilityIds((current) => [...current, routine.id])
    setLocalRoutines((current) =>
      current.map((item) => (item.id === routine.id ? { ...item, visibility: nextVisibility } : item))
    )

    try {
      const response = await fetch('/api/play-maker/exercise-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId: equipo.id,
          routineId: routine.id,
          visibility: nextVisibility,
        }),
      })
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        routineId?: string
        visibility?: 'public' | 'private'
      } | null

      if (!response.ok || !payload?.ok || payload.routineId !== routine.id || !payload.visibility) {
        throw new Error(payload?.error || 'No se pudo guardar la visibilidad.')
      }

      setLocalRoutines((current) =>
        current.map((item) => (item.id === routine.id ? { ...item, visibility: payload.visibility! } : item))
      )
      setLocalPublicRoutines((current) => {
        if (payload.visibility === 'public') {
          const nextRoutine = { ...routine, visibility: 'public' as const }
          const exists = current.some((item) => item.id === routine.id)
          return exists
            ? current.map((item) => (item.id === routine.id ? nextRoutine : item))
            : [nextRoutine, ...current]
        }

        return current.filter((item) => item.id !== routine.id)
      })
    } catch {
      setLocalRoutines((current) =>
        current.map((item) => (item.id === routine.id ? { ...item, visibility: routine.visibility } : item))
      )
    } finally {
      setSavingVisibilityIds((current) => current.filter((id) => id !== routine.id))
    }
  }

  async function toggleRoutineLike(routine: RoutineSummary) {
    if (!equipo?.id) return

    const nextLiked = !routine.likedByViewer
    const applyState = (items: RoutineSummary[]) =>
      items.map((item) =>
        item.id === routine.id
          ? {
              ...item,
              likedByViewer: nextLiked,
              likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1)),
            }
          : item
      )

    setLocalRoutines(applyState)
    setLocalPublicRoutines(applyState)

    try {
      const response = await fetch('/api/play-maker/exercise-likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId: equipo.id,
          routineId: routine.id,
          liked: nextLiked,
        }),
      })
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        routineId?: string
        likedByViewer?: boolean
        likeCount?: number
      } | null

      if (!response.ok || !payload?.ok || payload.routineId !== routine.id) {
        throw new Error('No se pudo guardar el like.')
      }

      const reconcile = (items: RoutineSummary[]) =>
        items.map((item) =>
          item.id === routine.id
            ? {
                ...item,
                likedByViewer: Boolean(payload.likedByViewer),
                likeCount: Math.max(0, Number(payload.likeCount ?? item.likeCount)),
              }
            : item
        )

      setLocalRoutines(reconcile)
      setLocalPublicRoutines(reconcile)
    } catch {
      const rollback = (items: RoutineSummary[]) =>
        items.map((item) =>
          item.id === routine.id
            ? {
                ...item,
                likedByViewer: routine.likedByViewer,
                likeCount: routine.likeCount,
              }
            : item
        )

      setLocalRoutines(rollback)
      setLocalPublicRoutines(rollback)
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
      <div className="flex min-h-screen w-full">
        <LeftNavigation equipoId={equipo?.id} teamName={equipo?.nombre ?? 'Equipo'} isCoach={isCoach} />

        <main className="min-w-0 flex-1">
          <header
            className={[
              'z-30 flex h-16 items-center justify-between border-b border-[#dfe3e8] bg-white/80 px-6 backdrop-blur-md lg:px-10',
              activeTab === 'EXERCISES' ? 'sticky top-0' : 'relative',
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
              activeTab === 'EXERCISES' ? 'sticky top-16' : 'relative',
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
                onClick={() => setActiveTab('EXERCISES')}
                className={`h-full px-1 text-sm tracking-tight ${activeTab === 'EXERCISES' ? 'font-bold text-[#1A73E8]' : 'font-semibold text-[#44474E]/70'}`}
              >
                Ejercicios
              </button>
            </div>
          </nav>

          <div className="mx-auto max-w-7xl px-6 pb-20 pt-12 lg:px-10">
            {activeTab === 'EXERCISES' ? (
              <section className="hidden">
                <div className="pointer-events-none absolute -right-8 -top-16 select-none text-[9rem] font-black uppercase tracking-tighter text-[#1A73E8]/5 lg:text-[15rem]">
                  Community
                </div>
                <div className="relative z-10">
                  <h2 className="mb-4 text-5xl font-extrabold tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)] lg:text-7xl">
                    Ejercicios <span className="italic text-[#1A73E8]">para compartir</span>
                  </h2>
                  <p className="max-w-2xl text-lg font-medium leading-relaxed text-[#44474E]">
                    Publica ejercicios del equipo, explora ideas de otros entrenadores y clona rutinas para adaptarlas a tu sesion.
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
                          isSavingVisibility={savingVisibilityIds.includes(routine.id)}
                          onToggleVisibility={() => void toggleRoutineVisibility(routine)}
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
              <div className="space-y-6">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-[32px] bg-[#0c1524] shadow-[0_30px_60px_rgba(0,0,0,0.24)]">
                  <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#1A73E8] opacity-[0.07] blur-[80px]" />
                  <div className="pointer-events-none absolute -bottom-24 right-8 h-[300px] w-[300px] rounded-full bg-[#0056b3] opacity-[0.09] blur-[60px]" />
                  <div className="relative z-10 grid gap-0 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
                    <div className="px-8 py-10 lg:px-12 lg:py-12">
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1A73E8]/30 bg-[#1A73E8]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#60a5fa]">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Coach Integrado
                      </div>
                      <h2 className="text-[2.4rem] font-black leading-[1.06] tracking-tight text-white [font-family:var(--font-plus-jakarta)] lg:text-5xl">
                        Genera rutinas<br /><span className="text-[#60a5fa]">con inteligencia</span>
                      </h2>
                      <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-slate-400">
                        La IA construye una sesion completa dentro del creador de rutinas, la deja editable y mantiene el contexto para que puedas seguir refinandola antes de guardar.
                      </p>
                      <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {[
                          { step: '01', text: 'Pide la sesion con un prompt o chip rapido' },
                          { step: '02', text: 'Rutina con fases y bloques editables aparece en el creador' },
                          { step: '03', text: 'Refina chateando: intensidad, duracion, ejercicios' },
                          { step: '04', text: 'Guarda como rutina normal, marcada como hecha por IA' },
                        ].map(({ step, text }) => (
                          <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A73E8]/20 text-[11px] font-black text-[#60a5fa]">
                              {step}
                            </span>
                            <p className="text-[13px] font-semibold leading-snug text-slate-300">{text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-8">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Prompts rapidos</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestionChips.map((chip) => (
                            <Link
                              key={chip}
                              href={aiCreateHref}
                              className="rounded-full border border-[#1A73E8]/25 bg-[#1A73E8]/10 px-4 py-2.5 text-[11px] font-bold tracking-wide text-[#60a5fa] transition-all hover:border-[#1A73E8]/55 hover:bg-[#1A73E8]/20 hover:shadow-[0_0_20px_rgba(26,115,232,0.18)]"
                            >
                              {chip}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center p-6 lg:p-8">
                      <div className="w-full max-w-xs rounded-[28px] bg-gradient-to-br from-[#1A73E8] via-[#1258c4] to-[#0b3a8a] p-7 shadow-[0_0_50px_rgba(26,115,232,0.28),inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/80">Sesion generada con IA</p>
                        <h4 className="mt-3 text-2xl font-black leading-tight text-white [font-family:var(--font-plus-jakarta)]">Lista para generar y guardar</h4>
                        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/10 py-5">
                          <AiStat label="Min" value={`${previewDuration || 0}`} />
                          <AiStat label="Vol" value={previewVolume.split(' ')[0]} bordered />
                          <AiStat label="Int" value={previewIntensity} />
                        </div>
                        <Link
                          href={aiCreateHref}
                          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-[11px] font-black uppercase tracking-widest text-[#1A73E8] transition hover:bg-blue-50 hover:shadow-lg"
                        >
                          <Sparkles className="h-4 w-4" />
                          Abrir creador con IA
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Library panel */}
                <section className="rounded-[28px] bg-white p-8 shadow-[0_20px_40px_rgba(0,93,182,0.06)]">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Contexto para la IA</p>
                      <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)]">Biblioteca disponible</h3>
                    </div>
                    <Link
                      href={withEquipo('/play-maker/create', equipo?.id)}
                      className="flex items-center gap-2 rounded-xl border border-[#e8edf5] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#44474E] transition hover:border-[#1A73E8]/30 hover:bg-[#f0f6ff] hover:text-[#1A73E8]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nueva
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {previewRoutines.length > 0 ? (
                      previewRoutines.map((routine) => (
                        <div
                          key={routine.id}
                          className="group flex flex-col gap-3 rounded-2xl border border-[#e8edf5] bg-[#f7f9fe] p-4 transition-all hover:border-[#1A73E8]/30 hover:bg-white hover:shadow-[0_8px_24px_rgba(26,115,232,0.08)]"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d6e3ff] text-[#005db6]">
                              <Dumbbell className="h-5 w-5" />
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#727785] shadow-sm ring-1 ring-[#e8edf5]">
                              {routine.category || difficultyLabel(routine.difficulty)}
                            </span>
                          </div>
                          <div>
                            <p className="line-clamp-2 text-sm font-bold leading-tight text-[#181c20]">{routine.title}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{routine.blockCount} bloques · {routine.duration ?? 10} min</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="Sin biblioteca" description="Carga rutinas para que la IA tenga mas contexto al generar nuevas sesiones." compact />
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <ExercisesCommunityView
                equipoId={equipo?.id}
                teamName={equipo?.nombre ?? 'Equipo'}
                role={role ?? 'Jugador'}
                routines={visiblePublicRoutines}
                allRoutines={localPublicRoutines}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onToggleLike={toggleRoutineLike}
              />
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
  const normalized = value.trim().replace(/\s+/g, ' ')
  const separatorIndex = normalized.indexOf(':')

  if (separatorIndex > 0) {
    const first = normalized.slice(0, separatorIndex + 1).trim()
    const second = normalized.slice(separatorIndex + 1).trim()

    return {
      first: first || 'Rutina',
      second: second.split(/\s+/).filter(Boolean).slice(0, 10).join(' ') || 'Entrenamiento',
    }
  }

  const words = normalized.split(/\s+/).filter(Boolean).slice(0, 14)
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
  isSavingVisibility,
  onToggleVisibility,
  canSend,
  onSend,
}: {
  routine: RoutineSummary
  category: FilterCategory
  viewHref: string
  editHref: string
  isDeleting: boolean
  onDelete: () => void
  isSavingVisibility: boolean
  onToggleVisibility: () => void
  canSend: boolean
  onSend: () => void
}) {
  const displayTitle = normalizeRoutineDisplayTitle(routine.title)
  const title = splitDisplayTitle(displayTitle)
  const badge = category === 'Rehabilitacion' ? 'REHAB' : category === 'Estiramientos' ? 'MOVILIDAD' : 'RENDIMIENTO'
  const accent = getRoutineAccent(category)
  const ownerLabel = routine.isOwnedByViewer
    ? 'Tu ejercicio'
    : `Compartido por ${routine.creatorName?.trim() || 'Usuario'}`

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

      <h3 className="mb-4 max-h-[8.25rem] max-w-[18rem] overflow-hidden text-[1.5rem] font-black uppercase italic leading-[0.98] tracking-normal [font-family:var(--font-plus-jakarta)]" title={displayTitle}>
        <span className="block text-white">{title.first}</span>
        <span className={`block ${accent.textClass}`}>{title.second}</span>
      </h3>

      <p className="mb-9 max-w-[19rem] truncate text-xs font-black uppercase tracking-widest text-white/48">
        {ownerLabel}
      </p>

      <div className="mt-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <DarkMetric label="Duracion" value={`${routine.duration || 20} min`} />
          <DarkMetric label="Intensidad" value={difficultyLabel(routine.difficulty)} />
        </div>

        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={isSavingVisibility}
          className={[
            'flex h-[46px] w-full items-center justify-center gap-2 rounded-lg border px-4 text-xs font-black uppercase tracking-widest transition disabled:cursor-wait disabled:opacity-70',
            routine.visibility === 'public'
              ? 'border-[#22c55e]/40 bg-[#22c55e]/15 text-[#86efac] hover:bg-[#22c55e]/22'
              : 'border-white/16 bg-white/5 text-white/75 hover:border-white/30 hover:bg-white/12',
          ].join(' ')}
          aria-pressed={routine.visibility === 'public'}
        >
          {isSavingVisibility ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : routine.visibility === 'public' ? (
            <Globe2 className="h-4 w-4" />
          ) : (
            <LockKeyhole className="h-4 w-4" />
          )}
          <span>{routine.visibility === 'public' ? 'Publico' : 'Privado'}</span>
        </button>

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
          // eslint-disable-next-line @next/next/no-img-element
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

function ExercisesCommunityView({
  equipoId,
  teamName,
  role,
  routines,
  allRoutines,
  activeFilter,
  onFilterChange,
  onToggleLike,
}: {
  equipoId?: string
  teamName: string
  role: string
  routines: RoutineSummary[]
  allRoutines: RoutineSummary[]
  activeFilter: FilterCategory
  onFilterChange: (filter: FilterCategory) => void
  onToggleLike: (routine: RoutineSummary) => void
}) {
  const createHref = withEquipo('/play-maker/create', equipoId)
  const featured = routines[0] ?? allRoutines[0] ?? null
  const totalMinutes = allRoutines.reduce((sum, routine) => sum + Math.max(routine.duration, 0), 0)
  const categoryCount = new Set(allRoutines.map(resolveCategory)).size

  return (
    <div className="space-y-10">
      <section className="hidden">
        <div className="grid min-h-[420px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10 flex flex-col justify-center p-7 md:p-10">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#ffe170] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#221b00]">
              <Star className="h-3.5 w-3.5 fill-current" />
              Ejercicio destacado
            </div>
            <h2 className="max-w-xl text-4xl font-black tracking-tight text-white [font-family:var(--font-plus-jakarta)] md:text-6xl">
              {featured?.title ?? 'Publica el primer ejercicio'}
            </h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-[#d6e3ff]">
              {featured?.description ||
                'Crea ejercicios para tu equipo, compártelos en la biblioteca y deja que otros jugadores o entrenadores los consulten desde esta zona.'}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={createHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#005db6] shadow-lg shadow-black/10 transition hover:bg-[#eef4ff]"
              >
                <Plus className="h-4 w-4" />
                Crear ejercicio
              </Link>
              {featured ? (
                <Link
                  href={withEquipo(`/play-maker/routine/${featured.id}`, equipoId)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                >
                  <Eye className="h-4 w-4" />
                  Ver detalles
                </Link>
              ) : null}
            </div>

            <div className="mt-9 grid max-w-lg grid-cols-3 gap-3">
              <HeroStat label="Ejercicios" value={String(allRoutines.length)} />
              <HeroStat label="Minutos" value={String(totalMinutes)} />
              <HeroStat label="Categorias" value={`${categoryCount}/3`} />
            </div>
          </div>

          <div className="relative min-h-[300px] overflow-hidden bg-[#0f172a]">
            <TacticalExercisePreview />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/12 bg-black/25 p-4 text-white backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe170]">{teamName}</p>
              <p className="mt-1 text-sm font-bold">{role} · Biblioteca compartida</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A73E8]">Comunidad de ejercicios</p>
          <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)]">
            Explora, publica y reutiliza
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={[
                'rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition',
                activeFilter === filter
                  ? 'bg-[#005db6] text-white shadow-[0_10px_20px_rgba(0,93,182,0.18)]'
                  : 'border border-[#dfe3e8] bg-white text-[#5f6776] hover:bg-[#eef4ff] hover:text-[#005db6]',
              ].join(' ')}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href={createHref}
          className="group flex min-h-[430px] flex-col justify-between rounded-[22px] border border-dashed border-[#005db6]/35 bg-white p-7 shadow-[0_18px_35px_rgba(0,93,182,0.04)] transition hover:-translate-y-0.5 hover:border-[#005db6] hover:shadow-[0_20px_45px_rgba(0,93,182,0.10)]"
        >
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ebf2ff] text-[#005db6]">
              <Plus className="h-7 w-7" />
            </div>
            <h4 className="text-2xl font-black tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)]">
              Subir nuevo ejercicio
            </h4>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#5f6776]">
              Crea una rutina visual, guarda sus bloques y dejala disponible para que el equipo la consulte.
            </p>
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#005db6] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition group-hover:bg-[#2b5bb5]">
            Crear
            <Sparkles className="h-4 w-4" />
          </div>
        </Link>

        {routines.length > 0 ? (
          routines.map((routine, index) => (
            <ExerciseCommunityCard
              key={routine.id}
              routine={routine}
              index={index}
              equipoId={equipoId}
              onToggleLike={onToggleLike}
            />
          ))
        ) : (
          <div className="flex min-h-[430px] flex-col justify-center rounded-[22px] border border-[#dfe3e8] bg-white p-7 text-center shadow-[0_18px_35px_rgba(0,93,182,0.04)] md:col-span-2 xl:col-span-2">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#005db6]">
              <Dumbbell className="h-7 w-7" />
            </div>
            <h4 className="text-2xl font-black tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)]">
              No hay ejercicios publicos
            </h4>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-[#5f6776]">
              Cuando alguien marque una rutina como publica desde Library aparecera aqui para todos.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function ExerciseCommunityCard({
  routine,
  index,
  equipoId,
  onToggleLike,
}: {
  routine: RoutineSummary
  index: number
  equipoId?: string
  onToggleLike: (routine: RoutineSummary) => void
}) {
  const category = resolveCategory(routine)
  const cloneHref = withEquipo(`/play-maker/guardar?routine=${encodeURIComponent(routine.id)}`, equipoId)
  const displayTitle = normalizeRoutineDisplayTitle(routine.title)
  const ownerLabel = routine.isOwnedByViewer
    ? 'Tu ejercicio'
    : `Compartido por ${routine.creatorName?.trim() || 'Usuario'}`

  return (
    <article className="group overflow-hidden rounded-[22px] bg-white shadow-[0_18px_35px_rgba(0,93,182,0.04)] ring-1 ring-[#e8edf5] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(0,93,182,0.10)]">
      <div className="relative h-56 overflow-hidden">
        {routine.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={routine.imageUrls[0]}
            alt={routine.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <TacticalExercisePreview compact variant={index % 3} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/5 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <span className="rounded-lg bg-[#005db6] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
            {category}
          </span>
          <button
            type="button"
            onClick={() => onToggleLike(routine)}
            disabled={!equipoId}
            aria-pressed={routine.likedByViewer}
            aria-label={routine.likedByViewer ? 'Quitar like' : 'Dar like'}
            className={[
              'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/20 text-white backdrop-blur transition',
              routine.likedByViewer ? 'text-[#ffe170]' : 'hover:bg-white/30',
              !equipoId ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            <Heart className={`h-5 w-5 ${routine.likedByViewer ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#727785]">
              {difficultyLabel(routine.difficulty)} · {routine.duration} min
            </p>
            <h4 className="mt-2 line-clamp-2 text-xl font-black tracking-tight text-[#181c20] [font-family:var(--font-plus-jakarta)]">
              {displayTitle}
            </h4>
            <p className="mt-2 max-w-[13rem] truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#727785]">
              {ownerLabel}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#d6e3ff] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#00468c]">
            Publico
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between border-y border-[#eef1f6] py-4 text-[#727785]">
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span className="text-xs font-bold">{formatNumber(routine.cloneCount ?? 0)} clones</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className={`h-4 w-4 ${routine.likedByViewer ? 'fill-current text-[#005db6]' : ''}`} />
            <span className="text-xs font-bold">{formatNumber(routine.likeCount)} likes</span>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href={cloneHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#005db6] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#2b5bb5]"
          >
            <Copy className="h-4 w-4" />
            Clonar
          </Link>
        </div>
      </div>
    </article>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#d6e3ff]">{label}</p>
      <p className="mt-1 text-2xl font-black text-white [font-family:var(--font-plus-jakarta)]">{value}</p>
    </div>
  )
}

function TacticalExercisePreview({ compact = false, variant = 0 }: { compact?: boolean; variant?: number }) {
  const homeColor = variant === 1 ? '#fde047' : '#60a5fa'
  const homeBorder = variant === 1 ? '#a16207' : '#1e40af'
  const awayColor = variant === 2 ? '#4ade80' : '#f8fafc'
  const awayBorder = variant === 2 ? '#166534' : '#64748b'
  const arrowYellowId = `ay${variant}`
  const arrowBlueId = `ab${variant}`

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${compact ? 'p-3' : 'p-5'}`}
      style={{ background: 'linear-gradient(175deg,#1e7a4e 0%,#166a42 50%,#1e7a4e 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg,rgba(0,0,0,0.035) 0px,rgba(0,0,0,0.035) 55px,transparent 55px,transparent 110px)' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 120 78"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <marker id={arrowYellowId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0.5 L4.5,2.5 L0,4.5 Z" fill="rgba(253,224,71,0.95)" />
          </marker>
          <marker id={arrowBlueId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0.5 L4.5,2.5 L0,4.5 Z" fill="rgba(196,220,255,0.9)" />
          </marker>
        </defs>
        {/* Field border */}
        <rect x="1.5" y="1.5" width="117" height="75" rx="1.5" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="1.1" />
        {/* Center line */}
        <line x1="60" y1="1.5" x2="60" y2="76.5" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        {/* Center circle */}
        <circle cx="60" cy="39" r="9" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        <circle cx="60" cy="39" r="0.9" fill="rgba(255,255,255,0.8)" />
        {/* Left penalty area */}
        <rect x="1.5" y="24" width="18" height="30" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        {/* Left 6-yard box */}
        <rect x="1.5" y="31" width="8" height="16" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.7" />
        {/* Left goal */}
        <rect x="-0.5" y="33.5" width="2.8" height="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.82)" strokeWidth="0.8" />
        {/* Left penalty spot */}
        <circle cx="13.5" cy="39" r="0.75" fill="rgba(255,255,255,0.75)" />
        {/* Left penalty arc */}
        <path d="M19.5 33 A7.5 7.5 0 0 0 19.5 45" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.7" />
        {/* Right penalty area */}
        <rect x="100.5" y="24" width="18" height="30" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
        {/* Right 6-yard box */}
        <rect x="110.5" y="31" width="8" height="16" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.7" />
        {/* Right goal */}
        <rect x="117.7" y="33.5" width="2.8" height="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.82)" strokeWidth="0.8" />
        {/* Right penalty spot */}
        <circle cx="106.5" cy="39" r="0.75" fill="rgba(255,255,255,0.75)" />
        {/* Right penalty arc */}
        <path d="M100.5 33 A7.5 7.5 0 0 1 100.5 45" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.7" />
        {/* Corner arcs */}
        <path d="M1.5 6 A4.5 4.5 0 0 0 6 1.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" />
        <path d="M114 1.5 A4.5 4.5 0 0 0 118.5 6" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" />
        <path d="M118.5 72 A4.5 4.5 0 0 0 114 76.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" />
        <path d="M6 76.5 A4.5 4.5 0 0 0 1.5 72" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" />
        {/* Movement arrows */}
        <path d="M36 39 C44 32,53 29,68 26" fill="none" stroke="rgba(253,224,71,0.88)" strokeDasharray="4.5 3" strokeWidth="1.5" markerEnd={`url(#${arrowYellowId})`} />
        <path d="M36 39 C44 47,54 51,70 55" fill="none" stroke="rgba(196,220,255,0.82)" strokeWidth="1.5" markerEnd={`url(#${arrowBlueId})`} />
        <path d="M54 20 C57 27,58 33,57 39" fill="none" stroke="rgba(255,255,255,0.32)" strokeDasharray="3 3" strokeWidth="1" />
        {/* Home team */}
        <circle cx="7" cy="39" r="3.2" fill={homeColor} stroke={homeBorder} strokeWidth="1.2" />
        <circle cx="27" cy="21" r="3.2" fill={homeColor} stroke={homeBorder} strokeWidth="1.2" />
        <circle cx="29" cy="34" r="3.2" fill={homeColor} stroke={homeBorder} strokeWidth="1.2" />
        <circle cx="29" cy="46" r="3.2" fill={homeColor} stroke={homeBorder} strokeWidth="1.2" />
        <circle cx="27" cy="59" r="3.2" fill={homeColor} stroke={homeBorder} strokeWidth="1.2" />
        <circle cx="44" cy="27" r="3.2" fill={homeColor} stroke={homeBorder} strokeWidth="1.2" />
        <circle cx="46" cy="41" r="3.2" fill={homeColor} stroke={homeBorder} strokeWidth="1.2" />
        {/* Away team */}
        <circle cx="113" cy="39" r="3.2" fill={awayColor} stroke={awayBorder} strokeWidth="1.2" />
        <circle cx="87" cy="25" r="3.2" fill={awayColor} stroke={awayBorder} strokeWidth="1.2" />
        <circle cx="89" cy="40" r="3.2" fill={awayColor} stroke={awayBorder} strokeWidth="1.2" />
        <circle cx="87" cy="55" r="3.2" fill={awayColor} stroke={awayBorder} strokeWidth="1.2" />
        <circle cx="73" cy="32" r="3.2" fill={awayColor} stroke={awayBorder} strokeWidth="1.2" />
        <circle cx="75" cy="52" r="3.2" fill={awayColor} stroke={awayBorder} strokeWidth="1.2" />
        {/* Ball */}
        <circle cx="58" cy="38" r="2.4" fill="white" stroke="#4b5563" strokeWidth="0.8" />
        <path d="M56.5 36.8 L58 35.5 L59.5 36.8 L59.2 38.6 L56.8 38.6 Z" fill="#374151" opacity="0.22" />
      </svg>
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
