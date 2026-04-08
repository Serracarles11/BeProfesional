import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type TrainingType = 'FISICO' | 'TECNICO' | 'TACTICO' | 'RECUPERACION'

type CreateTrainingBody = {
  equipoId?: unknown
  date?: unknown
  time?: unknown
  title?: unknown
  type?: unknown
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

function parseTrainingType(value: unknown): TrainingType | null {
  if (
    value === 'FISICO' ||
    value === 'TECNICO' ||
    value === 'TACTICO' ||
    value === 'RECUPERACION'
  ) {
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

    const body = (await request.json()) as CreateTrainingBody
    const equipoId = typeof body.equipoId === 'string' ? body.equipoId.trim() : ''
    const date = typeof body.date === 'string' ? body.date.trim() : ''
    const time = typeof body.time === 'string' ? body.time.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const type = parseTrainingType(body.type)
    const place = typeof body.place === 'string' ? body.place.trim() : ''

    if (!equipoId) return createErrorResponse('equipoId invalido.', 400)
    if (!date || !isValidDate(date)) return createErrorResponse('Fecha invalida.', 400)
    if (!title) return createErrorResponse('Titulo invalido.', 400)
    if (!type) return createErrorResponse('Tipo de entrenamiento invalido.', 400)
    if (time && !isValidTime(time)) return createErrorResponse('Hora invalida.', 400)

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
      return createErrorResponse('Solo un entrenador puede crear entrenamientos.', 403)
    }

    const insertPayload: {
      equipo_id: string
      fecha: string
      titulo: string
      tipo: TrainingType
      estado: 'PUBLICADO'
      creado_por: string
      hora_inicio?: string
      lugar?: string
    } = {
      equipo_id: equipoId,
      fecha: date,
      titulo: title,
      tipo: type,
      estado: 'PUBLICADO',
      creado_por: user.id,
    }

    if (time) {
      insertPayload.hora_inicio = `${time}:00`
    }
    if (place) {
      insertPayload.lugar = place
    }

    const { data, error } = await supabase
      .from('entrenamientos_equipo')
      .insert(insertPayload)
      .select('id, fecha, hora_inicio, titulo, tipo, estado, lugar')
      .single()

    if (error || !data) {
      return createErrorResponse('No se pudo crear el entrenamiento.', 500)
    }

    return NextResponse.json({
      ok: true,
      training: data,
    })
  } catch (error) {
    console.error('Error en POST /api/dashboard/home/trainings:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
