import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { enrichDraftWithExerciseDb, searchExerciseCatalog } from '@/lib/exercisedb'
import { getServerOpenAiConfig, getServerOpenAiKeyError } from '@/lib/openai-server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { buildRoutineDetails, buildRoutineSummary, normalizeRoutineDetailText, normalizeRoutineDraft, splitRoutineDetailText, type RoutineEditorBlock, type RoutineEditorDraft, type RoutineExerciseRow } from '@/lib/playmaker/routines'
import { extractRawResponseText, formatOpenAiError, getModelName, getTemperature, isReasoningModel } from '@/lib/playmaker/server-ai'

type RequestBody = {
  equipoId?: unknown
  prompt?: unknown
  currentDraft?: unknown
  messages?: unknown
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ExerciseDbPreviewItem = {
  name: string
  subtitle: string
  imageUrl: string | null
  bodyParts: string[]
  targetMuscles: string[]
  equipments: string[]
}

const AI_ROUTINE_MAX_OUTPUT_TOKENS = 6000

const EXERCISE_DB_QUERY_HINTS = [
  'sentadilla con salto',
  'sentadilla',
  'flexiones',
  'dominadas',
  'zancadas',
  'plancha',
  'escaladores',
  'abdominales',
  'peso muerto',
  'remo',
  'gemelos',
  'burpees',
  'jumping jacks',
  'mountain climbers',
  'squat',
  'push up',
  'pull up',
  'lunge',
  'plank',
  'deadlift',
  'row',
]

const AI_ROUTINE_JSON_SCHEMA = {
  name: 'playmaker_ai_routine',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      assistantMessage: { type: 'string' },
      draft: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          objective: { type: 'string' },
          trainingCategory: { type: 'string', enum: ['FUERZA', 'POTENCIA', 'RESISTENCIA', 'RECUPERACION'] },
          targetGroup: { type: 'string' },
          playerCount: { type: 'string' },
          phases: { type: 'array', items: { type: 'string' } },
          origin: { type: 'string', enum: ['ai'] },
          imageUrls: { type: 'array', items: { type: 'string' } },
          blocks: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                phase: { type: 'string' },
                name: { type: 'string' },
                duration: { type: 'string' },
                sets: { type: 'string' },
                reps: { type: 'string' },
                rest: { type: 'string' },
                load: { type: 'string' },
                purpose: { type: 'string' },
                setup: { type: 'string' },
                instructions: { type: 'string' },
                coachingPoints: { type: 'array', items: { type: 'string' } },
                progression: { type: 'string' },
                notes: { type: 'string' },
              },
              required: ['id', 'phase', 'name', 'duration', 'sets', 'reps', 'rest', 'load', 'purpose', 'setup', 'instructions', 'coachingPoints', 'progression', 'notes'],
            },
          },
        },
        required: ['title', 'objective', 'trainingCategory', 'targetGroup', 'playerCount', 'phases', 'origin', 'imageUrls', 'blocks'],
      },
    },
    required: ['assistantMessage', 'draft'],
  },
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const payload = item as Record<string, unknown>
      const role = payload.role === 'assistant' ? 'assistant' : payload.role === 'user' ? 'user' : null
      const content = typeof payload.content === 'string' ? payload.content.trim() : ''
      if (!role || !content) return null
      return { role, content }
    })
    .filter((item): item is ChatMessage => Boolean(item))
    .slice(-12)
}

