'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Grip,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  SendHorizontal,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { withEquipo } from '@/app/home/utils'
import {
  normalizeRoutineDraft,
  routineDetailToEditorDraft,
  type RoutineDetail,
  type RoutineEditorBlock,
  type RoutineEditorDraft,
  mergeRoutineBlockWithExerciseData,
} from '@/lib/playmaker/routines'
import type { ExerciseCatalogSearchResult, ExerciseDbEnrichment } from '@/lib/exercisedb-types'

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

type TrainingCategory = 'FUERZA' | 'POTENCIA' | 'RESISTENCIA' | 'RECUPERACION'
type ChatRole = 'user' | 'assistant'
type ChatMessage = { id: string; role: ChatRole; content: string }

type CreateExerciseClientProps = {
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
    logo_url: string | null
  } | null
  initialRoutine?: RoutineDetail | null
  initialExercise?: ExerciseDbEnrichment | null
}

function createBlock(seed = 0, phase = 'Fase 1'): RoutineEditorBlock {
  return {
    id: `block-${seed}-${Math.random().toString(36).slice(2, 8)}`,
    phase,
    name: seed === 0 ? 'Activacion inicial con desplazamientos' : '',
    duration: seed === 0 ? '12' : '10',
    sets: '',
    reps: '',
    rest: '',
    load: '',
    purpose: '',
    setup: '',
    instructions: '',
    coachingPoints: [],
    progression: '',
    notes: '',
    imageUrls: [],
  }
}

function createInitialDraft(
  initialRoutine: RoutineDetail | null | undefined,
  initialExercise: ExerciseDbEnrichment | null | undefined
): RoutineEditorDraft {
  const base = initialRoutine ? routineDetailToEditorDraft(initialRoutine) : normalizeRoutineDraft(undefined)
  const normalized = normalizeRoutineDraft(base)
  if (normalized.blocks.length > 0) return normalized
  const firstBlock = createBlock(0, normalized.phases[0] ?? 'Fase 1')
  const exerciseImage = initialExercise?.gifUrl ?? initialExercise?.imageUrl ?? ''
  const seededBlock = initialExercise ? mergeRoutineBlockWithExerciseData(firstBlock, initialExercise) : firstBlock
  const blockWithImage = exerciseImage ? { ...seededBlock, imageUrls: [exerciseImage] } : seededBlock
  return {
    ...normalized,
    title: initialExercise?.name ? `Rutina - ${initialExercise.name}` : normalized.title,
    objective: initialExercise?.overview || normalized.objective,
    blocks: [blockWithImage],
  }
}

function normalizeCategory(value: string): TrainingCategory {
  if (value === 'FUERZA' || value === 'POTENCIA' || value === 'RESISTENCIA' || value === 'RECUPERACION') return value
  return 'POTENCIA'
}

function coachingPointsToText(value: string[]) {
  return value.join('\n')
}

function textToCoachingPoints(value: string) {
  return value.split(/\r?\n/).map((item) => item.replace(/^[-*•]\s*/, '').trim()).filter(Boolean)
}

