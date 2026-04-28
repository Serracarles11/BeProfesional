import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type UpdateTeamSettingsBody = {
  equipoId?: string
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

function normalizeOptionalText(value?: string | null) {
  const clean = value?.trim().replace(/\s+/g, ' ')
  return clean ? clean : null
}

function normalizeRole(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? ''
}

function isCoachRole(role: string | null | undefined) {
  return ['ENTRENADOR', 'STAFF'].includes(normalizeRole(role))
}

function getAniosPorCategoria(categoria: string | null) {
  if (categoria === 'JUVENIL') return ['1R', '2N', '3R']
  if (categoria === 'AMATEUR' || !categoria) return []
  return ['1R', '2N']
}

function isCategoriaValida(categoria: string | null) {
  return ['PREBENJAMIN', 'BENJAMIN', 'ALEVIN', 'INFANTIL', 'CADETE', 'JUVENIL', 'AMATEUR'].includes(categoria ?? '')
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 })
    }

    const body = (await request.json()) as UpdateTeamSettingsBody
    const equipoId = normalizeOptionalText(body.equipoId)
    const clubId = normalizeOptionalText(body.club_id)
    const categoria = normalizeOptionalText(body.categoria)
    const categoriaAnio = categoria === 'AMATEUR' ? null : normalizeOptionalText(body.categoria_anio)

    if (!equipoId) {
      return NextResponse.json({ ok: false, error: 'Falta el equipo.' }, { status: 400 })
    }

    if (!clubId) {
      return NextResponse.json({ ok: false, error: 'El club es obligatorio.' }, { status: 400 })
    }

    if (!isCategoriaValida(categoria)) {
      return NextResponse.json({ ok: false, error: 'La categoria es obligatoria.' }, { status: 400 })
    }

    if (categoria !== 'AMATEUR' && !getAniosPorCategoria(categoria).includes(categoriaAnio ?? '')) {
      return NextResponse.json({ ok: false, error: 'El anio de categoria es obligatorio.' }, { status: 400 })
    }

    const { data: equipo, error: equipoError } = await supabase
      .from('equipos')
      .select('id, creado_por')
      .eq('id', equipoId)
      .maybeSingle()

    if (equipoError || !equipo?.id) {
      return NextResponse.json({ ok: false, error: equipoError?.message || 'No se pudo validar el equipo.' }, { status: 404 })
    }

    const teamMembership = await supabase
      .from('miembros_equipo')
      .select('rol')
      .eq('equipo_id', equipoId)
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (equipo.creado_por !== user.id && !isCoachRole(teamMembership.data?.rol)) {
      return NextResponse.json({ ok: false, error: 'No puedes editar este equipo.' }, { status: 403 })
    }

    const { data: club, error: clubError } = await supabase
      .from('clubes')
      .select('id, nombre')
      .eq('id', clubId)
      .maybeSingle()

    if (clubError || !club?.id || !club.nombre) {
      return NextResponse.json({ ok: false, error: clubError?.message || 'No se pudo validar el club.' }, { status: 400 })
    }

    const payload = {
      club_id: club.id,
      club: club.nombre,
      categoria,
      categoria_anio: categoria === 'AMATEUR' ? null : categoriaAnio,
      temporada: normalizeOptionalText(body.temporada),
      ubicacion: normalizeOptionalText(body.ubicacion),
      campo_juego: normalizeOptionalText(body.campo_juego),
      direccion_campo: normalizeOptionalText(body.direccion_campo),
      ciudad: normalizeOptionalText(body.ciudad),
      provincia: normalizeOptionalText(body.provincia),
      pais: normalizeOptionalText(body.pais) || 'España',
    }

    const { data: updated, error: updateError } = await supabase
      .from('equipos')
      .update(payload)
      .eq('id', equipoId)
      .select('club_id, club, categoria, categoria_anio, temporada, ubicacion, campo_juego, direccion_campo, ciudad, provincia, pais')
      .single()

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message || 'No se pudieron guardar los datos del club.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, equipo: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
