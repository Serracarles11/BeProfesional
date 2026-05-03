import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseLike = Pick<SupabaseClient, 'from'>

export type DailyWellnessCheckin = {
  id: string
  usuario_id: string
  fecha: string
  fatiga: number | null
  estado_mental: number | null
  comentario: string | null
  respondido: boolean
  responded_at: string | null
  created_at: string
  updated_at: string
}

export type DailyWellnessInput = {
  fatiga: number
  estadoMental: number
  comentario?: string | null
}

export function getMadridDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function parseWellnessScore(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < 1 || value > 10) return null
  return value
}

export function parseWellnessComment(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 1000) : null
}

export async function getTodayDailyWellnessCheckin(
  supabase: SupabaseLike,
  userId: string,
  dateKey = getMadridDateKey()
) {
  return supabase
    .from('daily_wellness_checkins')
    .select('id, usuario_id, fecha, fatiga, estado_mental, comentario, respondido, responded_at, created_at, updated_at')
    .eq('usuario_id', userId)
    .eq('fecha', dateKey)
    .maybeSingle()
}

export async function ensureTodayDailyWellnessCheckin(
  supabase: SupabaseLike,
  userId: string,
  dateKey = getMadridDateKey()
) {
  const existing = await getTodayDailyWellnessCheckin(supabase, userId, dateKey)
  if (existing.error) return existing
  if (existing.data) return existing

  return supabase
    .from('daily_wellness_checkins')
    .insert({
      usuario_id: userId,
      fecha: dateKey,
    })
    .select('id, usuario_id, fecha, fatiga, estado_mental, comentario, respondido, responded_at, created_at, updated_at')
    .single()
}

export async function saveTodayDailyWellnessCheckin(
  supabase: SupabaseLike,
  userId: string,
  input: DailyWellnessInput,
  dateKey = getMadridDateKey()
) {
  const nowIso = new Date().toISOString()

  return supabase
    .from('daily_wellness_checkins')
    .upsert(
      {
        usuario_id: userId,
        fecha: dateKey,
        fatiga: input.fatiga,
        estado_mental: input.estadoMental,
        comentario: input.comentario ?? null,
        respondido: true,
        responded_at: nowIso,
      },
      {
        onConflict: 'usuario_id,fecha',
      }
    )
    .select('id, usuario_id, fecha, fatiga, estado_mental, comentario, respondido, responded_at, created_at, updated_at')
    .single()
}
