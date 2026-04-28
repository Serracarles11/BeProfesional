import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type CreateClubBody = {
  nombre?: string | null
}

function normalizeName(value?: string | null) {
  return value?.trim().replace(/\s+/g, ' ') || null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 })
    }

    const body = (await request.json()) as CreateClubBody
    const nombre = normalizeName(body.nombre)

    if (!nombre) {
      return NextResponse.json({ ok: false, error: 'El nombre del club es obligatorio.' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('clubes')
      .select('id, nombre')
      .ilike('nombre', nombre)
      .limit(1)

    if (existingError) {
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 400 })
    }

    if (existing?.[0]) {
      return NextResponse.json({ ok: true, club: existing[0], existing: true })
    }

    const { data, error } = await supabase
      .from('clubes')
      .insert({ nombre, creado_por: user.id })
      .select('id, nombre')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message || 'No se pudo crear el club.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, club: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
