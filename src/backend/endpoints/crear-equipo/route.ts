import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type CrearEquipoBody = {
  nombre_equipo?: string
  club_id?: string | null
  club?: string | null
  categoria?: string | null
  categoria_anio?: string | null
  temporada?: string | null
  ubicacion?: string | null
  campo_juego?: string | null
  direccion_campo?: string | null
  ciudad?: string | null
  provincia?: string | null
  pais?: string | null
}

type SupabaseRpcError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

type RouteSupabase = Awaited<ReturnType<typeof createSupabaseRouteHandler>>

function normalizeOptionalText(value?: string | null) {
  const clean = value?.trim().replace(/\s+/g, ' ')
  return clean ? clean : null
}

function getAniosPorCategoria(categoria: string | null) {
  if (categoria === 'JUVENIL') return ['1R', '2N', '3R']
  if (categoria === 'AMATEUR' || !categoria) return []
  return ['1R', '2N']
}

function isCategoriaValida(categoria: string | null) {
  return ['PREBENJAMIN', 'BENJAMIN', 'ALEVIN', 'INFANTIL', 'CADETE', 'JUVENIL', 'AMATEUR'].includes(categoria ?? '')
}

async function obtenerOcrearClub(
  supabase: RouteSupabase,
  nombreClub: string | null,
  userId: string,
  clubId?: string | null
) {
  if (clubId) {
    const { data, error } = await supabase
      .from('clubes')
      .select('id, nombre')
      .eq('id', clubId)
      .maybeSingle()

    if (error || !data?.id || !data.nombre) {
      throw new Error(error?.message || 'No se pudo validar el club seleccionado.')
    }

    return data
  }

  const nombre = normalizeOptionalText(nombreClub)
  if (!nombre) throw new Error('El club es obligatorio.')

  const { data: existentes, error: searchError } = await supabase
    .from('clubes')
    .select('id, nombre')
    .ilike('nombre', nombre)
    .limit(10)

  if (searchError) throw new Error(searchError.message || 'No se pudo buscar el club.')

  const exacto = existentes?.find((club) => {
    return normalizeOptionalText(club.nombre)?.toLocaleLowerCase() === nombre.toLocaleLowerCase()
  })

  if (exacto) return exacto

  const { data, error } = await supabase
    .from('clubes')
    .insert({ nombre, creado_por: userId })
    .select('id, nombre')
    .single()

  if (error) throw new Error(error.message || 'No se pudo crear el club.')
  if (!data?.id || !data.nombre) throw new Error('La respuesta al crear el club es invalida.')

  return data
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
    const clubId = normalizeOptionalText(body.club_id)
    const categoria = normalizeOptionalText(body.categoria)
    const categoriaAnio = categoria === 'AMATEUR' ? null : normalizeOptionalText(body.categoria_anio)

    if (!nombreEquipo) {
      return NextResponse.json(
        { ok: false, error: 'El nombre del equipo es obligatorio.', code: null, details: null, hint: null },
        { status: 400 }
      )
    }

    let clubFinal: { id: string; nombre: string }
    try {
      clubFinal = await obtenerOcrearClub(supabase, body.club ?? null, user.id, clubId)
    } catch (clubError) {
      const message = clubError instanceof Error ? clubError.message : 'No se pudo crear el club.'
      return NextResponse.json(
        { ok: false, error: message, code: null, details: null, hint: null },
        { status: 400 }
      )
    }

    if (!isCategoriaValida(categoria)) {
      return NextResponse.json(
        { ok: false, error: 'La categoria es obligatoria.', code: null, details: null, hint: null },
        { status: 400 }
      )
    }

    if (categoria !== 'AMATEUR' && !getAniosPorCategoria(categoria).includes(categoriaAnio ?? '')) {
      return NextResponse.json(
        { ok: false, error: 'El anio de categoria es obligatorio.', code: null, details: null, hint: null },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('crear_equipo_con_codigos', {
      p_nombre: nombreEquipo,
      p_club: clubFinal.nombre,
      p_categoria: categoria,
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
    const equipoId = row?.o_equipo_id ?? row?.equipo_id
    const codigoEntrenador = row?.o_codigo_entrenador ?? row?.codigo_entrenador
    const codigoJugadores = row?.o_codigo_jugadores ?? row?.codigo_jugadores

    if (!equipoId || !codigoEntrenador || !codigoJugadores) {
      return NextResponse.json(
        { ok: false, error: 'La respuesta del servidor es invalida.', code: null, details: null, hint: null },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('equipos')
      .update({
        club_id: clubFinal.id,
        club: clubFinal.nombre,
        categoria,
        categoria_anio: categoria === 'AMATEUR' ? null : categoriaAnio,
        temporada: normalizeOptionalText(body.temporada),
        ubicacion: normalizeOptionalText(body.ubicacion),
        campo_juego: normalizeOptionalText(body.campo_juego),
        direccion_campo: normalizeOptionalText(body.direccion_campo),
        ciudad: normalizeOptionalText(body.ciudad),
        provincia: normalizeOptionalText(body.provincia),
        pais: normalizeOptionalText(body.pais) || 'España',
      })
      .eq('id', equipoId)

    if (updateError) {
      console.error('Error actualizando metadatos del equipo:', updateError)

      return NextResponse.json(
        {
          ok: false,
          error: updateError.message || 'El equipo se creo, pero no se pudieron guardar los datos del club.',
          code: updateError.code ?? null,
          details: updateError.details ?? null,
          hint: updateError.hint ?? null,
        },
        { status: 400 }
      )
    }

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
