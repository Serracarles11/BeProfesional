
import type { ExerciseCatalogSearchResult, ExerciseDbEnrichment, ExerciseDbRelatedExercise } from '@/lib/exercisedb-types'
import { mergeRoutineBlockWithExerciseData, normalizeRoutineDraft, type RoutineEditorDraft } from '@/lib/playmaker/routines'

const EXERCISEDB_BASE_URL =
  process.env.EXERCISEDB_BASE_URL?.trim() || 'https://exercisedb.p.rapidapi.com'
const EXERCISEDB_HOST =
  process.env.EXERCISEDB_RAPIDAPI_HOST?.trim() || 'exercisedb.p.rapidapi.com'
const EXERCISEDB_KEY = process.env.EXERCISEDB_RAPIDAPI_KEY?.trim() || ''

const detailCache = new Map<string, ExerciseDbEnrichment>()
const searchCache = new Map<string, ExerciseCatalogSearchResult[]>()
const translationCache = new Map<string, string>()
const searchTranslationCache = new Map<string, string>()

const DEFAULT_OVERVIEW = 'Sin descripción disponible.'
const DEFAULT_INSTRUCTIONS = 'Sin instrucciones disponibles.'
const DEFAULT_EQUIPMENT = 'Sin equipamiento especificado.'
const DEFAULT_VARIATIONS = 'Sin variaciones disponibles.'
const DEFAULT_TIPS = 'Sin consejos técnicos disponibles.'

const BODY_PART_TRANSLATIONS: Record<string, string> = {
  abs: 'abdomen',
  abductors: 'abductores',
  adductors: 'aductores',
  arms: 'brazos',
  back: 'espalda',
  calves: 'gemelos',
  cardio: 'cardio',
  chest: 'pecho',
  core: 'zona media',
  forearms: 'antebrazos',
  glutes: 'glúteos',
  hamstrings: 'isquiotibiales',
  hips: 'caderas',
  lats: 'dorsales',
  legs: 'piernas',
  lowerarms: 'antebrazos',
  lowerarmss: 'antebrazos',
  lowerback: 'zona lumbar',
  neck: 'cuello',
  quadriceps: 'cuádriceps',
  quads: 'cuádriceps',
  shoulders: 'hombros',
  traps: 'trapecios',
  triceps: 'tríceps',
  upperarms: 'brazos',
  upperback: 'espalda alta',
  waist: 'cintura',
}

const MUSCLE_TRANSLATIONS: Record<string, string> = {
  ...BODY_PART_TRANSLATIONS,
  biceps: 'bíceps',
  brachialis: 'braquial',
  delts: 'deltoides',
  erectorspinae: 'erectores espinales',
  obliques: 'oblicuos',
}

const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  assisted: 'asistido',
  band: 'banda elástica',
  barbell: 'barra',
  bench: 'banco',
  bodyweight: 'peso corporal',
  bosu: 'bosu',
  cable: 'polea',
  dumbbell: 'mancuerna',
  ezbarbell: 'barra EZ',
  kettlebell: 'kettlebell',
  leveragemachine: 'máquina de palanca',
  machine: 'máquina',
  mat: 'colchoneta',
  medicineball: 'balón medicinal',
  olympicbarbell: 'barra olímpica',
  resistanceband: 'banda elástica',
  roller: 'foam roller',
  rope: 'cuerda',
  smithmachine: 'máquina Smith',
  stabilityball: 'fitball',
  trapbar: 'barra hexagonal',
  weighted: 'lastrado',
}

const EXERCISE_TYPE_TRANSLATIONS: Record<string, string> = {
  cardio: 'cardio',
  olympiclifting: 'levantamiento olímpico',
  plyometrics: 'pliometría',
  powerlifting: 'powerlifting',
  stretching: 'movilidad y estiramientos',
  strength: 'fuerza',
  strongman: 'strongman',
}

