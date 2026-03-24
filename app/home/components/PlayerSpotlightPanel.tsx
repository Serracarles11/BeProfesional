'use client'

import Link from 'next/link'
import { MoreVertical, Star } from 'lucide-react'
import { getPlayerInitials, withEquipo } from '../utils'

type PlayerSpotlightPanelProps = {
  equipoId?: string
  playerName: string
  position: string
  imageUrl?: string | null
  goals: number
  assists: number
  matches: number
  minutes: number
  topSpeed: number
  passAccuracy: number
}

function ProgressBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(Math.round(value), 100))

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#a9c7ff]">
      <div className="h-full rounded-full bg-[#005db6]" style={{ width: `${width}%` }} />
    </div>
  )
}

export function PlayerSpotlightPanel({
  equipoId,
  playerName,
  position,
  imageUrl,
  goals,
  assists,
  matches,
  minutes,
  topSpeed,
  passAccuracy,
}: PlayerSpotlightPanelProps) {
  const initials = getPlayerInitials(playerName)

  return (
    <section className="h-full border-t border-[#dfe3e8] bg-white xl:w-[400px] xl:border-l xl:border-t-0">
      <div className="relative px-6 pb-8 pt-10 lg:px-8">
        <button
          type="button"
          className="absolute right-6 top-6 rounded-md p-1 text-[#9aa0ae] transition hover:bg-[#f1f4f9] hover:text-[#005db6]"
          aria-label="Mas opciones"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        <header className="mb-7 pr-10">
          <p className="mb-2 text-[11px] font-black tracking-[0.2em] text-[#005db6]">PERFIL DESTACADO</p>
          <h2 className="mb-4 [font-family:var(--font-plus-jakarta)] text-4xl font-extrabold leading-[0.9] tracking-tight text-[#181c20] lg:text-5xl">
            {playerName.toUpperCase()}
          </h2>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#ffe170] px-3 py-1 text-[10px] font-black text-[#221b00]">
              <Star className="h-3 w-3" />
              ELITE PROSPECT
            </span>
            <span className="rounded-md bg-[#f1f4f9] px-3 py-1 text-[10px] font-black text-[#5f6776]">SUB-21</span>
          </div>
        </header>

        <div className="group relative mb-8 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#dfe3e8]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={playerName}
              className="h-full w-full scale-105 object-cover grayscale transition-all duration-700 group-hover:scale-100 group-hover:grayscale-0"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#a9c7ff] via-[#3176d2] to-[#005db6] text-6xl font-black text-white">
              {initials}
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 to-transparent p-6 text-white">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-white/70">Posicion</p>
                <p className="text-lg font-bold">{position}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/70">Partidos</p>
                <p className="text-4xl font-black italic">{matches}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="border-b border-[#eef2f8] pb-2 text-xs font-bold tracking-[0.18em] text-[#727785]">
            RENDIMIENTO ESTACIONAL
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="GOLES" value={goals} />
            <StatCard label="ASISTENCIAS" value={assists} />
            <StatCard label="PARTIDOS" value={matches} />
            <StatCard label="MINUTOS" value={minutes} />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>VELOCIDAD MAXIMA</span>
              <span className="text-[#005db6]">{topSpeed.toFixed(1)} km/h</span>
            </div>
            <ProgressBar value={(topSpeed / 36) * 100} />

            <div className="flex items-center justify-between pt-2 text-xs font-bold">
              <span>PRECISION DE PASE</span>
              <span className="text-[#005db6]">{passAccuracy}%</span>
            </div>
            <ProgressBar value={passAccuracy} />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href={withEquipo('/estadisticas', equipoId)}
            className="flex w-full items-center justify-center rounded-full bg-[#005db6] px-4 py-4 text-sm font-bold text-white shadow-xl shadow-[#005db6]/25 transition hover:shadow-[#005db6]/40"
          >
            Enviar Informe a Scouting
          </Link>
          <Link
            href={withEquipo('/jugadores', equipoId)}
            className="flex w-full items-center justify-center rounded-full border-2 border-[#eef2f8] bg-transparent px-4 py-4 text-sm font-bold text-[#5f6776] transition hover:bg-[#f8faff]"
          >
            Comparar con Plantilla
          </Link>
        </div>
      </div>
    </section>
  )
}

type StatCardProps = {
  label: string
  value: number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl bg-[#f1f4f9] p-4">
      <p className="mb-1 text-[10px] font-bold text-[#727785]">{label}</p>
      <p className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">{value}</p>
    </div>
  )
}
