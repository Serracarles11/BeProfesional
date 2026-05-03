import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function isCoachRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return normalized.includes('ENTREN') || normalized.includes('COACH') || normalized === 'ADMIN'
}

function isPlayerRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return normalized.includes('JUG')
}

type AttendanceStatus = 'CONFIRMADO' | 'NO_VA' | 'SIN_RESPUESTA'

type AttendeeRow = {
  usuarioId: string
  nombre: string
  fotoUrl: string | null
  posicion: string | null
  estado: AttendanceStatus
  invitado: boolean
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

    const url = new URL(request.url)
    const equipoId = url.searchParams.get('equipoId')?.trim() ?? ''
    const trainingId = url.searchParams.get('trainingId')?.trim() ?? ''

    if (!equipoId) return createErrorResponse('equipoId inválido.', 400)
    if (!trainingId) return createErrorResponse('trainingId inválido.', 400)

    const [membershipResult, teamOwnerResult, trainingResult] = await Promise.all([
      supabase
        .from('miembros_equipo')
        .select('rol')
        .eq('equipo_id', equipoId)
        .eq('usuario_id', user.id)
        .eq('estado', 'ACTIVO')
        .maybeSingle(),
      supabase
        .from('equipos')
        .select('creado_por')
        .eq('id', equipoId)
        .maybeSingle(),
      supabase
        .from('entrenamientos_equipo')
        .select('id, titulo, fecha, hora_inicio')
        .eq('id', trainingId)
        .eq('equipo_id', equipoId)
        .maybeSingle(),
    ])

    if (teamOwnerResult.error) {
      return createErrorResponse('No se pudo validar el equipo.', 500)
    }

    const isTeamOwner = teamOwnerResult.data?.creado_por === user.id

    if (membershipResult.error && !isTeamOwner) {
      return createErrorResponse('No se pudo validar tu rol en el equipo.', 500)
    }

    if (!membershipResult.data && !isTeamOwner) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    if (!isTeamOwner && !isCoachRole(membershipResult.data?.rol)) {
      return createErrorResponse('Solo un entrenador puede consultar la asistencia.', 403)
    }

    if (trainingResult.error) {
      return createErrorResponse('No se pudo validar el entrenamiento.', 500)
    }

    if (!trainingResult.data) {
      return createErrorResponse('El entrenamiento no existe.', 404)
    }

    const adminClient = createSupabaseAdmin() ?? supabase

    const [playersResult, recipientsResult, attendancesResult] = await Promise.all([
      adminClient
        .from('miembros_equipo')
        .select('usuario_id, rol, perfiles(nombre, foto_url, posicion)')
        .eq('equipo_id', equipoId)
        .eq('estado', 'ACTIVO'),
      adminClient
        .from('entrenamiento_destinatarios')
        .select('usuario_id')
        .eq('entrenamiento_id', trainingId),
      adminClient
        .from('entrenamiento_asistencias')
        .select('usuario_id, asiste')
        .eq('entrenamiento_id', trainingId),
    ])

    if (playersResult.error) {
      return createErrorResponse('No se pudieron cargar los jugadores del equipo.', 500)
    }
    if (recipientsResult.error) {
      return createErrorResponse('No se pudieron cargar los destinatarios.', 500)
    }
    if (attendancesResult.error) {
      return createErrorResponse('No se pudieron cargar las asistencias.', 500)
    }

    const recipientIds = new Set(
      (recipientsResult.data ?? [])
        .map((row) => row.usuario_id)
        .filter((value): value is string => typeof value === 'string')
    )
    const hasExplicitRecipients = recipientIds.size > 0

    const attendanceByUser = new Map<string, boolean>()
    for (const row of attendancesResult.data ?? []) {
      if (typeof row.usuario_id === 'string') {
        attendanceByUser.set(row.usuario_id, Boolean(row.asiste))
      }
    }

    const players: AttendeeRow[] = []

    for (const member of playersResult.data ?? []) {
      const usuarioId = typeof member.usuario_id === 'string' ? member.usuario_id : null
      if (!usuarioId) continue
      if (!isPlayerRole(typeof member.rol === 'string' ? member.rol : null)) continue

      const profile = Array.isArray(member.perfiles) ? member.perfiles[0] : member.perfiles
      const nombre =
        (profile && typeof profile === 'object' && typeof (profile as { nombre?: unknown }).nombre === 'string'
          ? ((profile as { nombre: string }).nombre).trim()
          : '') || 'Jugador'
      const fotoUrl =
        profile && typeof profile === 'object' && typeof (profile as { foto_url?: unknown }).foto_url === 'string'
          ? ((profile as { foto_url: string }).foto_url).trim() || null
          : null
      const posicion =
        profile && typeof profile === 'object' && typeof (profile as { posicion?: unknown }).posicion === 'string'
          ? ((profile as { posicion: string }).posicion).trim() || null
          : null

      const invitado = hasExplicitRecipients ? recipientIds.has(usuarioId) : true

      let estado: AttendanceStatus = 'SIN_RESPUESTA'
      if (attendanceByUser.has(usuarioId)) {
        estado = attendanceByUser.get(usuarioId) ? 'CONFIRMADO' : 'NO_VA'
      }

      players.push({ usuarioId, nombre, fotoUrl, posicion, estado, invitado })
    }

    players.sort((left, right) => left.nombre.localeCompare(right.nombre, 'es', { sensitivity: 'base' }))

    const invited = players.filter((player) => player.invitado)
    const confirmed = invited.filter((player) => player.estado === 'CONFIRMADO').length
    const declined = invited.filter((player) => player.estado === 'NO_VA').length
    const noResponse = invited.filter((player) => player.estado === 'SIN_RESPUESTA').length

    return NextResponse.json({
      ok: true,
      training: {
        id: trainingId,
        titulo: trainingResult.data.titulo,
        fecha: trainingResult.data.fecha,
        hora_inicio: trainingResult.data.hora_inicio,
      },
      totals: {
        invited: invited.length,
        confirmed,
        declined,
        noResponse,
      },
      hasExplicitRecipients,
      players: invited,
    })
  } catch (error) {
    console.error('Error en GET /api/dashboard/home/trainings/attendees:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
