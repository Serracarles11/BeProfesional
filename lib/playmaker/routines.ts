export type RoutineOrigin = 'manual' | 'ai'

export type RoutineMaterialMeta = {
  order?: number
  load?: string
  phase?: string
  imageUrls?: string[]
  trainingCategory?: string
  objective?: string
  targetGroup?: string
  playerCount?: string
  origin?: RoutineOrigin
  duration?: string
  purpose?: string
  setup?: string
  instructions?: string
  coachingPoints?: string[]
  progression?: string
}

export type RoutineExerciseRow = {
  id: string
  nombre: string
  descripcion: string | null
  tipo: string | null
  objetivo: string | null
  duracion_estimada_min: number | null
  dificultad: number | null
  material: string | null
  creado_en?: string | null
}

export type RoutineBlock = {
  rowId: string
  order: number
  phase: string
  name: string
  duration: string
  sets: string
  reps: string
  rest: string
  load: string
  purpose: string
  setup: string
  instructions: string
  coachingPoints: string[]
  progression: string
  notes: string
  difficulty: number | null
}

export type RoutineSummary = {
  id: string
  title: string
  phase: string
  phases: string[]
  category: string
  trainingCategory: string
  description: string
  duration: number
  blockCount: number
  difficulty: number
  imageUrls: string[]
  objective: string
  targetGroup: string
  playerCount: string
  origin: RoutineOrigin
  createdAt: string | null
}

export type RoutineDetail = RoutineSummary & {
  blocks: RoutineBlock[]
}

export type RoutineEditorBlock = {
  id: string
  phase: string
  name: string
  duration: string
  sets: string
  reps: string
  rest: string
  load: string
  purpose: string
  setup: string
  instructions: string
  coachingPoints: string[]
  progression: string
  notes: string
}

export type RoutineEditorDraft = {
  title: string
  objective: string
  trainingCategory: string
  targetGroup: string
  playerCount: string
  phases: string[]
  blocks: RoutineEditorBlock[]
  imageUrls: string[]
  origin: RoutineOrigin
}

const ROUTINE_PREFIX = 'routine::'

export function buildRoutineObjective(routineId: string, title: string) {
  return `${ROUTINE_PREFIX}${routineId}::${encodeURIComponent(title)}`
}

export function parseRoutineObjective(value: string | null | undefined) {
  if (!value || !value.startsWith(ROUTINE_PREFIX)) return null
  const rest = value.slice(ROUTINE_PREFIX.length)
  const separator = rest.indexOf('::')
  if (separator === -1) return null

  const id = rest.slice(0, separator).trim()
  const encodedTitle = rest.slice(separator + 2)
  if (!id) return null

  return {
    id,
    title: decodeURIComponent(encodedTitle || ''),
  }
}

export function serializeRoutineMaterial(meta: RoutineMaterialMeta) {
  return JSON.stringify(meta)
}

export function parseRoutineMaterial(value: string | null | undefined): RoutineMaterialMeta {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value) as RoutineMaterialMeta
    return {
      order: typeof parsed.order === 'number' ? parsed.order : undefined,
      load: typeof parsed.load === 'string' ? parsed.load : undefined,
      phase: typeof parsed.phase === 'string' ? parsed.phase : undefined,
      imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls.filter((item): item is string => typeof item === 'string') : undefined,
      trainingCategory: typeof parsed.trainingCategory === 'string' ? parsed.trainingCategory : undefined,
      objective: typeof parsed.objective === 'string' ? parsed.objective : undefined,
      targetGroup: typeof parsed.targetGroup === 'string' ? parsed.targetGroup : undefined,
      playerCount: typeof parsed.playerCount === 'string' ? parsed.playerCount : undefined,
      origin: parsed.origin === 'ai' ? 'ai' : parsed.origin === 'manual' ? 'manual' : undefined,
      duration: typeof parsed.duration === 'string' ? parsed.duration : undefined,
      purpose: typeof parsed.purpose === 'string' ? parsed.purpose : undefined,
      setup: typeof parsed.setup === 'string' ? parsed.setup : undefined,
      instructions: typeof parsed.instructions === 'string' ? parsed.instructions : undefined,
      coachingPoints: Array.isArray(parsed.coachingPoints)
        ? parsed.coachingPoints.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
        : undefined,
      progression: typeof parsed.progression === 'string' ? parsed.progression : undefined,
    }
  } catch {
    return {
      load: value,
    }
  }
}

function pickLine(description: string, label: string) {
  const expression = new RegExp(`(?:^|\\n)${label}:\\s*(.+)`, 'i')
  const match = description.match(expression)
  return match?.[1]?.trim() ?? ''
}

