import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { ExerciseDbEnrichment } from '@/lib/exercisedb-types'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { buildRoutineObjective, normalizeRoutineDetailText, serializeRoutineMaterial, type RoutineOrigin } from '@/lib/playmaker/routines'

type ExerciseBlock = {
  phase?: unknown
  name?: unknown
  duration?: unknown
  sets?: unknown
  reps?: unknown
  rest?: unknown
  load?: unknown
  purpose?: unknown
  setup?: unknown
  instructions?: unknown
  coachingPoints?: unknown
  progression?: unknown
  notes?: unknown
  exerciseData?: unknown
}

type RequestBody = {
  equipoId?: unknown
  title?: unknown
  objective?: unknown
  trainingCategory?: unknown
  targetGroup?: unknown
  playerCount?: unknown
  origin?: unknown
  routineId?: unknown
  imageUrls?: unknown
  blocks?: unknown
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCoachingPoints(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|[.;](?=\s|$)/)
      .map((item) => item.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean)
  }
  return []
}

function parseOrigin(value: unknown): RoutineOrigin {
  return value === 'ai' ? 'ai' : 'manual'
}

function parseExerciseStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseExerciseData(value: unknown): ExerciseDbEnrichment | undefined {
  if (!value || typeof value !== 'object') return undefined
  const parsed = value as Record<string, unknown>
  const exerciseId = parseString(parsed.exerciseId)
  const name = parseString(parsed.name)
  if (!exerciseId || !name) return undefined

  const relatedExercises = Array.isArray(parsed.relatedExercises)
    ? parsed.relatedExercises
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const related = item as Record<string, unknown>
          const relatedId = parseString(related.exerciseId)
          const relatedName = parseString(related.name)
          if (!relatedId || !relatedName) return null
          return { exerciseId: relatedId, name: relatedName }
        })
        .filter((item): item is ExerciseDbEnrichment['relatedExercises'][number] => Boolean(item))
    : []

  return {
    source: 'exercisedb',
    exerciseId,
    name,
    overview: parseString(parsed.overview),
    instructions: parseExerciseStringArray(parsed.instructions),
    imageUrl: parseString(parsed.imageUrl) || null,
    gifUrl: parseString(parsed.gifUrl) || null,
    videoUrl: parseString(parsed.videoUrl) || null,
    bodyParts: parseExerciseStringArray(parsed.bodyParts),
    targetMuscles: parseExerciseStringArray(parsed.targetMuscles),
    secondaryMuscles: parseExerciseStringArray(parsed.secondaryMuscles),
    equipments: parseExerciseStringArray(parsed.equipments),
    exerciseType: parseString(parsed.exerciseType) || null,
    exerciseTips: parseExerciseStringArray(parsed.exerciseTips),
    variations: parseExerciseStringArray(parsed.variations),
    keywords: parseExerciseStringArray(parsed.keywords),
    relatedExercises,
  }
}

function toDifficulty(category: string, origin: RoutineOrigin) {
  if (origin === 'ai') return 4
  if (category === 'RECUPERACION') return 2
  if (category === 'RESISTENCIA') return 3
  if (category === 'FUERZA') return 4
  if (category === 'POTENCIA') return 5
  return 3
}

function categoryLabel(category: string) {
  if (category === 'RECUPERACION') return 'Recuperacion'
  if (category === 'RESISTENCIA') return 'Resistencia'
  if (category === 'FUERZA') return 'Fuerza'
  if (category === 'POTENCIA') return 'Potencia'
  return 'Fisico'
}

function mapTrainingCategoryToExerciseType(category: string) {
  if (category === 'RECUPERACION') return 'RECUPERACION'
  return 'FISICO'
}

function estimateMinutes(durationValue: string, setsValue: string, restValue: string) {
  const explicitDuration = Number(durationValue)
  if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
    return Math.max(1, Math.min(300, Math.round(explicitDuration)))
  }

  const sets = Number(setsValue)
  const rest = Number(restValue)
  if (!Number.isFinite(sets) || sets <= 0) return 10
  const restMinutes = Number.isFinite(rest) && rest > 0 ? (sets * rest) / 60 : sets
  return Math.max(5, Math.min(300, Math.round(sets * 2 + restMinutes)))
}

