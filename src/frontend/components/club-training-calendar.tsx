"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import AnimatedList from "@/components/AnimatedList"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type ClubTrainingCalendarItem = {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  title: string
  type: string | null
  status: string | null
  teamName: string
  teamCategory: string
  coachName: string
  field: string
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]
const FIELD_COLORS = [
  {
    dot: "bg-[var(--bp-primary)]",
    border: "border-[var(--bp-primary)]",
    bg: "bg-[var(--bp-primary)]/10",
    text: "text-[var(--bp-primary)]",
  },
  {
    dot: "bg-[var(--bp-mid)]",
    border: "border-[var(--bp-mid)]",
    bg: "bg-[var(--bp-mid)]/10",
    text: "text-[var(--bp-mid)]",
  },
  {
    dot: "bg-[#0f766e]",
    border: "border-[#0f766e]",
    bg: "bg-[#0f766e]/10",
    text: "text-[#0f766e]",
  },
  {
    dot: "bg-[#b45309]",
    border: "border-[#b45309]",
    bg: "bg-[#b45309]/10",
    text: "text-[#b45309]",
  },
  {
    dot: "bg-[#7c3aed]",
    border: "border-[#7c3aed]",
    bg: "bg-[#7c3aed]/10",
    text: "text-[#7c3aed]",
  },
]

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfCalendar(date: Date) {
  const start = startOfMonth(date)
  const dayOffset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dayOffset)
  return start
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildCalendarDays(month: Date) {
  const start = startOfCalendar(month)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function formatTime(value: string | null) {
  if (!value) return null
  return value.slice(0, 5)
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function ClubTrainingCalendar({
  trainings,
}: {
  trainings: ClubTrainingCalendarItem[]
}) {
  const sortedTrainings = React.useMemo(
    () =>
      [...trainings].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return (a.startTime ?? "").localeCompare(b.startTime ?? "")
      }),
    [trainings]
  )
  const initialDate = new Date()
  const [selectedDate, setSelectedDate] = React.useState(initialDate)
  const [viewDate, setViewDate] = React.useState(() => startOfMonth(initialDate))

  const fields = React.useMemo(
    () => [...new Set(sortedTrainings.map((training) => training.field))],
    [sortedTrainings]
  )

  const fieldStyles = React.useMemo(() => {
    return new Map(fields.map((field, index) => [field, FIELD_COLORS[index % FIELD_COLORS.length]]))
  }, [fields])

  const trainingsByDate = React.useMemo(() => {
    const grouped = new Map<string, ClubTrainingCalendarItem[]>()
    sortedTrainings.forEach((training) => {
      const current = grouped.get(training.date) ?? []
      current.push(training)
      grouped.set(training.date, current)
    })
    return grouped
  }, [sortedTrainings])

  const selectedKey = toDateKey(selectedDate)
  const selectedTrainings = trainingsByDate.get(selectedKey) ?? []
  const days = React.useMemo(() => buildCalendarDays(viewDate), [viewDate])
  const monthLabel = viewDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  })
  const today = React.useMemo(() => new Date(), [])

  return (
    <Card className="flex h-full min-h-0 rounded-none border-0 bg-transparent shadow-none" id="entrenamientos">
      <CardHeader className="shrink-0 px-0 pt-0">
        <CardTitle className="text-[var(--bp-ink)]">Calendario de entrenamientos</CardTitle>
        <CardDescription>
          Todos los entrenamientos del club diferenciados por campo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 items-stretch gap-6 px-0 pb-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-0 flex-col rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="flex size-8 items-center justify-center rounded-md border text-[var(--bp-ink)] transition hover:bg-[var(--bp-soft)]/30"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bp-muted)]">
                Mes
              </p>
              <h3 className="text-lg font-semibold capitalize text-[var(--bp-ink)]">
                {monthLabel}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="flex size-8 items-center justify-center rounded-md border text-[var(--bp-ink)] transition hover:bg-[var(--bp-soft)]/30"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="pb-2 text-center text-xs font-semibold uppercase text-muted-foreground"
              >
                {label}
              </div>
            ))}

            {days.map((day) => {
              const dateKey = toDateKey(day)
              const dayTrainings = trainingsByDate.get(dateKey) ?? []
              const inCurrentMonth = day.getMonth() === viewDate.getMonth()
              const selected = isSameDay(day, selectedDate)
              const dayFields = [...new Set(dayTrainings.map((training) => training.field))]

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-0 overflow-hidden rounded-md border p-2 text-left transition",
                    inCurrentMonth ? "bg-white text-[var(--bp-ink)]" : "bg-muted/30 text-muted-foreground",
                    selected && "border-[var(--bp-primary)] ring-2 ring-[var(--bp-primary)]/20",
                    isSameDay(day, today) && !selected && "border-[var(--bp-mid)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{day.getDate()}</span>
                    {dayTrainings.length > 0 ? (
                      <span className="rounded-full bg-[var(--bp-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--bp-ink)]">
                        {dayTrainings.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {dayFields.slice(0, 4).map((field) => {
                      const style = fieldStyles.get(field) ?? FIELD_COLORS[0]
                      return (
                        <span
                          key={field}
                          title={field}
                          className={cn("h-2 w-2 rounded-full", style.dot)}
                        />
                      )
                    })}
                  </div>

                  <div className="mt-2 hidden space-y-1 md:block">
                    {dayTrainings.slice(0, 2).map((training) => {
                      const style = fieldStyles.get(training.field) ?? FIELD_COLORS[0]
                      return (
                        <div
                          key={training.id}
                          className={cn(
                            "truncate rounded border-l-2 px-2 py-1 text-[11px] font-medium",
                            style.border,
                            style.bg,
                            style.text
                          )}
                        >
                          {formatTime(training.startTime) ?? "--:--"} · {training.teamCategory} · {training.coachName}
                        </div>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-[var(--bp-ink)]">Campos</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {fields.length > 0 ? (
                fields.map((field) => {
                  const style = fieldStyles.get(field) ?? FIELD_COLORS[0]
                  return (
                    <Badge
                      key={field}
                      variant="outline"
                      className={cn("gap-2 border-current", style.text)}
                    >
                      <span className={cn("size-2 rounded-full", style.dot)} />
                      {field}
                    </Badge>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">No hay campos registrados.</p>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-[var(--bp-ink)]">
              {selectedDate.toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>

            <div className="mt-4 min-h-0 flex-1">
              {selectedTrainings.length > 0 ? (
                <AnimatedList
                  items={selectedTrainings}
                  className="h-full"
                  showGradients
                  enableArrowNavigation
                  displayScrollbar
                  renderItem={(training) => {
                    const style = fieldStyles.get(training.field) ?? FIELD_COLORS[0]
                    const start = formatTime(training.startTime)
                    const end = formatTime(training.endTime)

                    return (
                      <article
                        className={cn("rounded-lg border-l-4 bg-white p-3 shadow-sm", style.border)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-[var(--bp-ink)]">{training.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {training.teamCategory} · {training.teamName}
                            </p>
                          </div>
                          <Badge variant="outline" className={style.text}>
                            {training.type || "Sesion"}
                          </Badge>
                        </div>
                        <div className="mt-3 text-sm text-[var(--bp-ink)]">
                          <p>{start ? `${start}${end ? ` - ${end}` : ""}` : "Hora sin definir"}</p>
                          <p>Entrenador: {training.coachName}</p>
                          <p className={cn("font-semibold", style.text)}>{training.field}</p>
                        </div>
                      </article>
                    )
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay entrenamientos para este dia.
                </p>
              )}
            </div>
          </div>
        </aside>
      </CardContent>
    </Card>
  )
}
