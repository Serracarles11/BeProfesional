
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
  [/\bpress\s+de\s+hombros?\b/gi, 'shoulder press'],
  [/\bsentadillas?\s+con\s+salto\b/gi, 'jump squat'],
  [/\bsentadillas?\b/gi, 'squat'],
  [/\bflexiones?\b/gi, 'push up'],
  [/\bdominadas?\b/gi, 'pull up'],
  [/\bzancadas?\b/gi, 'lunge'],
  [/\bzancadas?\s+con\s+salto\b/gi, 'jumping lunge'],
  [/\bplanchas?\b/gi, 'plank'],
  [/\bescaladores?\b/gi, 'mountain climber'],
  [/\babdominales?\b/gi, 'sit up'],
  [/\bcrunch(?:es)?\b/gi, 'crunch'],
  [/\bcrunch\s+bicicleta\b/gi, 'bicycle crunch'],
  [/\bbicicleta\s+abdominal\b/gi, 'bicycle crunch'],
  [/\belevaciones?\s+de\s+piernas?\b/gi, 'leg raise'],
  [/\bcurl\s+de\s+biceps\b/gi, 'biceps curl'],
  [/\bpeso\s+muerto\b/gi, 'deadlift'],
  [/\bremo\b/gi, 'row'],
  [/\bgemelos?\b/gi, 'calf raise'],
  [/\bpuente\s+de\s+gluteos?\b/gi, 'glute bridge'],
  [/\bhip\s+thrust\b/gi, 'hip thrust'],
  [/\bsalto(?:s)?\s+de\s+tijera\b/gi, 'jumping jack'],
  [/\bjumping\s+jacks?\b/gi, 'jumping jack'],
  [/\bburpees?\b/gi, 'burpee'],
  [/\bskaters?\b/gi, 'skater'],
  [/\bsaltos?\s+laterales?\b/gi, 'side hop'],
  [/\bdesplazamientos?\s+laterales?\b/gi, 'side shuffle'],
  [/\brodillas?\s+arriba\b/gi, 'high knee'],
  [/\bhigh\s+knees?\b/gi, 'high knee'],
  [/\bstep\s*ups?\b/gi, 'step up'],
  [/\bsubidas?\s+al\s+banco\b/gi, 'step up'],
  [/\bwall\s+sit\b/gi, 'wall sit'],
  [/\bsentadilla\s+isometrica\b/gi, 'wall sit'],
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

const IMAGE_EXTENSION_REGEX = /\.(gif|png|jpe?g|webp|svg|bmp|avif)(\?.*)?$/i
const GIF_EXTENSION_REGEX = /\.gif(\?.*)?$/i
const URL_PATH_HINTS = ['/image', '/images', '/img', '/uploads', '/static', '/assets', '/media', '/photo', '/cdn-cgi/image']

function isImageExtension(value: string) {
  return IMAGE_EXTENSION_REGEX.test(value)
}

