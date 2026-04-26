'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, HelpCircle, Loader2, MapPin, Plus, Shield, Users, XCircle } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import type { DashboardActivityItem } from '../types'

type InsightCardProps = {
  activities: DashboardActivityItem[]
  isCoach: boolean
  equipoId?: string | null
  onOpenCreateEvent: (dateKey?: string) => void
  onOpenWeeklyTraining?: () => void
  onEditEvent?: (event: DashboardActivityItem) => void
  onDeleteEvent?: (event: DashboardActivityItem) => void
}

type AttendanceStatus = 'CONFIRMADO' | 'NO_VA' | 'SIN_RESPUESTA'

type Attendee = {
  usuarioId: string
  nombre: string
  fotoUrl: string | null
  posicion: string | null
  estado: AttendanceStatus
  invitado: boolean
}

type AttendeesResponse = {
  ok: true
  totals: { invited: number; confirmed: number; declined: number; noResponse: number }
  hasExplicitRecipients: boolean
  players: Attendee[]
}

function getEventDatabaseId(event: DashboardActivityItem) {
  const prefix = event.type === 'partido' ? 'match-' : 'training-'
  return event.id.startsWith(prefix) ? event.id.slice(prefix.length) : event.id
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'
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

export function InsightCard({
  activities,
  isCoach,
  equipoId,
  onOpenCreateEvent,
  onOpenWeeklyTraining,
  onEditEvent,
  onDeleteEvent,
}: InsightCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [activeEvent, setActiveEvent] = useState<DashboardActivityItem | null>(null)
  const [attendees, setAttendees] = useState<AttendeesResponse | null>(null)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [attendeesError, setAttendeesError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeEvent || !isCoach || activeEvent.type !== 'entrenamiento' || !equipoId) {
      setAttendees(null)
      setAttendeesError(null)
      setIsLoadingAttendees(false)
      return
    }

    const trainingId = getEventDatabaseId(activeEvent)
    const controller = new AbortController()

    setAttendees(null)
    setAttendeesError(null)
    setIsLoadingAttendees(true)

    const params = new URLSearchParams({ equipoId, trainingId })
    fetch(`/api/dashboard/home/trainings/attendees?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | (AttendeesResponse & { ok: true })
          | { ok: false; error?: string }
          | null

        if (!response.ok || !payload || payload.ok !== true) {
          throw new Error((payload && 'error' in payload && payload.error) || 'No se pudo cargar la asistencia.')
        }

        setAttendees(payload)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setAttendeesError(error instanceof Error ? error.message : 'No se pudo cargar la asistencia.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingAttendees(false)
      })

    return () => controller.abort()
  }, [activeEvent, isCoach, equipoId])

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

  return (
    <>
      <section className="overflow-hidden rounded-[28px] border border-[#d9e4f7] bg-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.35)]">
        <div className="border-b border-[#e7eef9] bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#005db6] text-white shadow-[0_18px_34px_-18px_rgba(0,93,182,0.9)]">
                <CalendarDays className="h-5 w-5" strokeWidth={2} />
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5f6d86]">
                  Planificacion
                </p>
                <h3 className="mt-1 [font-family:var(--font-plus-jakarta)] text-xl font-extrabold text-[#0f172a]">
                  Calendario del equipo
                </h3>
                <p className="mt-1 text-sm text-[#4b5565]">
                  Visualiza entrenamientos y partidos y abre el detalle de cada evento desde el propio calendario.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#005db6] shadow-[0_12px_28px_-20px_rgba(0,93,182,0.55)]">
                {selectedDateLabel}
              </span>
              {isCoach ? (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenCreateEvent(selectedDateKey || undefined)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#005db6] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#004f9a]"
                  >
                    <Plus className="h-4 w-4" />
                    Anadir entrenamiento / partido
                  </button>
                  <button
                    type="button"
                    onClick={onOpenWeeklyTraining}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#c7d7ef] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#005db6] transition hover:border-[#005db6] hover:bg-[#eef6ff]"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Fijos
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[#e3ebf8] bg-[#f8fbff] p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              eventSummaryByDate={daySummaryByDate}
              className="border-none bg-transparent p-0"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#617084]">
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

          <div className="rounded-[24px] border border-[#e3ebf8] bg-[#fbfdff] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#738197]">
                  Eventos del dia
                </p>
                <h4 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#111827]">
                  {selectedDateLabel}
                </h4>
              </div>
              <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-bold text-[#005db6]">
                {selectedDayEvents.length} evento{selectedDayEvents.length === 1 ? '' : 's'}
              </span>
            </div>

            <div
              className={[
                'space-y-3 pr-1',
                selectedDayEvents.length > 3 ? 'max-h-[360px] overflow-y-auto' : '',
              ].join(' ')}
            >
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setActiveEvent(event)}
                    className="w-full rounded-2xl border border-[#dbe5f4] bg-white p-4 text-left transition hover:border-[#bfd0ef] hover:shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]"
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
                        <h5 className="mt-2 text-sm font-bold text-[#111827]">{event.title}</h5>
                      </div>
                      <span className="text-xs font-bold text-[#4b5565]">{formatEventTime(event.time)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-[#5f6d86]">
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
                <div className="rounded-2xl border border-dashed border-[#d7e1f1] bg-white px-4 py-10 text-center text-sm text-[#6b7280]">
                  No hay eventos para este dia.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {activeEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_40px_90px_-42px_rgba(15,23,42,0.55)]">
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
                onClick={() => setActiveEvent(null)}
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
            </div>

            {isCoach && activeEvent.type === 'entrenamiento' ? (
              <AttendancePanel
                isLoading={isLoadingAttendees}
                error={attendeesError}
                data={attendees}
              />
            ) : null}

            {isCoach ? (
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const eventToEdit = activeEvent
                    setActiveEvent(null)
                    onEditEvent?.(eventToEdit)
                  }}
                  className="rounded-xl border border-[#c7d7ef] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#005db6] transition hover:border-[#005db6] hover:bg-[#eef6ff]"
                >
                  Modificar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const eventToDelete = activeEvent
                    setActiveEvent(null)
                    onDeleteEvent?.(eventToDelete)
                  }}
                  className="rounded-xl bg-[#dc2626] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#b91c1c]"
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}

function AttendancePanel({
  isLoading,
  error,
  data,
}: {
  isLoading: boolean
  error: string | null
  data: AttendeesResponse | null
}) {
  return (
    <div className="mt-4 rounded-2xl border border-[#e3ebf8] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#005db6]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738197]">Asistencia</p>
            <h5 className="[font-family:var(--font-plus-jakarta)] text-sm font-bold text-[#111827]">
              Quien va al entrenamiento
            </h5>
          </div>
        </div>
        {data ? (
          <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-bold text-[#005db6]">
            {data.totals.confirmed}/{data.totals.invited}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-[#5f6d86]">
          <Loader2 className="h-4 w-4 animate-spin text-[#005db6]" />
          Cargando asistencia...
        </div>
      ) : error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : data ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <div className="rounded-xl bg-[#ecfdf5] px-2 py-2 text-[#047857]">
              <p className="text-base font-extrabold">{data.totals.confirmed}</p>
              <p className="text-[10px] uppercase tracking-[0.12em]">Van</p>
            </div>
            <div className="rounded-xl bg-[#fef2f2] px-2 py-2 text-[#b91c1c]">
              <p className="text-base font-extrabold">{data.totals.declined}</p>
              <p className="text-[10px] uppercase tracking-[0.12em]">No van</p>
            </div>
            <div className="rounded-xl bg-[#f1f5f9] px-2 py-2 text-[#475569]">
              <p className="text-base font-extrabold">{data.totals.noResponse}</p>
              <p className="text-[10px] uppercase tracking-[0.12em]">Sin respuesta</p>
            </div>
          </div>

          {data.players.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-[#d7e1f1] bg-[#f8fbff] px-3 py-3 text-center text-xs text-[#5f6d86]">
              No hay jugadores asignados a este entrenamiento.
            </p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {data.players.map((player) => (
                <AttendanceRow key={player.usuarioId} player={player} />
              ))}
            </ul>
          )}

          {!data.hasExplicitRecipients && data.players.length > 0 ? (
            <p className="mt-2 text-[11px] text-[#738197]">
              Este entrenamiento esta abierto a toda la plantilla.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function AttendanceRow({ player }: { player: Attendee }) {
  const statusConfig =
    player.estado === 'CONFIRMADO'
      ? { Icon: CheckCircle2, label: 'Va', tone: 'text-[#047857] bg-[#ecfdf5]' }
      : player.estado === 'NO_VA'
        ? { Icon: XCircle, label: 'No va', tone: 'text-[#b91c1c] bg-[#fef2f2]' }
        : { Icon: HelpCircle, label: 'Sin responder', tone: 'text-[#475569] bg-[#f1f5f9]' }
  const StatusIcon = statusConfig.Icon

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-[#eef2f9] bg-[#fbfcff] px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0f172a] text-[10px] font-bold text-white">
          {player.fotoUrl ? (
            <img src={player.fotoUrl} alt={player.nombre} className="h-full w-full object-cover" />
          ) : (
            getInitials(player.nombre)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111827]">{player.nombre}</p>
          {player.posicion ? (
            <p className="truncate text-[11px] text-[#738197]">{player.posicion}</p>
          ) : null}
        </div>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${statusConfig.tone}`}>
        <StatusIcon className="h-3.5 w-3.5" />
        {statusConfig.label}
      </span>
    </li>
  )
}
