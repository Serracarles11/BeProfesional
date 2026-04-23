import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const GENEROS_VALIDOS = ['HOMBRE', 'MUJER', 'NO_BINARIO', 'PREFIERO_NO_DECIR']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { genero } = body

    if (!genero || !GENEROS_VALIDOS.includes(genero)) {
      return NextResponse.json(
        { ok: false, error: 'Genero no valido' },
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
        genero,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error actualizando genero:', updateError)
      return NextResponse.json(
        { ok: false, error: 'Error al guardar el genero' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en onboarding genero:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