function normalizeComparableText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function uniqueByNormalizedText(values: string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = normalizeComparableText(value).replace(/[^a-z0-9]+/g, ' ').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildExerciseDbQueries(prompt: string, currentDraft: RoutineEditorDraft) {
  const normalizedPrompt = normalizeComparableText(prompt)
  const hintedExercises = EXERCISE_DB_QUERY_HINTS.filter((hint) =>
    normalizedPrompt.includes(normalizeComparableText(hint))
  )
  const blockNames = currentDraft.blocks.map((block) => block.name.trim()).filter(Boolean)

  return uniqueByNormalizedText([...blockNames, ...hintedExercises]).slice(0, 5)
}

async function buildExerciseDbPreview(prompt: string, currentDraft: RoutineEditorDraft): Promise<ExerciseDbPreviewItem[]> {
  const queries = buildExerciseDbQueries(prompt, currentDraft)
  if (queries.length === 0) return []

  try {
    const results = await Promise.all(queries.map((query) => searchExerciseCatalog(query).catch(() => [])))
    const seen = new Set<string>()
    return results
      .flat()
      .filter((item) => {
        const key = item.exerciseId || normalizeComparableText(item.name)
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 8)
      .map((item) => ({
        name: item.name,
        subtitle: item.subtitle,
        imageUrl: item.imageUrl,
        bodyParts: item.bodyParts,
        targetMuscles: item.targetMuscles,
        equipments: item.equipments,
      }))
  } catch {
    return []
  }
}

async function validateMembership(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  equipoId: string
) {
  const membershipResult = await supabase
    .from('miembros_equipo')
    .select('usuario_id, rol, equipo:equipos(id, nombre, categoria, temporada)')
    .eq('usuario_id', userId)
    .eq('equipo_id', equipoId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  return membershipResult.data as
    | {
        usuario_id: string
        rol: string | null
        equipo:
          | {
              id: string
              nombre: string
              categoria: string | null
              temporada: string | null
            }
          | {
              id: string
              nombre: string
              categoria: string | null
              temporada: string | null
            }[]
          | null
      }
    | null
}

function normalizeTeam(value: Awaited<ReturnType<typeof validateMembership>>) {
  if (!value?.equipo) return null
  return Array.isArray(value.equipo) ? value.equipo[0] ?? null : value.equipo
}

function sanitizeAssistantMessage(value: unknown) {
  if (typeof value !== 'string') return 'He actualizado la rutina con tus indicaciones.'
  const trimmed = value.trim()
  return trimmed || 'He actualizado la rutina con tus indicaciones.'
}

function parseSpanishCount(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'una' || normalized === 'uno') return 1
  if (normalized === 'dos') return 2
  if (normalized === 'tres') return 3
  if (normalized === 'cuatro') return 4
  if (normalized === 'cinco') return 5
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null
}

function extractRestSeconds(value: string) {
  const match = value.match(/descans\w*\s+(\d+(?:[.,]\d+)?)\s*(?:''|"|s|seg|segundos?)/i)
  if (!match?.[1]) return ''
  const seconds = Number(match[1].replace(',', '.'))
  return Number.isFinite(seconds) && seconds > 0 ? String(Math.round(seconds)) : ''
}

function extractRounds(value: string) {
  const match = value.match(/(?:completar|hacer|realizar)?\s*(\d+|una|uno|dos|tres|cuatro|cinco)\s+rondas?/i)
  if (!match?.[1]) return ''
  const rounds = parseSpanishCount(match[1])
  return rounds ? String(rounds) : ''
}

function extractActivityParts(value: string) {
  const withoutNumber = value.replace(/^\d+[.)]\s*/, '').trim()
  const durationMatch = withoutNumber.match(/\s+(\d+(?:[.,]\d+)?)\s*(?:''|"|s|seg|segundos?|min|minutos?)\.?$/i)
  if (!durationMatch?.[0] || !durationMatch[1]) {
    return {
      name: withoutNumber.replace(/[.;]\s*$/, '').trim(),
      duration: '',
      durationText: '',
    }
  }

  const durationText = durationMatch[0].trim().replace(/\.$/, '')
  const rawAmount = Number(durationMatch[1].replace(',', '.'))
  const isMinutes = /min/i.test(durationText)
  const duration = Number.isFinite(rawAmount) && rawAmount > 0
    ? isMinutes
      ? String(rawAmount)
      : String(Math.max(0.5, Math.round((rawAmount / 60) * 10) / 10))
    : ''

  return {
    name: withoutNumber.slice(0, durationMatch.index).trim(),
    duration,
    durationText,
  }
}

function isSharedInstruction(value: string) {
  return /descans|ronda|completar|recuper/i.test(value)
}

function isActivityInstruction(value: string) {
  if (isSharedInstruction(value)) return false
  return /^\d+[.)]\s+/.test(value) || /\d+(?:[.,]\d+)?\s*(?:''|"|s|seg|segundos?|min|minutos?)\.?$/i.test(value)
}

function splitActivityListBlock(block: RoutineEditorBlock): RoutineEditorBlock[] {
  const items = splitRoutineDetailText(block.instructions)
  const activityItems = items.filter(isActivityInstruction)
  if (activityItems.length < 2) return [block]

  const sharedText = items.filter((item) => !isActivityInstruction(item)).join(' ')
  const rest = extractRestSeconds(sharedText) || block.rest
  const rounds = extractRounds(sharedText) || block.sets
  const sharedNotes = [block.notes, sharedText].map((item) => item.trim()).filter(Boolean).join('\n')

  return activityItems.map((item, index) => {
    const activity = extractActivityParts(item)
    const name = activity.name || `${block.name} ${index + 1}`

    return {
      ...block,
      id: `${block.id}-part-${index + 1}`,
      name,
      duration: activity.duration || block.duration,
      sets: rounds,
      reps: activity.durationText ? activity.durationText : block.reps,
      rest,
      purpose: block.purpose || `Trabajo especifico de ${name}.`,
      instructions: activity.durationText ? `Realizar ${name} durante ${activity.durationText}.` : `Realizar ${name}.`,
      notes: sharedNotes,
    }
  })
}

function buildContextPrompt(args: {
  team: { id: string; nombre: string; categoria: string | null; temporada: string | null } | null
  prompt: string
  currentDraft: RoutineEditorDraft
  messages: ChatMessage[]
  libraryPreview: Array<{ title: string; category: string; duration: number; objective: string }>
  exerciseDbPreview: ExerciseDbPreviewItem[]
  upcomingSessions: Array<{ titulo: string; tipo: string | null; fecha: string }>
}) {
  const { team, prompt, currentDraft, messages, libraryPreview, exerciseDbPreview, upcomingSessions } = args

  return JSON.stringify(
    {
      objetivo: currentDraft.blocks.length > 0 ? 'Refinar la rutina actual respetando su estructura y cambiando solo lo necesario.' : 'Generar una rutina completa y lista para guardar.',
      equipo: team,
      peticion_actual: prompt,
      conversacion_reciente: messages,
      borrador_actual: currentDraft,
      referencias_biblioteca: libraryPreview,
      referencias_exercisedb: exerciseDbPreview,
      proximos_entrenamientos: upcomingSessions,
      reglas: [
        'La respuesta debe ser una rutina completa, coherente y guardable.',
        'Si ya existe un borrador, manten la mayor parte estable y modifica solo lo necesario para cumplir la nueva peticion.',
        'La sesion debe incluir calentamiento, bloque principal y cierre si aplica.',
        'Cada ejercicio debe ser practico, claro y utilizable por un entrenador.',
        'No metas varias actividades dentro de un mismo campo instructions/Consignas. Si hay Jumping jacks, sentadillas, burpees u otras tareas, cada una debe ser un block independiente.',
        'Usa instructions para explicar solo el block actual, no para listar otros ejercicios.',
        'Separa calentamiento, bloque principal y cierre en blocks distintos, con phase clara para cada parte.',
        'Cuando referencias_exercisedb tenga resultados relevantes, prioriza esos nombres de ejercicio para que el backend pueda enriquecerlos con imagenes reales.',
        'No inventes imageUrls ni exerciseData: el backend los rellena despues con ExerciseDB.',
        'Usa trainingCategory solo entre FUERZA, POTENCIA, RESISTENCIA o RECUPERACION.',
        'El origen debe ser ai.',
      ],
    },
    null,
    2
  )
}

export async function POST(request: NextRequest) {
  try {
    const openAiConfig = getServerOpenAiConfig()
    if (!openAiConfig) {
      return errorResponse(getServerOpenAiKeyError(), 500)
    }
    const apiKey = openAiConfig.apiKey

    const body = (await request.json()) as RequestBody
    const equipoId = parseString(body.equipoId)
    const prompt = parseString(body.prompt)
    const currentDraft = normalizeRoutineDraft((body.currentDraft as Partial<RoutineEditorDraft> | undefined) ?? undefined)
    const messages = normalizeMessages(body.messages)

    if (!equipoId) return errorResponse('equipoId es obligatorio.')
    if (!prompt) return errorResponse('prompt es obligatorio.')

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse('No autorizado.', 401)
    }

    const membership = await validateMembership(supabase, user.id, equipoId)
    if (!membership) {
      return errorResponse('No tienes acceso a este equipo.', 403)
    }

    const team = normalizeTeam(membership)

    const [libraryResult, upcomingResult] = await Promise.all([
      supabase
        .from('ejercicios')
        .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material, creado_en')
        .eq('equipo_id', equipoId)
        .order('creado_en', { ascending: false })
        .limit(24),
      supabase
        .from('entrenamientos_equipo')
        .select('titulo, tipo, fecha')
        .eq('equipo_id', equipoId)
        .gte('fecha', new Date().toISOString().slice(0, 10))
        .order('fecha', { ascending: true })
        .limit(4),
    ])

    const libraryPreview = buildRoutineDetails((libraryResult.data ?? []) as RoutineExerciseRow[])
      .map(buildRoutineSummary)
      .slice(0, 6)
      .map((routine) => ({
        title: routine.title,
        category: routine.category,
        duration: routine.duration,
        objective: routine.objective,
      }))

    const upcomingSessions = (upcomingResult.data ?? []) as Array<{ titulo: string; tipo: string | null; fecha: string }>
    const exerciseDbPreview = await buildExerciseDbPreview(prompt, currentDraft)

    const systemPrompt = [
      'Eres el disenador de entrenamientos de BeProfesional.',
      'Responde SIEMPRE en espanol.',
      'Devuelve SOLO JSON valido, sin markdown.',
      'Tu trabajo es generar o refinar la misma rutina, no crear una rutina distinta sin motivo.',
      'Si el usuario pide cambios parciales, conserva el resto del borrador.',
      'La rutina debe ser practicamente utilizable por un entrenador real.',
      'Usa este esquema exacto:',
      '{"assistantMessage":"","draft":{"title":"","objective":"","trainingCategory":"POTENCIA","targetGroup":"","playerCount":"","phases":["Fase 1"],"origin":"ai","imageUrls":[],"blocks":[{"id":"block-1","phase":"Fase 1","name":"","duration":"","sets":"","reps":"","rest":"","load":"","purpose":"","setup":"","instructions":"","coachingPoints":[""],"progression":"","notes":""}]}}',
      'Cada bloque debe incluir name, purpose, duration, setup, instructions y coachingPoints claros. progression es opcional pero recomendable.',
      'No pongas listas de actividades dentro de instructions. Cada actividad debe ser su propio objeto dentro de blocks con name, duration, reps/rest y instructions propios.',
      'Ejemplo correcto: un block con name "Jumping jacks", otro block con name "Sentadillas con salto", otro block con name "Mountain climbers".',
      'Divide la sesion en partes reales: calentamiento, bloque principal y cierre/vuelta a la calma cuando aplique. Cada parte debe tener sus propios blocks.',
      'Mantén coherencia global entre calentamiento, parte principal y cierre.',
      'No dejes la rutina vacia ni incompleta.',
    ].join(' ')

    const openai = new OpenAI({ apiKey })
    const modelName = getModelName()
    const contextPrompt = buildContextPrompt({ team, prompt, currentDraft, messages, libraryPreview, exerciseDbPreview, upcomingSessions })
    let responseModel = modelName
    let rawText = ''

    if (isReasoningModel(modelName)) {
      const response = await openai.responses.create({
        model: modelName,
        max_output_tokens: AI_ROUTINE_MAX_OUTPUT_TOKENS,
        instructions: systemPrompt,
        input: [{ role: 'user', content: contextPrompt }],
        text: {
          format: {
            type: 'json_schema',
            ...AI_ROUTINE_JSON_SCHEMA,
          },
          verbosity: 'low',
        },
        reasoning: { effort: 'low' },
      })

      responseModel = response.model ?? modelName
      rawText = extractRawResponseText(response)
    } else {
      const completion = await openai.chat.completions.create({
        model: modelName,
        temperature: Math.min(getTemperature(), 0.5),
        response_format: { type: 'json_object' },
        max_completion_tokens: 2600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextPrompt },
        ],
      })

      responseModel = completion.model
      rawText = completion.choices[0]?.message?.content?.trim() ?? ''
    }

    if (!rawText) {
      return errorResponse('La IA no devolvio contenido.', 502)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return errorResponse('La IA devolvio JSON invalido.', 502)
    }

    if (!parsed || typeof parsed !== 'object') {
      return errorResponse('La IA devolvio una respuesta invalida.', 502)
    }

    const payload = parsed as Record<string, unknown>
    const nextDraft = normalizeRoutineDraft((payload.draft as Partial<RoutineEditorDraft> | undefined) ?? undefined)
    nextDraft.origin = 'ai'
    nextDraft.blocks = nextDraft.blocks.flatMap((block) =>
      splitActivityListBlock({
        ...block,
        purpose: normalizeRoutineDetailText(block.purpose),
        setup: normalizeRoutineDetailText(block.setup),
        instructions: normalizeRoutineDetailText(block.instructions),
        progression: normalizeRoutineDetailText(block.progression),
        notes: normalizeRoutineDetailText(block.notes),
      })
    )

    if (!nextDraft.title.trim() || nextDraft.blocks.length === 0) {
      return errorResponse('La IA devolvio una rutina incompleta.', 502)
    }

    const draft = await enrichDraftWithExerciseDb(nextDraft)

    return NextResponse.json({
      ok: true,
      draft,
      assistantMessage: sanitizeAssistantMessage(payload.assistantMessage),
      model: responseModel,
    })
  } catch (error) {
    console.error('Error en POST /api/play-maker/ai-routine:', formatOpenAiError(error))

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return errorResponse(
          'La clave de OpenAI configurada para generar rutinas no es valida. Revisa OPENAI_API_KEY en .env.local y reinicia el servidor.',
          401
        )
      }
      if (error.status === 429) return errorResponse('Limite de OpenAI alcanzado. Intenta de nuevo.', 429)
    }

    return errorResponse('Error interno del servidor.', 500)
  }
}
