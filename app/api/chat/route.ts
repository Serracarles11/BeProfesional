import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `Eres un asistente deportivo profesional especializado en futbol y gestion de equipos.
Tu nombre es BePro AI. Ayudas a entrenadores y jugadores con:
- Analisis tactico y estrategias de juego
- Planificacion de entrenamientos
- Analisis de rendimiento de jugadores
- Consejos de nutricion y preparacion fisica
- Motivacion y liderazgo deportivo
- Estadisticas y metricas de rendimiento

Responde siempre en espanol de forma clara, concisa y profesional.
Usa un tono amigable pero experto. Si te preguntan sobre algo fuera del ambito deportivo,
redirige la conversacion amablemente hacia temas deportivos.`

const AI_CHAT_TITLE = 'BePro AI'
const MAX_CONTEXT_MESSAGES = 20

type ChatRole = 'user' | 'assistant'

type MembershipRow = {
  equipo_id: string
  fecha_alta: string
}

type ChatRow = {
  id: string
  equipo_id: string
  creado_por: string
  titulo: string
  creado_en: string
}

type InputMessage = {
  role: ChatRole
  content: string
}

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function parseInputMessages(value: unknown) {
  if (!Array.isArray(value)) return [] as InputMessage[]

  return value
    .filter((item): item is InputMessage => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<InputMessage>
      return (
        (candidate.role === 'user' || candidate.role === 'assistant') &&
        typeof candidate.content === 'string' &&
        candidate.content.trim().length > 0
      )
    })
    .slice(-MAX_CONTEXT_MESSAGES)
}

async function getActiveTeamId(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  requestedTeamId?: string | null
) {
  const { data, error } = await supabase
    .from('miembros_equipo')
    .select('equipo_id, fecha_alta')
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .order('fecha_alta', { ascending: false })

  if (error) {
    throw new Error('No se pudo validar el equipo activo del usuario.')
  }

  const memberships = (data ?? []) as MembershipRow[]

  if (memberships.length === 0) {
    return null
  }

  if (requestedTeamId) {
    const found = memberships.find((item) => item.equipo_id === requestedTeamId)
    if (!found) {
      throw new Error('No perteneces al equipo seleccionado.')
    }
    return found.equipo_id
  }

  return memberships[0].equipo_id
}

async function getOrCreateAiChat(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  userId: string,
  equipoId: string,
  requestedChatId?: string | null
) {
  if (requestedChatId) {
    const { data, error } = await supabase
      .from('chats')
      .select('id, equipo_id, creado_por, titulo, creado_en')
      .eq('id', requestedChatId)
      .eq('creado_por', userId)
      .maybeSingle()

    if (error) {
      throw new Error('No se pudo validar el chat solicitado.')
    }

    if (data && data.equipo_id === equipoId) {
      return data as ChatRow
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('chats')
    .select('id, equipo_id, creado_por, titulo, creado_en')
    .eq('equipo_id', equipoId)
    .eq('creado_por', userId)
    .eq('titulo', AI_CHAT_TITLE)
    .order('creado_en', { ascending: false })
    .limit(1)

  if (existingError) {
    throw new Error('No se pudo recuperar el chat de IA.')
  }

  if (existingRows && existingRows.length > 0) {
    return existingRows[0] as ChatRow
  }

  const { data: created, error: createError } = await supabase
    .from('chats')
    .insert({
      equipo_id: equipoId,
      creado_por: userId,
      titulo: AI_CHAT_TITLE,
    })
    .select('id, equipo_id, creado_por, titulo, creado_en')
    .single()

  if (createError || !created) {
    throw new Error('No se pudo crear el chat de IA.')
  }

  return created as ChatRow
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

    const requestedTeamId = request.nextUrl.searchParams.get('equipo')
    const requestedChatId = request.nextUrl.searchParams.get('chatId')
    const equipoId = await getActiveTeamId(supabase, user.id, requestedTeamId)

    if (!equipoId) {
      return NextResponse.json({
        ok: true,
        chatId: null,
        equipoId: null,
      })
    }

    const chat = await getOrCreateAiChat(supabase, user.id, equipoId, requestedChatId)

    return NextResponse.json({
      ok: true,
      chatId: chat.id,
      equipoId,
    })
  } catch (error) {
    console.error('Error en GET /api/chat:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'No se pudo preparar el chat.',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return createErrorResponse(
        'La API key de OpenAI no esta configurada. Agrega OPENAI_API_KEY en las variables de entorno.',
        500
      )
    }

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const body = await request.json()
    const messages = parseInputMessages(body?.messages)

    if (messages.length === 0) {
      return createErrorResponse('Mensajes invalidos.', 400)
    }

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const reply = completion.choices[0]?.message?.content?.trim() || 'No pude generar una respuesta.'

    return NextResponse.json({
      ok: true,
      message: reply,
    })
  } catch (error) {
    console.error('Error en POST /api/chat:', error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return createErrorResponse('API key de OpenAI invalida. Verifica tu configuracion.', 401)
      }
      if (error.status === 429) {
        return createErrorResponse('Demasiadas solicitudes. Espera un momento e intenta de nuevo.', 429)
      }
    }

    return createErrorResponse('Error interno del servidor. Intenta de nuevo.', 500)
  }
}
