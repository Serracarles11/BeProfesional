'use client'

import Link from 'next/link'
import { Eye } from 'lucide-react'
import type { SquadPlayer } from '../types'
import {
  formatGoalsPer90,
  goalsPer90,
  playerInitials,
  positionTagLabel,
  withEquipo,
} from '../utils'

type PlayerGridProps = {
  players: SquadPlayer[]
  equipoId?: string
}

export function PlayerGrid({ players, equipoId }: PlayerGridProps) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {players.map((player, index) => (
        <PlayerCard key={player.id} player={player} index={index} equipoId={equipoId} />
      ))}
    </div>
  )
}

type PlayerCardProps = {
  player: SquadPlayer
  index: number
  equipoId?: string
}

function PlayerCard({ player, index, equipoId }: PlayerCardProps) {
  const jersey = player.dorsal !== null ? String(player.dorsal).padStart(2, '0') : String(index + 1).padStart(2, '0')

  return (
    <article className="group relative overflow-hidden rounded-3xl bg-white shadow-[0_20px_40px_rgba(0,93,182,0.05)] transition-all duration-500 hover:shadow-xl">
      <div className="relative h-80 overflow-hidden bg-[#ebeef3]">
        <span className="pointer-events-none absolute -bottom-8 -left-4 select-none [font-family:var(--font-plus-jakarta)] text-[120px] font-black italic leading-none text-[#005db6]/8 transition-transform duration-700 group-hover:-translate-y-4">
          {jersey}
        </span>

        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.avatarUrl}
            alt={player.name}
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d6e3ff] via-[#759efd] to-[#3176d2] text-6xl font-black text-white">
            {playerInitials(player.name)}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-[#005db6]/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Link
            href={withEquipo('/estadisticas', equipoId)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 [font-family:var(--font-plus-jakarta)] text-sm font-bold text-[#005db6] shadow-2xl"
          >
            <Eye className="h-4 w-4" />
            View Details
          </Link>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#005db6]">
              {positionTagLabel(player.position)}
            </p>
            <h3 className="[font-family:var(--font-plus-jakarta)] text-xl font-extrabold leading-none text-[#181c20]">
              {player.name.toUpperCase()}
            </h3>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#727785]">
              {player.team || 'TEAM'}
            </p>
          </div>
          <span className="[font-family:var(--font-plus-jakarta)] text-sm font-bold text-[#727785]">
            {player.age ? `${player.age} YRS` : '--'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[#ebeef3] pt-4">
          <StatItem label="Minutos Totales" value={String(player.stats.minutes)} />
          <StatItem label="Goles" value={String(player.stats.goals)} accent />
          <StatItem label="Goles/90" value={formatGoalsPer90(goalsPer90(player))} />
        </div>
      </div>
    </article>
  )
}

function StatItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-bold uppercase text-[#727785]">{label}</p>
      <p
        className={[
          '[font-family:var(--font-plus-jakarta)] text-lg font-extrabold',
          accent ? 'text-[#005db6]' : 'text-[#181c20]',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
