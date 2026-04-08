import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type MatchHomeAway = 'CASA' | 'FUERA'

type CreateMatchBody = {
  equipoId?: unknown
  date?: unknown
  time?: unknown
  opponent?: unknown
  homeAway?: unknown
  competition?: unknown
  place?: unknown
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function isCoachRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return normalized.includes('ENTREN') || normalized.includes('COACH') || normalized === 'ADMIN'
}

function parseHomeAway(value: unknown): MatchHomeAway | null {
  if (value === 'CASA' || value === 'FUERA') {
    return value
  }

  return null
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const body = (await request.json()) as CreateMatchBody
    const equipoId = typeof body.equipoId === 'string' ? body.equipoId.trim() : ''
    const date = typeof body.date === 'string' ? body.date.trim() : ''
    const time = typeof body.time === 'string' ? body.time.trim() : ''
    const opponent = typeof body.opponent === 'string' ? body.opponent.trim() : ''
    const homeAway = parseHomeAway(body.homeAway)
    const competition = typeof body.competition === 'string' ? body.competition.trim() : ''
    const place = typeof body.place === 'string' ? body.place.trim() : ''

    if (!equipoId) return createErrorResponse('equipoId invalido.', 400)
    if (!date || !isValidDate(date)) return createErrorResponse('Fecha invalida.', 400)
    if (!time || !isValidTime(time)) return createErrorResponse('Hora invalida.', 400)
    if (!opponent) return createErrorResponse('Rival invalido.', 400)
    if (!homeAway) return createErrorResponse('Condicion del partido invalida.', 400)

    const [membershipResult, teamOwnerResult] = await Promise.all([
      supabase
        .from('miembros_equipo')
        .select('rol')
        .eq('equipo_id', equipoId)
        .eq('usuario_id', user.id)
        .eq('estado', 'ACTIVO')
        .maybeSingle(),
      supabase
        .from('equipos')
        .select('creado_por')
        .eq('id', equipoId)
        .maybeSingle(),
    ])

    const membership = membershipResult.data
    const membershipError = membershipResult.error
    const teamOwner = teamOwnerResult.data
    const teamOwnerError = teamOwnerResult.error

    if (teamOwnerError) {
      return createErrorResponse('No se pudo validar el equipo.', 500)
    }

    const isTeamOwner = teamOwner?.creado_por === user.id

    if (membershipError && !isTeamOwner) {
      return createErrorResponse('No se pudo validar tu rol en el equipo.', 500)
    }

    if (!membership && !isTeamOwner) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    if (!isTeamOwner && !isCoachRole(membership?.rol)) {
      return createErrorResponse('Solo un entrenador puede crear partidos.', 403)
    }

    const matchId = crypto.randomUUID()
    const matchTimestamp = new Date(`${date}T${time}:00`)

    if (Number.isNaN(matchTimestamp.getTime())) {
      return createErrorResponse('Fecha u hora invalida.', 400)
    }

    const insertPayload: {
      id: string
      equipo_id: string
      fecha_hora: string
      casa_fuera: MatchHomeAway
      rival_nombre: string
      lugar?: string
      competicion?: string
      estado: 'PROGRAMADO'
      creado_por: string
    } = {
      id: matchId,
      equipo_id: equipoId,
      fecha_hora: matchTimestamp.toISOString(),
      casa_fuera: homeAway,
      rival_nombre: opponent,
      estado: 'PROGRAMADO',
      creado_por: user.id,
    }

    if (place) {
      insertPayload.lugar = place
    }
    if (competition) {
      insertPayload.competicion = competition
    }

    const { error } = await supabase.from('partidos').insert(insertPayload)

    if (error) {
      console.error('No se pudo insertar el partido en Supabase:', error)
      return createErrorResponse('No se pudo crear el partido.', 500)
    }

    return NextResponse.json({
      ok: true,
      match: {
        id: matchId,
      },
    })
  } catch (error) {
    console.error('Error en POST /api/dashboard/home/matches:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
