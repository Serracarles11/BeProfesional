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

    const { data: trainings, error: trainingsError } = await supabase
      .from('entrenamientos_equipo')
      .select('lugar')
      .eq('equipo_id', equipoId)
      .not('lugar', 'is', null)
      .order('creado_en', { ascending: false })
      .limit(200)

    if (trainingsError) {
      return createErrorResponse('No se pudieron cargar los campos de futbol.', 500)
    }

    const fromTeam = (trainings ?? [])
      .map((item) => (typeof item.lugar === 'string' ? normalizeFieldName(item.lugar) : ''))
      .filter((item) => item.length > 0)

    const merged = [...fromTeam, ...DEFAULT_FOOTBALL_FIELDS]
    const unique = Array.from(new Set(merged))

    return NextResponse.json({
      ok: true,
      fields: unique,
    })
  } catch (error) {
    console.error('Error en GET /api/dashboard/home/fields:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
