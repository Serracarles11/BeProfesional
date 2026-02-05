import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo } = body

    // Validacion basica
    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: 'El codigo es requerido' },
        { status: 400 }
      )
    }

    // Validar formato XXXX-XXXX
    const codigoRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/
    if (!codigoRegex.test(codigo)) {
      return NextResponse.json(
        { ok: false, error: 'Formato de codigo invalido' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createSupabaseRouteHandler(cookieStore)

    // Verificar sesion
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Llamar al RPC para unirse con codigo
    const { data, error } = await supabase.rpc('unirse_con_codigo', {
      p_codigo: codigo,
    })

    if (error) {
      console.error('Error en RPC unirse_con_codigo:', error)

      // Mensajes de error personalizados segun el error de Supabase
      if (error.message.includes('expirado') || error.message.includes('expired')) {
        return NextResponse.json(
          { ok: false, error: 'Este codigo ha expirado' },
          { status: 400 }
        )
      }
      if (error.message.includes('no existe') || error.message.includes('not found') || error.message.includes('invalid')) {
        return NextResponse.json(
          { ok: false, error: 'Codigo de invitacion invalido' },
          { status: 400 }
        )
      }
      if (error.message.includes('ya eres') || error.message.includes('already')) {
        return NextResponse.json(
          { ok: false, error: 'Ya eres miembro de este equipo' },
          { status: 400 }
        )
      }
      if (error.message.includes('limite') || error.message.includes('limit')) {
        return NextResponse.json(
          { ok: false, error: 'Este codigo ha alcanzado su limite de usos' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { ok: false, error: 'No se pudo procesar el codigo de invitacion' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      redirectTo: '/equipos',
      data,
    })
  } catch (err) {
    console.error('Error al unirse:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
