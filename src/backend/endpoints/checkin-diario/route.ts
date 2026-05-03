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