function buildExerciseBlock(block: RoutineEditorBlock, exerciseData: ExerciseDbEnrichment): RoutineEditorBlock {
  const bodyParts = exerciseData.bodyParts.join(', ')
  const primaryMuscles = exerciseData.targetMuscles.join(', ')
  const secondaryMuscles = exerciseData.secondaryMuscles.join(', ')
  const equipments = exerciseData.equipments.join(', ')

  return {
    ...block,
    name: exerciseData.name,
    purpose: exerciseData.overview,
    setup: [equipments ? `Equipamiento: ${equipments}.` : '', bodyParts ? `Zona corporal principal: ${bodyParts}.` : '']
      .filter(Boolean)
      .join(' '),
    instructions: exerciseData.instructions.join('\n'),
    coachingPoints: exerciseData.exerciseTips,
    progression: exerciseData.variations.join('\n'),
    notes: [
      primaryMuscles ? `Musculatura principal: ${primaryMuscles}.` : '',
      secondaryMuscles ? `Musculatura secundaria: ${secondaryMuscles}.` : '',
      exerciseData.exerciseType ? `Tipo de ejercicio: ${exerciseData.exerciseType}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
    exerciseData,
  }
}

function buildStarterMessages(
  playerName: string,
  initialRoutine: RoutineDetail | null | undefined,
  initialExercise: ExerciseDbEnrichment | null | undefined
): ChatMessage[] {
  if (initialRoutine?.origin === 'ai') {
    return [{ id: 'assistant-restored', role: 'assistant', content: `He recuperado el borrador IA de ${initialRoutine.title}. Puedes pedirme cambios concretos y actualizare esta misma rutina.` }]
  }
  if (initialExercise) {
    return [{ id: 'assistant-exercisedb', role: 'assistant', content: `He cargado ${initialExercise.name} desde ExerciseDB en el primer bloque. Puedes pedirme que lo convierta en una sesion completa.` }]
  }
  return [{ id: 'assistant-start', role: 'assistant', content: `Soy tu asistente de rutinas, ${playerName}. Pideme una sesion completa y la dejare lista para guardar en este mismo editor.` }]
}

export default function CreateExerciseClient({ equipo, initialRoutine = null, initialExercise = null }: CreateExerciseClientProps) {
  const router = useRouter()
  const backHref = withEquipo('/play-maker', equipo?.id)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadingBlockIdRef = useRef<string | null>(null)
  const isEditing = Boolean(initialRoutine)
  const initialDraft = createInitialDraft(initialRoutine, initialExercise)
  const playerName = equipo?.nombre ?? 'Equipo'

  const [draft, setDraft] = useState<RoutineEditorDraft>(initialDraft)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'draft' | 'saved'>(initialRoutine ? 'saved' : 'draft')
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(() => buildStarterMessages(playerName, initialRoutine, initialExercise))
  const [aiPrompt, setAiPrompt] = useState('')
  const [lastAiPrompt, setLastAiPrompt] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [activeCatalogBlockId, setActiveCatalogBlockId] = useState<string | null>(null)
  const [catalogResults, setCatalogResults] = useState<ExerciseCatalogSearchResult[]>([])
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [applyingCatalogId, setApplyingCatalogId] = useState<string | null>(null)

  function patchDraft(updater: (current: RoutineEditorDraft) => RoutineEditorDraft) {
    setDraft((current) => updater(current))
    setSaveState('draft')
  }

  function setTopField<Key extends keyof RoutineEditorDraft>(key: Key, value: RoutineEditorDraft[Key]) {
    patchDraft((current) => ({ ...current, [key]: value }))
  }

  function updateBlock(id: string, key: keyof RoutineEditorBlock, value: string | string[]) {
    patchDraft((current) => ({ ...current, blocks: current.blocks.map((block) => (block.id === id ? { ...block, [key]: value } : block)) }))
  }

  function updateExerciseName(id: string, value: string) {
    updateBlock(id, 'name', value)
    setActiveCatalogBlockId(id)
    setCatalogQuery(value)
  }

  function addBlock() {
    patchDraft((current) => ({ ...current, blocks: [...current.blocks, createBlock(current.blocks.length, current.phases[0] ?? 'Fase 1')] }))
  }

  function removeBlock(id: string) {
    patchDraft((current) => ({ ...current, blocks: current.blocks.length === 1 ? current.blocks : current.blocks.filter((block) => block.id !== id) }))
  }

  function addPhase() {
    patchDraft((current) => ({ ...current, phases: [...current.phases, `Fase ${current.phases.length + 1}`] }))
  }
  function updatePhase(index: number, value: string) {
    const currentPhase = draft.phases[index] ?? ''
    patchDraft((current) => ({
      ...current,
      phases: current.phases.map((phase, phaseIndex) => (phaseIndex === index ? value : phase)),
      blocks: current.blocks.map((block) => (block.phase === currentPhase ? { ...block, phase: value } : block)),
    }))
  }

  function removePhase(index: number) {
    if (draft.phases.length === 1) return
    const removed = draft.phases[index]
    const nextPhases = draft.phases.filter((_, phaseIndex) => phaseIndex !== index)
    const fallbackPhase = nextPhases[0] ?? 'Fase 1'
    patchDraft((current) => ({
      ...current,
      phases: nextPhases,
      blocks: current.blocks.map((block) => (block.phase === removed ? { ...block, phase: fallbackPhase } : block)),
    }))
  }

  function moveBlock(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    patchDraft((current) => {
      const next = [...current.blocks]
      const fromIndex = next.findIndex((block) => block.id === draggedId)
      const toIndex = next.findIndex((block) => block.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return current
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return { ...current, blocks: next }
    })
  }

  function normalizeBlocksForSave() {
    const normalizedPhases = draft.phases.map((phase) => phase.trim()).filter(Boolean)
    const fallbackPhase = normalizedPhases[0] ?? 'Fase 1'
    return draft.blocks.filter((block) => block.name.trim()).map((block) => ({ ...block, phase: block.phase.trim() || fallbackPhase }))
  }

  async function handleSave() {
    const validBlocks = normalizeBlocksForSave()
    if (!equipo?.id) return setError('No hay un equipo activo para guardar la rutina.')
    if (!draft.title.trim()) return setError('Introduce un titulo para la rutina.')
    if (draft.phases.length === 0 || draft.phases.every((phase) => !phase.trim())) return setError('Anade al menos una fase para la rutina.')
    if (validBlocks.length === 0) return setError('Anade al menos un bloque con nombre antes de guardar.')

    const confirmed = window.confirm(isEditing ? 'Quieres actualizar la rutina?' : 'Quieres guardar la rutina?')
    if (!confirmed) return

    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/play-maker/exercises', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId: equipo.id,
          title: draft.title,
          objective: draft.objective,
          trainingCategory: normalizeCategory(draft.trainingCategory),
          targetGroup: draft.targetGroup,
          playerCount: draft.playerCount,
          origin: draft.origin,
          routineId: initialRoutine?.id ?? null,
          blocks: validBlocks,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'No se pudo guardar la rutina.')
      setSaveState('saved')
      router.push(backHref)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la rutina.')
    } finally {
      setIsSaving(false)
    }
  }

  function openImagePicker(blockId: string) {
    uploadingBlockIdRef.current = blockId
    fileInputRef.current?.click()
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files
    const blockId = uploadingBlockIdRef.current
    if (!fileList || fileList.length === 0 || !blockId) {
      uploadingBlockIdRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadingBlockId(blockId)
    setError(null)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(fileList)) {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/play-maker/media', { method: 'POST', body: formData })
        const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; imageUrl?: string; name?: string } | null
        if (!response.ok || !payload?.ok || !payload.imageUrl) throw new Error(payload?.error || 'No se pudo subir una de las imagenes.')
        uploadedUrls.push(payload.imageUrl)
      }
      patchDraft((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId ? { ...block, imageUrls: [...block.imageUrls, ...uploadedUrls] } : block
        ),
      }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudieron subir las imagenes.')
    } finally {
      setUploadingBlockId(null)
      uploadingBlockIdRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeBlockImage(blockId: string, url: string) {
    patchDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, imageUrls: block.imageUrls.filter((item) => item !== url) } : block
      ),
    }))
  }

  useEffect(() => {
    const query = catalogQuery.trim()
    if (!activeCatalogBlockId || query.length < 2 || !equipo?.id) {
      setCatalogResults([])
      setCatalogError(null)
      setIsCatalogLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsCatalogLoading(true)
      setCatalogError(null)

      try {
        const params = new URLSearchParams({
          query,
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

        if (!cancelled) {
          setCatalogResults(payload.results ?? [])
        }
      } catch (searchError) {
        if (cancelled || controller.signal.aborted) return
        setCatalogResults([])
        setCatalogError(searchError instanceof Error ? searchError.message : 'No se pudo buscar en ExerciseDB.')
      } finally {
        if (!cancelled) setIsCatalogLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [activeCatalogBlockId, catalogQuery, equipo?.id])

  async function applyCatalogResult(blockId: string, result: ExerciseCatalogSearchResult) {
    setApplyingCatalogId(result.exerciseId ?? result.localId ?? result.name)
    setCatalogError(null)
    patchDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? { ...block, name: result.name } : block)),
    }))

    try {
      if (!result.exerciseId) {
        setCatalogQuery(result.name)
        setCatalogResults([])
        return
      }

      const response = await fetch('/api/play-maker/exercise-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: result.exerciseId, name: result.name }),
      })
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        exercise?: ExerciseDbEnrichment
      } | null

      if (!response.ok || !payload?.ok || !payload.exercise) {
        throw new Error(payload?.error || 'No se pudo cargar el detalle del ejercicio.')
      }

      const exercise = payload.exercise
      const mediaUrl = exercise.gifUrl ?? exercise.imageUrl

      patchDraft((current) => ({
        ...current,
        blocks: current.blocks.map((block) => {
          if (block.id !== blockId) return block
          const enriched = buildExerciseBlock(block, exercise)
          if (mediaUrl && !enriched.imageUrls.includes(mediaUrl)) {
            return { ...enriched, imageUrls: [...enriched.imageUrls, mediaUrl] }
          }
          return enriched
        }),
      }))

      setCatalogQuery(exercise.name)
      setCatalogResults([])
    } catch (applyError) {
      setCatalogError(applyError instanceof Error ? applyError.message : 'No se pudo aplicar el ejercicio.')
    } finally {
      setApplyingCatalogId(null)
    }
  }

  async function submitAiPrompt(nextPrompt: string) {
    const prompt = nextPrompt.trim()
    if (!prompt || !equipo?.id) return
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: prompt }
    const nextConversation = [...aiMessages, userMessage]

    setAiPrompt('')
    setLastAiPrompt(prompt)
    setAiError(null)
    setIsAiLoading(true)
    setAiMessages(nextConversation)

    try {
      const response = await fetch('/api/play-maker/ai-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId: equipo.id,
          prompt,
          currentDraft: draft,
          messages: nextConversation.map((message) => ({ role: message.role, content: message.content })),
        }),
      })

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; assistantMessage?: string; draft?: RoutineEditorDraft } | null
      if (!response.ok || !payload?.ok || !payload.draft) throw new Error(payload?.error || 'No se pudo generar la rutina con IA.')

      const nextDraft = normalizeRoutineDraft(payload.draft)
      const blocksWithImages = (nextDraft.blocks.length > 0 ? nextDraft.blocks : [createBlock(0, nextDraft.phases[0] ?? 'Fase 1')]).map(
        (block) => {
          if (block.imageUrls.length > 0) return block
          const exerciseImage = block.exerciseData?.gifUrl ?? block.exerciseData?.imageUrl
          return exerciseImage ? { ...block, imageUrls: [exerciseImage] } : block
        }
      )
      setDraft({
        ...nextDraft,
        origin: 'ai',
        blocks: blocksWithImages,
      })
      setSaveState('draft')
      setAiMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: payload.assistantMessage || 'He actualizado la rutina con tus indicaciones.' }])
    } catch (aiRequestError) {
      const message = aiRequestError instanceof Error ? aiRequestError.message : 'No se pudo generar la rutina con IA.'
      setAiError(message)
      setAiMessages(aiMessages)
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <div className={`${plusJakarta.variable} ${inter.variable} min-h-screen bg-[#F8FAFC] [font-family:var(--font-inter)] text-[#0F172A]`}>
      <main className="min-h-screen">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-6 backdrop-blur-md lg:px-10">
          <div className="flex items-center gap-4">
            <Link href={backHref} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#1A73E8] transition hover:bg-[#E8F0FE]" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-[#0F172A] [font-family:var(--font-plus-jakarta)]">{isEditing ? 'Editar rutina' : 'Creador de rutinas'}</h1>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${saveState === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {saveState === 'saved' ? 'Guardada' : draft.origin === 'ai' ? 'Borrador IA' : 'Borrador'}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#64748B]">{equipo?.nombre ?? 'Sin equipo'} - {isEditing ? 'modo edicion' : 'sesion en preparacion'}</p>
            </div>
          </div>

          <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 rounded-lg bg-[#1A73E8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1557B0] disabled:cursor-not-allowed disabled:opacity-60">
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Guardando...' : isEditing ? 'Actualizar rutina' : 'Guardar rutina'}</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row">
            <div className="flex-1 space-y-10">
              <section className="space-y-5">
                <input value={draft.title} onChange={(event) => setTopField('title', event.target.value)} className="w-full border-none bg-transparent p-0 text-4xl font-extrabold tracking-tight text-[#0F172A] outline-none placeholder:text-slate-300 [font-family:var(--font-plus-jakarta)]" placeholder="Rutina sin titulo" />

                <div className="grid gap-5 xl:grid-cols-2">
                  <TextField label="Objetivo principal" value={draft.objective} onChange={(value) => setTopField('objective', value)} placeholder="Ej. mejorar pressing tras perdida y finalizacion rapida" />
                  <TextField label="Grupo o categoria" value={draft.targetGroup} onChange={(value) => setTopField('targetGroup', value)} placeholder="Ej. Juvenil A, Sub-16, primer equipo" />
                  <TextField label="Numero de jugadores" value={draft.playerCount} onChange={(value) => setTopField('playerCount', value)} placeholder="Ej. 16" />
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Categoria del entrenamiento</label>
                    <select value={normalizeCategory(draft.trainingCategory)} onChange={(event) => setTopField('trainingCategory', event.target.value)} className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#1A73E8]">
                      <option value="FUERZA">Fuerza</option>
                      <option value="POTENCIA">Potencia</option>
                      <option value="RESISTENCIA">Resistencia</option>
                      <option value="RECUPERACION">Recuperacion</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Fases de la rutina</label>
                    <button type="button" onClick={addPhase} className="inline-flex items-center gap-1 text-xs font-bold text-[#1A73E8]"><Plus className="h-3.5 w-3.5" /><span>Anadir fase</span></button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {draft.phases.map((phase, index) => (
                      <div key={`${index}-${phase}`} className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8F0FE] text-xs font-black text-[#1A73E8]">{String(index + 1).padStart(2, '0')}</span>
                        <input value={phase} onChange={(event) => updatePhase(index, event.target.value)} className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-[#64748B] outline-none focus:border-[#1A73E8]" placeholder={`Fase ${index + 1}`} />
                        <button type="button" onClick={() => removePhase(index)} disabled={draft.phases.length === 1} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                {draft.blocks.map((block, index) => (
                  <article key={block.id} onDragOver={(event) => { event.preventDefault(); setDragOverBlockId(block.id) }} onDragLeave={() => setDragOverBlockId((current) => (current === block.id ? null : current))} onDrop={(event) => { event.preventDefault(); if (draggedBlockId) moveBlock(draggedBlockId, block.id); setDraggedBlockId(null); setDragOverBlockId(null) }} className={`overflow-hidden rounded-xl border bg-white shadow-[0_4px_10px_rgba(15,23,42,0.04)] transition ${dragOverBlockId === block.id ? 'border-[#1A73E8] ring-2 ring-[#1A73E8]/15' : 'border-[#E2E8F0]'}`}>
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full space-y-3 border-b border-[#E2E8F0] bg-slate-50 p-6 md:w-64 md:border-b-0 md:border-r">
                        {block.imageUrls.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {block.imageUrls.map((url, imageIndex) => (
                              <div key={`${block.id}-${url}-${imageIndex}`} className="group relative overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                                <img src={url} alt={`${block.name || 'Ejercicio'} ${imageIndex + 1}`} className="h-24 w-full object-cover" />
                                <button type="button" onClick={() => removeBlockImage(block.id, url)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-label="Eliminar imagen">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <button type="button" onClick={() => openImagePicker(block.id)} disabled={uploadingBlockId === block.id} className="group flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 transition hover:border-[#1A73E8] hover:bg-[#E8F0FE] disabled:cursor-not-allowed disabled:opacity-60">
                          <ImagePlus className="h-6 w-6 text-slate-400 transition group-hover:text-[#1A73E8]" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-[#1A73E8]">{uploadingBlockId === block.id ? 'Subiendo...' : block.imageUrls.length > 0 ? 'Anadir imagen' : 'Multimedia'}</span>
                        </button>
                      </div>

                      <div className="flex-1 p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-4">
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#1A73E8]">Nombre del ejercicio</label>
                              <input
                                value={block.name}
                                onChange={(event) => updateExerciseName(block.id, event.target.value)}
                                onFocus={() => {
                                  setActiveCatalogBlockId(block.id)
                                  setCatalogQuery(block.name)
                                }}
                                className="w-full border-b border-[#E2E8F0] bg-transparent pb-2 text-xl font-bold text-[#0F172A] outline-none transition hover:border-slate-300 focus:border-[#1A73E8] [font-family:var(--font-plus-jakarta)]"
                                placeholder="Ej. juego de posicion 6x4 con finalizacion"
                              />
                              {activeCatalogBlockId === block.id && catalogQuery.trim().length >= 2 ? (
                                <div className="mt-3 rounded-xl border border-[#DDE7F5] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                                  <div className="flex items-center justify-between border-b border-[#EDF2F7] px-4 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">ExerciseDB</span>
                                    {isCatalogLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#1A73E8]" /> : null}
                                  </div>
                                  {catalogError ? (
                                    <p className="px-4 py-3 text-xs font-semibold text-red-600">{catalogError}</p>
                                  ) : catalogResults.length > 0 ? (
                                    <div className="max-h-72 overflow-y-auto p-2">
                                      {catalogResults.map((result) => {
                                        const resultId = result.exerciseId ?? result.localId ?? result.name
                                        return (
                                          <button
                                            key={`${result.source}-${resultId}`}
                                            type="button"
                                            onClick={() => applyCatalogResult(block.id, result)}
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#F1F7FF]"
                                          >
                                            {result.imageUrl ? (
                                              <img src={result.imageUrl} alt={result.name} className="h-11 w-11 rounded-lg object-cover" />
                                            ) : (
                                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E8F0FE] text-[#1A73E8]">
                                                <Sparkles className="h-4 w-4" />
                                              </div>
                                            )}
                                            <span className="min-w-0 flex-1">
                                              <span className="block truncate text-sm font-bold text-[#0F172A]">{result.name}</span>
                                              <span className="block truncate text-xs text-[#64748B]">
                                                {result.source === 'local' ? 'Biblioteca local' : 'ExerciseDB'} - {result.subtitle}
                                              </span>
                                            </span>
                                            {applyingCatalogId === resultId ? <Loader2 className="h-4 w-4 animate-spin text-[#1A73E8]" /> : null}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  ) : isCatalogLoading ? (
                                    <p className="px-4 py-3 text-xs text-[#64748B]">Buscando ejercicios...</p>
                                  ) : (
                                    <p className="px-4 py-3 text-xs text-[#64748B]">Sin resultados para esa busqueda.</p>
                                  )}
                                </div>
                              ) : null}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Fase del ejercicio</label>
                                <select value={block.phase} onChange={(event) => updateBlock(block.id, 'phase', event.target.value)} className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#1A73E8]">
                                  {draft.phases.map((phaseOption, phaseIndex) => <option key={`${phaseIndex}-${phaseOption}`} value={phaseOption}>{phaseOption || `Fase ${phaseIndex + 1}`}</option>)}
                                </select>
                              </div>
                              <TextField label="Objetivo del ejercicio" value={block.purpose} onChange={(value) => updateBlock(block.id, 'purpose', value)} placeholder="Que se busca con este bloque" />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button type="button" draggable onDragStart={() => setDraggedBlockId(block.id)} onDragEnd={() => { setDraggedBlockId(null); setDragOverBlockId(null) }} className="flex h-9 w-9 cursor-grab items-center justify-center rounded-lg bg-slate-100 text-slate-400 active:cursor-grabbing" aria-label={`Mover bloque ${index + 1}`}><Grip className="h-4 w-4" /></button>
                            <button type="button" onClick={() => removeBlock(block.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500" aria-label={`Eliminar bloque ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 xl:grid-cols-5">
                          <Field label="Duracion (min)" value={block.duration} onChange={(value) => updateBlock(block.id, 'duration', value)} />
                          <Field label="Series" value={block.sets} onChange={(value) => updateBlock(block.id, 'sets', value)} />
                          <Field label="Repeticiones" value={block.reps} onChange={(value) => updateBlock(block.id, 'reps', value)} />
                          <Field label="Descanso (s)" value={block.rest} onChange={(value) => updateBlock(block.id, 'rest', value)} />
                          <Field label="Carga (kg)" value={block.load} onChange={(value) => updateBlock(block.id, 'load', value)} />
                        </div>

                        <div className="mt-6 grid gap-6 xl:grid-cols-2">
                          <AreaField label="Montaje" value={block.setup} onChange={(value) => updateBlock(block.id, 'setup', value)} placeholder="Espacio, material, numero de jugadores por tarea, distribucion inicial..." />
                          <AreaField label="Consignas" value={block.instructions} onChange={(value) => updateBlock(block.id, 'instructions', value)} placeholder="Desarrollo, reglas, secuencia y criterios de la tarea." />
                          <AreaField label="Puntos de coaching" value={coachingPointsToText(block.coachingPoints)} onChange={(value) => updateBlock(block.id, 'coachingPoints', textToCoachingPoints(value))} placeholder="Una indicacion por linea." />
                          <AreaField label="Progresion o variante" value={block.progression} onChange={(value) => updateBlock(block.id, 'progression', value)} placeholder="Como escalar o simplificar el ejercicio." />
                        </div>

                        <div className="mt-6">
                          <AreaField label="Notas" value={block.notes} onChange={(value) => updateBlock(block.id, 'notes', value)} placeholder="Indicaciones extra, observaciones o adaptaciones." rows={3} />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                <button type="button" onClick={addBlock} className="group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10 transition hover:border-[#1A73E8] hover:bg-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-400 shadow-sm transition group-hover:border-[#1A73E8] group-hover:bg-[#1A73E8] group-hover:text-white"><Plus className="h-6 w-6" /></div>
                  <div className="text-center">
                    <span className="block text-sm font-bold text-[#0F172A] group-hover:text-[#1A73E8]">Anadir bloque de ejercicio</span>
                    <span className="text-xs text-[#64748B]">Inserta un nuevo ejercicio o movimiento tecnico</span>
                  </div>
                </button>
              </section>
            </div>

            <aside className="w-full lg:w-[420px]">
              <div className="sticky top-28 space-y-6">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageSelection} />
                <section className="rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_10px_rgba(15,23,42,0.04)]">
                  <div className="space-y-3">
                    <button type="button" onClick={handleSave} disabled={isSaving} className="w-full rounded-lg bg-[#1A73E8] py-3.5 font-bold text-white transition hover:bg-[#1557B0] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Guardando...' : isEditing ? 'Actualizar rutina' : 'Guardar rutina'}</button>
                    <Link href={backHref} className="block w-full rounded-lg border border-[#E2E8F0] bg-white py-3.5 text-center font-bold text-[#0F172A] transition hover:bg-slate-50">Volver a IA Coach</Link>
                  </div>

                  {error ? <p className="mt-4 text-sm font-medium text-[#b91c1c]">{error}</p> : null}
                </section>

                <section className="rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_10px_rgba(15,23,42,0.04)]">
                  <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[#1A73E8]"><Sparkles className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Asistente IA</span></div>
                      <h3 className="text-lg font-bold [font-family:var(--font-plus-jakarta)]">Rutina generada y refinada en el editor</h3>
                    </div>
                    {draft.origin === 'ai' ? <span className="rounded-full bg-[#E8F0FE] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#1A73E8]">Activa</span> : null}
                  </div>

                  <div className="space-y-4">
                    <div className="max-h-[320px] space-y-4 overflow-y-auto pr-1">
                      {aiMessages.map((message) => (
                        <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${message.role === 'user' ? 'bg-[#1A73E8]' : 'bg-[#0F172A]'}`}>
                            {message.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                          </div>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'bg-[#1A73E8] text-white' : 'bg-[#F1F5F9] text-[#0F172A]'}`}>{message.content}</div>
                        </div>
                      ))}
                      {isAiLoading ? <div className="flex gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F172A]"><Loader2 className="h-4 w-4 animate-spin text-white" /></div><div className="rounded-2xl bg-[#F1F5F9] px-4 py-3 text-sm text-[#0F172A]">Generando y ajustando la rutina actual...</div></div> : null}
                    </div>

                    {draft.origin === 'ai' ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /><span>Borrador IA listo para editar y guardar</span></div>
                        <p className="mt-1 text-xs text-emerald-700">Cada nuevo mensaje modifica esta misma rutina. No se genera una distinta salvo que lo pidas.</p>
                      </div>
                    ) : <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-4 text-sm text-[#475569]">Pidele una sesion completa, por ejemplo: &quot;Necesito una rutina de 75 minutos para 16 jugadores centrada en pressing y finalizacion&quot;.</div>}

                    {aiError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{aiError}</p>{lastAiPrompt ? <button type="button" onClick={() => submitAiPrompt(lastAiPrompt)} className="mt-2 inline-flex items-center gap-2 font-bold text-red-700 underline"><RotateCcw className="h-3.5 w-3.5" /><span>Reintentar</span></button> : null}</div> : null}

                    <div className="mb-2 flex flex-wrap gap-2">
                      {['Genera una sesion de 75 minutos centrada en pressing alto', 'Hazla mas intensa', 'Adapta la rutina a 12 jugadores', 'Cambia solo el calentamiento'].map((chip) => (
                        <button key={chip} type="button" onClick={() => submitAiPrompt(chip)} disabled={isAiLoading} className="rounded-full border border-[#1A73E8]/20 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#1A73E8] transition hover:bg-[#1A73E8] hover:text-white disabled:opacity-50">{chip}</button>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={4} className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 pr-14 text-sm text-[#0F172A] outline-none transition focus:border-[#1A73E8]" placeholder="Pidele una rutina completa o refina la actual: mas intensidad, menos jugadores, 60 minutos, mas finalizacion, pressing, simplifica el primer ejercicio..." />
                      <button type="button" onClick={() => submitAiPrompt(aiPrompt)} disabled={isAiLoading || !aiPrompt.trim()} className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A73E8] text-white transition hover:bg-[#1557B0] disabled:cursor-not-allowed disabled:opacity-50"><SendHorizontal className="h-4 w-4" /></button>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-2 text-base font-bold text-[#0F172A] outline-none transition focus:border-[#1A73E8] focus:bg-white" />
    </div>
  )
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] outline-none transition focus:border-[#1A73E8]" />
    </div>
  )
}

function AreaField({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="w-full rounded-lg border border-[#E2E8F0] bg-slate-50 px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#1A73E8] focus:bg-white" />
    </div>
  )
}

