'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalendarProps = {
  mode?: 'single'
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  eventSummaryByDate?: Record<
    string,
    {
      total: number
      trainings: number
      matches: number
    }
  >
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfCalendar(date: Date) {
  const start = startOfMonth(date)
  const dayOffset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dayOffset)
  return start
}

function buildCalendarDays(month: Date) {
  const start = startOfCalendar(month)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function isSameDay(left?: Date, right?: Date) {
  if (!left || !right) return false

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  className,
  eventSummaryByDate,
}: CalendarProps) {
  const [viewDate, setViewDate] = React.useState(() => startOfMonth(selected ?? new Date()))

  React.useEffect(() => {
    if (!selected) return
    setViewDate(startOfMonth(selected))
  }, [selected])

  const today = React.useMemo(() => new Date(), [])
  const monthLabel = viewDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })
  const days = React.useMemo(() => buildCalendarDays(viewDate), [viewDate])

  return (
    <div className={cn('rounded-lg border', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d9e4f7] bg-white text-[#4e5b70] transition hover:border-[#bfd0ef] hover:text-[#005db6]"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7b8799]">Mes actual</p>
          <h4 className="mt-1 [font-family:var(--font-plus-jakarta)] text-base font-bold capitalize text-[#181c20]">
            {monthLabel}
          </h4>
        </div>

        <button
          type="button"
          onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d9e4f7] bg-white text-[#4e5b70] transition hover:border-[#bfd0ef] hover:text-[#005db6]"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b8799]"
          >
            {label}
          </span>
        ))}

        {days.map((day) => {
          const inCurrentMonth = day.getMonth() === viewDate.getMonth()
          const isSelected = isSameDay(day, selected)
          const isToday = isSameDay(day, today)
          const summary = eventSummaryByDate?.[toDateKey(day)]
          const hasMatch = Boolean(summary?.matches)
          const hasTraining = Boolean(summary?.trainings)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                if (mode === 'single') onSelect?.(day)
              }}
              aria-pressed={isSelected}
              className={cn(
                'flex h-12 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all',
                inCurrentMonth ? 'text-[#1f2734]' : 'text-[#a4aec0]',
                isSelected
                  ? 'bg-[#005db6] text-white shadow-[0_14px_30px_-18px_rgba(0,93,182,0.9)]'
                  : 'bg-white/80 hover:bg-white',
                isToday && !isSelected && !hasMatch && !hasTraining && 'border border-[#b9cef3] text-[#005db6]',
                hasTraining && !hasMatch && !isSelected && 'border-2 border-[#8fb1ef] bg-[#f4f8ff] text-[#1f56a8] shadow-[0_12px_26px_-22px_rgba(0,93,182,0.75)]',
                hasMatch && !isSelected && 'border-2 border-[#d97706] bg-[#fff7ed] text-[#9a4f05] shadow-[0_12px_26px_-22px_rgba(217,119,6,0.9)]'
              )}
            >
              <span>{day.getDate()}</span>
              {summary ? (
                <span className="mt-1 flex items-center gap-1">
                  {summary.trainings > 0 ? (
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isSelected ? 'bg-white' : 'bg-[#005db6]'
                      )}
                    />
                  ) : null}
                  {summary.matches > 0 ? (
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isSelected ? 'bg-[#ffe082]' : 'bg-[#d97706]'
                      )}
                    />
                  ) : null}
                  {summary.total > 2 ? (
                    <span
                      className={cn(
                        'text-[10px] font-bold',
                        isSelected ? 'text-white/85' : 'text-[#7b8799]'
                      )}
                    >
                      {summary.total}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
