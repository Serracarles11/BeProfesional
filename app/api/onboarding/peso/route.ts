import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { peso_kg } = body

    if (!peso_kg || typeof peso_kg !== 'number' || peso_kg < 20 || peso_kg > 300) {
      return NextResponse.json(
        { ok: false, error: 'Peso no valido' },
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
        peso_kg,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error actualizando peso:', updateError)
      return NextResponse.json(
        { ok: false, error: 'Error al guardar el peso' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en onboarding peso:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
