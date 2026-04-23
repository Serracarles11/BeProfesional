import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseRouteHandler(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que todos los campos requeridos esten completos
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('nombre, genero, edad, peso_kg, altura_cm')
      .eq('id', user.id)
      .single()

    if (perfilError || !perfil) {
      return NextResponse.json(
        { ok: false, error: 'No se encontro el perfil' },
        { status: 404 }
      )
    }

    // Validar campos requeridos
    const camposFaltantes: string[] = []
    if (!perfil.nombre) camposFaltantes.push('nombre')
    if (!perfil.genero) camposFaltantes.push('genero')
    if (!perfil.edad) camposFaltantes.push('edad')
    if (!perfil.peso_kg) camposFaltantes.push('peso')
    if (!perfil.altura_cm) camposFaltantes.push('altura')

    if (camposFaltantes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Faltan campos: ${camposFaltantes.join(', ')}`,
          camposFaltantes,
        },
        { status: 400 }
      )
    }

    // Marcar perfil como completo (si existe la columna)
    const { error: updateError } = await supabase
      .from('perfiles')
      .update({
        perfil_completo: true,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      // Si falla porque no existe la columna, no es critico
      console.warn('Aviso actualizando perfil_completo:', updateError)
    }

    // Verificar si tiene equipos para decidir redireccion
    const { data: memberships } = await supabase
      .from('miembros_equipo')
      .select('equipo_id')
      .eq('usuario_id', user.id)
      .limit(1)

    const hasTeam = memberships && memberships.length > 0
    const redirectTo = hasTeam ? '/equipos' : '/unirse'

    return NextResponse.json({
      ok: true,
      redirectTo,
    })
  } catch (err) {
    console.error('Error en onboarding final:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
