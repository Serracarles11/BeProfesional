'use client'

/* eslint-disable @next/next/no-img-element */

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'

interface Equipo {
  id: string
  nombre: string
  logo_url?: string
  rol: string
  miembros_count?: number
}

interface ClubUsuario {
  id: string
  club_id: string
  rol: string
  estado: string
  club: {
    id: string
    nombre: string
  } | null
}

type ClubRelation = ClubUsuario['club'] | ClubUsuario['club'][]

type ClubMembershipRow = {
  id: string
  rol: string | null
  estado: string | null
  club_id: string
  clubes: ClubRelation | null
}

type ClubMembershipBaseRow = {
  id: string
  rol: string | null
  estado: string | null
  club_id: string
}

function normalizeClubMemberships(rows: ClubMembershipRow[]) {
  return rows.map((membership) => {
    const clubRaw = membership.clubes
    const club = Array.isArray(clubRaw) ? clubRaw[0] : clubRaw

    return {
      id: membership.id,
      club_id: membership.club_id,
      rol: membership.rol || 'ADMINISTRATIVO',
      estado: membership.estado || 'ACTIVO',
      club: club
        ? {
            id: club.id,
            nombre: club.nombre,
          }
        : null,
    }
  })
}

function normalizeRole(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? ''
}

function isClubStaffRole(value: string | null | undefined) {
  return ['ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR'].includes(normalizeRole(value))
}

function isActiveStatus(value: string | null | undefined) {
  return normalizeRole(value) === 'ACTIVO'
}

