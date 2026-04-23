import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type EquipoRelation = {
  id: string
  nombre: string
  logo_url?: string | null
}

// GET: Obtener equipos del usuario
export async function GET() {
  try {
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

    // Obtener equipos del usuario con su rol.
    // Si la columna logo_url no existe aun, hacemos fallback sin esa columna.
    const selectWithLogo = `
      rol,
      equipo:equipos (
        id,
        nombre,
        logo_url
      )
    `
    const selectWithoutLogo = `
      rol,
      equipo:equipos (
        id,
        nombre
      )
    `

    let memberships: Array<{ rol: string | null; equipo: EquipoRelation | EquipoRelation[] | null }> | null = null
    let membershipError: { message?: string; code?: string } | null = null

    const withLogoQuery = await supabase
      .from('miembros_equipo')
      .select(selectWithLogo)
      .eq('usuario_id', user.id)

    memberships = withLogoQuery.data as Array<{ rol: string | null; equipo: EquipoRelation | EquipoRelation[] | null }> | null
    membershipError = withLogoQuery.error as { message?: string; code?: string } | null

    if (
      membershipError &&
      membershipError.code === '42703' &&
      membershipError.message?.includes('logo_url')
    ) {
      const fallbackQuery = await supabase
        .from('miembros_equipo')
        .select(selectWithoutLogo)
        .eq('usuario_id', user.id)

      memberships = fallbackQuery.data as Array<{ rol: string | null; equipo: EquipoRelation | EquipoRelation[] | null }> | null
      membershipError = fallbackQuery.error as { message?: string; code?: string } | null
    }

    if (membershipError) {
      console.error('Error obteniendo equipos:', membershipError)
      return NextResponse.json(
        { ok: false, error: membershipError.message || 'Error al obtener equipos' },
        { status: 500 }
      )
    }

    // Formatear respuesta
    const equipos = (memberships || []).map((m) => {
      const equipoRaw = m.equipo as EquipoRelation | EquipoRelation[] | null
      const equipo = Array.isArray(equipoRaw) ? equipoRaw[0] : equipoRaw
      return {
        id: equipo?.id,
        nombre: equipo?.nombre || 'Equipo',
        logo_url: equipo?.logo_url,
        rol: m.rol || 'jugador',
      }
    }).filter(e => e.id) // Filtrar equipos nulos

    // Obtener conteo de miembros para cada equipo
    const equiposConConteo = await Promise.all(
      equipos.map(async (equipo) => {
        const { count } = await supabase
          .from('miembros_equipo')
          .select('*', { count: 'exact', head: true })
          .eq('equipo_id', equipo.id)

        return {
          ...equipo,
          miembros_count: count || 0,
        }
      })
    )

    return NextResponse.json({
      ok: true,
      equipos: equiposConConteo,
    })
  } catch (err) {
    console.error('Error en GET equipos:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST: Logout u otras acciones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const cookieStore = await cookies()
    const supabase = createSupabaseRouteHandler(cookieStore)

    if (action === 'logout') {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error en logout:', error)
        return NextResponse.json(
          { ok: false, error: 'Error al cerrar sesion' },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json(
      { ok: false, error: 'Accion no valida' },
      { status: 400 }
    )
  } catch (err) {
    console.error('Error en POST equipos:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
