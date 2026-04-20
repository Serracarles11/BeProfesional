import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Faltan variables publicas de Supabase para el cliente.'
    )
  }

  return createBrowserClient(
    url,
    anonKey
  )
}