export default function EquiposPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [clubesUsuario, setClubesUsuario] = useState<ClubUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingClubes, setLoadingClubes] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const [clubesError, setClubesError] = useState('')
  const [clubesLoadedFromServer, setClubesLoadedFromServer] = useState(false)

  const fetchEquipos = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/equipos', {
        method: 'GET',
      })

      const data = await res.json()

      if (!data.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        setError(data.error || 'Error al cargar equipos')
        return
      }

      setEquipos(data.equipos || [])
      if (Array.isArray(data.clubes) && data.clubes.length > 0) {
        setClubesUsuario(data.clubes)
        setClubesLoadedFromServer(true)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchClubesUsuario = useCallback(async () => {
    if (clubesLoadedFromServer) {
      setLoadingClubes(false)
      return
    }

    setLoadingClubes(true)
    setClubesError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setClubesError('No se pudo obtener el usuario autenticado')
        setClubesUsuario([])
        return
      }

      console.log('USER ID:', user.id)

      const { data: clubesUsuario, error: clubesError } = await supabase
        .from('miembros_club')
        .select(
          `
          id,
          rol,
          estado,
          club_id,
          clubes (
            id,
            nombre
          )
        `
        )
        .eq('usuario_id', user.id)
        .in('rol', ['ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR'])

      console.log('clubesUsuario:', clubesUsuario)
      console.log('clubesError:', clubesError)

      let normalizedClubes = normalizeClubMemberships(
        ((clubesUsuario || []) as ClubMembershipRow[]).filter((membership) =>
          isActiveStatus(membership.estado) && isClubStaffRole(membership.rol)
        )
      )

      if (clubesError || normalizedClubes.length === 0 || normalizedClubes.some((membership) => !membership.club)) {
        const { data: miembrosClub, error: miembrosClubError } = await supabase
          .from('miembros_club')
          .select('id, rol, estado, club_id')
          .eq('usuario_id', user.id)

        console.log('miembrosClubFallback:', miembrosClub)
        console.log('miembrosClubFallbackError:', miembrosClubError)

        if (miembrosClubError) {
          setClubesError(
            clubesError?.message || miembrosClubError.message || 'Error al cargar clubes'
          )
          setClubesUsuario([])
          return
        }

        const memberships = ((miembrosClub || []) as ClubMembershipBaseRow[]).filter((membership) =>
          isActiveStatus(membership.estado) && isClubStaffRole(membership.rol)
        )
        const clubIds = [...new Set(memberships.map((membership) => membership.club_id).filter(Boolean))]

        const { data: clubes, error: clubesByIdError } = clubIds.length
          ? await supabase.from('clubes').select('id, nombre').in('id', clubIds)
          : { data: [], error: null }

        console.log('clubesByIdFallback:', clubes)
        console.log('clubesByIdFallbackError:', clubesByIdError)

        const clubById = new Map(
          ((clubes || []) as Array<{ id: string; nombre: string }>).map((club) => [club.id, club])
        )

        normalizedClubes = memberships.map((membership) => {
          const club = clubById.get(membership.club_id) ?? null

          return {
            id: membership.id,
            club_id: membership.club_id,
            rol: membership.rol || 'ADMINISTRATIVO',
            estado: membership.estado || 'ACTIVO',
            club: club
              ? {
                  id: club.id,
                  nombre: club.nombre,
                }
              : {
                  id: membership.club_id,
                  nombre: `Club ${membership.club_id.slice(0, 8)}`,
                },
          }
        })

        if (clubesByIdError) {
          setClubesError(clubesByIdError.message || 'No se pudo cargar el nombre del club')
        }
      }

      if (normalizedClubes.length === 0) {
        const response = await fetch('/api/auth/equipos', { method: 'GET' })
        const data = await response.json().catch(() => null)

        if (Array.isArray(data?.clubes) && data.clubes.length > 0) {
          normalizedClubes = data.clubes
        }
      }

      setClubesUsuario((current) => (normalizedClubes.length > 0 ? normalizedClubes : current))
    } catch (clubError) {
      const message = clubError instanceof Error ? clubError.message : 'Error al cargar clubes'
      setClubesError(message)
      setClubesUsuario([])
    } finally {
      setLoadingClubes(false)
    }
  }, [clubesLoadedFromServer, supabase])

  useEffect(() => {
    fetchEquipos()
    fetchClubesUsuario()
  }, [fetchEquipos, fetchClubesUsuario])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const res = await fetch('/api/auth/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })

      const data = await res.json()

      if (data.ok) {
        router.push('/login')
        router.refresh()
      }
    } catch {
      setError('Error al cerrar sesión')
    } finally {
      setLoggingOut(false)
    }
  }

  const getRolBadgeColor = (rol: string) => {
    switch (rol.toLowerCase()) {
      case 'entrenador':
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'capitan':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'jugador':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getRolEmoji = (rol: string) => {
    switch (rol.toLowerCase()) {
      case 'entrenador':
      case 'admin':
        return '👔'
      case 'capitan':
        return '🎖️'
      case 'jugador':
      default:
        return '⚽'
    }
  }

  const hasEquipos = equipos.length > 0
  const hasClubes = clubesUsuario.length > 0
  const isLoadingInitial = loading || loadingClubes
  const showEmptyState = !isLoadingInitial && !hasEquipos && !hasClubes

  return (
    <div className="auth-bg min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="glass-card rounded-3xl p-6 md:p-8 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Mis equipos
              </h1>
              <p className="text-gray-500 mt-1">
                {hasEquipos
                  ? `Perteneces a ${equipos.length} equipo${equipos.length > 1 ? 's' : ''}`
                  : hasClubes
                    ? 'Tienes acceso administrativo a paneles de club'
                  : 'Aun no perteneces a ningun equipo'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/unirse">
                <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  + Unirse
                </button>
              </Link>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-all duration-300 disabled:opacity-50"
              >
                {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoadingInitial && (
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="spinner spinner-dark mx-auto mb-4 w-8 h-8" />
            <p className="text-gray-500">Cargando equipos y clubes...</p>
          </div>
        )}

        {clubesError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-6">
            {clubesError}
          </div>
        )}

        {!isLoadingInitial && hasClubes && (
          <section
            className="glass-card rounded-3xl p-6 md:p-8 mb-6 animate-slide-up"
            style={{ animationDelay: '0.05s' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                  Paneles de club
                </h2>
                <p className="text-gray-500 mt-1">
                  Gestionas {clubesUsuario.length} club{clubesUsuario.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {clubesUsuario.map((membership, index) => (
                <div
                  key={membership.id}
                  className="team-card animate-slide-up"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 text-white">
                      <span className="text-2xl md:text-3xl font-bold">
                        {(membership.club?.nombre || 'Club').charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                        {membership.club?.nombre || 'Club'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border bg-sky-100 text-sky-700 border-sky-200">
                          {membership.rol}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {membership.estado}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push(`/club-dashboard/${encodeURIComponent(membership.club_id)}`)}
                      className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
                    >
                      Entrar al panel del club
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {showEmptyState && (
          <div
            className="glass-card rounded-3xl p-8 md:p-12 text-center animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl">🏟️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Sin equipos todavía
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Únete a un equipo con un código de invitación o crea tu propio
              equipo para empezar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/unirse">
                <button className="btn-premium px-8" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                  Usar código
                </button>
              </Link>
              <Link href="/crear-equipo">
                <button className="btn-premium-outline px-8">
                  Crear equipo
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Team list */}
        {!isLoadingInitial && hasEquipos && (
          <div className="grid gap-4">
            {equipos.map((equipo, index) => (
              <div
                key={equipo.id}
                className="team-card animate-slide-up cursor-pointer"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                onClick={() => router.push(`/home?equipo=${equipo.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0 text-white">
                    {equipo.logo_url ? (
                      <img
                        src={equipo.logo_url}
                        alt={equipo.nombre}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <span className="text-2xl md:text-3xl font-bold">
                        {equipo.nombre.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 truncate">
                      {equipo.nombre}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getRolBadgeColor(
                          equipo.rol
                        )}`}
                      >
                        <span>{getRolEmoji(equipo.rol)}</span>
                        {equipo.rol}
                      </span>
                      {equipo.miembros_count !== undefined && (
                        <span className="text-gray-400 text-sm">
                          {equipo.miembros_count} miembro
                          {equipo.miembros_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Enter button */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      router.push(`/home?equipo=${equipo.id}`)
                    }}
                    className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        {!isLoadingInitial && (hasEquipos || hasClubes) && (
          <div
            className="mt-6 glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <p className="text-gray-500 text-sm">
              ¿Quieres unirte a otro equipo o crear uno nuevo?
            </p>
            <div className="flex gap-3">
              <Link href="/unirse">
                <button className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium transition-all duration-300 text-sm">
                  + Unirse con código
                </button>
              </Link>
              <Link href="/crear-equipo">
                <button className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-all duration-300 text-sm">
                  Crear equipo
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
