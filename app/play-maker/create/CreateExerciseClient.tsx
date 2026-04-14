'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Grip, ImagePlus, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { withEquipo } from '@/app/home/utils'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
})

type ExerciseBlock = {
  id: string
  category: 'Strength' | 'Power' | 'Endurance' | 'Rehabilitation'
  name: string
  sets: string
  reps: string
  rest: string
  load: string
  notes: string
}

type CreateExerciseClientProps = {
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
    logo_url: string | null
  } | null
  playerName: string
}

function createBlock(seed = 0): ExerciseBlock {
  return {
    id: `block-${seed}-${Math.random().toString(36).slice(2, 8)}`,
    category: seed === 0 ? 'Strength' : 'Rehabilitation',
    name: seed === 0 ? 'Barbell Back Squat (Low Bar)' : '',
    sets: seed === 0 ? '4' : '3',
    reps: seed === 0 ? '8-10' : '12',
    rest: seed === 0 ? '90' : '45',
    load: seed === 0 ? '105' : '0',
    notes: '',
  }
}

function toDifficulty(category: ExerciseBlock['category']) {
  if (category === 'Rehabilitation') return 2
  if (category === 'Endurance') return 3
  if (category === 'Strength') return 4
  return 5
}

function estimateMinutes(block: ExerciseBlock) {
  const sets = Number(block.sets)
  const rest = Number(block.rest)
  if (!Number.isFinite(sets) || sets <= 0) return 10
  const restMinutes = Number.isFinite(rest) && rest > 0 ? (sets * rest) / 60 : sets
  return Math.max(5, Math.round(sets * 2 + restMinutes))
}

