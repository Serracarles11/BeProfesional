'use client'

import type { PositionFilter } from '../types'

const FILTERS: Array<{ value: PositionFilter; label: string }> = [
  { value: 'ALL', label: 'All Players' },
  { value: 'GK', label: 'GK' },
  { value: 'DEF', label: 'DEF' },
  { value: 'MID', label: 'MID' },
  { value: 'FWD', label: 'FWD' },
]

type SquadHeaderProps = {
  seasonLabel: string
  selectedFilter: PositionFilter
  onFilterChange: (value: PositionFilter) => void
}

export function SquadHeader({ seasonLabel, selectedFilter, onFilterChange }: SquadHeaderProps) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div>
        <span className="[font-family:var(--font-plus-jakarta)] text-sm font-extrabold uppercase tracking-[0.2em] text-[#005db6]">
          Season {seasonLabel}
        </span>
        <h2 className="mt-2 [font-family:var(--font-plus-jakarta)] text-5xl font-extrabold tracking-tighter text-[#181c20]">
          ELITE SQUAD
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#f1f4f9] p-1.5">
        {FILTERS.map((filter) => {
          const active = selectedFilter === filter.value

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              className={[
                '[font-family:var(--font-plus-jakarta)] rounded-xl px-6 py-2 text-xs font-bold transition-colors',
                active
                  ? 'bg-white text-[#005db6] shadow-sm'
                  : 'text-[#727785] hover:text-[#005db6]',
              ].join(' ')}
            >
              {filter.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
