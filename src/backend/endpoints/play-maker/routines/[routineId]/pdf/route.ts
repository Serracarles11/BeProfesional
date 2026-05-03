import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { buildRoutineDetails, type RoutineExerciseRow } from '@/lib/playmaker/routines'
import {
  buildRoutinePdfFileName,
  buildRoutinePdfBuffer,
  type RoutinePdfTeam,
} from '@/lib/playmaker/routine-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ParamsInput = {
  routineId: string
}

type MembershipRow = {
  equipo:
    | RoutinePdfTeam
    | RoutinePdfTeam[]
    | null
}

function normalizeEquipo(row: MembershipRow) {
  const raw = Array.isArray(row.equipo) ? row.equipo[0] : row.equipo
  if (!raw?.id) return null
  return raw
}

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<ParamsInput> | ParamsInput }
) {
  try {
    const params = await context.params
    const routineId = params.routineId?.trim()
    const equipoId = request.nextUrl.searchParams.get('equipo')?.trim() || ''

    if (!routineId) return errorResponse('routineId inválido.', 400)
    if (!equipoId) return errorResponse('equipo inválido.', 400)

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return errorResponse('No autorizado.', 401)

    const membershipsResult = await supabase
      .from('miembros_equipo')
      .select('equipo:equipos(id, nombre, club, categoria, temporada, logo_url)')
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')

    if (membershipsResult.error) {
      return errorResponse('No se pudieron validar los equipos del usuario.', 500)
    }

    const activeTeam = ((membershipsResult.data ?? []) as MembershipRow[])
      .map((row) => normalizeEquipo(row))
      .find((team): team is RoutinePdfTeam => Boolean(team && team.id === equipoId))

    if (!activeTeam) return errorResponse('No perteneces al equipo solicitado.', 403)

    const rowsResult = await supabase
      .from('ejercicios')
      .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material, creado_en')
      .eq('equipo_id', activeTeam.id)
      .eq('creado_por', user.id)
      .ilike('objetivo', `routine::${routineId}::%`)
      .order('creado_en', { ascending: true })

    if (rowsResult.error) {
      return errorResponse('No se pudo cargar la rutina.', 500)
    }

    const routine = buildRoutineDetails((rowsResult.data ?? []) as RoutineExerciseRow[])[0] ?? null
    if (!routine) return errorResponse('La rutina no existe.', 404)

    const fileName = buildRoutinePdfFileName(routine)
    const pdf = buildRoutinePdfBuffer({ equipo: activeTeam, routine })

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generando PDF de rutina:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'No se pudo generar el PDF.',
      500
    )
  }
}
