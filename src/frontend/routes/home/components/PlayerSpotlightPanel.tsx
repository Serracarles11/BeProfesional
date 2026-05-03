'use client'

import { MoreVertical, Star } from 'lucide-react'
import { getPlayerInitials } from '../utils'

type PlayerSpotlightPanelProps = {
  playerName: string
  position: string
  imageUrl?: string | null
  goals: number
  assists: number
  matches: number
  minutes: number
  stats?: Array<{
    label: string
    value: number
  }>
}

export function PlayerSpotlightPanel({
  playerName,
  position,
  imageUrl,
  goals,
  assists,
  matches,
  minutes,
  stats,
}: PlayerSpotlightPanelProps) {
  const initials = getPlayerInitials(playerName)
  const seasonStats = stats ?? [
    { label: 'GOLES', value: goals },
    { label: 'ASISTENCIAS', value: assists },
    { label: 'PARTIDOS', value: matches },
    { label: 'MINUTOS', value: minutes },
  ]

  return (
    <section className="h-full border-t border-[#dfe3e8] bg-white xl:w-[400px] xl:border-l xl:border-t-0">
      <div className="relative px-6 pb-8 pt-10 lg:px-8">
        <button
          type="button"
          className="absolute right-6 top-6 rounded-md p-1 text-[#9aa0ae] transition hover:bg-[#f1f4f9] hover:text-[#005db6]"
          aria-label="Más opciones"
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

        <div className="relative mb-8 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#dfe3e8]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={playerName}
              className="h-full w-full object-cover"
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
            {seasonStats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
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
