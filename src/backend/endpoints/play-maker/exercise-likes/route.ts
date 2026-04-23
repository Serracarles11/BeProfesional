import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { parseRoutineMaterial, serializeRoutineMaterial } from '@/lib/playmaker/routines'

type RequestBody = {
  equipoId?: unknown
  routineId?: unknown
  liked?: unknown
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
    const liked = body.liked === true

    if (!equipoId) return errorResponse('equipoId es obligatorio.')
    if (!routineId) return errorResponse('routineId es obligatorio.')

    const hasAccess = await validateMembership(supabase, user.id, equipoId)
    if (!hasAccess) return errorResponse('No tienes acceso a este equipo.', 403)

    const rowsResult = await admin
      .from('ejercicios')
      .select('id, equipo_id, material')
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
    const isOwnTeamRoutine = targetRow.equipo_id === equipoId || targetRow.equipo_id === null
    const isPublicRoutine = material.communityVisibility === 'public'

    if (!isOwnTeamRoutine && !isPublicRoutine) {
      return errorResponse('No tienes acceso a este ejercicio.', 403)
    }

    const likes = new Set(material.communityLikes ?? [])

    if (liked) likes.add(user.id)
    else likes.delete(user.id)

    const communityLikes = Array.from(likes)
    const updateResult = await admin
      .from('ejercicios')
      .update({
        material: serializeRoutineMaterial({
          ...material,
          communityLikes,
        }),
      })
      .eq('id', targetRow.id)

    if (updateResult.error) return errorResponse('No se pudo guardar el like.', 500)

    return NextResponse.json({
      ok: true,
      routineId,
      likedByViewer: liked,
      likeCount: communityLikes.length,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno del servidor.', 500)
  }
}