const SPANISH_EXERCISE_SEARCH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\belevaciones?\s+laterales?\b/gi, 'lateral raise'],
  [/\belevacion\s+lateral\b/gi, 'lateral raise'],
  [/\bpress\s+militar\b/gi, 'shoulder press'],
  [/\bsentadillas?\s+con\s+salto\b/gi, 'jump squat'],
  [/\bsentadillas?\b/gi, 'squat'],
  [/\bflexiones?\b/gi, 'push up'],
  [/\bdominadas?\b/gi, 'pull up'],
  [/\bzancadas?\b/gi, 'lunge'],
  [/\bplanchas?\b/gi, 'plank'],
  [/\bescaladores?\b/gi, 'mountain climber'],
  [/\babdominales?\b/gi, 'sit up'],
  [/\bcurl\s+de\s+biceps\b/gi, 'biceps curl'],
  [/\bpeso\s+muerto\b/gi, 'deadlift'],
  [/\bremo\b/gi, 'row'],
  [/\bgemelos?\b/gi, 'calf raise'],
  [/\bsprint\s+en\s+el\s+sitio\b/gi, 'run in place'],
  [/\bcarrera\s+en\s+el\s+sitio\b/gi, 'run in place'],
]

const GENERIC_SEARCH_WORDS = new Set([
  'hombro',
  'hombros',
  'shoulder',
  'shoulders',
  'pecho',
  'chest',
  'espalda',
  'back',
  'pierna',
  'piernas',
  'leg',
  'legs',
  'brazo',
  'brazos',
  'arm',
  'arms',
  'abdomen',
  'abs',
  'gluteo',
  'gluteos',
  'glute',
  'glutes',
])

function normalizeKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function toTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseNullableString(value: unknown) {
  const parsed = toTrimmedString(value)
  return parsed || null
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  return values.filter((item) => {
    const key = normalizeKey(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toStringArray(value: unknown) {
  if (typeof value === 'string') return uniqueStrings([cleanText(value)].filter(Boolean))
  if (!Array.isArray(value)) return []
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => cleanText(item))
      .filter(Boolean)
  )
}

function titleCaseSpanish(value: string) {
  const lower = value.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function translateMappedValue(value: string, dictionary: Record<string, string>) {
  const key = normalizeKey(value)
  const translated = dictionary[key]
  if (translated) return translated
  return titleCaseSpanish(cleanText(value.replace(/[_-]+/g, ' ')))
}

function translateArray(values: string[], dictionary: Record<string, string>) {
  return uniqueStrings(values.map((item) => translateMappedValue(item, dictionary)).filter(Boolean))
}

function buildExerciseImageUrl(exerciseId: string, resolution = 180) {
  return `/api/play-maker/exercise-image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${resolution}`
}

function applySearchReplacements(value: string) {
  return SPANISH_EXERCISE_SEARCH_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value
  )
}

function normalizeSearchCandidate(value: string) {
  return cleanText(value)
    .replace(/[,_/]+/g, ' ')
    .replace(/\braises\b/gi, 'raise')
    .replace(/\bpushups\b/gi, 'push up')
    .replace(/\bpullups\b/gi, 'pull up')
    .replace(/\bsitups\b/gi, 'sit up')
    .split(/\s+/)
    .filter((word) => word && !GENERIC_SEARCH_WORDS.has(normalizeKey(word)))
    .join(' ')
    .trim()
}

async function translateSearchQueryToEnglish(value: string) {
  const input = cleanText(value)
  if (!input) return ''
  const key = input.toLowerCase()
  if (searchTranslationCache.has(key)) return searchTranslationCache.get(key) as string

  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', 'auto')
    url.searchParams.set('tl', 'en')
    url.searchParams.set('dt', 't')
    url.searchParams.set('q', input)

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json,text/plain,*/*',
      },
      next: { revalidate: 60 * 60 * 24 * 14 },
    })

    if (!response.ok) {
      searchTranslationCache.set(key, input)
      return input
    }

    const data = (await response.json()) as unknown
    const translated = Array.isArray(data) && Array.isArray(data[0])
      ? data[0]
          .map((item) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
          .join('')
          .trim()
      : ''

    const result = translated || input
    searchTranslationCache.set(key, result)
    return result
  } catch {
    searchTranslationCache.set(key, input)
    return input
  }
}

async function buildSearchCandidates(query: string) {
  const original = cleanText(query)
  const replaced = applySearchReplacements(original)
  const translated = await translateSearchQueryToEnglish(replaced)
  const normalized = normalizeSearchCandidate(translated)
  const replacedNormalized = normalizeSearchCandidate(replaced)
  const originalNormalized = normalizeSearchCandidate(original)

  const baseCandidates = uniqueStrings([
    normalized,
    replacedNormalized,
    originalNormalized,
    normalized.replace(/\blateral raise\b/i, 'dumbbell lateral raise'),
    normalized.replace(/\blateral raise\b/i, 'cable lateral raise'),
  ].filter(Boolean))

  return baseCandidates
}

function splitIntoSentences(value: string) {
  return value
    .split(/\r?\n+/)
    .map((item) => cleanText(item))
    .filter(Boolean)
}

async function translateText(value: string) {
  const input = cleanText(value)
  if (!input) return ''
  const key = input.toLowerCase()
  if (translationCache.has(key)) return translationCache.get(key) as string

  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', 'en')
    url.searchParams.set('tl', 'es')
    url.searchParams.set('dt', 't')
    url.searchParams.set('q', input)

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json,text/plain,*/*',
      },
      next: { revalidate: 60 * 60 * 24 * 14 },
    })

    if (!response.ok) {
      translationCache.set(key, input)
      return input
    }

    const data = (await response.json()) as unknown
    const translated = Array.isArray(data) && Array.isArray(data[0])
      ? data[0]
          .map((item) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
          .join('')
          .trim()
      : ''

    const result = translated || input
    translationCache.set(key, result)
    return result
  } catch {
    translationCache.set(key, input)
    return input
  }
}

