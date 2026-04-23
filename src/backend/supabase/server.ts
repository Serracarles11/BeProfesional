import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from './env'

type CookieStore = Awaited<ReturnType<typeof cookies>>

type SupabaseClient = ReturnType<typeof createServerClient>

function buildServerClient(cookieStore: CookieStore): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // In some server contexts cookies are read-only.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // In some server contexts cookies are read-only.
        }
      },
    },
  })
}

export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return buildServerClient(cookieStore)
}

export function createSupabaseRouteHandler(cookieStore: CookieStore): SupabaseClient
export function createSupabaseRouteHandler(): Promise<SupabaseClient>
export function createSupabaseRouteHandler(cookieStore?: CookieStore) {
  if (cookieStore) {
    return buildServerClient(cookieStore)
  }

  return cookies().then((store) => buildServerClient(store))
}
