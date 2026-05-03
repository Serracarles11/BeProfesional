'use client'

import type * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Info, Users } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type Club = {
  id: string
  nombre: string
  ubicacion: string | null
  campo_juego: string | null
  ciudad: string | null
}

type EquipoClub = {
  id: string
  nombre: string | null
  categoria: string | null
  categoria_anio: string | null
  temporada: string | null
  ubicacion: string | null
  campo_juego: string | null
  ciudad: string | null
  provincia: string | null
  pais: string | null
}

function categoriaLabel(value: string | null) {
  const labels: Record<string, string> = {
    PREBENJAMIN: 'Prebenjamin',
    BENJAMIN: 'Benjamin',
    ALEVIN: 'Alevin',
    INFANTIL: 'Infantil',
    CADETE: 'Cadete',
    JUVENIL: 'Juvenil',
    AMATEUR: 'Amateur',
  }

  return value ? labels[value] ?? value : '-'
}

function anioLabel(value: string | null) {
  if (value === '1R') return '1r año'
  if (value === '2N') return '2º año'
  if (value === '3R') return '3r año'
  return '-'
}

export default function ClubDashboardByIdPage() {
  const router = useRouter()
  const params = useParams<{ clubId: string }>()
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  const clubId = typeof params.clubId === 'string' ? params.clubId : ''

  const [club, setClub] = useState<Club | null>(null)
  const [equipos, setEquipos] = useState<EquipoClub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadClubDashboard() {
      if (!clubId) {
        setError('Falta el club.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const { data: clubData, error: clubError } = await supabase
          .from('clubes')
          .select('id, nombre, ubicacion, campo_juego, ciudad')
          .eq('id', clubId)
          .maybeSingle()

        if (clubError) {
          throw new Error(clubError.message || 'No se pudo cargar el club')
        }

        const { data: equiposData, error: equiposError } = await supabase
          .from('equipos')
          .select(
            `
            id,
            nombre,
            categoria,
            categoria_anio,
            temporada,
            ubicacion,
            campo_juego,
            ciudad,
            provincia,
            pais
          `
          )
          .eq('club_id', clubId)
          .order('nombre', { ascending: true })

        if (equiposError) {
          throw new Error(equiposError.message || 'No se pudieron cargar los equipos del club')
        }

        if (!cancelled) {
          setClub((clubData as Club | null) ?? null)
          setEquipos((equiposData ?? []) as EquipoClub[])
        }
      } catch (dashboardError) {
        if (!cancelled) {
          setError(
            dashboardError instanceof Error
              ? dashboardError.message
              : 'No se pudo cargar el panel del club'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadClubDashboard()

    return () => {
      cancelled = true
    }
  }, [clubId, supabase])

  const clubName = club?.nombre || 'Club'
  const clubInfoHref = `/club-dashboard/${encodeURIComponent(clubId)}/informacion-club`

  return (
    <SidebarProvider
      className="bg-[linear-gradient(145deg,#f8fbff_0%,#edf3ff_46%,#dfeaff_100%)]"
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
          "--primary": "var(--bp-primary)",
          "--ring": "var(--bp-mid)",
          "--accent": "var(--bp-soft)",
          "--accent-foreground": "var(--bp-ink)",
        } as React.CSSProperties
      }
    >
      <AppSidebar clubName={clubName} clubHref={clubInfoHref} />
      <SidebarInset className="bg-transparent">
        <SiteHeader clubName={clubName} backHref="/equipos" />
        <main className="min-h-[calc(100vh-var(--header-height))] p-4 md:p-8">
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push('/equipos')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a equipos
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(clubInfoHref)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-600/20 transition hover:bg-sky-700"
          >
            <Info className="h-4 w-4" />
            Ver Informacion club
          </button>
        </div>

        <section className="glass-card mb-6 rounded-3xl p-6 md:p-8">
          {loading ? (
            <div className="py-8 text-center">
              <div className="spinner spinner-dark mx-auto mb-4 h-8 w-8" />
              <p className="text-gray-500">Cargando panel del club...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : (
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
                    Panel de club
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-gray-800 md:text-3xl">
                    {clubName}
                  </h1>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-sky-700" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">
                      Total equipos
                    </p>
                    <p className="text-2xl font-black text-gray-800">{equipos.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {!loading && !error && (
          <section className="glass-card rounded-3xl p-6 md:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-800">Equipos del club</h2>
              <p className="mt-1 text-gray-500">
                Equipos vinculados a {clubName || 'este club'}.
              </p>
            </div>

            {equipos.length > 0 ? (
              <div className="grid gap-4">
                {equipos.map((equipo) => (
                  <article key={equipo.id} className="team-card">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-lg shadow-indigo-500/20">
                        <span className="text-2xl font-bold">
                          {(equipo.nombre || 'E').charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-bold text-gray-800">
                          {equipo.nombre || 'Equipo'}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-gray-500">
                          <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-blue-700">
                            {categoriaLabel(equipo.categoria)}
                          </span>
                          <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1">
                            {anioLabel(equipo.categoria_anio)}
                          </span>
                          <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1">
                            {equipo.temporada || 'Sin temporada'}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 md:text-right">
                        <p>{equipo.ciudad || equipo.ubicacion || club?.ciudad || club?.ubicacion || '-'}</p>
                        <p className="font-semibold text-gray-700">
                          {equipo.campo_juego || club?.campo_juego || 'Campo no indicado'}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white/60 p-8 text-center">
                <p className="font-semibold text-gray-600">
                  Este club todavía no tiene equipos vinculados.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
