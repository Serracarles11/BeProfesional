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
  targetPlayerIds?: unknown
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

function parseTargetPlayerIds(value: unknown) {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return Array.from(new Set(normalized))
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
    const targetPlayerIds = parseTargetPlayerIds(body.targetPlayerIds)

    if (!equipoId) return createErrorResponse('equipoId invalido.', 400)
    if (!date || !isValidDate(date)) return createErrorResponse('Fecha invalida.', 400)
    if (!title) return createErrorResponse('Titulo invalido.', 400)
    if (!type) return createErrorResponse('Tipo de entrenamiento invalido.', 400)
    if (time && !isValidTime(time)) return createErrorResponse('Hora invalida.', 400)
    if (targetPlayerIds === null) {
      return createErrorResponse('Destinatarios invalidos.', 400)
    }

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

    if (targetPlayerIds.length > 0) {
      const { data: targetPlayers, error: targetPlayersError } = await supabase
        .from('miembros_equipo')
        .select('usuario_id, rol')
        .eq('equipo_id', equipoId)
        .eq('estado', 'ACTIVO')
        .in('usuario_id', targetPlayerIds)

      if (targetPlayersError) {
        return createErrorResponse('No se pudieron validar los destinatarios del entrenamiento.', 500)
      }

      const validPlayerIds = new Set(
        (targetPlayers ?? [])
          .filter((item) => typeof item.rol === 'string' && item.rol.toUpperCase().includes('JUG'))
          .map((item) => item.usuario_id)
      )

      if (validPlayerIds.size !== targetPlayerIds.length) {
        return createErrorResponse('Algunos destinatarios no son jugadores validos del equipo.', 400)
      }
    }

    const trainingId = crypto.randomUUID()
    const startTime = time ? `${time}:00` : null
    const normalizedPlace = place || null

    const insertPayload: {
      id: string
      equipo_id: string
      fecha: string
      titulo: string
      tipo: TrainingType
      estado: 'PUBLICADO'
      creado_por: string
      hora_inicio?: string
      lugar?: string
    } = {
      id: trainingId,
      equipo_id: equipoId,
      fecha: date,
      titulo: title,
      tipo: type,
      estado: 'PUBLICADO',
      creado_por: user.id,
    }

    if (startTime) {
      insertPayload.hora_inicio = startTime
    }
    if (normalizedPlace) {
      insertPayload.lugar = normalizedPlace
    }

    const { error } = await supabase.from('entrenamientos_equipo').insert(insertPayload)

    if (error) {
      console.error('No se pudo insertar el entrenamiento en Supabase:', error)
      return createErrorResponse('No se pudo crear el entrenamiento.', 500)
    }

    if (targetPlayerIds.length > 0) {
      const { error: recipientsError } = await supabase.from('entrenamiento_destinatarios').insert(
        targetPlayerIds.map((usuarioId) => ({
          entrenamiento_id: trainingId,
          usuario_id: usuarioId,
        }))
      )

      if (recipientsError) {
        console.error('No se pudieron insertar los destinatarios del entrenamiento en Supabase:', recipientsError)
        await supabase.from('entrenamientos_equipo').delete().eq('id', trainingId)
        return createErrorResponse('No se pudo asignar el entrenamiento a los jugadores seleccionados.', 500)
      }
    }

    return NextResponse.json({
      ok: true,
      training: {
        id: trainingId,
        fecha: date,
        hora_inicio: startTime,
        titulo: title,
        tipo: type,
        estado: 'PUBLICADO',
        lugar: normalizedPlace,
        targetPlayerIds,
      },
    })
  } catch (error) {
    console.error('Error en POST /api/dashboard/home/trainings:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const url = new URL(request.url)
    const equipoId = url.searchParams.get('equipoId')?.trim() ?? ''
    const trainingId = url.searchParams.get('trainingId')?.trim() ?? ''

    if (!equipoId) return createErrorResponse('equipoId invalido.', 400)
    if (!trainingId) return createErrorResponse('trainingId invalido.', 400)

    const [membershipResult, teamOwnerResult, trainingResult] = await Promise.all([
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
      supabase
        .from('entrenamientos_equipo')
        .select('id')
        .eq('id', trainingId)
        .eq('equipo_id', equipoId)
        .maybeSingle(),
    ])

    if (teamOwnerResult.error) {
      return createErrorResponse('No se pudo validar el equipo.', 500)
    }

    const isTeamOwner = teamOwnerResult.data?.creado_por === user.id

    if (membershipResult.error && !isTeamOwner) {
      return createErrorResponse('No se pudo validar tu rol en el equipo.', 500)
    }

    if (!membershipResult.data && !isTeamOwner) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    if (!isTeamOwner && !isCoachRole(membershipResult.data?.rol)) {
      return createErrorResponse('Solo un entrenador puede eliminar entrenamientos.', 403)
    }

    if (trainingResult.error) {
      return createErrorResponse('No se pudo validar el entrenamiento.', 500)
    }

    if (!trainingResult.data) {
      return createErrorResponse('El entrenamiento no existe.', 404)
    }

    const { error: deleteError } = await supabase
      .from('entrenamientos_equipo')
      .delete()
      .eq('id', trainingId)
      .eq('equipo_id', equipoId)

    if (deleteError) {
      return createErrorResponse('No se pudo eliminar el entrenamiento.', 500)
    }

    return NextResponse.json({
      ok: true,
      deletedTrainingId: trainingId,
    })
  } catch (error) {
    console.error('Error en DELETE /api/dashboard/home/trainings:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
