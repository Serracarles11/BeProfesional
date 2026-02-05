import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, posicion, pie_dominante } = body

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { ok: false, error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createSupabaseRouteHandler(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Actualizar perfil
    const updateData: Record<string, unknown> = {
      nombre: nombre.trim(),
      actualizado_en: new Date().toISOString(),
    }

    if (posicion) {
      updateData.posicion = posicion
    }

    if (pie_dominante) {
      updateData.pie_dominante = pie_dominante
    }

    const { error: updateError } = await supabase
      .from('perfiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error actualizando perfil:', updateError)
      return NextResponse.json(
        { ok: false, error: 'Error al guardar el nombre' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en onboarding nombre:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
