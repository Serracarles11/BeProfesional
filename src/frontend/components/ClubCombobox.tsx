'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buscarClubes, normalizarNombreClub, type ClubOption } from '@/frontend/lib/team-clubs'

type ClubComboboxProps = {
  id: string
  label: string
  value: string
  selectedClubId: string | null
  onChange: (value: string) => void
  onSelectClub: (club: ClubOption) => void
  disabled?: boolean
  required?: boolean
  placeholder?: string
  inputClassName?: string
  labelClassName?: string
  emptyMessage?: string
  supabase?: SupabaseClient
}

export default function ClubCombobox({
  id,
  label,
  value,
  selectedClubId,
  onChange,
  onSelectClub,
  disabled = false,
  required = false,
  placeholder = 'Ej: Atletico Norte',
  inputClassName = 'input-premium',
  labelClassName = 'mb-2 block text-sm font-semibold text-gray-700',
  emptyMessage = 'Selecciona un club existente. Si no aparece, pide a un administrador del club que te invite o apruebe tu solicitud.',
  supabase,
}: ClubComboboxProps) {
  const [results, setResults] = useState<ClubOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const normalizedValue = useMemo(() => normalizarNombreClub(value), [value])
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
    const query = normalizarNombreClub(value)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('')

    if (!query) {
      setResults([])
      setLoading(false)
      return
    }

    const timeout = window.setTimeout(() => {
      setLoading(true)
      buscarClubes(query, supabase)
        .then((clubes) => {
          setResults(clubes)
          setOpen(true)
        })
        .catch((searchError) => {
          const message = searchError instanceof Error ? searchError.message : 'No se pudieron buscar clubes.'
          setError(message)
          setResults([])
        })
        .finally(() => setLoading(false))
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [value, supabase])

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className={labelClassName}>
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (value.trim()) setOpen(true)
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        ) : selectedClubId ? (
          <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
        ) : null}
      </div>

      {open && normalizedValue ? (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-[#d7e2fb] bg-white p-1 shadow-[0_18px_45px_rgba(7,25,71,0.16)]">
          {results.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => {
                onSelectClub(club)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[#0e1f46] transition hover:bg-[#eef3ff]"
            >
              <span>{club.nombre}</span>
              {club.id === selectedClubId ? <Check className="h-4 w-4 text-emerald-500" /> : null}
            </button>
          ))}

          {!loading && results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#45629c]">{emptyMessage}</div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
