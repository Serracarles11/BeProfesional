import { NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const CLUB_STAFF_ROLES = ['ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR']

type ClubMembershipRow = {
  id: string
  rol: string
  estado: string
  club_id: string
  clubes?: { id: string; nombre: string } | { id: string; nombre: string }[] | null
}

function normalizeClub(clubes: ClubMembershipRow['clubes']) {
  if (Array.isArray(clubes)) return clubes[0] ?? null
  return clubes ?? null
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 })
    }

    const { data, error } = await supabase
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
      .eq('estado', 'ACTIVO')
      .in('rol', CLUB_STAFF_ROLES)
      .limit(1)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    const row = (data?.[0] ?? null) as ClubMembershipRow | null
    const club = row ? normalizeClub(row.clubes) : null

    return NextResponse.json({
      ok: true,
      membership:
        row && club
          ? {
              id: row.id,
              role: row.rol,
              status: row.estado,
              clubId: row.club_id,
              clubName: club.nombre,
            }
          : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
