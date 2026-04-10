import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const TEAM_CHAT_TITLE_PREFIX = 'TEAM_CHAT::'
const PRIVATE_CHAT_TITLE_PREFIX = 'PRIVATE_CHAT::'
const AI_CHAT_TITLE_PREFIX = 'AI_CHAT::'
const STAFF_ROLE_TOKENS = ['ENTREN', 'COACH', 'TECN', 'ADMIN', 'AUX', 'DELEG', 'STAFF']

type MembershipRow = {
  equipo_id: string
  rol: string | null
  fecha_alta: string | null
}

type TeamRow = {
  id: string
  nombre: string | null
}

type TeamMemberRow = {
  usuario_id: string
  rol: string | null
  fecha_alta: string | null
  perfiles:
    | {
        nombre: string | null
      }
    | null
    | {
        nombre: string | null
      }[]
}

type ChatRow = {
  id: string
  equipo_id: string
  titulo: string
  creado_por: string
  creado_en: string
}

type ChatChannel = {
  id: string
  kind: 'team' | 'private' | 'ai'
  label: string
  canSend: boolean
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
  if (!normalized) return false
  return STAFF_ROLE_TOKENS.some((token) => normalized.includes(token))
}

function isPlayerRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  if (!normalized) return false
  return normalized === 'JUGADOR' || normalized.includes('JUGADOR') || normalized.includes('JUG')
}

function getProfileName(raw: TeamMemberRow['perfiles']) {
  const profile = Array.isArray(raw) ? raw[0] : raw
  const name = profile?.nombre?.trim()
  return name || null
}

function getTeamChatTitle(equipoId: string) {
  return `${TEAM_CHAT_TITLE_PREFIX}${equipoId}`
}

function getPrivateChatTitle(coachId: string, playerId: string) {
  return `${PRIVATE_CHAT_TITLE_PREFIX}${coachId}::${playerId}`
}

function getAiChatTitle(userId: string) {
  return `${AI_CHAT_TITLE_PREFIX}${userId}`
}

async function ensureChat(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>,
  equipoId: string,
  title: string,
  creatorId: string
) {
  const existingResult = await supabase
    .from('chats')
    .select('id, equipo_id, titulo, creado_por, creado_en')
    .eq('equipo_id', equipoId)
    .eq('titulo', title)
    .order('creado_en', { ascending: false })
    .limit(1)

  if (existingResult.error) {
    throw new Error('No se pudo recuperar canales de chat.')
  }

  const existing = (existingResult.data ?? []) as ChatRow[]
  if (existing.length > 0) return existing[0]

  const createdResult = await supabase
    .from('chats')
    .insert({
      equipo_id: equipoId,
      titulo: title,
      creado_por: creatorId,
    })
    .select('id, equipo_id, titulo, creado_por, creado_en')
    .single()

  if (createdResult.error || !createdResult.data) {
    throw new Error('No se pudo crear el canal de chat.')
  }

  return createdResult.data as ChatRow
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

    const requestedTeamId = request.nextUrl.searchParams.get('equipo')?.trim() ?? null
    const requestedChatId = request.nextUrl.searchParams.get('chatId')?.trim() ?? null

    const membershipsResult = await supabase
      .from('miembros_equipo')
      .select('equipo_id, rol, fecha_alta')
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .order('fecha_alta', { ascending: false })

    if (membershipsResult.error) {
      return createErrorResponse('No se pudo validar el equipo activo.', 500)
    }

    const memberships = (membershipsResult.data ?? []) as MembershipRow[]
    if (memberships.length === 0) {
      return NextResponse.json({
        ok: true,
        equipoId: null,
        teamName: null,
        role: null,
        isCoach: false,
        channels: [],
        activeChatId: null,
      })
    }

    const activeMembership = requestedTeamId
      ? memberships.find((membership) => membership.equipo_id === requestedTeamId)
      : memberships[0]

    if (!activeMembership) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    const equipoId = activeMembership.equipo_id
    const role = activeMembership.rol ?? null
    const viewerIsCoach = isCoachRole(role)
    const teamResult = await supabase
      .from('equipos')
      .select('id, nombre')
      .eq('id', equipoId)
      .maybeSingle()

    const teamName =
      !teamResult.error && teamResult.data
        ? ((teamResult.data as TeamRow).nombre?.trim() || 'Equipo')
        : 'Equipo'

    const teamMembersResult = await supabase
      .from('miembros_equipo')
      .select('usuario_id, rol, fecha_alta, perfiles(nombre)')
      .eq('equipo_id', equipoId)
      .eq('estado', 'ACTIVO')
      .order('fecha_alta', { ascending: true })

    if (teamMembersResult.error) {
      return createErrorResponse('No se pudieron cargar los miembros del equipo.', 500)
    }

    const teamMembers = (teamMembersResult.data ?? []) as TeamMemberRow[]
    const teamChat = await ensureChat(supabase, equipoId, getTeamChatTitle(equipoId), user.id)
    const aiChat = await ensureChat(supabase, equipoId, getAiChatTitle(user.id), user.id)

    const channels: ChatChannel[] = [
      {
        id: teamChat.id,
        kind: 'team',
        label: 'Equipo',
        canSend: true,
      },
      {
        id: aiChat.id,
        kind: 'ai',
        label: 'BePro IA',
        canSend: true,
      },
    ]

    if (viewerIsCoach) {
      const players = teamMembers.filter(
        (member) => member.usuario_id !== user.id && isPlayerRole(member.rol)
      )

      for (const player of players) {
        const privateChat = await ensureChat(
          supabase,
          equipoId,
          getPrivateChatTitle(user.id, player.usuario_id),
          user.id
        )

        channels.push({
          id: privateChat.id,
          kind: 'private',
          label: `Privado - ${getProfileName(player.perfiles) ?? 'Jugador'}`,
          canSend: true,
        })
      }
    } else {
      const coach = teamMembers.find((member) => isCoachRole(member.rol))

      if (coach && coach.usuario_id !== user.id) {
        const privateChat = await ensureChat(
          supabase,
          equipoId,
          getPrivateChatTitle(coach.usuario_id, user.id),
          coach.usuario_id
        )

        channels.push({
          id: privateChat.id,
          kind: 'private',
          label: 'Privado - Entrenador',
          canSend: false,
        })
      }
    }

    const activeChatId =
      (requestedChatId && channels.some((channel) => channel.id === requestedChatId)
        ? requestedChatId
        : channels[0]?.id) ?? null

    return NextResponse.json({
      ok: true,
      equipoId,
      teamName,
      role,
      isCoach: viewerIsCoach,
      channels,
      activeChatId,
    })
  } catch (error) {
    console.error('Error en GET /api/chat:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'No se pudo preparar el chat.',
      500
    )
  }
}

export async function POST() {
  return createErrorResponse('Operacion no soportada en este endpoint.', 405)
}

