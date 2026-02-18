import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { ChatRole, decodeChatContent, encodeChatContent } from '@/lib/chat/envelope'

type ChatMessageRow = {
  id: string
  chat_id: string
  emisor_id: string
  contenido: string
  creado_en: string
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function parseRole(value: unknown): ChatRole | null {
  if (value === 'user' || value === 'assistant') return value
  return null
}

function mapMessageRow(row: ChatMessageRow, userId: string) {
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
        messages: [],
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

    const { data, error } = await supabase
      .from('chat_mensajes')
      .select('id, chat_id, emisor_id, contenido, creado_en')
      .eq('chat_id', chatId)
      .order('creado_en', { ascending: true })

    if (error) {
      return createErrorResponse('No se pudieron cargar los mensajes.', 500)
    }

    const messages = ((data ?? []) as ChatMessageRow[]).map((row) =>
      mapMessageRow(row, user.id)
    )

    return NextResponse.json({
      ok: true,
      chatId,
      messages,
    })
  } catch (error) {
    console.error('Error en GET /api/chat/mensajes:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const chatId = typeof body?.chatId === 'string' ? body.chatId : ''
    const role = parseRole(body?.role)
    const text = typeof body?.text === 'string' ? body.text.trim() : ''

    if (!chatId) {
      return createErrorResponse('chatId invalido.', 400)
    }

    if (!role) {
      return createErrorResponse('role invalido.', 400)
    }

    if (!text) {
      return createErrorResponse('text invalido.', 400)
    }

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const { data, error } = await supabase
      .from('chat_mensajes')
      .insert({
        chat_id: chatId,
        emisor_id: user.id,
        contenido: encodeChatContent(role, text),
      })
      .select('id, chat_id, emisor_id, contenido, creado_en')
      .single()

    if (error || !data) {
      return createErrorResponse('No se pudo guardar el mensaje.', 500)
    }

    return NextResponse.json({
      ok: true,
      message: mapMessageRow(data as ChatMessageRow, user.id),
    })
  } catch (error) {
    console.error('Error en POST /api/chat/mensajes:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
