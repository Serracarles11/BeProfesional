import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type EquipoRelation = {
  id: string
  nombre: string
  logo_url?: string | null
}

type ClubRelation = {
  id: string
  nombre: string
}

type ClubMembership = {
  id: string
  rol: string | null
  estado: string | null
  club_id: string
  clubes?: ClubRelation | ClubRelation[] | null
}

const CLUB_STAFF_ROLES = ['ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR']

function normalizeRole(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? ''
}

function isClubStaffRole(value: string | null | undefined) {
  return CLUB_STAFF_ROLES.includes(normalizeRole(value))
}

function isActiveStatus(value: string | null | undefined) {
  return normalizeRole(value) === 'ACTIVO'
}

// GET: Obtener equipos del usuario
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createSupabaseRouteHandler(cookieStore)

    // Verificar sesión
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

    const clubDb = createSupabaseAdmin() ?? supabase

    const { data: clubesUsuario, error: clubesError } = await clubDb
      .from('miembros_club')
      .select(
        `
        id,
        rol,
        estado,
        club_id,
        clubes (
          id,
          nombre
        )
      `
      )
      .eq('usuario_id', user.id)

    console.log('clubesUsuario', clubesUsuario)
    console.log('clubesError', clubesError)

    if (clubesError) {
      console.error('Error obteniendo clubes:', clubesError)
    }

    let clubes = ((clubesUsuario || []) as ClubMembership[])
      .filter((membership) => isActiveStatus(membership.estado) && isClubStaffRole(membership.rol))
      .map((membership) => {
        const clubRaw = membership.clubes
        const club = Array.isArray(clubRaw) ? clubRaw[0] : clubRaw

        return {
          id: membership.id,
          club_id: membership.club_id,
          rol: membership.rol || 'ADMINISTRATIVO',
          estado: membership.estado || 'ACTIVO',
          club: club
            ? {
                id: club.id,
                nombre: club.nombre,
              }
            : null,
        }
      })

    if (clubesError || clubes.some((membership) => !membership.club)) {
      const { data: miembrosClubFallback, error: miembrosClubFallbackError } = await clubDb
        .from('miembros_club')
        .select('id, rol, estado, club_id')
        .eq('usuario_id', user.id)

      console.log('miembrosClubFallback', miembrosClubFallback)
      console.log('miembrosClubFallbackError', miembrosClubFallbackError)

      if (!miembrosClubFallbackError) {
        const memberships = ((miembrosClubFallback || []) as ClubMembership[]).filter(
          (membership) => isActiveStatus(membership.estado) && isClubStaffRole(membership.rol)
        )
        const clubIds = [...new Set(memberships.map((membership) => membership.club_id).filter(Boolean))]
        const { data: clubsById, error: clubsByIdError } = clubIds.length
          ? await clubDb.from('clubes').select('id, nombre').in('id', clubIds)
          : { data: [], error: null }

        console.log('clubsByIdFallback', clubsById)
        console.log('clubsByIdFallbackError', clubsByIdError)

        const clubById = new Map(
          ((clubsById || []) as ClubRelation[]).map((club) => [club.id, club])
        )

        clubes = memberships.map((membership) => {
          const club = clubById.get(membership.club_id) ?? null

          return {
            id: membership.id,
            club_id: membership.club_id,
            rol: normalizeRole(membership.rol) || 'ADMINISTRATIVO',
            estado: membership.estado || 'ACTIVO',
            club: club
              ? {
                  id: club.id,
                  nombre: club.nombre,
                }
              : {
                  id: membership.club_id,
                  nombre: `Club ${membership.club_id.slice(0, 8)}`,
                },
          }
        })
      }
    }

    return NextResponse.json({
      ok: true,
      equipos: equiposConConteo,
      clubes,
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
          { ok: false, error: 'Error al cerrar sesión' },
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
