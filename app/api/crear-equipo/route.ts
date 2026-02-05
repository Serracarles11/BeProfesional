import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type CrearEquipoBody = {
  nombre_equipo?: string
  club?: string
  categoria?: string
  temporada?: string
}

type SupabaseRpcError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

function normalizeOptionalText(value?: string) {
  const clean = value?.trim()
  return clean ? clean : null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No autorizado. Inicia sesion para continuar.',
          code: null,
          details: null,
          hint: null,
        },
        { status: 401 }
      )
    }

    const body = (await request.json()) as CrearEquipoBody
    const nombreEquipo = body.nombre_equipo?.trim()

    if (!nombreEquipo) {
      return NextResponse.json(
        {
          ok: false,
          error: 'El nombre del equipo es obligatorio.',
          code: null,
          details: null,
          hint: null,
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('crear_equipo_con_codigos', {
      p_nombre: nombreEquipo,
      p_club: normalizeOptionalText(body.club),
      p_categoria: normalizeOptionalText(body.categoria),
      p_temporada: normalizeOptionalText(body.temporada),
      p_usos_jugadores: 30,
      p_usos_entrenador: 3,
    })

    if (error) {
      console.error('Error en rpc crear_equipo_con_codigos:', error)

      const rpcError = error as SupabaseRpcError

      return NextResponse.json(
        {
          ok: false,
          error: rpcError.message || 'No se pudo crear el equipo.',
          code: rpcError.code ?? null,
          details: rpcError.details ?? null,
          hint: rpcError.hint ?? null,
        },
        { status: 400 }
      )
    }

    const row = Array.isArray(data) ? data[0] : data

    if (!row?.o_equipo_id || !row.o_codigo_entrenador || !row.o_codigo_jugadores) {
      return NextResponse.json(
        {
          ok: false,
          error: 'La respuesta del servidor es invalida.',
          code: null,
          details: null,
          hint: null,
        },
        { status: 400 }
      )
    }

    const equipoId = row.o_equipo_id
    const codigoEntrenador = row.o_codigo_entrenador
    const codigoJugadores = row.o_codigo_jugadores

    return NextResponse.json({
      ok: true,
      equipoId,
      codigoEntrenador,
      codigoJugadores,
      redirectTo: '/home',
    })
  } catch (error) {
    console.error('Error en POST /api/crear-equipo:', error)

    const unknownError = error as SupabaseRpcError

    return NextResponse.json(
      {
        ok: false,
        error: unknownError?.message || 'Error interno del servidor.',
        code: unknownError?.code ?? null,
        details: unknownError?.details ?? null,
        hint: unknownError?.hint ?? null,
      },
      { status: 400 }
    )
  }
}