export default function CreateExerciseClient({ equipo, playerName }: CreateExerciseClientProps) {
  const router = useRouter()
  const backHref = withEquipo('/play-maker', equipo?.id)
  const [title, setTitle] = useState('Pre-Season Explosive Power')
  const [phase, setPhase] = useState('Phase 1: Hypertrophy & Neuromuscular Activation')
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([createBlock(0), createBlock(1)])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const summary = useMemo(() => {
    const validBlocks = blocks.filter((block) => block.name.trim())
    const estimatedMinutes = validBlocks.reduce((acc, block) => acc + estimateMinutes(block), 0)
    const totalLoad = validBlocks.reduce((acc, block) => {
      const sets = Number(block.sets)
      const load = Number(block.load)
      if (!Number.isFinite(sets) || !Number.isFinite(load)) return acc
      return acc + sets * load
    }, 0)
    const score = Math.min(
      5,
      Math.max(1, Math.round(validBlocks.reduce((acc, block) => acc + toDifficulty(block.category), 0) / Math.max(validBlocks.length, 1)))
    )

    return {
      count: validBlocks.length,
      estimatedMinutes,
      totalLoad,
      score,
    }
  }, [blocks])

  async function handleSave() {
    const validBlocks = blocks.filter((block) => block.name.trim())
    if (!equipo?.id) {
      setError('No hay un equipo activo para guardar el ejercicio.')
      return
    }
    if (!title.trim()) {
      setError('Introduce un titulo para el ejercicio.')
      return
    }
    if (validBlocks.length === 0) {
      setError('Anade al menos un bloque con nombre antes de guardar.')
      return
    }

    const confirmed = window.confirm('¿Quieres guardar?')
    if (!confirmed) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/play-maker/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equipoId: equipo.id,
          title,
          phase,
          blocks: validBlocks,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'No se pudo guardar el ejercicio.')
      }

      router.push(backHref)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el ejercicio.')
    } finally {
      setIsSaving(false)
    }
  }

  function updateBlock(id: string, key: keyof ExerciseBlock, value: string) {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, [key]: value } : block)))
  }

  function addBlock() {
    setBlocks((current) => [...current, createBlock(current.length)])
  }

  function removeBlock(id: string) {
    setBlocks((current) => (current.length === 1 ? current : current.filter((block) => block.id !== id)))
  }

  return (
    <div className={`${plusJakarta.variable} ${inter.variable} min-h-screen bg-[#F8FAFC] [font-family:var(--font-inter)] text-[#0F172A]`}>
      <main className="min-h-screen">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-6 backdrop-blur-md lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#1A73E8] transition hover:bg-[#E8F0FE]"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A] [font-family:var(--font-plus-jakarta)]">Routine Creator</h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#64748B]">
                {equipo?.nombre ?? 'Sin equipo'} · Draft mode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#1A73E8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1557B0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar ejercicio'}</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row">
            <div className="flex-1 space-y-10">
              <section className="space-y-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full border-none bg-transparent p-0 text-4xl font-extrabold tracking-tight text-[#0F172A] outline-none placeholder:text-slate-300 [font-family:var(--font-plus-jakarta)]"
                  placeholder="Untitled Routine"
                />
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-[#1A73E8]" />
                  <input
                    value={phase}
                    onChange={(event) => setPhase(event.target.value)}
                    className="w-full border-none bg-transparent p-0 text-sm font-medium text-[#64748B] outline-none"
                    placeholder="Fase y objetivo principal"
                  />
                </div>
              </section>

              <section className="space-y-6">
                {blocks.map((block, index) => (
                  <article key={block.id} className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_10px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full border-b border-[#E2E8F0] bg-slate-50 p-6 md:w-64 md:border-b-0 md:border-r">
                        <button
                          type="button"
                          className="group flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 transition hover:border-[#1A73E8] hover:bg-[#E8F0FE]"
                        >
                          <ImagePlus className="h-6 w-6 text-slate-400 transition group-hover:text-[#1A73E8]" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-[#1A73E8]">
                            Media
                          </span>
                        </button>

                        <div className="mt-4 space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Category</label>
                          <select
                            value={block.category}
                            onChange={(event) =>
                              updateBlock(block.id, 'category', event.target.value as ExerciseBlock['category'])
                            }
                            className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#1A73E8]"
                          >
                            <option>Strength</option>
                            <option>Power</option>
                            <option>Endurance</option>
                            <option>Rehabilitation</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex-1 p-8">
                        <div className="mb-8 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#1A73E8]">
                              Exercise Name
                            </label>
                            <input
                              value={block.name}
                              onChange={(event) => updateBlock(block.id, 'name', event.target.value)}
                              className="w-full border-b border-[#E2E8F0] bg-transparent pb-2 text-xl font-bold text-[#0F172A] outline-none transition hover:border-slate-300 focus:border-[#1A73E8] [font-family:var(--font-plus-jakarta)]"
                              placeholder="e.g. Single Leg Glute Bridge"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                              <Grip className="h-4 w-4" />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                              aria-label={`Eliminar bloque ${index + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                          <Field
                            label="Sets"
                            value={block.sets}
                            onChange={(value) => updateBlock(block.id, 'sets', value)}
                          />
                          <Field
                            label="Reps"
                            value={block.reps}
                            onChange={(value) => updateBlock(block.id, 'reps', value)}
                          />
                          <Field
                            label="Rest (s)"
                            value={block.rest}
                            onChange={(value) => updateBlock(block.id, 'rest', value)}
                          />
                          <Field
                            label="Load (kg)"
                            value={block.load}
                            onChange={(value) => updateBlock(block.id, 'load', value)}
                          />
                        </div>

                        <div className="mt-6 space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Notes</label>
                          <textarea
                            value={block.notes}
                            onChange={(event) => updateBlock(block.id, 'notes', event.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50 px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#1A73E8] focus:bg-white"
                            placeholder="Indicaciones tecnicas, objetivo del bloque o notas de ejecucion."
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={addBlock}
                  className="group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10 transition hover:border-[#1A73E8] hover:bg-white"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-400 shadow-sm transition group-hover:border-[#1A73E8] group-hover:bg-[#1A73E8] group-hover:text-white">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-[#0F172A] group-hover:text-[#1A73E8]">Add Exercise Block</span>
                    <span className="text-xs text-[#64748B]">Insert a new exercise or technical movement</span>
                  </div>
                </button>
              </section>
            </div>

            <aside className="w-full lg:w-[400px]">
              <div className="sticky top-28 space-y-6">
                <section className="rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_10px_rgba(15,23,42,0.04)]">
                  <div className="mb-8 flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                    <h3 className="text-lg font-bold [font-family:var(--font-plus-jakarta)]">Routine Summary</h3>
                    <span className="rounded bg-[#1A73E8] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      {summary.count} Movements
                    </span>
                  </div>

                  <div className="mb-8 space-y-5">
                    {blocks.map((block, index) => (
                      <div key={block.id} className="flex items-center gap-4 rounded-lg p-2 transition hover:bg-slate-50">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-slate-100 text-xs font-bold text-[#64748B]">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-bold ${block.name.trim() ? 'text-[#0F172A]' : 'italic text-slate-400'}`}>
                            {block.name.trim() || 'Untitled Exercise'}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {block.sets || '--'} Sets • {block.reps || '--'} Reps • {block.rest || '--'}s Rest
                          </p>
                        </div>
                        <Grip className="h-4 w-4 text-slate-300" />
                      </div>
                    ))}
                  </div>

                  <div className="mb-8 space-y-4 rounded-lg bg-slate-50 p-5">
                    <Metric label="Est. Duration" value={`${summary.estimatedMinutes} Minutes`} />
                    <Metric label="Total Vol. Load" value={`${summary.totalLoad.toLocaleString('es-ES')} kg`} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#64748B]">Power Score</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }, (_, index) => (
                          <div
                            key={`score-${index}`}
                            className={`h-3 w-1.5 rounded-full ${index < summary.score ? 'bg-[#1A73E8]' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full rounded-lg bg-[#1A73E8] py-3.5 font-bold text-white transition hover:bg-[#1557B0] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar ejercicio'}
                    </button>
                    <Link
                      href={backHref}
                      className="block w-full rounded-lg border border-[#E2E8F0] bg-white py-3.5 text-center font-bold text-[#0F172A] transition hover:bg-slate-50"
                    >
                      Volver a AI Coach
                    </Link>
                  </div>

                  {error ? <p className="mt-4 text-sm font-medium text-[#b91c1c]">{error}</p> : null}
                </section>

                <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#0D9488] p-6 text-white shadow-lg">
                  <div className="relative z-10">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold [font-family:var(--font-plus-jakarta)]">AI Insights</h4>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Smart Assistant</p>
                      </div>
                    </div>
                    <p className="mb-6 text-sm leading-relaxed text-white/90">
                      {playerName}, en base a los bloques actuales conviene combinar un movimiento principal de fuerza con un cierre de activacion o recuperacion para equilibrar la sesion.
                    </p>
                    <div className="rounded-lg bg-white/15 px-4 py-3 text-xs font-semibold text-white/90 backdrop-blur-md">
                      Recomendacion: revisa el descanso del bloque principal antes de guardar.
                    </div>
                  </div>
                  <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                </section>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-xl font-bold text-[#0F172A] outline-none transition focus:border-[#1A73E8] focus:bg-white"
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-[#64748B]">{label}</span>
      <span className="font-bold text-[#0F172A]">{value}</span>
    </div>
  )
}
