import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { altura_cm } = body

    if (!altura_cm || typeof altura_cm !== 'number' || altura_cm < 100 || altura_cm > 250) {
      return NextResponse.json(
        { ok: false, error: 'Altura no valida' },
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

    const { error: updateError } = await supabase
      .from('perfiles')
      .update({
        altura_cm,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error actualizando altura:', updateError)
      return NextResponse.json(
        { ok: false, error: 'Error al guardar la altura' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en onboarding altura:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
