'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Bell,
  ChevronDown,
  Dumbbell,
  FileText,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { LeftNavigation } from '@/app/home/components/LeftNavigation'
import { withEquipo } from '@/app/home/utils'
import type { RoutineSummary } from '@/lib/playmaker/routines'

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

function intensityLabel(value: number | null) {
  if (!value || value <= 1) return 'Intensidad Muy Baja'
  if (value <= 2) return 'Intensidad Baja'
  if (value <= 3) return 'Intensidad Media'
  if (value <= 4) return 'Intensidad Alta'
  return 'Intensidad Maxima'
}

function cardTheme(category: FilterCategory) {
  if (category === 'Rehabilitacion') {
    return {
      badge: 'Rehab',
      badgeClass: 'bg-[#fff2f2] text-[#d32f2f]',
      icon: 'ecg_heart',
      gradient: 'from-[#f8d7da] via-[#f7f9fe] to-[#ffffff]',
    }
  }
  if (category === 'Estiramientos') {
    return {
      badge: 'Stretching',
      badgeClass: 'bg-white/95 text-[#1A73E8]',
      icon: 'self_improvement',
      gradient: 'from-[#d6e3ff] via-[#f7f9fe] to-[#ffffff]',
    }
  }
  return {
    badge: 'Strength',
    badgeClass: 'bg-white/95 text-[#1A73E8]',
    icon: 'fitness_center',
    gradient: 'from-[#cfe2ff] via-[#e9f1ff] to-[#ffffff]',
  }
}

