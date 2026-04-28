'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buscarClubes,
  crearClub,
  normalizarNombreClub,
  type ClubOption,
} from '@/frontend/lib/team-clubs'

export type DatosClubFormValue = {
  club: string
  club_id: string | null
  ubicacion: string
  campo_juego: string
  direccion_campo: string
  ciudad: string
  provincia: string
  pais: string
}

type DatosClubFormProps = {
  value: DatosClubFormValue
  onChange: (value: DatosClubFormValue) => void
  supabase: SupabaseClient
  userId?: string | null
  disabled?: boolean
  compact?: boolean
}

const inputClassName =
  'w-full rounded-xl border border-[#d7e2fb] bg-white px-3 py-2.5 text-sm text-[#0e1f46] outline-none transition focus:border-[#5086F2] focus:ring-2 focus:ring-[#5086F2]/20 disabled:cursor-not-allowed disabled:bg-[#f4f7fc] disabled:text-[#7b8dab]'

const labelClassName = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[#6f86b8]'

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <label>
      <span className={labelClassName}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />
    </label>
  )
}

export default function DatosClubForm({
  value,
  onChange,
  supabase,
  userId,
  disabled = false,
  compact = false,
}: DatosClubFormProps) {
  const [results, setResults] = useState<ClubOption[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [creatingClub, setCreatingClub] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const nombreClub = useMemo(() => normalizarNombreClub(value.club), [value.club])
  const exactMatch = results.some((club) => {
    return normalizarNombreClub(club.nombre).toLocaleLowerCase() === nombreClub.toLocaleLowerCase()
  })
  const canCreateClub = Boolean(nombreClub) && !exactMatch

  const patchValue = (patch: Partial<DatosClubFormValue>) => {
    onChange({ ...value, ...patch })
  }

  const selectClub = (club: ClubOption) => {
    patchValue({ club: club.nombre, club_id: club.id })
    setOpen(false)
    setSearchError('')
  }

  const handleCreateClub = async () => {
    if (!nombreClub) {
      setSearchError('El club es obligatorio.')
      return
    }

    let creatorId = userId

    if (!creatorId) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!error && user) {
        creatorId = user.id
      }
    }

    if (!creatorId) {
      setSearchError('Usuario no autenticado.')
      return
    }

    setCreatingClub(true)
    setSearchError('')

    try {
      const club = await crearClub(nombreClub, creatorId, supabase)
      selectClub(club)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el club.'
      setSearchError(message)
    } finally {
      setCreatingClub(false)
    }
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  useEffect(() => {
    const query = normalizarNombreClub(value.club)

    if (!query) {
      setResults([])
      setLoadingSearch(false)
      setSearchError('')
      return
    }

    const timeout = window.setTimeout(() => {
      setLoadingSearch(true)
      setSearchError('')

      buscarClubes(query, supabase)
        .then((clubes) => {
          setResults(clubes)
          setOpen(true)
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'No se pudo buscar el club.'
          setSearchError(message)
          setResults([])
        })
        .finally(() => setLoadingSearch(false))
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [value.club, supabase])

  return (
    <section className={compact ? 'rounded-2xl border border-[#d8e3f8] bg-[#f8fbff] p-4' : 'rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4'}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f86b8]">Datos del club</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div ref={wrapperRef} className="relative md:col-span-2">
          <label htmlFor="club-selector">
            <span className={labelClassName}>Club *</span>
            <div className="relative">
              <input
                id="club-selector"
                type="text"
                value={value.club}
                onChange={(event) => patchValue({ club: event.target.value, club_id: null })}
                onFocus={() => {
                  if (value.club.trim()) setOpen(true)
                }}
                placeholder="Buscar o crear club"
                disabled={disabled || creatingClub}
                className={inputClassName}
                autoComplete="off"
              />
              {loadingSearch || creatingClub ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              ) : value.club_id ? (
                <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              ) : null}
            </div>
          </label>

          {open && nombreClub ? (
            <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-[#d7e2fb] bg-white p-1 shadow-[0_18px_45px_rgba(7,25,71,0.16)]">
              {results.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => selectClub(club)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[#0e1f46] transition hover:bg-[#eef3ff]"
                >
                  <span>{club.nombre}</span>
                  {club.id === value.club_id ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                </button>
              ))}

              {!loadingSearch && results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-[#45629c]">No se encontraron clubes</div>
              ) : null}

              {canCreateClub ? (
                <button
                  type="button"
                  onClick={() => void handleCreateClub()}
                  disabled={disabled || creatingClub}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#1542a0] transition hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingClub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear club: {nombreClub}
                </button>
              ) : null}
            </div>
          ) : null}

          {searchError ? <p className="mt-1 text-xs text-red-600">{searchError}</p> : null}
        </div>

        <Field
          label="Ubicación"
          value={value.ubicacion}
          onChange={(next) => patchValue({ ubicacion: next })}
          placeholder="Sant Jordi, Ibiza, Palma..."
          disabled={disabled}
        />
        <Field
          label="Campo donde juega"
          value={value.campo_juego}
          onChange={(next) => patchValue({ campo_juego: next })}
          placeholder="Campo Municipal de Sant Jordi"
          disabled={disabled}
        />
        <Field
          label="Dirección del campo"
          value={value.direccion_campo}
          onChange={(next) => patchValue({ direccion_campo: next })}
          disabled={disabled}
        />
        <Field label="Ciudad" value={value.ciudad} onChange={(next) => patchValue({ ciudad: next })} disabled={disabled} />
        <Field label="Provincia" value={value.provincia} onChange={(next) => patchValue({ provincia: next })} disabled={disabled} />
        <Field label="País" value={value.pais} onChange={(next) => patchValue({ pais: next })} disabled={disabled} />
      </div>
    </section>
  )
}
