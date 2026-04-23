import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceRoleEnv } from './env'

function isValidServiceRoleKey(value: string) {
  try {
    const payloadPart = value.split('.')[1]
    if (!payloadPart) return false
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
      role?: string
    }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

export function createSupabaseAdmin() {
  const env = getSupabaseServiceRoleEnv()
  if (!env) return null
  if (!isValidServiceRoleKey(env.serviceRoleKey)) return null

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
