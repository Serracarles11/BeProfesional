const SUPABASE_URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

function getEnvValue(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function isPlaceholderValue(value: string): boolean {
  return (
    value.includes('tu-proyecto.supabase.co') ||
    value.includes('tu-anon-key-aqui')
  )
}

export function isSupabaseConfigured() {
  const url = getEnvValue(SUPABASE_URL_KEY)
  const anonKey = getEnvValue(SUPABASE_ANON_KEY)

  if (!url || !anonKey) {
    return false
  }

  return !isPlaceholderValue(url) && !isPlaceholderValue(anonKey)
}

export function getSupabaseEnv() {
  const url = getEnvValue(SUPABASE_URL_KEY)
  const anonKey = getEnvValue(SUPABASE_ANON_KEY)

  if (!url || !anonKey || isPlaceholderValue(url) || isPlaceholderValue(anonKey)) {
    throw new Error(
      'Faltan variables de Supabase. Copia .env.local.example a .env.local y reemplaza NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY con valores reales.'
    )
  }

  return { url, anonKey }
}
