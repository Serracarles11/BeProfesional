import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { edad } = body

    if (!edad || typeof edad !== 'number' || edad < 10 || edad > 100) {
      return NextResponse.json(
        { ok: false, error: 'Edad no valida' },
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

    // Calcular fecha de nacimiento aproximada
    const today = new Date()
    const birthYear = today.getFullYear() - edad
    const fechaNacimiento = new Date(birthYear, 0, 1).toISOString().split('T')[0]

    const { error: updateError } = await supabase
      .from('perfiles')
      .update({
        edad,
        fecha_nacimiento: fechaNacimiento,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error actualizando edad:', updateError)
      return NextResponse.json(
        { ok: false, error: 'Error al guardar la edad' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en onboarding edad:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
