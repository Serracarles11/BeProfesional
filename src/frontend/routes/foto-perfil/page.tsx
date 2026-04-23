import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import ProfilePhotoPrompt from './profile-photo-prompt'

type SearchParamsInput = Record<string, string | string[] | undefined>

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function safePath(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/')) return fallback
  return value
}

export default async function FotoPerfilPage({
  searchParams,
}: {
  searchParams: SearchParamsInput | Promise<SearchParamsInput>
}) {
  const resolvedSearchParams = await searchParams
  const next = safePath(getQueryValue(resolvedSearchParams.next), '/equipos')

  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('nombre, foto_url')
    .eq('id', session.user.id)
    .maybeSingle()

  const displayName =
    profile?.nombre ||
    (typeof session.user.user_metadata?.nombre === 'string' ? session.user.user_metadata.nombre : null) ||
    session.user.email?.split('@')[0] ||
    'Jugador'

  return (
    <ProfilePhotoPrompt
      next={next}
      currentPhotoUrl={profile?.foto_url ?? null}
      displayName={displayName}
    />
  )
}
