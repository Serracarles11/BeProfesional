import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { ChatRole, decodeChatContent } from '@/lib/chat/envelope'

type ChatMessageRow = {
  id: string
  chat_id: string
  emisor_id: string
  contenido: string
  creado_en: string
}

type SavedRow = {
  mensaje_id: string
  creado_en: string
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function getMessageId(body: unknown) {
  if (!body || typeof body !== 'object') return null
  const candidate = body as { mensajeId?: unknown }
  if (typeof candidate.mensajeId !== 'string') return null
  const trimmed = candidate.mensajeId.trim()
  return trimmed.length > 0 ? trimmed : null
}

function mapMessage(row: ChatMessageRow, userId: string) {
  const fallbackRole: ChatRole = row.emisor_id === userId ? 'user' : 'assistant'
  const decoded = decodeChatContent(row.contenido, fallbackRole)

  return {
    id: row.id,
    role: decoded.role,
    content: decoded.text,
    createdAt: row.creado_en,
  }
}

export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get('chatId')

    if (!chatId) {
      return NextResponse.json({
        ok: true,
        chatId: null,
        savedMessageIds: [],
        savedMessages: [],
      })
    }

    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const { data: messageRows, error: messagesError } = await supabase
      .from('chat_mensajes')
      .select('id, chat_id, emisor_id, contenido, creado_en')
      .eq('chat_id', chatId)

    if (messagesError) {
      return createErrorResponse('No se pudieron cargar los mensajes del chat.', 500)
    }

    const messages = (messageRows ?? []) as ChatMessageRow[]

    if (messages.length === 0) {
      return NextResponse.json({
        ok: true,
        chatId,
        savedMessageIds: [],
        savedMessages: [],
      })
    }

    const messageIds = messages.map((message) => message.id)
    const messageMap = new Map(
      messages.map((message) => [message.id, mapMessage(message, user.id)])
    )

    const { data: savedRows, error: savedError } = await supabase
      .from('chat_mensajes_guardados')
      .select('mensaje_id, creado_en')
      .eq('usuario_id', user.id)
      .in('mensaje_id', messageIds)
      .order('creado_en', { ascending: false })

    if (savedError) {
      return createErrorResponse('No se pudieron cargar los guardados.', 500)
    }

    const saved = (savedRows ?? []) as SavedRow[]
    const savedMessageIds = saved.map((item) => item.mensaje_id)
    const savedMessages = saved
      .map((item) => {
        const message = messageMap.get(item.mensaje_id)
        if (!message) return null

        return {
          ...message,
          savedAt: item.creado_en,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return NextResponse.json({
      ok: true,
      chatId,
      savedMessageIds,
      savedMessages,
    })
  } catch (error) {
    console.error('Error en GET /api/chat/guardados:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const mensajeId = getMessageId(body)

    if (!mensajeId) {
      return createErrorResponse('mensajeId invalido.', 400)
    }

    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const { error } = await supabase
      .from('chat_mensajes_guardados')
      .upsert(
        {
          usuario_id: user.id,
          mensaje_id: mensajeId,
        },
        {
          onConflict: 'usuario_id,mensaje_id',
          ignoreDuplicates: true,
        }
      )

    if (error) {
      return createErrorResponse('No se pudo guardar el mensaje.', 500)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error en POST /api/chat/guardados:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const mensajeId = request.nextUrl.searchParams.get('mensajeId')?.trim() ?? null

    if (!mensajeId) {
      return createErrorResponse('mensajeId invalido.', 400)
    }

    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const { error } = await supabase
      .from('chat_mensajes_guardados')
      .delete()
      .eq('usuario_id', user.id)
      .eq('mensaje_id', mensajeId)

    if (error) {
      return createErrorResponse('No se pudo quitar el mensaje guardado.', 500)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error en DELETE /api/chat/guardados:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
