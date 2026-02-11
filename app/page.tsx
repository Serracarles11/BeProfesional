import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'

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

  try {
    const supabase = await createSupabaseServer()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      // Verificar si tiene equipos
      const { data: memberships, error: membershipsError } = await supabase
        .from('miembros_equipo')
        .select('equipo_id')
        .eq('usuario_id', session.user.id)
        .limit(1)

      if (membershipsError) {
        console.error('Error consultando miembros_equipo en /:', membershipsError)
        redirect('/home')
      }

      if (memberships && memberships.length > 0) {
        redirect('/equipos')
      } else {
        redirect('/unirse')
      }
    } else {
      redirect('/login')
    }
  } catch (error) {
    const digest = typeof error === 'object' && error && 'digest' in error
      ? String((error as { digest?: string }).digest)
      : ''

    if (digest.startsWith('NEXT_REDIRECT') || digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }

    console.error('Error en app/page.tsx:', error)
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl rounded-2xl border border-red-300 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-900 mb-2">
            No se pudo cargar la pagina inicial
          </h1>
          <p className="text-red-800">
            Revisa variables de entorno en Vercel y vuelve a desplegar.
          </p>
        </div>
      </main>
    )
  }
}