function isUrlLike(value: string) {
  if (!value) return false
  if (/^https?:\/\//i.test(value)) return true
  if (/^data:image\//i.test(value)) return true
  if (value.startsWith('//')) return true
  if (value.startsWith('/api/')) return true
  const lower = value.toLowerCase()
  if (URL_PATH_HINTS.some((hint) => lower.includes(hint)) && !lower.startsWith(' ')) return true
  if (isImageExtension(value)) return true
  return false
}

const MEDIA_KEY_HINTS = [
  'image', 'images', 'img',
  'thumbnail', 'thumb', 'thumbnailurl', 'thumburl',
  'imageurl', 'imagepath', 'imagesrc',
  'gif', 'gifurl', 'animation', 'animationurl',
  'media', 'mediaurl',
  'video', 'videourl',
  'exerciseimage', 'photo', 'photos', 'picture', 'pictures',
  'icon', 'asset', 'assets', 'preview', 'cover', 'coverimage',
  'urls', 'files', 'url', 'src', 'href',
]

function keyHintScore(normalizedKey: string) {
  if (!normalizedKey) return 0
  let score = 0
  if (normalizedKey.includes('gif') || normalizedKey.includes('animation')) score += 60
  if (normalizedKey.includes('hires') || normalizedKey.includes('large') || normalizedKey.includes('original')) score += 12
  if (normalizedKey.includes('image') || normalizedKey.includes('img')) score += 30
  if (normalizedKey.includes('photo') || normalizedKey.includes('picture')) score += 28
  if (normalizedKey.includes('cover')) score += 22
  if (normalizedKey.includes('media') || normalizedKey.includes('asset') || normalizedKey.includes('preview')) score += 18
  if (normalizedKey.includes('exerciseimage')) score += 35
  if (normalizedKey.includes('thumb')) score += 8
  if (normalizedKey.includes('icon')) score -= 10
  if (normalizedKey === 'url' || normalizedKey === 'urls' || normalizedKey === 'src' || normalizedKey === 'href' || normalizedKey === 'file' || normalizedKey === 'files') score += 4
  if (normalizedKey.includes('video') && !normalizedKey.includes('image')) score -= 5
  return score
}

function valueScore(value: string) {
  let score = 0
  if (GIF_EXTENSION_REGEX.test(value)) score += 60
  else if (isImageExtension(value)) score += 25
  if (/(?:^|[/?&])(?:resolution|size|width|height)=([0-9]{3,4})/i.test(value)) score += 6
  if (/\b(360|480|512|720|1080)\b/.test(value)) score += 4
  if (/\b(48|64|72|96)\b/.test(value)) score -= 4
  return score
}

function isMediaCandidate(normalizedKey: string, value: string) {
  if (!normalizedKey) return isImageExtension(value)
  for (const hint of MEDIA_KEY_HINTS) {
    if (normalizedKey.includes(hint)) return true
  }
  return isImageExtension(value)
}

type MediaCandidate = { key: string; normalizedKey: string; value: string; score: number; isGif: boolean }

function collectMediaCandidates(value: unknown, parentKey = '', visited = new WeakSet<object>()): MediaCandidate[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (!isUrlLike(trimmed) && !isImageExtension(trimmed)) return []
    const fullNormalizedKey = normalizeKey(parentKey)
    if (!isMediaCandidate(fullNormalizedKey, trimmed)) return []
    const score = keyHintScore(fullNormalizedKey) + valueScore(trimmed)
    const isGif = fullNormalizedKey.includes('gif') || fullNormalizedKey.includes('animation') || GIF_EXTENSION_REGEX.test(trimmed)
    return [{ key: parentKey, normalizedKey: fullNormalizedKey, value: trimmed, score, isGif }]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMediaCandidates(item, parentKey, visited))
  }

  if (!value || typeof value !== 'object') return []
  if (visited.has(value as object)) return []
  visited.add(value as object)

  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
    const combinedKey = parentKey ? `${parentKey}.${key}` : key
    return collectMediaCandidates(item, combinedKey, visited)
  })
}

function dedupeCandidates(candidates: MediaCandidate[]) {
  const seen = new Map<string, MediaCandidate>()
  for (const candidate of candidates) {
    const existing = seen.get(candidate.value)
    if (!existing || existing.score < candidate.score) seen.set(candidate.value, candidate)
  }
  return [...seen.values()].sort((left, right) => right.score - left.score)
}

const EXERCISEDB_DEBUG = process.env.EXERCISEDB_DEBUG_IMAGES === '1'

function logImageDiagnostics(payload: Record<string, unknown>, candidates: MediaCandidate[], picked: { gif: string | null; image: string | null }) {
  if (!EXERCISEDB_DEBUG) return
  const exerciseId = pickString(payload, ['exerciseId', 'id']) || '(sin id)'
  const name = pickString(payload, ['name']) || '(sin nombre)'
  if (candidates.length === 0) {
    console.warn('[exercise-image] sin candidatos', { exerciseId, name, keys: Object.keys(payload) })
    return
  }
  console.info('[exercise-image] candidatos', {
    exerciseId,
    name,
    total: candidates.length,
    top: candidates.slice(0, 5).map((candidate) => ({ key: candidate.key, score: candidate.score, value: candidate.value })),
    picked,
  })
}

