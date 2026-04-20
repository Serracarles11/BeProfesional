import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type NotificationRow = {
  id: string
  tipo: string
  titulo: string
  mensaje: string | null
  enlace: string | null
  leida: boolean
  creado_en: string
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
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

    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 20)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
      : 20
    const db = createSupabaseAdmin() ?? supabase
    const [notificationsResult, unreadResult] = await Promise.all([
      db
        .from('notificaciones')
        .select('id, tipo, titulo, mensaje, leida, creado_en')
        .eq('usuario_id', user.id)
        .order('creado_en', { ascending: false })
        .limit(limit),
      db
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false),
    ])

    if (notificationsResult.error) {
      console.error('GET /api/notificaciones - notifications failed:', notificationsResult.error)
      return createErrorResponse('No se pudieron cargar las notificaciones.', 500)
    }

    if (unreadResult.error) {
      console.error('GET /api/notificaciones - unread count failed:', unreadResult.error)
    }

    return NextResponse.json({
      ok: true,
      unreadCount: unreadResult.count ?? 0,
      notifications: ((notificationsResult.data ?? []) as Omit<NotificationRow, 'enlace'>[]).map(
        (notification) => ({
          ...notification,
          enlace: null,
        })
      ),
    })
  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const body = (await request.json().catch(() => null)) as
      | {
          notificationId?: unknown
        }
      | null
    const notificationId =
      typeof body?.notificationId === 'string' ? body.notificationId.trim() : ''

    if (!notificationId) {
      return createErrorResponse('notificationId invalido.', 400)
    }

    const db = createSupabaseAdmin() ?? supabase
    const updateResult = await db
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', notificationId)
      .eq('usuario_id', user.id)

    if (updateResult.error) {
      console.error('PATCH /api/notificaciones - update failed:', updateResult.error)
      return createErrorResponse('No se pudo marcar la notificacion como leida.', 500)
    }

    return NextResponse.json({
      ok: true,
      notificationId,
    })
  } catch (error) {
    console.error('Error en PATCH /api/notificaciones:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
