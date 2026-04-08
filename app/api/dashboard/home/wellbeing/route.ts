import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type WellbeingPatchBody = {
  equipoId?: unknown
  mentalState?: unknown
  fatigue?: unknown
  attendingTraining?: unknown
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function getMadridDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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

    if (!equipoId) {
      return createErrorResponse('equipoId invalido.', 400)
    }

    if (mentalState === null || fatigue === null || attendingTraining === null) {
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

    const todayDateKey = getMadridDateKey(new Date())
    const upsertPayload: {
      equipo_id: string
      usuario_id: string
      fecha: string
      estado_mental?: number | null
      fatiga?: number | null
      asiste_entrenamiento?: boolean | null
      actualizado_en: string
    } = {
      equipo_id: equipoId,
      usuario_id: user.id,
      fecha: todayDateKey,
      actualizado_en: new Date().toISOString(),
    }

    if (mentalState !== undefined) {
      upsertPayload.estado_mental = mentalState
    }
    if (fatigue !== undefined) {
      upsertPayload.fatiga = fatigue
    }
    if (attendingTraining !== undefined) {
      upsertPayload.asiste_entrenamiento = attendingTraining
    }

    const { data: row, error: saveError } = await supabase
      .from('home_bienestar_diario')
      .upsert(upsertPayload, {
        onConflict: 'equipo_id,usuario_id,fecha',
      })
      .select('estado_mental, fatiga, asiste_entrenamiento')
      .single()

    if (saveError || !row) {
      return createErrorResponse('No se pudo guardar el estado diario.', 500)
    }

    const { count, error: countError } = await supabase
      .from('home_bienestar_diario')
      .select('id', { count: 'exact', head: true })
      .eq('equipo_id', equipoId)
      .eq('fecha', todayDateKey)
      .eq('asiste_entrenamiento', true)

    if (countError) {
      return createErrorResponse('No se pudo calcular la asistencia del dia.', 500)
    }

    return NextResponse.json({
      ok: true,
      wellbeing: {
        date: todayDateKey,
        mentalState: row.estado_mental ?? null,
        fatigue: row.fatiga ?? null,
        attendingTraining: row.asiste_entrenamiento ?? null,
        attendingCount: Number(count ?? 0),
      },
    })
  } catch (error) {
    console.error('Error en POST /api/dashboard/home/wellbeing:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
