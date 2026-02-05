import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validacion basica
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email y contrasena son requeridos' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createSupabaseRouteHandler(cookieStore)

    // Login con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { ok: false, error: 'Error al obtener usuario' },
        { status: 500 }
      )
    }

    // Verificar si el perfil esta completo
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, genero, edad, peso_kg, altura_cm, perfil_completo')
      .eq('id', data.user.id)
      .single()

    const perfilCompleto = perfil && (
      perfil.perfil_completo === true ||
      (perfil.nombre && perfil.genero && perfil.edad && perfil.peso_kg && perfil.altura_cm)
    )

    // Si el perfil no esta completo, ir al onboarding
    if (!perfilCompleto) {
      return NextResponse.json({ ok: true, redirectTo: '/onboarding/nombre' })
    }

    // Verificar si el usuario pertenece a algun equipo
    const { data: memberships, error: membershipError } = await supabase
      .from('miembros_equipo')
      .select('equipo_id')
      .eq('usuario_id', data.user.id)
      .limit(1)

    if (membershipError) {
      console.error('Error verificando equipos:', membershipError)
    }

    // Decidir redireccion
    const hasTeam = memberships && memberships.length > 0
    const redirectTo = hasTeam ? '/equipos' : '/unirse'

    return NextResponse.json({ ok: true, redirectTo })
  } catch (err) {
    console.error('Error en login:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