function pickBestMediaUrl(payload: Record<string, unknown>, preferred: 'gif' | 'image') {
  const candidates = dedupeCandidates(collectMediaCandidates(payload))
  if (candidates.length === 0) {
    logImageDiagnostics(payload, candidates, { gif: null, image: null })
    return null
  }

  const gifCandidate = candidates.find((candidate) => candidate.isGif) ?? null
  const imageCandidate = candidates.find((candidate) => !candidate.isGif) ?? null

  const result = preferred === 'gif'
    ? gifCandidate?.value ?? imageCandidate?.value ?? candidates[0]?.value ?? null
    : imageCandidate?.value ?? gifCandidate?.value ?? candidates[0]?.value ?? null

  logImageDiagnostics(payload, candidates, { gif: gifCandidate?.value ?? null, image: imageCandidate?.value ?? null })
  return result
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

function buildExerciseImageUrl(exerciseId: string, resolution = 360) {
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
    translated,
    replaced,
    original,
    normalized,
    replacedNormalized,
    originalNormalized,
    normalized.replace(/\blateral raise\b/i, 'dumbbell lateral raise'),
    normalized.replace(/\blateral raise\b/i, 'cable lateral raise'),
    normalized.replace(/\bpush up\b/i, 'push-up'),
    normalized.replace(/\bpull up\b/i, 'pull-up'),
    normalized.replace(/\bjumping jack\b/i, 'jumping jacks'),
    normalized.replace(/\bmountain climber\b/i, 'mountain climbers'),
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
  const imageUrl = pickBestMediaUrl(payload, 'image')
  const gifUrl = pickBestMediaUrl(payload, 'gif') ?? buildExerciseImageUrl(exerciseId)

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
    imageUrl,
    gifUrl,
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

function scoreExerciseMatch(query: string, detail: ExerciseDbEnrichment) {
  const queryKey = normalizeKey(query)
  const nameKey = normalizeKey(detail.name)
  if (!queryKey || !nameKey) return 0
  if (queryKey === nameKey) return 100
  if (nameKey.includes(queryKey) || queryKey.includes(nameKey)) return 80

  const queryWords = new Set(
    cleanText(query)
      .toLowerCase()
      .split(/\s+/)
      .map((word) => normalizeKey(word))
      .filter(Boolean)
  )
  const detailWords = new Set(
    [detail.name, ...detail.keywords, ...detail.targetMuscles, ...detail.equipments, detail.exerciseType ?? '']
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .map((word) => normalizeKey(word))
      .filter(Boolean)
  )

  let overlap = 0
  queryWords.forEach((word) => {
    if (detailWords.has(word)) overlap += 1
  })

  return overlap * 10 + (detail.gifUrl ? 4 : 0) + (detail.imageUrl ? 2 : 0)
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

const MIN_MATCH_SCORE = 25

export async function findExerciseCatalogDetailByName(name: string): Promise<ExerciseDbEnrichment | null> {
  const normalizedName = cleanText(name)
  if (!normalizedName) return null

  const matches = await searchExerciseCatalog(normalizedName)
  const exactMatch = matches.find((item) => normalizeKey(item.name) === normalizeKey(normalizedName))
  if (exactMatch?.exerciseId) {
    const detail = await getExerciseCatalogDetailById(exactMatch.exerciseId)
    if (detail) return detail
  }

  const candidates = await buildSearchCandidates(normalizedName)
  const details: ExerciseDbEnrichment[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const payload = await fetchExerciseDbJson(`/exercises/name/${encodeURIComponent(candidate)}`, {
      limit: '8',
    })
    const rows = extractDataArray(payload)
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      const detail = await translateDetail(row as Record<string, unknown>)
      if (!detail || seen.has(detail.exerciseId)) continue
      seen.add(detail.exerciseId)
      if (normalizeKey(detail.name) === normalizeKey(normalizedName)) {
        detailCache.set(detail.exerciseId, detail)
        return detail
      }
      details.push(detail)
    }
  }

  for (const match of matches) {
    if (!match.exerciseId || seen.has(match.exerciseId)) continue
    const detail = await getExerciseCatalogDetailById(match.exerciseId).catch(() => null)
    if (!detail) continue
    seen.add(detail.exerciseId)
    details.push(detail)
  }

  if (details.length === 0) return null

  const ranked = [...details]
    .map((detail) => ({ detail, score: scoreExerciseMatch(normalizedName, detail) }))
    .sort((left, right) => right.score - left.score)
  const best = ranked[0]

  if (!best || best.score < MIN_MATCH_SCORE) {
    if (process.env.EXERCISEDB_DEBUG_IMAGES === '1') {
      console.warn('[exercise-image] match descartado por baja relevancia', {
        query: normalizedName,
        bestScore: best?.score ?? null,
        bestName: best?.detail.name ?? null,
        threshold: MIN_MATCH_SCORE,
      })
    }
    return null
  }

  const hydrated = await getExerciseCatalogDetailById(best.detail.exerciseId).catch(() => null)
  const detail = hydrated ?? best.detail
  detailCache.set(detail.exerciseId, detail)
  return detail
}

async function findExerciseCatalogDetailForBlock(block: RoutineEditorDraft['blocks'][number]) {
  const instructionHints = splitIntoSentences(block.instructions)
    .map((line) => line.replace(/^(realizar|hacer|ejecutar|completar)\s+/i, '').replace(/\s+durante\s+.+$/i, '').trim())
    .filter((line) => line.length >= 3 && line.length <= 60)

  const queries = uniqueStrings([
    block.name,
    ...instructionHints,
    block.purpose,
    block.progression,
  ].map((item) => cleanText(item)).filter(Boolean)).slice(0, 4)

  for (const query of queries) {
    const detail = await findExerciseCatalogDetailByName(query)
    if (detail) return detail
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
        const detail = await findExerciseCatalogDetailForBlock(block)
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
