'use client'

import { type FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  Copy,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import DatosClubForm, { type DatosClubFormValue } from '@/frontend/components/DatosClubForm'
import {
  CATEGORIAS_EQUIPO,
  esCategoriaEquipo,
  getAniosPorCategoria,
  normalizarNombreClub,
  obtenerOcrearClub,
} from '@/frontend/lib/team-clubs'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type CreateTeamResponse = {
  ok: boolean
  error?: string
  code?: string | null
  details?: string | null
  hint?: string | null
  equipoId?: string
  codigoEntrenador?: string
  codigoJugadores?: string
  redirectTo?: string
}

type SuccessData = {
  equipoId: string
  codigoEntrenador: string
  codigoJugadores: string
  redirectTo: string
}

export default function CrearEquipoPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  const [nombreEquipo, setNombreEquipo] = useState('')
  const [datosClub, setDatosClub] = useState<DatosClubFormValue>({
    club: '',
    club_id: null,
    ubicacion: '',
    campo_juego: '',
    direccion_campo: '',
    ciudad: '',
    provincia: '',
    pais: 'España',
  })
  const [categoria, setCategoria] = useState('')
  const [categoriaAnio, setCategoriaAnio] = useState('')
  const [temporada, setTemporada] = useState('')

  const [loading, setLoading] = useState(false)
  const [clubSaving, setClubSaving] = useState(false)
  const [error, setError] = useState('')
  const [errorDebug, setErrorDebug] = useState<{
    code?: string | null
    details?: string | null
    hint?: string | null
  } | null>(null)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [copied, setCopied] = useState<'entrenador' | 'jugadores' | null>(null)
  const aniosCategoria = getAniosPorCategoria(categoria)

  function handleCategoriaChange(value: string) {
    setCategoria(value)

    if (value === 'AMATEUR') {
      setCategoriaAnio('')
      return
    }

    if (categoriaAnio && !getAniosPorCategoria(value).some((option) => option.value === categoriaAnio)) {
      setCategoriaAnio('')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!nombreEquipo.trim()) {
      setError('El nombre del equipo es obligatorio.')
      setErrorDebug(null)
      return
    }

    if (!normalizarNombreClub(datosClub.club)) {
      setError('El club es obligatorio.')
      setErrorDebug(null)
      return
    }

    if (!esCategoriaEquipo(categoria)) {
      setError('La categoria es obligatoria.')
      setErrorDebug(null)
      return
    }

    if (categoria !== 'AMATEUR' && !getAniosPorCategoria(categoria).some((option) => option.value === categoriaAnio)) {
      setError('El anio de categoria es obligatorio.')
      setErrorDebug(null)
      return
    }

    setLoading(true)
    setClubSaving(true)
    setError('')
    setErrorDebug(null)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Usuario no autenticado')
      }

      const clubFinal = datosClub.club_id
        ? { id: datosClub.club_id, nombre: normalizarNombreClub(datosClub.club) }
        : await obtenerOcrearClub(datosClub.club, user.id, supabase)

      setDatosClub((current) => ({ ...current, club: clubFinal.nombre, club_id: clubFinal.id }))
      setClubSaving(false)

      const response = await fetch('/api/crear-equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_equipo: nombreEquipo,
          club_id: clubFinal.id,
          club: clubFinal.nombre,
          categoria,
          categoria_anio: categoria === 'AMATEUR' ? null : categoriaAnio,
          temporada,
          ubicacion: datosClub.ubicacion,
          campo_juego: datosClub.campo_juego,
          direccion_campo: datosClub.direccion_campo,
          ciudad: datosClub.ciudad,
          provincia: datosClub.provincia,
          pais: datosClub.pais || 'España',
        }),
      })

      const data = (await response.json()) as CreateTeamResponse

      if (!response.ok || !data.ok) {
        setError(data.error ?? 'No se pudo crear el equipo.')
        setErrorDebug({
          code: data.code ?? null,
          details: data.details ?? null,
          hint: data.hint ?? null,
        })
        return
      }

      if (
        !data.equipoId ||
        !data.codigoEntrenador ||
        !data.codigoJugadores ||
        !data.redirectTo
      ) {
        setError('La respuesta del servidor es invalida.')
        setErrorDebug(null)
        return
      }

      setSuccess({
        equipoId: data.equipoId,
        codigoEntrenador: data.codigoEntrenador,
        codigoJugadores: data.codigoJugadores,
        redirectTo: data.redirectTo,
      })
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Error de conexion. Vuelve a intentarlo.'
      setError(message)
      setErrorDebug(null)
    } finally {
      setLoading(false)
      setClubSaving(false)
    }
  }

  async function copyCode(value: string, type: 'entrenador' | 'jugadores') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setError('No se pudo copiar el codigo.')
    }
  }

  if (success) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="dashboard-card shadow-soft-lg rounded-3xl p-6 md:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-soft">
                <Check className="h-8 w-8" strokeWidth={3} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">Equipo creado</h1>
              <p className="mt-2 text-sm text-gray-500">
                Comparte estos codigos para que tu staff y jugadores se unan.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Codigo entrenador</p>
                    <p className="text-xs text-gray-500">Hasta 3 usos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-xl bg-white px-3 py-2 font-mono text-sm font-bold tracking-wider text-indigo-700 md:text-base">
                    {success.codigoEntrenador}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyCode(success.codigoEntrenador, 'entrenador')}
                    className="rounded-xl bg-indigo-600 p-2 text-white transition hover:bg-indigo-700"
                  >
                    {copied === 'entrenador' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Codigo jugadores</p>
                    <p className="text-xs text-gray-500">Hasta 30 usos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-xl bg-white px-3 py-2 font-mono text-sm font-bold tracking-wider text-amber-700 md:text-base">
                    {success.codigoJugadores}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyCode(success.codigoJugadores, 'jugadores')}
                    className="rounded-xl bg-amber-500 p-2 text-white transition hover:bg-amber-600"
                  >
                    {copied === 'jugadores' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(success.redirectTo)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:opacity-95"
            >
              Ir al dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="dashboard-card shadow-soft-lg rounded-3xl p-6 md:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
              <Trophy className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">Crear equipo</h1>
            <p className="mt-2 text-sm text-gray-500">
              Crea tu equipo y genera codigos de invitacion al instante.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nombre_equipo" className="mb-2 block text-sm font-semibold text-gray-700">
                Nombre del equipo *
              </label>
              <input
                id="nombre_equipo"
                type="text"
                value={nombreEquipo}
                onChange={(event) => setNombreEquipo(event.target.value)}
                placeholder="Ej: Juvenil A"
                disabled={loading}
                className="input-premium"
              />
            </div>

            <DatosClubForm
              value={datosClub}
              onChange={setDatosClub}
              supabase={supabase}
              userId={null}
              disabled={loading}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="categoria" className="mb-2 block text-sm font-medium text-gray-700">
                  Categoria *
                </label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(event) => handleCategoriaChange(event.target.value)}
                  disabled={loading}
                  className="input-premium"
                >
                  <option value="">Selecciona categoria</option>
                  {CATEGORIAS_EQUIPO.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="categoria_anio" className="mb-2 block text-sm font-medium text-gray-700">
                  Año de categoria{categoria === 'AMATEUR' ? '' : ' *'}
                </label>
                <select
                  id="categoria_anio"
                  value={categoriaAnio}
                  onChange={(event) => setCategoriaAnio(event.target.value)}
                  disabled={loading || categoria === 'AMATEUR' || aniosCategoria.length === 0}
                  className="input-premium"
                >
                  <option value="">{categoria === 'AMATEUR' ? 'No aplica' : 'Selecciona año'}</option>
                  {aniosCategoria.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
                <label htmlFor="temporada" className="mb-2 block text-sm font-medium text-gray-700">
                  Temporada (opcional)
                </label>
                <input
                  id="temporada"
                  type="text"
                  value={temporada}
                  onChange={(event) => setTemporada(event.target.value)}
                  placeholder="2025/2026"
                  disabled={loading}
                  className="input-premium"
                />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
                {(errorDebug?.code || errorDebug?.details || errorDebug?.hint) && (
                  <details className="mt-2 text-xs text-red-700/90">
                    <summary className="cursor-pointer select-none font-medium">
                      Ver detalle técnico
                    </summary>
                    <div className="mt-2 space-y-1">
                      {errorDebug.code && <p><strong>code:</strong> {errorDebug.code}</p>}
                      {errorDebug.details && <p><strong>details:</strong> {errorDebug.details}</p>}
                      {errorDebug.hint && <p><strong>hint:</strong> {errorDebug.hint}</p>}
                    </div>
                  </details>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !nombreEquipo.trim() ||
                !normalizarNombreClub(datosClub.club) ||
                !categoria ||
                (categoria !== 'AMATEUR' && !categoriaAnio)
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-soft transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  {clubSaving ? 'Preparando club...' : 'Creando equipo...'}
                </>
              ) : (
                <>
                  Crear equipo
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
