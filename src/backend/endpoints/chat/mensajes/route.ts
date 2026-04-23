import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { notifyTeamMembers, notifyUsers } from '@/lib/notifications'
import { getServerOpenAiConfig, getServerOpenAiKeyError } from '@/lib/openai-server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { decodeChatContent, encodeChatContent } from '@/lib/chat/envelope'

const TEAM_CHAT_TITLE_PREFIX = 'TEAM_CHAT::'
const PRIVATE_CHAT_TITLE_PREFIX = 'PRIVATE_CHAT::'
const AI_CHAT_TITLE_PREFIX = 'AI_CHAT::'
const MAX_AI_CONTEXT_MESSAGES = 20
const AI_SYSTEM_PROMPT = `Eres BePro IA, un asistente de futbol para entrenadores y jugadores.
Responde siempre en espanol, de forma clara, breve y practica.
Ayuda con tactica, planificacion de entrenamientos, analisis de rendimiento y recuperacion fisica.`

type ChatRow = {
  id: string
  equipo_id: string
  titulo: string
  creado_por: string
  creado_en?: string
}

type ChatMessageRow = {
  id: string
  chat_id: string
  emisor_id: string
  contenido: string
  creado_en: string
}

type ProfileRow = {
  id: string
  nombre: string | null
}

type ChatAccess = {
  allowed: boolean
  canSend: boolean
  message?: string
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function parsePrivateParticipants(title: string) {
  const prefix = PRIVATE_CHAT_TITLE_PREFIX
  if (!title.startsWith(prefix)) return null

  const parts = title.slice(prefix.length).split('::')
  if (parts.length !== 2) return null

  const coachId = parts[0]?.trim() ?? ''
  const playerId = parts[1]?.trim() ?? ''
  if (!coachId || !playerId) return null

  return { coachId, playerId }
}

async function getChatAccess(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  chatId: string
) {
  const chatResult = await supabase
    .from('chats')
    .select('id, equipo_id, titulo, creado_por, creado_en')
    .eq('id', chatId)
    .maybeSingle()

  if (chatResult.error) {
    throw new Error('No se pudo validar el chat seleccionado.')
  }

  const chat = chatResult.data as ChatRow | null
  if (!chat) {
    return {
      access: {
        allowed: false,
        canSend: false,
        message: 'Chat no encontrado.',
      } satisfies ChatAccess,
      chat: null,
    }
  }

  const membershipResult = await supabase
    .from('miembros_equipo')
    .select('usuario_id')
    .eq('equipo_id', chat.equipo_id)
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  if (membershipResult.error) {
    throw new Error('No se pudo validar tu acceso al equipo del chat.')
  }

  if (!membershipResult.data) {
    return {
      access: {
        allowed: false,
        canSend: false,
        message: 'No perteneces al equipo de este chat.',
      } satisfies ChatAccess,
      chat,
    }
  }

  if (chat.titulo.startsWith(TEAM_CHAT_TITLE_PREFIX)) {
    return {
      access: {
        allowed: true,
        canSend: true,
      } satisfies ChatAccess,
      chat,
    }
  }

  if (chat.titulo.startsWith(PRIVATE_CHAT_TITLE_PREFIX)) {
    const participants = parsePrivateParticipants(chat.titulo)
    if (!participants) {
      return {
        access: {
          allowed: false,
          canSend: false,
          message: 'Canal privado invalido.',
        } satisfies ChatAccess,
        chat,
      }
    }

    const isCoach = userId === participants.coachId
    const isPlayer = userId === participants.playerId

    if (!isCoach && !isPlayer) {
      return {
        access: {
          allowed: false,
          canSend: false,
          message: 'No puedes acceder a este chat privado.',
        } satisfies ChatAccess,
        chat,
      }
    }

    return {
      access: {
        allowed: true,
        canSend: true,
      } satisfies ChatAccess,
      chat,
    }
  }

  return {
    access: {
      allowed: chat.creado_por === userId,
      canSend: chat.creado_por === userId,
      message: chat.creado_por === userId ? undefined : 'No puedes acceder a este chat.',
    } satisfies ChatAccess,
    chat,
  }
}

function normalizeMessageContent(rawContent: string, isMine: boolean) {
  const decoded = decodeChatContent(rawContent, isMine ? 'user' : 'assistant')
  return decoded.text
}

function isAiChatTitle(value: string) {
  return value.startsWith(AI_CHAT_TITLE_PREFIX)
}

async function notifyChatMessage(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>> | NonNullable<ReturnType<typeof createSupabaseAdmin>>
  chat: ChatRow | null
  senderId: string
  senderName: string
  text: string
}) {
  if (!params.chat || isAiChatTitle(params.chat.titulo)) return

  const payload = {
    tipo: 'MENSAJE_CHAT',
    titulo: params.senderName,
    mensaje: params.text,
    enlace: `/chat?equipo=${encodeURIComponent(params.chat.equipo_id)}`,
  }

  if (params.chat.titulo.startsWith(PRIVATE_CHAT_TITLE_PREFIX)) {
    const participants = parsePrivateParticipants(params.chat.titulo)
    if (!participants) return

    const recipientId =
      params.senderId === participants.coachId ? participants.playerId : participants.coachId
    await notifyUsers(params.supabase, [recipientId], payload)
    return
  }

  if (params.chat.titulo.startsWith(TEAM_CHAT_TITLE_PREFIX)) {
    await notifyTeamMembers(params.supabase, params.chat.equipo_id, payload, {
      excludeUserIds: [params.senderId],
    })
  }
}

