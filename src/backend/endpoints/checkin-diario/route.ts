import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import {
  ensureTodayDailyWellnessCheckin,
  getMadridDateKey,
  getTodayDailyWellnessCheckin,
  parseWellnessComment,
  parseWellnessScore,
  saveTodayDailyWellnessCheckin,
} from '@/backend/daily-wellness'

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function errorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return ''
  const payload = error as { message?: string; details?: string; hint?: string; code?: string }
  return [payload.message, payload.details, payload.hint, payload.code].filter(Boolean).join(' | ')
}

async function syncCheckinWithTeamTables(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  fecha: string,
  input: {
    fatiga: number
    estadoMental: number
    comentario: string | null
  }
) {
  const { data: memberships, error: membershipsError } = await supabase
    .from('miembros_equipo')
    .select('equipo_id')
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')

  if (membershipsError) return membershipsError

  const equipoIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((membership) => (typeof membership.equipo_id === 'string' ? membership.equipo_id : null))
        .filter((equipoId): equipoId is string => Boolean(equipoId))
    )
  )

  const nowIso = new Date().toISOString()

  for (const equipoId of equipoIds) {
    const homePayload = {
      equipo_id: equipoId,
      usuario_id: userId,
      fecha,
      estado_mental: input.estadoMental,
      estado_mental_actualizado_en: nowIso,
      fatiga: input.fatiga,
      fatiga_actualizada_en: nowIso,
      comentario: input.comentario,
      actualizado_en: nowIso,
    }

    const homeSave = await supabase
      .from('home_bienestar_diario')
      .upsert(homePayload, { onConflict: 'equipo_id,usuario_id,fecha' })

    if (homeSave.error) {
      const code = typeof homeSave.error.code === 'string' ? homeSave.error.code : ''
      const message = typeof homeSave.error.message === 'string' ? homeSave.error.message : ''
      const isMissingCommentColumn = code === '42703' || message.includes('comentario')

      if (!isMissingCommentColumn) return homeSave.error

      const fallbackHomePayload = {
        equipo_id: homePayload.equipo_id,
        usuario_id: homePayload.usuario_id,
        fecha: homePayload.fecha,
        estado_mental: homePayload.estado_mental,
        estado_mental_actualizado_en: homePayload.estado_mental_actualizado_en,
        fatiga: homePayload.fatiga,
        fatiga_actualizada_en: homePayload.fatiga_actualizada_en,
        actualizado_en: homePayload.actualizado_en,
      }
      const fallbackHomeSave = await supabase
        .from('home_bienestar_diario')
        .upsert(fallbackHomePayload, { onConflict: 'equipo_id,usuario_id,fecha' })

      if (fallbackHomeSave.error) return fallbackHomeSave.error
    }

    const checkinPayload = {
      equipo_id: equipoId,
      jugador_id: userId,
      fecha,
      animo: input.estadoMental,
      fatiga: input.fatiga,
      comentario: input.comentario,
    }

    const existingCheckin = await supabase
      .from('checkins_diarios')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('jugador_id', userId)
      .eq('fecha', fecha)
      .limit(1)
      .maybeSingle()

    if (existingCheckin.error) return existingCheckin.error

    const checkinSave = existingCheckin.data?.id
      ? await supabase.from('checkins_diarios').update(checkinPayload).eq('id', existingCheckin.data.id)
      : await supabase.from('checkins_diarios').insert(checkinPayload)

    if (checkinSave.error) return checkinSave.error
  }

  return null
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return errorResponse('No autorizado.', 401)

    const fecha = getMadridDateKey()
    const result = await ensureTodayDailyWellnessCheckin(supabase, user.id, fecha)

    if (result.error) {
      console.error('Daily check-in GET error:', result.error)
      return errorResponse(`No se pudo cargar el check-in. ${errorDetails(result.error)}`.trim(), 500)
    }

    return NextResponse.json({
      ok: true,
      fecha,
      checkin: result.data,
    })
  } catch (error) {
    console.error('Error en GET /api/checkin-diario:', error)
    return errorResponse('Error interno del servidor.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return errorResponse('No autorizado.', 401)

    const body = (await request.json().catch(() => null)) as
      | {
          fatiga?: unknown
          estadoMental?: unknown
          estado_mental?: unknown
          comentario?: unknown
        }
      | null

    if (!body) return errorResponse('Body inválido.', 400)

    const fatiga = parseWellnessScore(body.fatiga)
    const estadoMental = parseWellnessScore(body.estadoMental ?? body.estado_mental)
    const comentario = parseWellnessComment(body.comentario)

    if (fatiga === null || estadoMental === null) {
      return errorResponse('Fatiga y estado mental deben ser enteros entre 1 y 10.', 400)
    }

    const fecha = getMadridDateKey()
    const result = await saveTodayDailyWellnessCheckin(
      supabase,
      user.id,
      {
        fatiga,
        estadoMental,
        comentario,
      },
      fecha
    )

    if (result.error) {
      console.error('Daily check-in POST error:', result.error)
      return errorResponse(`No se pudo guardar el check-in. ${errorDetails(result.error)}`.trim(), 500)
    }

    const syncError = await syncCheckinWithTeamTables(supabase, user.id, fecha, {
      fatiga,
      estadoMental,
      comentario,
    })

    if (syncError) {
      console.error('Daily check-in team sync error:', syncError)
      return errorResponse(
        `El check-in se guardó, pero no se pudo sincronizar con la vista del equipo. ${errorDetails(syncError)}`.trim(),
        500
      )
    }

    const current = await getTodayDailyWellnessCheckin(supabase, user.id, fecha)

    return NextResponse.json({
      ok: true,
      fecha,
      checkin: current.data ?? result.data,
    })
  } catch (error) {
    console.error('Error en POST /api/checkin-diario:', error)
    return errorResponse('Error interno del servidor.', 500)
  }
}