async function translateLines(values: string[]) {
  const translated = await Promise.all(values.map((item) => translateText(item)))
  return uniqueStrings(translated.map((item) => cleanText(item)).filter(Boolean))
}

function parseRelatedExercises(value: unknown): ExerciseDbRelatedExercise[] {
  if (!Array.isArray(value)) return []

  const related = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const payload = item as Record<string, unknown>
      const exerciseId = toTrimmedString(payload.exerciseId)
      const name = toTrimmedString(payload.name)
      if (!exerciseId || !name) return null
      return { exerciseId, name }
    })
    .filter((item): item is ExerciseDbRelatedExercise => Boolean(item))

  const seen = new Set<string>()
  return related.filter((item) => {
    const key = `${item.exerciseId}:${normalizeKey(item.name)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pickArray(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toStringArray(payload[key])
    if (value.length > 0) return value
  }
  return []
}

function pickString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toTrimmedString(payload[key])
    if (value) return value
  }
  return ''
}

function pickNullableString(payload: Record<string, unknown>, keys: string[]) {
  const value = pickString(payload, keys)
  return value || null
}

async function fetchExerciseDbJson(pathname: string, searchParams?: Record<string, string>) {
  if (!EXERCISEDB_KEY) {
    throw new Error(getExerciseDbConfigError())
  }

  const url = new URL(pathname, EXERCISEDB_BASE_URL)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) {
        url.searchParams.set(key, value)
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': EXERCISEDB_KEY,
      'X-RapidAPI-Host': EXERCISEDB_HOST,
      Accept: 'application/json',
    },
    next: { revalidate: 60 * 60 * 6 },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `ExerciseDB respondió con estado ${response.status}.`)
  }

  return (await response.json()) as unknown
}

function extractDataArray(payload: unknown) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && Array.isArray((payload as { value?: unknown[] }).value)) {
    return (payload as { value: unknown[] }).value
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: unknown[] }).data
  }
  return []
}

function extractDataObject(payload: unknown) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const objectPayload = payload as Record<string, unknown>
    if (objectPayload.data && typeof objectPayload.data === 'object' && !Array.isArray(objectPayload.data)) {
      return objectPayload.data as Record<string, unknown>
    }
    return objectPayload
  }
  return null
}

async function translateDetail(payload: Record<string, unknown>): Promise<ExerciseDbEnrichment | null> {
  const exerciseId = pickString(payload, ['exerciseId', 'id'])
  const rawName = pickString(payload, ['name'])
  if (!exerciseId || !rawName) return null

  const rawOverview = pickString(payload, ['overview', 'description'])
  const rawInstructions = pickArray(payload, ['instructions', 'howTo'])
  const rawTips = pickArray(payload, ['exerciseTips', 'tips'])
  const rawVariations = pickArray(payload, ['variations'])
  const rawKeywords = pickArray(payload, ['keywords'])
  const rawBodyParts = pickArray(payload, ['bodyParts', 'bodyPart'])
  const rawTargetMuscles = pickArray(payload, ['targetMuscles', 'target'])
  const rawSecondaryMuscles = pickArray(payload, ['secondaryMuscles'])
  const rawEquipments = pickArray(payload, ['equipments', 'equipment'])
  const rawExerciseType = pickNullableString(payload, ['exerciseType', 'type', 'category'])

  const [name, overview, instructions, exerciseTips, variations, keywords] = await Promise.all([
    translateText(rawName),
    rawOverview ? translateText(rawOverview) : Promise.resolve(DEFAULT_OVERVIEW),
    rawInstructions.length > 0 ? translateLines(rawInstructions) : Promise.resolve([DEFAULT_INSTRUCTIONS]),
    rawTips.length > 0 ? translateLines(rawTips) : Promise.resolve([DEFAULT_TIPS]),
    rawVariations.length > 0 ? translateLines(rawVariations) : Promise.resolve([DEFAULT_VARIATIONS]),
    rawKeywords.length > 0 ? translateLines(rawKeywords) : Promise.resolve([]),
  ])

  const bodyParts = rawBodyParts.length > 0 ? translateArray(rawBodyParts, BODY_PART_TRANSLATIONS) : []
  const targetMuscles = rawTargetMuscles.length > 0 ? translateArray(rawTargetMuscles, MUSCLE_TRANSLATIONS) : []
  const secondaryMuscles = rawSecondaryMuscles.length > 0 ? translateArray(rawSecondaryMuscles, MUSCLE_TRANSLATIONS) : []
  const equipments = rawEquipments.length > 0 ? translateArray(rawEquipments, EQUIPMENT_TRANSLATIONS) : [DEFAULT_EQUIPMENT]

  const relatedExercises = parseRelatedExercises(payload.relatedExercises)

  return {
    source: 'exercisedb',
    exerciseId,
    name,
    overview: overview || DEFAULT_OVERVIEW,
    instructions: instructions.length > 0 ? instructions : [DEFAULT_INSTRUCTIONS],
    imageUrl: parseNullableString(payload.imageUrl ?? payload.image),
    gifUrl: parseNullableString(payload.gifUrl ?? payload.gif) ?? buildExerciseImageUrl(exerciseId),
    videoUrl: parseNullableString(payload.videoUrl),
    bodyParts,
    targetMuscles,
    secondaryMuscles,
    equipments,
    exerciseType: rawExerciseType ? translateMappedValue(rawExerciseType, EXERCISE_TYPE_TRANSLATIONS) : null,
    exerciseTips: exerciseTips.length > 0 ? exerciseTips : [DEFAULT_TIPS],
    variations: variations.length > 0 ? variations : [DEFAULT_VARIATIONS],
    keywords,
    relatedExercises: relatedExercises.map((item) => ({
      exerciseId: item.exerciseId,
      name: item.name,
    })),
  }
}

function buildSearchSubtitle(input: {
  targetMuscles: string[]
  equipments: string[]
  exerciseType: string | null
  overview: string
}) {
  const pieces = [input.targetMuscles.join(', '), input.equipments.join(', '), input.exerciseType].filter(Boolean)
  if (pieces.length > 0) return pieces.join(' · ')
  return input.overview || DEFAULT_OVERVIEW
}

export function getExerciseDbConfigError() {
  return 'Falta configurar EXERCISEDB_RAPIDAPI_KEY para conectar ExerciseDB.'
}

export async function searchExerciseCatalog(query: string): Promise<ExerciseCatalogSearchResult[]> {
  const normalizedQuery = cleanText(query)
  if (normalizedQuery.length < 2) return []

  const cacheKey = normalizedQuery.toLowerCase()
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey) as ExerciseCatalogSearchResult[]

  const candidates = await buildSearchCandidates(normalizedQuery)
  let rows: unknown[] = []
  for (const candidate of candidates) {
    const payload = await fetchExerciseDbJson(`/exercises/name/${encodeURIComponent(candidate)}`, {
      limit: '8',
    })
    rows = extractDataArray(payload)
    if (rows.length > 0) break
  }

  const mapped: ExerciseCatalogSearchResult[] = (
    await Promise.all(
      rows.map(async (row): Promise<ExerciseCatalogSearchResult | null> => {
        if (!row || typeof row !== 'object') return null
        const detail = await translateDetail(row as Record<string, unknown>)
        if (!detail) return null

        return {
          source: 'exercisedb',
          exerciseId: detail.exerciseId,
          localId: null,
          name: detail.name,
          subtitle: buildSearchSubtitle({
            targetMuscles: detail.targetMuscles,
            equipments: detail.equipments[0] === DEFAULT_EQUIPMENT ? [] : detail.equipments,
            exerciseType: detail.exerciseType,
            overview: detail.overview,
          }),
          imageUrl: detail.gifUrl ?? detail.imageUrl,
          bodyParts: detail.bodyParts,
          targetMuscles: detail.targetMuscles,
          equipments: detail.equipments[0] === DEFAULT_EQUIPMENT ? [] : detail.equipments,
          exerciseType: detail.exerciseType,
        } satisfies ExerciseCatalogSearchResult
      })
    )
  ).filter((item): item is NonNullable<typeof item> => Boolean(item))

  searchCache.set(cacheKey, mapped)
  return mapped
}

export async function getExerciseCatalogDetailById(exerciseId: string): Promise<ExerciseDbEnrichment | null> {
  const normalizedId = toTrimmedString(exerciseId)
  if (!normalizedId) return null
  if (detailCache.has(normalizedId)) return detailCache.get(normalizedId) as ExerciseDbEnrichment

  const payload = await fetchExerciseDbJson(`/exercises/exercise/${encodeURIComponent(normalizedId)}`)
  const objectPayload = extractDataObject(payload)
  if (!objectPayload) return null

  const detail = await translateDetail(objectPayload)
  if (!detail) return null
  detailCache.set(normalizedId, detail)
  return detail
}

export async function findExerciseCatalogDetailByName(name: string): Promise<ExerciseDbEnrichment | null> {
  const normalizedName = cleanText(name)
  if (!normalizedName) return null

  const matches = await searchExerciseCatalog(normalizedName)
  const exact = matches.find((item) => normalizeKey(item.name) === normalizeKey(normalizedName)) ?? matches[0]
  if (exact?.exerciseId) {
    const detail = await getExerciseCatalogDetailById(exact.exerciseId)
    if (detail) return detail
  }

  const candidates = await buildSearchCandidates(normalizedName)
  let rows: unknown[] = []
  for (const candidate of candidates) {
    const payload = await fetchExerciseDbJson(`/exercises/name/${encodeURIComponent(candidate)}`, {
      limit: '5',
    })
    rows = extractDataArray(payload)
    if (rows.length > 0) break
  }

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const detail = await translateDetail(row as Record<string, unknown>)
    if (!detail) continue
    if (normalizeKey(detail.name) === normalizeKey(normalizedName)) {
      detailCache.set(detail.exerciseId, detail)
      return detail
    }
  }

  if (rows[0] && typeof rows[0] === 'object') {
    const fallback = await translateDetail(rows[0] as Record<string, unknown>)
    if (fallback) {
      detailCache.set(fallback.exerciseId, fallback)
      return fallback
    }
  }

  return null
}

export async function enrichDraftWithExerciseDb(draftInput: RoutineEditorDraft): Promise<RoutineEditorDraft> {
  const draft = normalizeRoutineDraft(draftInput)

  const blocks = await Promise.all(
    draft.blocks.map(async (block) => {
      if (block.exerciseData?.exerciseId) return block
      if (!block.name.trim()) return block

      try {
        const detail = await findExerciseCatalogDetailByName(block.name)
        return detail ? mergeRoutineBlockWithExerciseData(block, detail) : block
      } catch {
        return block
      }
    })
  )

  const exerciseMediaUrls = blocks
    .map((block) => block.exerciseData?.gifUrl ?? block.exerciseData?.imageUrl ?? null)
    .filter((item): item is string => Boolean(item))

  return {
    ...draft,
    blocks,
    imageUrls: Array.from(new Set([...exerciseMediaUrls, ...draft.imageUrls])),
  }
}