function splitCoachingPoints(value: string) {
  return value
    .split(/\r?\n|[.;](?=\s|$)/)
    .map((item) => item.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDisplayCategory(value: string | null | undefined) {
  if (!value) return 'Sin categoria'
  if (value === 'FUERZA') return 'Fuerza'
  if (value === 'POTENCIA') return 'Potencia'
  if (value === 'RESISTENCIA') return 'Resistencia'
  if (value === 'RECUPERACION') return 'Recuperacion'
  if (value === 'FISICO') return 'Fisico'
  if (value === 'TECNICO') return 'Tecnico'
  if (value === 'TACTICO') return 'Tactico'
  return value
}

function parseBlock(row: RoutineExerciseRow): RoutineBlock {
  const description = row.descripcion ?? ''
  const meta = parseRoutineMaterial(row.material)
  const coachingPoints = meta.coachingPoints ?? splitCoachingPoints(pickLine(description, 'Puntos clave'))

  return {
    rowId: row.id,
    order: meta.order ?? 0,
    phase: meta.phase ?? pickLine(description, 'Fase'),
    name: row.nombre,
    duration: meta.duration ?? pickLine(description, 'Duracion'),
    sets: pickLine(description, 'Series'),
    reps: pickLine(description, 'Repeticiones'),
    rest: pickLine(description, 'Descanso').replace(/s$/i, '').trim(),
    load: meta.load ?? pickLine(description, 'Carga').replace(/kg$/i, '').trim(),
    purpose: meta.purpose ?? pickLine(description, 'Objetivo del ejercicio') ?? '',
    setup: meta.setup ?? pickLine(description, 'Montaje') ?? '',
    instructions: meta.instructions ?? pickLine(description, 'Consignas') ?? '',
    coachingPoints,
    progression: meta.progression ?? pickLine(description, 'Progresion') ?? '',
    notes: pickLine(description, 'Notas'),
    difficulty: row.dificultad,
  }
}

function fallbackDuration(block: RoutineBlock, rowDuration: number | null) {
  const explicit = toNumber(block.duration)
  if (explicit !== null && explicit > 0) return explicit
  if (rowDuration && rowDuration > 0) return rowDuration

  const sets = toNumber(block.sets)
  const rest = toNumber(block.rest)
  if (sets === null || sets <= 0) return 10
  const restMinutes = rest !== null && rest > 0 ? (sets * rest) / 60 : sets
  return Math.max(5, Math.round(sets * 2 + restMinutes))
}

export function createEmptyRoutineDraft(): RoutineEditorDraft {
  return {
    title: 'Rutina sin titulo',
    objective: '',
    trainingCategory: 'POTENCIA',
    targetGroup: '',
    playerCount: '',
    phases: ['Fase 1'],
    blocks: [],
    imageUrls: [],
    origin: 'manual',
  }
}

function sanitizeBlock(input: Partial<RoutineEditorBlock>, fallbackPhase: string, seed: number): RoutineEditorBlock {
  return {
    id: typeof input.id === 'string' && input.id.trim() ? input.id.trim() : `block-${seed}`,
    phase: typeof input.phase === 'string' && input.phase.trim() ? input.phase.trim() : fallbackPhase,
    name: typeof input.name === 'string' ? input.name.trim() : '',
    duration: typeof input.duration === 'string' ? input.duration.trim() : '',
    sets: typeof input.sets === 'string' ? input.sets.trim() : '',
    reps: typeof input.reps === 'string' ? input.reps.trim() : '',
    rest: typeof input.rest === 'string' ? input.rest.trim() : '',
    load: typeof input.load === 'string' ? input.load.trim() : '',
    purpose: typeof input.purpose === 'string' ? input.purpose.trim() : '',
    setup: typeof input.setup === 'string' ? input.setup.trim() : '',
    instructions: typeof input.instructions === 'string' ? input.instructions.trim() : '',
    coachingPoints: Array.isArray(input.coachingPoints)
      ? input.coachingPoints.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [],
    progression: typeof input.progression === 'string' ? input.progression.trim() : '',
    notes: typeof input.notes === 'string' ? input.notes.trim() : '',
  }
}

export function normalizeRoutineDraft(input: Partial<RoutineEditorDraft> | null | undefined): RoutineEditorDraft {
  const base = createEmptyRoutineDraft()
  const phases = Array.isArray(input?.phases)
    ? input?.phases.filter((phase): phase is string => typeof phase === 'string').map((phase) => phase.trim()).filter(Boolean)
    : []
  const normalizedPhases = phases.length > 0 ? phases : base.phases
  const fallbackPhase = normalizedPhases[0] ?? 'Fase 1'
  const blocks = Array.isArray(input?.blocks)
    ? input.blocks.map((block, index) => sanitizeBlock(block, fallbackPhase, index)).filter((block) => block.name || block.purpose || block.instructions)
    : []

  return {
    title: typeof input?.title === 'string' && input.title.trim() ? input.title.trim() : base.title,
    objective: typeof input?.objective === 'string' ? input.objective.trim() : base.objective,
    trainingCategory: typeof input?.trainingCategory === 'string' && input.trainingCategory.trim() ? input.trainingCategory.trim().toUpperCase() : base.trainingCategory,
    targetGroup: typeof input?.targetGroup === 'string' ? input.targetGroup.trim() : base.targetGroup,
    playerCount: typeof input?.playerCount === 'string' ? input.playerCount.trim() : base.playerCount,
    phases: normalizedPhases,
    blocks,
    imageUrls: Array.isArray(input?.imageUrls)
      ? input.imageUrls.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [],
    origin: input?.origin === 'ai' ? 'ai' : input?.origin === 'manual' ? 'manual' : base.origin,
  }
}

export function routineDetailToEditorDraft(detail: RoutineDetail): RoutineEditorDraft {
  return normalizeRoutineDraft({
    title: detail.title,
    objective: detail.objective,
    trainingCategory: detail.trainingCategory,
    targetGroup: detail.targetGroup,
    playerCount: detail.playerCount,
    phases: detail.phases,
    imageUrls: detail.imageUrls,
    origin: detail.origin,
    blocks: detail.blocks.map((block, index) => ({
      id: `${block.rowId || `block-${index}`}`,
      phase: block.phase,
      name: block.name,
      duration: block.duration,
      sets: block.sets,
      reps: block.reps,
      rest: block.rest,
      load: block.load,
      purpose: block.purpose,
      setup: block.setup,
      instructions: block.instructions,
      coachingPoints: block.coachingPoints,
      progression: block.progression,
      notes: block.notes,
    })),
  })
}

export function buildRoutineDetails(rows: RoutineExerciseRow[]) {
  const routines = new Map<string, RoutineExerciseRow[]>()

  for (const row of rows) {
    const meta = parseRoutineObjective(row.objetivo)
    const key = meta?.id ?? `legacy-${row.id}`
    const bucket = routines.get(key) ?? []
    bucket.push(row)
    routines.set(key, bucket)
  }

  return [...routines.entries()]
    .map(([routineId, bucket]) => {
      const orderedRows = [...bucket].sort((left, right) => {
        const leftMeta = parseRoutineMaterial(left.material)
        const rightMeta = parseRoutineMaterial(right.material)
        return (leftMeta.order ?? 0) - (rightMeta.order ?? 0)
      })

      const firstRow = orderedRows[0]
      const objectiveMeta = parseRoutineObjective(firstRow.objetivo)
      const firstMaterial = parseRoutineMaterial(firstRow.material)
      const blocks = orderedRows.map(parseBlock)
      const duration = blocks.reduce((acc, block, index) => acc + fallbackDuration(block, orderedRows[index]?.duracion_estimada_min ?? null), 0)
      const avgDifficulty =
        blocks.reduce((acc, block) => acc + (block.difficulty ?? 3), 0) / Math.max(blocks.length, 1)
      const phases = Array.from(new Set(blocks.map((block) => block.phase.trim()).filter(Boolean)))
      const phase = phases.join(' / ') || firstMaterial.phase || pickLine(firstRow.descripcion ?? '', 'Fase')
      const origin = firstMaterial.origin ?? 'manual'
      const trainingCategory = normalizeDisplayCategory(firstMaterial.trainingCategory || pickLine(firstRow.descripcion ?? '', 'Categoria') || firstRow.tipo)
      const displayCategory = origin === 'ai' ? 'Hecha por IA' : trainingCategory
      const objective = firstMaterial.objective ?? pickLine(firstRow.descripcion ?? '', 'Objetivo general') ?? ''
      const targetGroup = firstMaterial.targetGroup ?? pickLine(firstRow.descripcion ?? '', 'Grupo') ?? ''
      const playerCount = firstMaterial.playerCount ?? pickLine(firstRow.descripcion ?? '', 'Jugadores') ?? ''
      const description =
        objective ||
        blocks.find((block) => block.purpose)?.purpose ||
        blocks.find((block) => block.notes)?.notes ||
        firstRow.descripcion ||
        'Rutina del equipo.'

      return {
        id: routineId,
        title: objectiveMeta?.title || firstRow.nombre,
        phase,
        phases,
        category: displayCategory,
        trainingCategory,
        description,
        duration,
        blockCount: blocks.length,
        difficulty: Math.max(1, Math.min(5, Math.round(avgDifficulty))),
        imageUrls: firstMaterial.imageUrls ?? [],
        objective,
        targetGroup,
        playerCount,
        origin,
        createdAt: firstRow.creado_en ?? null,
        blocks,
      } satisfies RoutineDetail
    })
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
      return rightTime - leftTime
    })
}

export function buildRoutineSummary(detail: RoutineDetail): RoutineSummary {
  return {
    id: detail.id,
    title: detail.title,
    phase: detail.phase,
    phases: detail.phases,
    category: detail.category,
    trainingCategory: detail.trainingCategory,
    description: detail.description,
    duration: detail.duration,
    blockCount: detail.blockCount,
    difficulty: detail.difficulty,
    imageUrls: detail.imageUrls,
    objective: detail.objective,
    targetGroup: detail.targetGroup,
    playerCount: detail.playerCount,
    origin: detail.origin,
    createdAt: detail.createdAt,
  }
}
