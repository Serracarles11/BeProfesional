'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { WeeklyCalendarDay } from '../types'

type WeeklyCalendarProps = {
  days: WeeklyCalendarDay[]
  onPrevWeek: () => void
  onNextWeek: () => void
}

export function WeeklyCalendar({ days, onPrevWeek, onNextWeek }: WeeklyCalendarProps) {
  return (
    <section className="rounded-2xl bg-[#f1f4f9] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="[font-family:var(--font-plus-jakarta)] text-sm font-bold tracking-tight text-[#181c20]">
          CALENDARIO SEMANAL
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrevWeek}
            className="rounded-md p-1 transition-colors hover:bg-white"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-5 w-5 text-[#5f6776]" />
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="rounded-md p-1 transition-colors hover:bg-white"
            aria-label="Siguiente semana"
          >
            <ChevronRight className="h-5 w-5 text-[#5f6776]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.key} className="group flex cursor-default flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-[#727785]">{day.dayLabel}</span>
            <div
              className={[
                'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all',
                day.isSelected
                  ? 'scale-105 bg-[#005db6] text-white shadow-lg shadow-[#005db6]/25'
                  : 'bg-white/70 text-[#181c20] group-hover:bg-white',
              ].join(' ')}
            >
              {day.dayNumber}
            </div>
            <div className="flex h-2 items-center gap-1">
              {Array.from({ length: Math.min(day.eventCount, 2) }, (_, index) => (
                <span
                  key={`${day.key}-${index}`}
                  className={[
                    'h-1 w-1 rounded-full',
                    index === 0 ? 'bg-[#005db6]' : 'bg-[#705d00]',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
