'use client'

import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { SquadSuccessResponse } from '../types'
import { formatNextMatch, withEquipo } from '../utils'

type SquadHighlightsProps = {
  summary: SquadSuccessResponse['summary']
  equipoId?: string
}

export function SquadHighlights({ summary, equipoId }: SquadHighlightsProps) {
  return (
    <section className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
      <article className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#005db6] to-[#2b5bb5] p-10 md:col-span-2">
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
              Elite Stat
            </span>
            <h3 className="mt-4 [font-family:var(--font-plus-jakarta)] text-4xl font-extrabold tracking-tighter text-white">
              SQUAD PASSING ACCURACY
            </h3>
            <p className="mt-2 max-w-md text-white/80">
              Rendimiento colectivo estimado con datos reales del equipo en partidos recientes.
            </p>
          </div>

          <div className="mt-8">
            <div className="flex items-end gap-1">
              <span className="[font-family:var(--font-plus-jakarta)] text-7xl font-black leading-none text-white">
                {summary.squadPassAccuracy.toFixed(1)}
              </span>
              <span className="[font-family:var(--font-plus-jakarta)] pb-1 text-2xl font-bold text-white/70">%</span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${summary.squadPassAccuracy}%` }} />
            </div>
          </div>
        </div>

        <span className="pointer-events-none absolute right-0 top-0 -translate-y-12 translate-x-12 select-none [font-family:var(--font-plus-jakarta)] text-[200px] font-black text-white/5">
          DATA
        </span>
      </article>

      <article className="flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(0,93,182,0.05)]">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#005db6]/5 text-[#005db6]">
          <Trophy className="h-9 w-9" />
        </div>

        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#727785]">Next Match Ready</p>
        <h4 className="mb-3 [font-family:var(--font-plus-jakarta)] text-2xl font-extrabold text-[#181c20]">MATCH PREP</h4>
        <p className="mb-2 text-sm text-[#727785]">Indice de preparacion fisica actual: {summary.readinessIndex}%.</p>
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.1em] text-[#3176d2]">{formatNextMatch(summary)}</p>

        <Link
          href={withEquipo('/partidos', equipoId)}
          className="[font-family:var(--font-plus-jakarta)] border-b-2 border-[#3176d2] pb-1 text-sm font-extrabold text-[#005db6] transition hover:border-[#005db6]"
        >
          VIEW SCHEDULE
        </Link>
      </article>
    </section>
  )
}
