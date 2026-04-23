import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type WellbeingPatchBody = {
  equipoId?: unknown
  mentalState?: unknown
  fatigue?: unknown
  attendingTraining?: unknown
  trainingId?: unknown
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback
  const payload = error as { message?: string; details?: string; hint?: string; code?: string }
  return [payload.message, payload.details, payload.hint, payload.code].filter(Boolean).join(' | ') || fallback
}

function isPresentAttendanceState(estado: unknown) {
  if (typeof estado !== 'string') return false
  const normalized = estado
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  if (!normalized) return false
  if (normalized.includes('AUSEN') || normalized.includes('NO_ASIST') || normalized.includes('FALTA')) return false
  return normalized.includes('ASIST') || normalized.includes('PRES') || normalized === 'CONFIRMADO' || normalized === 'OK'
}

function getMadridDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getMadridTimeValue(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function parseScore(value: unknown) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < 1 || value > 10) return null
  return value
}

function parseBoolean(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') return null
  return value
}

function parseTrainingId(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

async function buildWellbeingResponse(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  equipoId: string,
  userId: string,
  todayDateKey: string,
  now: Date,
  selectedTrainingId?: string | null
) {
  const currentTime = getMadridTimeValue(now)
  const [todayRowResult, trainingsResult] = await Promise.all([
    supabase
      .from('home_bienestar_diario')
      .select('estado_mental, estado_mental_actualizado_en, fatiga, fatiga_actualizada_en')
      .eq('equipo_id', equipoId)
      .eq('usuario_id', userId)
      .eq('fecha', todayDateKey)
      .maybeSingle(),
    supabase
      .from('entrenamientos_equipo')
      .select('id, fecha, hora_inicio, titulo')
      .eq('equipo_id', equipoId)
      .gte('fecha', todayDateKey)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(20),
  ])

  if (todayRowResult.error || trainingsResult.error) {
    return null
  }

  const trainings = (trainingsResult.data ?? []).filter((training) => {
    if (!training.fecha) return false
    if (training.fecha > todayDateKey) return true
    if (training.fecha < todayDateKey) return false
    return !training.hora_inicio || training.hora_inicio >= currentTime
  })

  const audienceRowsResult = trainings.length > 0
    ? await supabase
        .from('entrenamiento_destinatarios')
        .select('entrenamiento_id, usuario_id')
        .in('entrenamiento_id', trainings.map((training) => training.id))
    : { data: [], error: null }

  if (audienceRowsResult.error) {
    return null
  }

  const visibleTrainings = trainings.filter((training) => {
    const audience = (audienceRowsResult.data ?? [])
      .filter((row) => row.entrenamiento_id === training.id)
      .map((row) => row.usuario_id)
    if (audience.length === 0) return true
    return audience.includes(userId)
  })

  let attendanceRows: Array<{ entrenamiento_id: string; usuario_id: string; asiste: boolean }> = []

  if (visibleTrainings.length > 0) {
    const currentAttendanceResult = await supabase
      .from('entrenamiento_asistencias')
      .select('entrenamiento_id, usuario_id, asiste')
      .eq('equipo_id', equipoId)
      .in('entrenamiento_id', visibleTrainings.map((training) => training.id))

    if (!currentAttendanceResult.error) {
      attendanceRows = (currentAttendanceResult.data ?? []) as Array<{
        entrenamiento_id: string
        usuario_id: string
        asiste: boolean
      }>
    } else {
      const legacyAttendanceResult = await supabase
        .from('asistencia_entrenamientos')
        .select('entrenamiento_id, jugador_id, estado')
        .in('entrenamiento_id', visibleTrainings.map((training) => training.id))

      if (legacyAttendanceResult.error) {
        console.error('buildWellbeingResponse attendance error:', {
          current: currentAttendanceResult.error,
          legacy: legacyAttendanceResult.error,
        })
        return null
      }

      attendanceRows = ((legacyAttendanceResult.data ?? []) as Array<Record<string, unknown>>).flatMap((row) => {
        const entrenamientoId = typeof row.entrenamiento_id === 'string' ? row.entrenamiento_id : null
        const usuarioId = typeof row.jugador_id === 'string' ? row.jugador_id : null
        if (!entrenamientoId || !usuarioId) return []
        return [
          {
            entrenamiento_id: entrenamientoId,
            usuario_id: usuarioId,
            asiste: isPresentAttendanceState(row.estado),
          },
        ]
      })
    }
  }

  const attendanceByTraining = new Map<
    string,
    Array<{ entrenamiento_id: string; usuario_id: string; asiste: boolean }>
  >()
  for (const row of attendanceRows) {
    const bucket = attendanceByTraining.get(row.entrenamiento_id) ?? []
    bucket.push(row)
    attendanceByTraining.set(row.entrenamiento_id, bucket)
  }

  const attendanceOptions = visibleTrainings.map((training) => {
    const rows = attendanceByTraining.get(training.id) ?? []
    const userAttendance = rows.find((row) => row.usuario_id === userId)
    const timeLabel = training.hora_inicio ? training.hora_inicio.slice(0, 5) : null

    return {
      id: training.id,
      label: `${training.titulo || 'Entrenamiento'}${timeLabel ? ` · ${timeLabel}` : ''}`,
      date: training.fecha,
      time: training.hora_inicio ? `${training.fecha}T${training.hora_inicio}` : null,
      attending: userAttendance?.asiste ?? null,
      attendingCount: rows.filter((row) => row.asiste).length,
    }
  })

  const selectedOption =
    (selectedTrainingId
      ? attendanceOptions.find((option) => option.id === selectedTrainingId)
      : null) ?? attendanceOptions[0] ?? null

  return {
    date: todayDateKey,
    mentalState: todayRowResult.data?.estado_mental ?? null,
    mentalStateUpdatedAt: todayRowResult.data?.estado_mental_actualizado_en ?? null,
    fatigue: todayRowResult.data?.fatiga ?? null,
    fatigueUpdatedAt: todayRowResult.data?.fatiga_actualizada_en ?? null,
    attendanceDate: selectedOption?.date ?? null,
    attendanceTrainingId: selectedOption?.id ?? null,
    attendanceTrainingLabel: selectedOption?.label ?? null,
    attendanceOptions,
    attendingTraining: selectedOption?.attending ?? null,
    attendingCount: selectedOption?.attendingCount ?? 0,
  }
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

    const body = (await request.json()) as WellbeingPatchBody
    const equipoId = typeof body.equipoId === 'string' ? body.equipoId.trim() : ''
    const mentalState = parseScore(body.mentalState)
    const fatigue = parseScore(body.fatigue)
    const attendingTraining = parseBoolean(body.attendingTraining)
    const trainingId = parseTrainingId(body.trainingId)

    if (!equipoId) {
      return createErrorResponse('equipoId invalido.', 400)
    }

    if (mentalState === null || fatigue === null || attendingTraining === null || trainingId === null) {
      return createErrorResponse('Valores invalidos. Mental y fatiga deben ser enteros del 1 al 10.', 400)
    }

    if (
      mentalState === undefined &&
      fatigue === undefined &&
      attendingTraining === undefined
    ) {
      return createErrorResponse('No hay campos para actualizar.', 400)
    }

    const { data: membership, error: membershipError } = await supabase
      .from('miembros_equipo')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .maybeSingle()

    if (membershipError) {
      return createErrorResponse('No se pudo validar tu membresia del equipo.', 500)
    }

    if (!membership) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const todayDateKey = getMadridDateKey(now)

    if (mentalState !== undefined || fatigue !== undefined) {
      const todayPayload: {
        equipo_id: string
        usuario_id: string
        fecha: string
        estado_mental?: number | null
        estado_mental_actualizado_en?: string | null
        fatiga?: number | null
        fatiga_actualizada_en?: string | null
        actualizado_en: string
      } = {
        equipo_id: equipoId,
        usuario_id: user.id,
        fecha: todayDateKey,
        actualizado_en: nowIso,
      }

      if (mentalState !== undefined) {
        todayPayload.estado_mental = mentalState
        todayPayload.estado_mental_actualizado_en = nowIso
      }
      if (fatigue !== undefined) {
        todayPayload.fatiga = fatigue
        todayPayload.fatiga_actualizada_en = nowIso
      }

      const { error: todaySaveError } = await supabase
        .from('home_bienestar_diario')
        .upsert(todayPayload, {
          onConflict: 'equipo_id,usuario_id,fecha',
        })

      if (todaySaveError) {
        console.error('Wellbeing daily save error:', todaySaveError)
        return createErrorResponse(`No se pudo guardar el estado diario. ${getErrorMessage(todaySaveError, '')}`.trim(), 500)
      }

      const checkinPayload: {
        equipo_id: string
        jugador_id: string
        fecha: string
        animo?: number | null
        fatiga?: number | null
      } = {
        equipo_id: equipoId,
        jugador_id: user.id,
        fecha: todayDateKey,
      }

      if (mentalState !== undefined) {
        checkinPayload.animo = mentalState
      }
      if (fatigue !== undefined) {
        checkinPayload.fatiga = fatigue
      }

      const existingCheckinResult = await supabase
        .from('checkins_diarios')
        .select('id')
        .eq('equipo_id', equipoId)
        .eq('jugador_id', user.id)
        .eq('fecha', todayDateKey)
        .limit(1)
        .maybeSingle()

      if (existingCheckinResult.error) {
        console.error('Check-in lookup error:', existingCheckinResult.error)
        return createErrorResponse(
          `No se pudo comprobar el check-in diario. ${getErrorMessage(existingCheckinResult.error, '')}`.trim(),
          500
        )
      }

      const checkinSaveError = existingCheckinResult.data?.id
        ? (
            await supabase
              .from('checkins_diarios')
              .update(checkinPayload)
              .eq('id', existingCheckinResult.data.id)
          ).error
        : (
            await supabase
              .from('checkins_diarios')
              .insert(checkinPayload)
          ).error

      if (checkinSaveError) {
        console.error('Check-in daily save error:', checkinSaveError)
        return createErrorResponse(
          `No se pudo guardar la fatiga en check-ins. ${getErrorMessage(checkinSaveError, '')}`.trim(),
          500
        )
      }
    }

    if (attendingTraining !== undefined) {
      if (!trainingId) {
        return createErrorResponse('Debes seleccionar un entrenamiento.', 400)
      }

      const { data: training, error: trainingError } = await supabase
        .from('entrenamientos_equipo')
        .select('id, equipo_id')
        .eq('id', trainingId)
        .eq('equipo_id', equipoId)
        .maybeSingle()

      if (trainingError) {
        return createErrorResponse('No se pudo validar el entrenamiento.', 500)
      }
      if (!training) {
        return createErrorResponse('El entrenamiento no existe.', 404)
      }

      const currentAttendanceSave = await supabase
        .from('entrenamiento_asistencias')
        .upsert(
          {
            equipo_id: equipoId,
            entrenamiento_id: trainingId,
            usuario_id: user.id,
            asiste: attendingTraining,
            actualizado_en: nowIso,
          },
          {
            onConflict: 'entrenamiento_id,usuario_id',
          }
        )

      if (currentAttendanceSave.error) {
        const legacyAttendanceSave = await supabase
          .from('asistencia_entrenamientos')
          .upsert(
            {
              entrenamiento_id: trainingId,
              jugador_id: user.id,
              estado: attendingTraining ? 'ASISTE' : 'NO_ASISTE',
            },
            {
              onConflict: 'entrenamiento_id,jugador_id',
            }
          )

        if (legacyAttendanceSave.error) {
          console.error('Attendance save error:', {
            current: currentAttendanceSave.error,
            legacy: legacyAttendanceSave.error,
          })
          return createErrorResponse(
            `No se pudo guardar la asistencia del entrenamiento. ${getErrorMessage(currentAttendanceSave.error, '')}`.trim(),
            500
          )
        }
      }

      const wellbeingAttendanceSync = await supabase
        .from('home_bienestar_diario')
        .upsert(
          {
            equipo_id: equipoId,
            usuario_id: user.id,
            fecha: todayDateKey,
            asiste_entrenamiento: attendingTraining,
            actualizado_en: nowIso,
          },
          {
            onConflict: 'equipo_id,usuario_id,fecha',
          }
        )

      if (wellbeingAttendanceSync.error) {
        console.error('Wellbeing attendance sync error:', wellbeingAttendanceSync.error)
      }
    }

    const wellbeing = await buildWellbeingResponse(
      supabase,
      equipoId,
      user.id,
      todayDateKey,
      now,
      trainingId ?? undefined
    )

    if (!wellbeing) {
      return createErrorResponse('No se pudo reconstruir el estado de bienestar.', 500)
    }

    return NextResponse.json({
      ok: true,
      wellbeing,
    })
  } catch (error) {
    console.error('Error en POST /api/dashboard/home/wellbeing:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
