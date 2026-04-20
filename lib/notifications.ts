import type { SupabaseClient } from '@supabase/supabase-js'

type NotificationClient = Pick<SupabaseClient, 'from'>

type TeamMemberNotificationRow = {
  usuario_id: string | null
  rol: string | null
}

export type NotificationPayload = {
  tipo: string
  titulo: string
  mensaje?: string | null
  enlace?: string | null
}

type NotificationInsert = NotificationPayload & {
  usuario_id: string
}

type NotificationInsertWithoutLink = Omit<NotificationInsert, 'enlace'>

const DB_NOTIFICATION_TYPES = [
  'NUEVO_ENTRENO',
  'NUEVO_PLAN',
  'RECORDATORIO',
  'ALERTA_FATIGA',
  'MENSAJE_CHAT',
  'NUEVO_VIDEO',
  'OTRA',
] as const

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

export function isStaffRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return ['ENTREN', 'COACH', 'TECN', 'ADMIN', 'AUX', 'DELEG', 'STAFF'].some((token) =>
    normalized.includes(token)
  )
}

export function isPlayerRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return normalized === 'JUGADOR' || normalized.includes('JUGADOR') || normalized.includes('JUG')
}

function toDbNotificationType(type: string) {
  if ((DB_NOTIFICATION_TYPES as readonly string[]).includes(type)) return type
  if (type.includes('entrenamiento')) return 'NUEVO_ENTRENO'
  if (type.includes('partido')) return 'RECORDATORIO'
  return 'OTRA'
}

export async function getActiveTeamMembers(client: NotificationClient, equipoId: string) {
  const { data, error } = await client
    .from('miembros_equipo')
    .select('usuario_id, rol')
    .eq('equipo_id', equipoId)
    .eq('estado', 'ACTIVO')

  if (error) {
    console.error('No se pudieron cargar los miembros para notificaciones:', error)
    return []
  }

  return ((data ?? []) as TeamMemberNotificationRow[]).filter(
    (member): member is { usuario_id: string; rol: string | null } =>
      typeof member.usuario_id === 'string' && member.usuario_id.length > 0
  )
}

export async function notifyUsers(
  client: NotificationClient,
  userIds: string[],
  payload: NotificationPayload
) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueUserIds.length === 0) return

  const rows: NotificationInsert[] = uniqueUserIds.map((usuarioId) => ({
    usuario_id: usuarioId,
    tipo: toDbNotificationType(payload.tipo),
    titulo: payload.titulo,
    mensaje: payload.mensaje ?? null,
    enlace: payload.enlace ?? null,
  }))

  const { error } = await client.from('notificaciones').insert(rows)
  if (error) {
    if (error.code === 'PGRST204' && error.message?.includes("'enlace'")) {
      const rowsWithoutLink: NotificationInsertWithoutLink[] = rows.map((row) => ({
        usuario_id: row.usuario_id,
        tipo: row.tipo,
        titulo: row.titulo,
        mensaje: row.mensaje,
      }))
      const retryResult = await client.from('notificaciones').insert(rowsWithoutLink)
      if (!retryResult.error) return
      console.error('No se pudieron crear las notificaciones sin enlace:', retryResult.error)
      return
    }

    console.error('No se pudieron crear las notificaciones:', error)
  }
}

export async function notifyTeamMembers(
  client: NotificationClient,
  equipoId: string,
  payload: NotificationPayload,
  options?: {
    excludeUserIds?: string[]
    onlyPlayers?: boolean
    onlyStaff?: boolean
  }
) {
  const excluded = new Set(options?.excludeUserIds ?? [])
  const members = await getActiveTeamMembers(client, equipoId)
  const recipients = members
    .filter((member) => !excluded.has(member.usuario_id))
    .filter((member) => {
      if (options?.onlyPlayers) return isPlayerRole(member.rol)
      if (options?.onlyStaff) return isStaffRole(member.rol)
      return true
    })
    .map((member) => member.usuario_id)

  await notifyUsers(client, recipients, payload)
}
