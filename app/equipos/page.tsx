'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Equipo {
  id: string
  nombre: string
  logo_url?: string
  rol: string
  miembros_count?: number
}

export default function EquiposPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchEquipos()
  }, [])

  const fetchEquipos = async () => {
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
    } catch {
      setError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

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
      setError('Error al cerrar sesion')
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

  return (
    <div className="auth-bg min-h-screen p-4 md:p-8">
      {/* Emojis flotantes decorativos */}
      <span className="floating-emoji" style={{ top: '8%', left: '5%' }}>
        🏆
      </span>
      <span
        className="floating-emoji"
        style={{ top: '12%', right: '8%', animationDelay: '-2s' }}
      >
        ⚽
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '15%', left: '8%', animationDelay: '-4s' }}
      >
        🎯
      </span>
      <span
        className="floating-emoji"
        style={{ bottom: '20%', right: '5%', animationDelay: '-1s' }}
      >
        🌟
      </span>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="glass-card rounded-3xl p-6 md:p-8 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Mis equipos
              </h1>
              <p className="text-gray-500 mt-1">
                {equipos.length > 0
                  ? `Perteneces a ${equipos.length} equipo${equipos.length > 1 ? 's' : ''}`
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
                {loggingOut ? 'Saliendo...' : 'Cerrar sesion'}
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
        {loading && (
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="spinner spinner-dark mx-auto mb-4 w-8 h-8" />
            <p className="text-gray-500">Cargando equipos...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && equipos.length === 0 && (
          <div
            className="glass-card rounded-3xl p-8 md:p-12 text-center animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl">🏟️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Sin equipos todavia
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Unete a un equipo con un codigo de invitacion o crea tu propio
              equipo para empezar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/unirse">
                <button className="btn-premium px-8" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                  Usar codigo
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
        {!loading && equipos.length > 0 && (
          <div className="grid gap-4">
            {equipos.map((equipo, index) => (
              <div
                key={equipo.id}
                className="team-card animate-slide-up cursor-pointer"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                onClick={() => router.push(`/equipo/${equipo.id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Team logo/avatar */}
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

                  {/* Team info */}
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
                  <button className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0">
                    Entrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        {!loading && equipos.length > 0 && (
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
                  + Unirse con codigo
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
