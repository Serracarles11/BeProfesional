import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { findExerciseCatalogDetailByName, getExerciseCatalogDetailById, getExerciseDbConfigError, searchExerciseCatalog } from '@/lib/exercisedb'
import type { ExerciseCatalogSearchResult } from '@/lib/exercisedb-types'
import { parseRoutineMaterial, type RoutineExerciseRow } from '@/lib/playmaker/routines'

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function uniqByName(results: ExerciseCatalogSearchResult[]) {
  const seen = new Set<string>()
  return results.filter((item) => {
    const key = item.exerciseId || `${item.source}:${normalizeText(item.name)}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function validateMembership(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  equipoId: string
) {
  const membership = await supabase
    .from('miembros_equipo')
    .select('usuario_id')
    .eq('usuario_id', userId)
    .eq('equipo_id', equipoId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  return membership.data
}

function mapLocalResult(row: RoutineExerciseRow): ExerciseCatalogSearchResult | null {
  const name = parseString(row.nombre)
  if (!name) return null
  const material = parseRoutineMaterial(row.material)
  const exerciseData = material.exerciseData
  const subtitle =
    exerciseData?.overview ||
    [
      exerciseData?.targetMuscles.join(', '),
      exerciseData?.equipments.join(', '),
      material.purpose,
    ]
      .filter(Boolean)
      .join(' · ') ||
    'Ejercicio guardado en tu biblioteca.'

  return {
    source: 'local',
    exerciseId: exerciseData?.exerciseId ?? null,
    localId: row.id,
    name,
    subtitle,
    imageUrl: exerciseData?.imageUrl ?? exerciseData?.gifUrl ?? material.imageUrls?.[0] ?? null,
    bodyParts: exerciseData?.bodyParts ?? [],
    targetMuscles: exerciseData?.targetMuscles ?? [],
    equipments: exerciseData?.equipments ?? [],
    exerciseType: exerciseData?.exerciseType ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query')?.trim() ?? ''
    const equipoId = request.nextUrl.searchParams.get('equipoId')?.trim() ?? ''
    if (query.length < 2) return NextResponse.json({ ok: true, results: [] })

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return errorResponse('No autorizado.', 401)

    let localResults: ExerciseCatalogSearchResult[] = []
    if (equipoId) {
      const membership = await validateMembership(supabase, user.id, equipoId)
      if (membership) {
        const localResponse = await supabase
          .from('ejercicios')
          .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material, creado_en')
          .eq('equipo_id', equipoId)
          .ilike('nombre', `%${query}%`)
          .order('creado_en', { ascending: false })
          .limit(5)

        localResults = ((localResponse.data ?? []) as RoutineExerciseRow[])
          .map(mapLocalResult)
          .filter((item): item is ExerciseCatalogSearchResult => Boolean(item))
      }
    }

    let remoteResults: ExerciseCatalogSearchResult[] = []
    try {
      remoteResults = await searchExerciseCatalog(query)
    } catch (error) {
      if (localResults.length === 0) {
        throw error
      }
    }

    return NextResponse.json({
      ok: true,
      results: uniqByName([...localResults, ...remoteResults]),
      warning: remoteResults.length === 0 && localResults.length > 0 ? getExerciseDbConfigError() : null,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'No se pudo buscar ejercicios.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return errorResponse('No autorizado.', 401)

    const body = (await request.json()) as { exerciseId?: unknown; name?: unknown }
    const exerciseId = parseString(body.exerciseId)
    const name = parseString(body.name)

    const detail = exerciseId
      ? await getExerciseCatalogDetailById(exerciseId)
      : name
        ? await findExerciseCatalogDetailByName(name)
        : null

    if (!detail) {
      return errorResponse('No se ha encontrado información adicional para este ejercicio.', 404)
    }

    return NextResponse.json({ ok: true, exercise: detail })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'No se pudo cargar el detalle del ejercicio.', 500)
  }
}