async function generateAiReply(
  chatHistory: Array<{ contenido: string; emisor_id: string }>,
  userId: string,
  userText: string
) {
  const openAiConfig = getServerOpenAiConfig()
  if (!openAiConfig) {
    return getServerOpenAiKeyError()
  }
  const apiKey = openAiConfig.apiKey

  const openai = new OpenAI({ apiKey })
  const context: Array<{ role: 'user' | 'assistant'; content: string }> = chatHistory
    .slice(-MAX_AI_CONTEXT_MESSAGES)
    .map((item) => {
      const decoded = decodeChatContent(item.contenido, item.emisor_id === userId ? 'user' : 'assistant')
      return {
        role: decoded.role === 'assistant' ? 'assistant' : 'user',
        content: decoded.text,
      }
    })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system' as const, content: AI_SYSTEM_PROMPT },
      ...context,
      { role: 'user' as const, content: userText },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content?.trim() || 'No pude generar una respuesta en este momento.'
}

export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get('chatId')?.trim() ?? ''

    if (!chatId) {
      return NextResponse.json({
        ok: true,
        chatId: null,
        canSend: false,
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

    const { access, chat } = await getChatAccess(supabase, user.id, chatId)

    if (!access.allowed) {
      return createErrorResponse(access.message || 'No autorizado para este chat.', 403)
    }

    const activeChatResult = await supabase
      .from('chats')
      .select('id, equipo_id, titulo, creado_en')
      .eq('id', chatId)
      .maybeSingle()

    if (activeChatResult.error || !activeChatResult.data) {
      return createErrorResponse('No se pudo resolver el canal del chat.', 500)
    }

    const siblingChatsResult = await supabase
      .from('chats')
      .select('id')
      .eq('equipo_id', activeChatResult.data.equipo_id)
      .eq('titulo', activeChatResult.data.titulo)

    if (siblingChatsResult.error) {
      return createErrorResponse('No se pudieron resolver chats equivalentes.', 500)
    }

    const siblingChatIds = ((siblingChatsResult.data ?? []) as Array<{ id: string }>)
      .map((row) => row.id)
      .filter((id) => typeof id === 'string' && id.length > 0)

    const chatIds = siblingChatIds.length > 0 ? siblingChatIds : [chatId]

    const messagesResult = await supabase
      .from('chat_mensajes')
      .select('id, chat_id, emisor_id, contenido, creado_en')
      .in('chat_id', chatIds)
      .order('creado_en', { ascending: true })

    if (messagesResult.error) {
      return createErrorResponse('No se pudieron cargar los mensajes.', 500)
    }

    const rows = (messagesResult.data ?? []) as ChatMessageRow[]
    const senderIds = [...new Set(rows.map((row) => row.emisor_id))]

    const profileById = new Map<string, string>()
    if (senderIds.length > 0) {
      const profilesResult = await supabase.from('perfiles').select('id, nombre').in('id', senderIds)
      if (!profilesResult.error) {
        for (const profile of (profilesResult.data ?? []) as ProfileRow[]) {
          profileById.set(profile.id, profile.nombre?.trim() || 'Usuario')
        }
      }
    }

    const chatIsAi = chat ? isAiChatTitle(chat.titulo) : false

    const messages = rows.map((row) => {
      const fallbackRole = row.emisor_id === user.id ? 'user' : 'assistant'
      const decoded = decodeChatContent(row.contenido, fallbackRole)
      const fromAssistant = chatIsAi && decoded.role === 'assistant'
      const isMine = row.emisor_id === user.id && !fromAssistant

      return {
        id: row.id,
        content: decoded.text,
        createdAt: row.creado_en,
        senderId: row.emisor_id,
        senderName: fromAssistant ? 'BePro IA' : profileById.get(row.emisor_id) || (isMine ? 'Tu' : 'Usuario'),
        isMine,
      }
    })

    return NextResponse.json({
      ok: true,
      chatId,
      canSend: access.canSend,
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
    const chatId = typeof body?.chatId === 'string' ? body.chatId.trim() : ''
    const text = typeof body?.text === 'string' ? body.text.trim() : ''

    if (!chatId) {
      return createErrorResponse('chatId invalido.', 400)
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

    const { access, chat } = await getChatAccess(supabase, user.id, chatId)

    if (!access.allowed) {
      return createErrorResponse(access.message || 'No autorizado para este chat.', 403)
    }

    if (!access.canSend) {
      return createErrorResponse('No puedes enviar mensajes en este chat.', 403)
    }

    const insertResult = await supabase
      .from('chat_mensajes')
      .insert({
        chat_id: chatId,
        emisor_id: user.id,
        contenido: text,
      })
      .select('id, chat_id, emisor_id, contenido, creado_en')
      .single()

    if (insertResult.error || !insertResult.data) {
      return createErrorResponse('No se pudo guardar el mensaje.', 500)
    }

    const profileResult = await supabase.from('perfiles').select('nombre').eq('id', user.id).maybeSingle()
    const senderName =
      profileResult.error || !profileResult.data?.nombre?.trim()
        ? 'Tu'
        : profileResult.data.nombre.trim()
    const notificationSenderName = senderName === 'Tu' ? 'Usuario' : senderName

    const row = insertResult.data as ChatMessageRow

    await notifyChatMessage({
      supabase: createSupabaseAdmin() ?? supabase,
      chat,
      senderId: user.id,
      senderName: notificationSenderName,
      text,
    })

    if (chat && isAiChatTitle(chat.titulo)) {
      const historyResult = await supabase
        .from('chat_mensajes')
        .select('contenido, emisor_id')
        .eq('chat_id', chatId)
        .order('creado_en', { ascending: false })
        .limit(MAX_AI_CONTEXT_MESSAGES)

      const historyRows = historyResult.error
        ? []
        : ((historyResult.data ?? []) as Array<{ contenido: string; emisor_id: string }>).reverse()

      let assistantReply = ''
      try {
        assistantReply = await generateAiReply(historyRows, user.id, text)
      } catch {
        assistantReply = 'No pude responder ahora mismo. Intentalo de nuevo en unos segundos.'
      }

      await supabase.from('chat_mensajes').insert({
        chat_id: chatId,
        emisor_id: user.id,
        contenido: encodeChatContent('assistant', assistantReply),
      })
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: row.id,
        content: normalizeMessageContent(row.contenido, true),
        createdAt: row.creado_en,
        senderId: row.emisor_id,
        senderName,
        isMine: true,
      },
    })
  } catch (error) {
    console.error('Error en POST /api/chat/mensajes:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
