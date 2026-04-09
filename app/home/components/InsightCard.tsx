'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Clock3, MapPin, Plus, Shield } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import type { DashboardActivityItem } from '../types'

type InsightCardProps = {
  activities: DashboardActivityItem[]
  isCoach: boolean
  onOpenCreateEvent: (dateKey?: string) => void
  onDeleteTraining: (trainingId: string) => Promise<void>
}

function formatSelectedDate(date?: Date) {
  if (!date) return 'Sin fecha'

  const formatted = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatEventTime(value: string | null) {
  if (!value) return 'Sin hora'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const timePart = value.split('T')[1]
    return timePart ? timePart.slice(0, 5) : 'Sin hora'
  }

  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEventDateTime(event: DashboardActivityItem) {
  const source = event.time ?? event.date
  const date = new Date(source)

  if (Number.isNaN(date.getTime())) {
    return event.date
  }

  return date.toLocaleString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: event.time ? '2-digit' : undefined,
    minute: event.time ? '2-digit' : undefined,
  })
}

function getEventTypeLabel(type: DashboardActivityItem['type']) {
  return type === 'partido' ? 'Partido' : 'Entrenamiento'
}

export function InsightCard({ activities, isCoach, onOpenCreateEvent, onDeleteTraining }: InsightCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [activeEvent, setActiveEvent] = useState<DashboardActivityItem | null>(null)
  const [isDeletingTraining, setIsDeletingTraining] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const selectedDateLabel = useMemo(() => formatSelectedDate(selectedDate), [selectedDate])
  const selectedDateKey = selectedDate ? getDateKey(selectedDate) : ''

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DashboardActivityItem[]>()

    for (const activity of activities) {
      const bucket = map.get(activity.date) ?? []
      bucket.push(activity)
      map.set(activity.date, bucket)
    }

    for (const [key, bucket] of map.entries()) {
      bucket.sort((left, right) => {
        const leftSource = left.time ?? left.date
        const rightSource = right.time ?? right.date
        return leftSource.localeCompare(rightSource)
      })
      map.set(key, bucket)
    }

    return map
  }, [activities])

  const daySummaryByDate = useMemo(() => {
    const summary: Record<string, { total: number; trainings: number; matches: number }> = {}

    for (const activity of activities) {
      const current = summary[activity.date] ?? { total: 0, trainings: 0, matches: 0 }
      current.total += 1
      if (activity.type === 'entrenamiento') current.trainings += 1
      else current.matches += 1
      summary[activity.date] = current
    }

    return summary
  }, [activities])

  const selectedDayEvents = selectedDateKey ? eventsByDate.get(selectedDateKey) ?? [] : []
  const canDeleteTraining = isCoach && activeEvent?.type === 'entrenamiento'

  return (
    <>
      <section className="overflow-hidden rounded-[28px] border border-[#d9e4f7] bg-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.35)]">
        <div className="border-b border-[#e7eef9] bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#005db6] text-white shadow-[0_18px_34px_-18px_rgba(0,93,182,0.9)]">
                <CalendarDays className="h-4.5 w-4.5" strokeWidth={2} />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5f6d86]">
                  Planificacion
                </p>
                <h3 className="mt-1 [font-family:var(--font-plus-jakarta)] text-lg font-extrabold text-[#0f172a]">
                  Calendario del equipo
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-[#4b5565]">
                  Visualiza entrenamientos y partidos y abre el detalle de cada evento desde el propio calendario.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#005db6] shadow-[0_12px_28px_-20px_rgba(0,93,182,0.55)]">
                {selectedDateLabel}
              </span>
              {isCoach ? (
                <button
                  type="button"
                  onClick={() => onOpenCreateEvent(selectedDateKey || undefined)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#005db6] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#004f9a]"
                >
                  <Plus className="h-4 w-4" />
                  Anadir entrenamiento / partido
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-4 xl:grid-cols-[1.02fr_0.98fr] xl:items-start">
          <div className="rounded-[24px] border border-[#e3ebf8] bg-[#f8fbff] p-4 xl:h-[560px]">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              eventSummaryByDate={daySummaryByDate}
              className="border-none bg-transparent p-0"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#617084]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#005db6]" />
                Entrenamientos
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" />
                Partidos
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e3ebf8] bg-[#fbfdff] p-4 xl:flex xl:h-[560px] xl:flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#738197]">
                  Eventos del dia
                </p>
                <h4 className="[font-family:var(--font-plus-jakarta)] text-base font-bold text-[#111827]">
                  {selectedDateLabel}
                </h4>
              </div>
              <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-bold text-[#005db6]">
                {selectedDayEvents.length} evento{selectedDayEvents.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-2.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setDeleteError('')
                      setActiveEvent(event)
                    }}
                    className="w-full rounded-2xl border border-[#dbe5f4] bg-white p-3.5 text-left transition hover:border-[#bfd0ef] hover:shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                            event.type === 'partido'
                              ? 'bg-[#fff1df] text-[#b45309]'
                              : 'bg-[#e8f0ff] text-[#005db6]',
                          ].join(' ')}
                        >
                          {getEventTypeLabel(event.type)}
                        </span>
                        <h5 className="mt-1.5 text-sm font-bold text-[#111827]">{event.title}</h5>
                      </div>
                      <span className="text-xs font-bold text-[#4b5565]">{formatEventTime(event.time)}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs text-[#5f6d86]">
                      {event.location ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f8fc] px-2.5 py-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </span>
                      ) : null}
                      {event.opponent ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f8fc] px-2.5 py-1">
                          <Shield className="h-3.5 w-3.5" />
                          {event.opponent}
                        </span>
                      ) : null}
                      {event.subtitle ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f8fc] px-2.5 py-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {event.subtitle}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d7e1f1] bg-white px-4 py-8 text-center text-sm text-[#6b7280]">
                  No hay eventos para este dia.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {activeEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_40px_90px_-42px_rgba(15,23,42,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={[
                    'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                    activeEvent.type === 'partido'
                      ? 'bg-[#fff1df] text-[#b45309]'
                      : 'bg-[#e8f0ff] text-[#005db6]',
                  ].join(' ')}
                >
                  {getEventTypeLabel(activeEvent.type)}
                </span>
                <h4 className="mt-3 [font-family:var(--font-plus-jakarta)] text-xl font-extrabold text-[#111827]">
                  {activeEvent.title}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteError('')
                  setActiveEvent(null)
                }}
                className="rounded-xl border border-[#d7e1f1] px-3 py-1.5 text-xs font-bold text-[#5f6d86] transition hover:bg-[#f8fbff]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-[#f8fbff] p-4 text-sm text-[#334155]">
              <p>
                <span className="font-bold text-[#111827]">Fecha:</span> {formatEventDateTime(activeEvent)}
              </p>
              {activeEvent.location ? (
                <p>
                  <span className="font-bold text-[#111827]">Lugar:</span> {activeEvent.location}
                </p>
              ) : null}
              {activeEvent.opponent ? (
                <p>
                  <span className="font-bold text-[#111827]">Rival:</span> {activeEvent.opponent}
                </p>
              ) : null}
              {activeEvent.homeAway ? (
                <p>
                  <span className="font-bold text-[#111827]">Condicion:</span> {activeEvent.homeAway}
                </p>
              ) : null}
              {activeEvent.competition ? (
                <p>
                  <span className="font-bold text-[#111827]">Competicion:</span> {activeEvent.competition}
                </p>
              ) : null}
              {activeEvent.subtitle ? (
                <p>
                  <span className="font-bold text-[#111827]">Detalle:</span> {activeEvent.subtitle}
                </p>
              ) : null}
              {activeEvent.status ? (
                <p>
                  <span className="font-bold text-[#111827]">Estado:</span> {activeEvent.status}
                </p>
              ) : null}
              {activeEvent.type === 'entrenamiento' ? (
                <div>
                  <p className="font-bold text-[#111827]">
                    Pueden ir: {activeEvent.attendees?.length ?? 0}
                  </p>
                  {activeEvent.attendees && activeEvent.attendees.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeEvent.attendees.map((attendee) => (
                        <span
                          key={attendee.id}
                          className="rounded-full bg-[#e8f5eb] px-2.5 py-1 text-xs font-semibold text-[#1b6e35]"
                        >
                          {attendee.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[#667085]">Todavia no ha confirmado nadie.</p>
                  )}
                </div>
              ) : null}
            </div>

            {canDeleteTraining ? (
              <div className="mt-5 space-y-3">
                {deleteError ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {deleteError}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isDeletingTraining}
                    onClick={async () => {
                      if (!activeEvent) return
                      const trainingId = activeEvent.id.replace(/^training-/, '')
                      setIsDeletingTraining(true)
                      setDeleteError('')
                      try {
                        await onDeleteTraining(trainingId)
                        setActiveEvent(null)
                      } catch (error) {
                        setDeleteError(
                          error instanceof Error
                            ? error.message
                            : 'No se pudo eliminar el entrenamiento.'
                        )
                      } finally {
                        setIsDeletingTraining(false)
                      }
                    }}
                    className="rounded-xl bg-[#c62828] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#aa1f1f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingTraining ? 'Eliminando...' : 'Eliminar entrenamiento'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