function buildDescription(args: {
  phase: string
  trainingCategory: string
  objective: string
  targetGroup: string
  playerCount: string
  duration: string
  sets: string
  reps: string
  rest: string
  purpose: string
  setup: string
  instructions: string
  coachingPoints: string[]
  progression: string
  notes: string
}) {
  const {
    phase,
    trainingCategory,
    objective,
    targetGroup,
    playerCount,
    duration,
    sets,
    reps,
    rest,
    purpose,
    setup,
    instructions,
    coachingPoints,
    progression,
    notes,
  } = args

  return [
    phase ? `Fase: ${phase}` : null,
    trainingCategory ? `Categoria: ${categoryLabel(trainingCategory)}` : null,
    objective ? `Objetivo general: ${objective}` : null,
    targetGroup ? `Grupo: ${targetGroup}` : null,
    playerCount ? `Jugadores: ${playerCount}` : null,
    duration ? `Duracion: ${duration}` : null,
    sets ? `Series: ${sets}` : null,
    reps ? `Repeticiones: ${reps}` : null,
    rest ? `Descanso: ${rest}s` : null,
    purpose ? `Objetivo del ejercicio: ${purpose}` : null,
    setup ? `Montaje: ${setup}` : null,
    instructions ? `Consignas: ${instructions}` : null,
    coachingPoints.length > 0 ? `Puntos clave: ${coachingPoints.join('; ')}` : null,
    progression ? `Progresion: ${progression}` : null,
    notes ? `Notas: ${notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

async function validateMembership(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  equipoId: string
) {
  const membershipResult = await supabase
    .from('miembros_equipo')
    .select('usuario_id, rol')
    .eq('usuario_id', userId)
    .eq('equipo_id', equipoId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  return membershipResult.data
}

function buildRows(args: {
  blocks: ExerciseBlock[]
  equipoId: string
  imageUrls: string[]
  routineId: string
  title: string
  objective: string
  trainingCategory: string
  targetGroup: string
  playerCount: string
  origin: RoutineOrigin
  userId: string
}) {
  const { blocks, equipoId, imageUrls, routineId, title, objective, trainingCategory, targetGroup, playerCount, origin, userId } = args

  return blocks
    .map((block, index) => {
      const phase = parseString(block.phase)
      const name = parseString(block.name)
      const duration = parseString(block.duration)
      const sets = parseString(block.sets)
      const reps = parseString(block.reps)
      const rest = parseString(block.rest)
      const load = parseString(block.load)
      const purpose = normalizeRoutineDetailText(parseString(block.purpose))
      const setup = normalizeRoutineDetailText(parseString(block.setup))
      const instructions = normalizeRoutineDetailText(parseString(block.instructions))
      const coachingPoints = parseCoachingPoints(block.coachingPoints)
      const progression = normalizeRoutineDetailText(parseString(block.progression))
      const notes = normalizeRoutineDetailText(parseString(block.notes))
      const exerciseData = parseExerciseData(block.exerciseData)

      if (!name) return null

      return {
        equipo_id: equipoId,
        nombre: name,
        descripcion: buildDescription({
          phase,
          trainingCategory,
          objective,
          targetGroup,
          playerCount,
          duration,
          sets,
          reps,
          rest,
          purpose,
          setup,
          instructions,
          coachingPoints,
          progression,
          notes,
        }),
        tipo: mapTrainingCategoryToExerciseType(trainingCategory),
        objetivo: buildRoutineObjective(routineId, title),
        duracion_estimada_min: estimateMinutes(duration, sets, rest),
        dificultad: toDifficulty(trainingCategory, origin),
        material: serializeRoutineMaterial({
          order: index,
          load,
          phase,
          imageUrls,
          trainingCategory,
          objective,
          targetGroup,
          playerCount,
          origin,
          duration,
          purpose,
          setup,
          instructions,
          coachingPoints,
          progression,
          exerciseData,
        }),
        creado_por: userId,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
}

async function saveRoutine(request: NextRequest, mode: 'create' | 'update') {
  const supabase = await createSupabaseRouteHandler()
  const admin = createSupabaseAdmin()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse('No autorizado.', 401)
  }

  const body = (await request.json()) as RequestBody
  const equipoId = parseString(body.equipoId)
  const title = parseString(body.title)
  const objective = parseString(body.objective)
  const trainingCategory = parseString(body.trainingCategory) || 'POTENCIA'
  const targetGroup = parseString(body.targetGroup)
  const playerCount = parseString(body.playerCount)
  const origin = parseOrigin(body.origin)
  const routineId = parseString(body.routineId) || randomUUID()
  const imageUrls = parseStringArray(body.imageUrls)
  const blocks = Array.isArray(body.blocks) ? (body.blocks as ExerciseBlock[]) : []

  if (!equipoId) return errorResponse('equipoId es obligatorio.')
  if (!title) return errorResponse('El titulo de la rutina es obligatorio.')
  if (mode === 'update' && !parseString(body.routineId)) {
    return errorResponse('routineId es obligatorio.')
  }

  const membership = await validateMembership(supabase, user.id, equipoId)
  if (!membership) return errorResponse('No tienes acceso a este equipo.', 403)
  if (!admin) {
    return errorResponse(
      'Falta una SUPABASE_SERVICE_ROLE_KEY valida para guardar rutinas en ejercicios.',
      500
    )
  }

  if (mode === 'update') {
    const existingResult = await admin
      .from('ejercicios')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('creado_por', user.id)
      .ilike('objetivo', `routine::${routineId}::%`)

    if (existingResult.error) {
      return errorResponse('No se pudo cargar la rutina actual.', 500)
    }

    const existingIds = (existingResult.data ?? []).map((row) => row.id)
    if (existingIds.length > 0) {
      const deleteResult = await admin.from('ejercicios').delete().in('id', existingIds)
      if (deleteResult.error) {
        return errorResponse('No se pudo actualizar la rutina.', 500)
      }
    }
  }

  const rows = buildRows({
    blocks,
    equipoId,
    imageUrls,
    routineId,
    title,
    objective,
    trainingCategory,
    targetGroup,
    playerCount,
    origin,
    userId: user.id,
  })

  if (rows.length === 0) {
    return errorResponse('Anade al menos un bloque valido antes de guardar.')
  }

  const insertResult = await admin.from('ejercicios').insert(rows).select('id')
  if (insertResult.error) {
    return errorResponse(insertResult.error.message, 500)
  }

  return NextResponse.json({
    ok: true,
    routineId,
    created: insertResult.data?.length ?? rows.length,
  })
}

export async function POST(request: NextRequest) {
  try {
    return await saveRoutine(request, 'create')
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno del servidor.', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await saveRoutine(request, 'update')
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno del servidor.', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const admin = createSupabaseAdmin()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse('No autorizado.', 401)
    }

    const url = new URL(request.url)
    const equipoId = parseString(url.searchParams.get('equipoId'))
    const routineId = parseString(url.searchParams.get('routineId'))

    if (!equipoId) return errorResponse('equipoId es obligatorio.')
    if (!routineId) return errorResponse('routineId es obligatorio.')

    const membership = await validateMembership(supabase, user.id, equipoId)
    if (!membership) return errorResponse('No tienes acceso a este equipo.', 403)
    if (!admin) {
      return errorResponse(
        'Falta una SUPABASE_SERVICE_ROLE_KEY valida para eliminar rutinas en ejercicios.',
        500
      )
    }

    const existingResult = await admin
      .from('ejercicios')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('creado_por', user.id)
      .ilike('objetivo', `routine::${routineId}::%`)

    if (existingResult.error) {
      return errorResponse('No se pudo cargar la rutina.', 500)
    }

    const existingIds = (existingResult.data ?? []).map((row) => row.id)
    if (existingIds.length === 0) {
      return errorResponse('La rutina no existe.', 404)
    }

    const deleteResult = await admin.from('ejercicios').delete().in('id', existingIds)
    if (deleteResult.error) {
      return errorResponse('No se pudo eliminar la rutina.', 500)
    }

    return NextResponse.json({
      ok: true,
      deletedRoutineId: routineId,
      deleted: existingIds.length,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno del servidor.', 500)
  }
}
