import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const DEFAULT_FOOTBALL_FIELDS = [
  'Campo principal',
  'Campo anexo',
  'Campo de futbol 11',
  'Campo de futbol 7',
  'Ciudad deportiva',
  'Pabellon municipal',
]

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function normalizeFieldName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const equipoId = request.nextUrl.searchParams.get('equipo')?.trim() ?? ''
    if (!equipoId) {
      return NextResponse.json({ ok: true, fields: DEFAULT_FOOTBALL_FIELDS })
    }

    const { data: membership, error: membershipError } = await supabase
      .from('miembros_equipo')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .maybeSingle()

    if (membershipError) {
      return createErrorResponse('No se pudo validar el equipo.', 500)
    }

    if (!membership) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    const [trainingsResult, playersResult] = await Promise.all([
      supabase
        .from('entrenamientos_equipo')
        .select('lugar')
        .eq('equipo_id', equipoId)
        .not('lugar', 'is', null)
        .order('creado_en', { ascending: false })
        .limit(200),
      supabase
        .from('miembros_equipo')
        .select('usuario_id, rol, perfiles(nombre)')
        .eq('equipo_id', equipoId)
        .eq('estado', 'ACTIVO'),
    ])

    const trainings = trainingsResult.data
    const trainingsError = trainingsResult.error

    if (trainingsError) {
      return createErrorResponse('No se pudieron cargar los campos de futbol.', 500)
    }

    if (playersResult.error) {
      return createErrorResponse('No se pudieron cargar los jugadores del equipo.', 500)
    }

    const fromTeam = (trainings ?? [])
      .map((item) => (typeof item.lugar === 'string' ? normalizeFieldName(item.lugar) : ''))
      .filter((item) => item.length > 0)

    const merged = [...fromTeam, ...DEFAULT_FOOTBALL_FIELDS]
    const unique = Array.from(new Set(merged))
    const players = (playersResult.data ?? [])
      .map((item) => {
        const role = typeof item.rol === 'string' ? item.rol.trim().toUpperCase() : ''
        const profile = Array.isArray(item.perfiles) ? item.perfiles[0] : item.perfiles

        if (!role.includes('JUG')) return null

        return {
          id: item.usuario_id,
          name: profile?.nombre?.trim() || 'Jugador',
        }
      })
      .filter((item): item is { id: string; name: string } => item !== null)
      .sort((left, right) => left.name.localeCompare(right.name, 'es-ES'))

    return NextResponse.json({
      ok: true,
      fields: unique,
      players,
    })
  } catch (error) {
    console.error('Error en GET /api/dashboard/home/fields:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
