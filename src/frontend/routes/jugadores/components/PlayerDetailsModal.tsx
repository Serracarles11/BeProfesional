'use client'

import { type ReactNode, useEffect } from 'react'
import Link from 'next/link'
import { CalendarDays, Footprints, MapPin, Ruler, Scale, ShieldCheck, X } from 'lucide-react'
import type { SquadPlayer } from '../types'
import { positionTagLabel, ratingValue, withEquipo } from '../utils'

type PlayerDetailsModalProps = {
  player: SquadPlayer
  equipoId?: string
  onClose: () => void
}

function qualityLabel(rating: number) {
  if (rating >= 8.5) return 'Talento Elite'
  if (rating >= 7.5) return 'Alto Rendimiento'
  return 'En Desarrollo'
}

function dominantFootLabel(value: string | null) {
  const normalized = (value ?? '').trim().toUpperCase()
  if (normalized.includes('IZQ')) return 'Izquierdo'
  if (normalized.includes('DER')) return 'Derecho'
  if (normalized.includes('AMB')) return 'Ambidiestro'
  return 'No definido'
}

function ageLabel(value: number | null) {
  if (!value || value <= 0) return '--'
  return `${value} anos`
}

function positionLabel(position: string | null) {
  if (position?.trim()) return position
  return positionTagLabel(position)
}

export function PlayerDetailsModal({ player, equipoId, onClose }: PlayerDetailsModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const rating = Number(ratingValue(player))
  const jersey = player.dorsal !== null ? String(player.dorsal).padStart(2, '0') : '--'

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-[#181c20]/30 p-4 backdrop-blur-md md:p-8"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-3xl bg-[#f7f9fe] shadow-[0px_20px_40px_rgba(0,93,182,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative min-h-[320px] overflow-hidden bg-gradient-to-br from-[#005db6] to-[#2b5bb5]">
          <div className="absolute -bottom-10 -right-20 select-none [font-family:var(--font-plus-jakarta)] text-[9rem] font-black uppercase tracking-tighter text-white/5 md:text-[12rem]">
            {positionTagLabel(player.position)}
          </div>

          <div className="relative z-10 flex h-full w-full flex-col items-center gap-6 px-6 pb-8 pt-20 text-center md:px-8">
            <div className="relative w-44 shrink-0 md:w-64">
              {player.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.avatarUrl}
                  alt={player.name}
                  className="w-full rounded-3xl object-cover object-center"
                />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center rounded-3xl bg-white/15 [font-family:var(--font-plus-jakarta)] text-5xl font-black text-white">
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="w-full pb-2 text-white">
              <div className="mb-2 flex flex-wrap items-center justify-center gap-3">
                <span className="rounded-full bg-[#ffe170] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#221b00]">
                  {qualityLabel(rating)}
                </span>
                <span className="text-sm font-semibold tracking-wide text-white/80">Dorsal {jersey}</span>
              </div>
              <h1 className="[font-family:var(--font-plus-jakarta)] text-3xl font-extrabold uppercase leading-none tracking-tighter md:text-5xl">
                {player.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-white/90">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4" />
                  {positionLabel(player.position)}
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4" />
                  {ageLabel(player.age)}
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  {player.team || 'Equipo'}
                </span>
              </div>
            </div>

            <div className="min-w-[110px] rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-md">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Rating</p>
              <p className="mt-1 [font-family:var(--font-plus-jakarta)] text-4xl font-black text-white">
                {rating.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-[#c1c6d6]/20 bg-white px-6 md:px-8">
          <div className="flex items-center gap-8 overflow-x-auto">
            <button className="whitespace-nowrap border-b-2 border-[#005db6] py-5 text-sm font-bold tracking-wide text-[#005db6]">
              Overview
            </button>
            <button className="whitespace-nowrap py-5 text-sm font-bold tracking-wide text-[#414754] hover:text-[#005db6]">
              Stats
            </button>
            <button className="whitespace-nowrap py-5 text-sm font-bold tracking-wide text-[#414754] hover:text-[#005db6]">
              Performance
            </button>
            <button className="whitespace-nowrap py-5 text-sm font-bold tracking-wide text-[#414754] hover:text-[#005db6]">
              History
            </button>
          </div>
        </div>

        <div className="space-y-10 p-6 md:p-8">
          <div className="flex flex-wrap gap-4">
            <BadgeItem icon={<Footprints className="h-4 w-4 text-[#005db6]" />} label="Pie dominante" value={dominantFootLabel(player.dominantFoot)} />
            <BadgeItem
              icon={<Ruler className="h-4 w-4 text-[#005db6]" />}
              label="Altura"
              value={player.heightCm ? `${player.heightCm} cm` : '--'}
            />
            <BadgeItem
              icon={<Scale className="h-4 w-4 text-[#005db6]" />}
              label="Peso"
              value={player.weightKg ? `${player.weightKg} kg` : '--'}
            />
          </div>

          <section>
            <h2 className="[font-family:var(--font-plus-jakarta)] text-xl font-bold text-[#181c20]">
              Rendimiento de temporada
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Partidos" value={player.stats.apps} />
              <StatCard label="Minutos" value={player.stats.minutes} />
              <StatCard label="Goles" value={player.stats.goals} />
              <StatCard label="Asistencias" value={player.stats.assists} />
              <StatCard label="Amarillas" value={player.stats.yellows} />
              <StatCard label="Rojas" value={player.stats.reds} />
            </div>
          </section>

          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-[#c1c6d6]/20 pt-8 md:flex-row md:items-center">
            <p className="text-sm font-medium text-[#414754]">
              Vista detallada del jugador seleccionada desde Plantilla.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={withEquipo('/estadisticas', equipoId)}
                className="rounded-full bg-[#ebeef3] px-6 py-3 text-sm font-bold text-[#181c20] transition hover:bg-[#dfe3e8]"
              >
                Ir a estadisticas
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-gradient-to-r from-[#005db6] to-[#2b5bb5] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(0,93,182,0.24)] transition hover:brightness-105"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BadgeItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-[#f1f4f9] px-5 py-3">
      {icon}
      <div className="text-sm">
        <span className="text-[#414754]">{label}:</span>
        <span className="ml-1 font-bold text-[#181c20]">{value}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="group flex flex-col items-center justify-center rounded-2xl bg-white p-6 text-center transition-all duration-300 hover:bg-[#005db6]">
      <div className="[font-family:var(--font-plus-jakarta)] text-3xl font-black tracking-tight text-[#005db6] group-hover:text-white">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#414754] group-hover:text-white/85">
        {label}
      </div>
    </div>
  )
}
