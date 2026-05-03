'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, BatteryMedium, Brain, CheckCircle2, Loader2 } from 'lucide-react'

type Checkin = {
  id: string
  fecha: string
  fatiga: number | null
  estado_mental: number | null
  comentario: string | null
  respondido: boolean
  responded_at: string | null
}

type ApiResponse = {
  ok?: boolean
  fecha?: string
  checkin?: Checkin
  error?: string
}

const SCALE = Array.from({ length: 10 }, (_, index) => index + 1)

function scoreLabel(value: number | null, kind: 'fatigue' | 'mental') {
  if (!value) return 'Elige un valor'
  if (kind === 'fatigue') {
    if (value <= 3) return 'Ligera'
    if (value <= 6) return 'Moderada'
    if (value <= 8) return 'Alta'
    return 'Muy alta'
  }
  if (value <= 3) return 'Bajo'
  if (value <= 6) return 'Normal'
  if (value <= 8) return 'Bueno'
  return 'Muy bien'
}

function ScorePicker({
  title,
  subtitle,
  value,
  onChange,
  kind,
  icon,
}: {
  title: string
  subtitle: string
  value: number | null
  onChange: (value: number) => void
  kind: 'fatigue' | 'mental'
  icon: ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-[#dce6f5] bg-white p-5 shadow-[0_18px_40px_rgba(0,93,182,0.08)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#005db6]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="[font-family:var(--font-plus-jakarta)] text-lg font-black text-[#111827]">{title}</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#6b7280]">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f8fc] px-3 py-2 text-center">
          <div className="text-2xl font-black leading-none text-[#005db6]">{value ?? '-'}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
            {scoreLabel(value, kind)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {SCALE.map((score) => {
          const active = value === score
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={[
                'flex h-12 items-center justify-center rounded-2xl border text-base font-black transition active:scale-95',
                active
                  ? 'border-[#005db6] bg-[#005db6] text-white shadow-[0_10px_24px_rgba(0,93,182,0.24)]'
                  : 'border-[#dce6f5] bg-[#f8fbff] text-[#334155] hover:border-[#005db6]/40',
              ].join(' ')}
              aria-pressed={active}
            >
              {score}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function DailyCheckinClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [checkin, setCheckin] = useState<Checkin | null>(null)
  const [fatiga, setFatiga] = useState<number | null>(null)
  const [estadoMental, setEstadoMental] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')

  const canSave = fatiga !== null && estadoMental !== null && !saving
  const dateLabel = useMemo(() => {
    const date = checkin?.fecha ? new Date(`${checkin.fecha}T12:00:00`) : new Date()
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(date)
  }, [checkin?.fecha])

  useEffect(() => {
    let cancelled = false

    async function loadCheckin() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/checkin-diario', { cache: 'no-store' })
        const payload = (await response.json().catch(() => null)) as ApiResponse | null

        if (!response.ok || !payload?.ok || !payload.checkin) {
          throw new Error(payload?.error || 'No se pudo cargar el check-in.')
        }

        if (cancelled) return
        setCheckin(payload.checkin)
        setFatiga(payload.checkin.fatiga)
        setEstadoMental(payload.checkin.estado_mental)
        setComentario(payload.checkin.comentario ?? '')
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el check-in.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCheckin()

    return () => {
      cancelled = true
    }
  }, [])

  async function saveCheckin() {
    if (!canSave) {
      setError('Selecciona fatiga física y estado mental antes de guardar.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/checkin-diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fatiga,
          estadoMental,
          comentario,
        }),
      })
      const payload = (await response.json().catch(() => null)) as ApiResponse | null

      if (!response.ok || !payload?.ok || !payload.checkin) {
        throw new Error(payload?.error || 'No se pudo guardar el check-in.')
      }

      setCheckin(payload.checkin)
      setFatiga(payload.checkin.fatiga)
      setEstadoMental(payload.checkin.estado_mental)
      setComentario(payload.checkin.comentario ?? '')
      setSuccess('Check-in guardado. Puedes modificarlo durante el día si lo necesitas.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el check-in.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-5 text-[#111827]">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-md flex-col">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/equipos"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dce6f5] bg-white text-[#334155] shadow-sm"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#005db6]">Check-in diario</p>
            <h1 className="[font-family:var(--font-plus-jakarta)] text-xl font-black text-[#111827]">
              ¿Cómo estás hoy?
            </h1>
          </div>
          <div className="h-11 w-11" />
        </header>

        <section className="mb-4 rounded-[30px] bg-[#071a3d] p-5 text-white shadow-[0_24px_50px_rgba(7,26,61,0.22)]">
          <p className="text-xs font-bold capitalize text-[#bcd0ff]">{dateLabel}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight [font-family:var(--font-plus-jakarta)]">
            Dedica 20 segundos a registrar cómo llegas hoy.
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-[#dbe7ff]">
            Tu entrenador podrá entender mejor tu carga y ajustar el trabajo sin salir de BeProfessional.
          </p>
        </section>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-[#cddbf2] bg-white p-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#005db6]" />
              <p className="mt-3 text-sm font-bold text-[#64748b]">Cargando check-in...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 pb-4">
            {checkin?.respondido ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Ya respondiste hoy. Puedes actualizar los valores si han cambiado.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {success}
              </div>
            ) : null}

            <ScorePicker
              title="Fatiga física"
              subtitle="1 es muy fresco, 10 es fatiga máxima."
              value={fatiga}
              onChange={setFatiga}
              kind="fatigue"
              icon={<BatteryMedium className="h-6 w-6" />}
            />

            <ScorePicker
              title="Estado mental"
              subtitle="1 es muy bajo, 10 es muy positivo."
              value={estadoMental}
              onChange={setEstadoMental}
              kind="mental"
              icon={<Brain className="h-6 w-6" />}
            />

            <section className="rounded-[28px] border border-[#dce6f5] bg-white p-5 shadow-[0_18px_40px_rgba(0,93,182,0.08)]">
              <label className="text-sm font-black text-[#111827]" htmlFor="comentario">
                Comentario opcional
              </label>
              <textarea
                id="comentario"
                value={comentario}
                onChange={(event) => setComentario(event.target.value)}
                rows={4}
                maxLength={1000}
                className="mt-3 w-full resize-none rounded-2xl border border-[#dce6f5] bg-[#f8fbff] px-4 py-3 text-base font-medium text-[#334155] outline-none transition focus:border-[#005db6] focus:bg-white"
                placeholder="Ej. dormí poco, piernas cargadas, me noto motivado..."
              />
            </section>

            <button
              type="button"
              onClick={() => void saveCheckin()}
              disabled={!canSave}
              className="sticky bottom-4 mt-auto flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#005db6] px-5 py-4 text-base font-black text-white shadow-[0_18px_34px_rgba(0,93,182,0.28)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#9fb7d5] disabled:shadow-none"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar check-in'
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
