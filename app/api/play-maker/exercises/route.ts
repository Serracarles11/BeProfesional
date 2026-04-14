import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type ExerciseBlock = {
  category?: unknown
  name?: unknown
  sets?: unknown
  reps?: unknown
  rest?: unknown
  load?: unknown
  notes?: unknown
}

type RequestBody = {
  equipoId?: unknown
  title?: unknown
  phase?: unknown
  blocks?: unknown
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toDifficulty(category: string) {
  if (category === 'Rehabilitation') return 2
  if (category === 'Endurance') return 3
  if (category === 'Strength') return 4
  if (category === 'Power') return 5
  return 3
}

function estimateMinutes(setsValue: string, restValue: string) {
  const sets = Number(setsValue)
  const rest = Number(restValue)
  if (!Number.isFinite(sets) || sets <= 0) return 10
  const restMinutes = Number.isFinite(rest) && rest > 0 ? (sets * rest) / 60 : sets
  return Math.max(5, Math.min(300, Math.round(sets * 2 + restMinutes)))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
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
    const phase = parseString(body.phase)
    const blocks = Array.isArray(body.blocks) ? (body.blocks as ExerciseBlock[]) : []

    if (!equipoId) {
      return errorResponse('equipoId es obligatorio.')
    }

    const membershipResult = await supabase
      .from('miembros_equipo')
      .select('usuario_id')
      .eq('usuario_id', user.id)
      .eq('equipo_id', equipoId)
      .eq('estado', 'ACTIVO')
      .maybeSingle()

    if (!membershipResult.data) {
      return errorResponse('No tienes acceso a este equipo.', 403)
    }

    const rows = blocks
      .map((block, index) => {
        const category = parseString(block.category)
        const name = parseString(block.name)
        const sets = parseString(block.sets)
        const reps = parseString(block.reps)
        const rest = parseString(block.rest)
        const load = parseString(block.load)
        const notes = parseString(block.notes)

        if (!name) return null

        const parts = [
          phase ? `Fase: ${phase}` : null,
          category ? `Categoria: ${category}` : null,
          sets ? `Series: ${sets}` : null,
          reps ? `Repeticiones: ${reps}` : null,
          rest ? `Descanso: ${rest}s` : null,
          load ? `Carga: ${load}kg` : null,
          notes || null,
        ].filter(Boolean)

        return {
          equipo_id: equipoId,
          nombre: name,
          descripcion: parts.join(' · '),
          tipo: null,
          objetivo: title || `Bloque ${index + 1}`,
          duracion_estimada_min: estimateMinutes(sets, rest),
          dificultad: toDifficulty(category),
          material: load && load !== '0' ? `Carga externa (${load} kg)` : null,
          creado_por: user.id,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    if (rows.length === 0) {
      return errorResponse('Anade al menos un bloque valido antes de guardar.')
    }

    const insertResult = await supabase.from('ejercicios').insert(rows).select('id')

    if (insertResult.error) {
      return errorResponse(insertResult.error.message, 500)
    }

    return NextResponse.json({
      ok: true,
      created: insertResult.data?.length ?? rows.length,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno del servidor.', 500)
  }
}