export default function TrainingAssistantClient({
  equipo,
  role,
  isCoach,
  playerName,
  routines,
  upcomingTrainings,
}: TrainingAssistantClientProps) {
  const [activeTab, setActiveTab] = useState<AssistantTab>('LIBRARY')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Todos')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'difficulty'>('popular')

  const visibleRoutines = useMemo(() => {
    const filtered = routines.filter((routine) => {
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
  }, [activeFilter, query, routines, sortBy])

  const heroCopy = isCoach
    ? 'Optimiza la planificacion del grupo con una biblioteca de ejercicios conectada a tu equipo.'
    : 'Optimiza tu rendimiento fisico con rutinas conectadas a tu equipo y sesiones preparadas por profesionales.'

  const previewRoutines = useMemo(() => {
    return (visibleRoutines.length > 0 ? visibleRoutines : routines).slice(0, 4)
  }, [routines, visibleRoutines])

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

                  {visibleRoutines.length > 0 ? (
                    visibleRoutines.map((routine, index) => {
                      const category = resolveCategory(routine)
                      const theme = cardTheme(category)
                      const featured = index === 1
                      const viewHref = withEquipo(`/play-maker/routine/${routine.id}`, equipo?.id)
                      const editHref = equipo?.id
                        ? `/play-maker/create?equipo=${encodeURIComponent(equipo.id)}&routine=${encodeURIComponent(routine.id)}`
                        : `/play-maker/create?routine=${encodeURIComponent(routine.id)}`

                      if (featured) {
                        return (
                          <article
                            key={routine.id}
                            className="relative overflow-hidden rounded-lg border border-[#181c20] bg-[#181c20] text-white transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                          >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,115,232,0.45),transparent_55%)]" />
                            <div className="relative z-10 flex min-h-[440px] flex-col p-8">
                              <div className="mb-6 flex items-start justify-between">
                                <span className="rounded-md bg-[#1A73E8] px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white">
                                  {theme.badge}
                                </span>
                                <Sparkles className="h-5 w-5 text-white/40" />
                              </div>
                              <h3 className="mb-4 text-4xl font-black uppercase italic leading-[0.9] tracking-tighter [font-family:var(--font-plus-jakarta)]">
                                {routine.title.split(' ').slice(0, 2).join(' ')}
                                <br />
                                <span className="text-[#1A73E8]">{routine.title.split(' ').slice(2).join(' ') || 'Focus'}</span>
                              </h3>
                              <p className="mb-8 max-w-[260px] text-sm font-medium leading-relaxed text-white/70">
                                {routine.description || routine.phase || 'Rutina especializada conectada a tu biblioteca de entrenamientos.'}
                              </p>
                              <div className="mt-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <InfoMini label="Duracion" value={`${routine.duration || 20} min`} dark />
                                  <InfoMini label="Intensidad" value={difficultyLabel(routine.difficulty)} dark />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <Link href={viewHref} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-4 text-xs font-extrabold tracking-widest text-[#181c20] transition-all hover:bg-[#d6e3ff] hover:text-[#1A73E8]">
                                    <span>VER</span>
                                    <FileText className="h-4 w-4" />
                                  </Link>
                                  <Link href={editHref} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 py-4 text-xs font-extrabold tracking-widest text-white transition-all hover:bg-white/20">
                                    <span>EDITAR</span>
                                    <Play className="h-4 w-4" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </article>
                        )
                      }

                      return (
                        <article
                          key={routine.id}
                          className="group flex flex-col overflow-hidden rounded-lg border border-[#ebeef3] bg-white transition-all duration-500 hover:-translate-y-1 premium-card-shadow"
                        >
                          <div className={`relative h-60 overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,115,232,0.22),transparent_50%)]" />
                            {routine.imageUrls[0] ? (
                              <img src={routine.imageUrls[0]} alt={routine.title} className="absolute inset-0 h-full w-full object-cover opacity-25" />
                            ) : null}
                            <div className="absolute left-4 top-4 flex gap-2">
                              <span className={`rounded-md px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest ${theme.badgeClass}`}>
                                {theme.badge}
                              </span>
                              {routine.difficulty >= 4 ? (
                                <span className="rounded-md bg-[#ffe170] px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-[#221b00]">
                                  Elite
                                </span>
                              ) : null}
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                              <div className="flex gap-4">
                                <InfoStack label="Tiempo" value={`${routine.duration ?? 20} min`} />
                                <InfoStack label="Nivel" value={difficultyLabel(routine.difficulty)} />
                              </div>
                              <div className="rounded-lg bg-white/30 p-2 text-white backdrop-blur-md">
                                <span className="material-symbols-outlined text-lg">{theme.icon}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col p-6">
                            <h3 className="mb-2 text-xl font-extrabold tracking-tight text-[#181c20] transition-colors group-hover:text-[#1A73E8] [font-family:var(--font-plus-jakarta)]">
                              {routine.title}
                            </h3>
                            <p className="mb-8 text-sm font-medium leading-relaxed text-[#44474E]/80">
                              {routine.description || routine.phase || 'Rutina conectada a tu biblioteca del equipo.'}
                            </p>
                            <div className="mt-auto flex items-center justify-between gap-4 border-t border-[#f1f4f9] pt-4">
                              <div className="flex items-center gap-1.5 text-[#44474E]">
                                <Dumbbell className="h-4 w-4 text-[#1A73E8]" />
                                <span className="text-xs font-bold">{intensityLabel(routine.difficulty)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link href={viewHref} className="flex items-center justify-center gap-2 rounded-lg border border-[#d6e3ff] px-4 py-3 text-xs font-bold text-[#1A73E8] transition-all hover:bg-[#eef4ff]">
                                  <span>VER</span>
                                  <FileText className="h-4 w-4" />
                                </Link>
                                <Link href={editHref} className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1A73E8] to-[#0056b3] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#1A73E8]/20 transition-all hover:-translate-y-0.5">
                                  <span>EDITAR</span>
                                  <Play className="h-4 w-4" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </article>
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
                <StatusCard title="Carga semanal" value={`${Math.min(routines.length * 8, 100)}%`} helper="Basado en la biblioteca activa" />
                <StatusCard title="Variedad de trabajo" value={`${new Set(routines.map(resolveCategory)).size}/3`} helper="Categorias activas" />
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
    </div>
  )
}

function InfoStack({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-tighter text-white/70">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
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
