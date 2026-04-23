import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, email, password } = body

    // Validacion basica
    if (!nombre || !email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'La contrasena debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createSupabaseRouteHandler(cookieStore)

    // Registrar usuario con Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
        },
      },
    })

    if (error) {
      // Manejar errores comunes
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { ok: false, error: 'Este email ya esta registrado' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { ok: false, error: 'Error al crear usuario' },
        { status: 500 }
      )
    }

    // Crear perfil en la tabla public.perfiles
    const { error: profileError } = await supabase
      .from('perfiles')
      .upsert({
        id: data.user.id,
        nombre,
      })

    if (profileError) {
      console.error('Error creando perfil:', profileError)
      // No falla el registro, el perfil se puede crear despues
    }

    // Despues del registro, ir al onboarding
    return NextResponse.json({
      ok: true,
      redirectTo: '/onboarding/nombre',
      message: 'Cuenta creada exitosamente',
    })
  } catch (err) {
    console.error('Error en registro:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
