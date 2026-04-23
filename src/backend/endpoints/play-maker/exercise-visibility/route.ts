import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { parseRoutineMaterial, serializeRoutineMaterial, type RoutineVisibility } from '@/lib/playmaker/routines'

type RequestBody = {
  equipoId?: unknown
  routineId?: unknown
  visibility?: unknown
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseVisibility(value: unknown): RoutineVisibility | null {
  if (value === 'public' || value === 'private') return value
  return null
}

async function validateMembership(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  equipoId: string
) {
  const result = await supabase
    .from('miembros_equipo')
    .select('usuario_id')
    .eq('usuario_id', userId)
    .eq('equipo_id', equipoId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  return Boolean(result.data && !result.error)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const admin = createSupabaseAdmin()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return errorResponse('No autorizado.', 401)
    if (!admin) return errorResponse('Falta una SUPABASE_SERVICE_ROLE_KEY valida.', 500)

    const body = (await request.json()) as RequestBody
    const equipoId = parseString(body.equipoId)
    const routineId = parseString(body.routineId)
    const visibility = parseVisibility(body.visibility)

    if (!equipoId) return errorResponse('equipoId es obligatorio.')
    if (!routineId) return errorResponse('routineId es obligatorio.')
    if (!visibility) return errorResponse('Visibilidad invalida.')

    const hasAccess = await validateMembership(supabase, user.id, equipoId)
    if (!hasAccess) return errorResponse('No tienes acceso a este equipo.', 403)

    const rowsResult = await admin
      .from('ejercicios')
      .select('id, material')
      .eq('equipo_id', equipoId)
      .eq('creado_por', user.id)
      .ilike('objetivo', `routine::${routineId}::%`)

    if (rowsResult.error) return errorResponse('No se pudo cargar el ejercicio.', 500)

    const rows = rowsResult.data ?? []
    if (rows.length === 0) return errorResponse('El ejercicio no existe.', 404)

    const sortedRows = [...rows].sort((left, right) => {
      const leftOrder = parseRoutineMaterial(left.material).order ?? 0
      const rightOrder = parseRoutineMaterial(right.material).order ?? 0
      return leftOrder - rightOrder
    })
    const targetRow = sortedRows[0]
    const material = parseRoutineMaterial(targetRow.material)

    const updateResult = await admin
      .from('ejercicios')
      .update({
        material: serializeRoutineMaterial({
          ...material,
          communityVisibility: visibility,
        }),
      })
      .eq('id', targetRow.id)

    if (updateResult.error) return errorResponse('No se pudo guardar la visibilidad.', 500)

    return NextResponse.json({
      ok: true,
      routineId,
      visibility,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno del servidor.', 500)
  }
}
