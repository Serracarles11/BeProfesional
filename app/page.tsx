import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h1 className="text-xl font-semibold text-amber-900 mb-2">
            Falta configurar Supabase
          </h1>
          <p className="text-amber-800 mb-2">
            Crea el archivo <code>.env.local</code> dentro de <code>beprofesional</code>
            usando <code>.env.local.example</code>.
          </p>
          <p className="text-amber-800">
            Luego reemplaza <code>NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> con los valores reales de tu
            proyecto en Supabase.
          </p>
        </div>
      </main>
    )
  }

  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // Verificar si tiene equipos
    const { data: memberships } = await supabase
      .from('miembros_equipo')
      .select('equipo_id')
      .eq('usuario_id', session.user.id)
      .limit(1)

    if (memberships && memberships.length > 0) {
      redirect('/equipos')
    } else {
      redirect('/unirse')
    }
  } else {
    redirect('/login')
  }
}
