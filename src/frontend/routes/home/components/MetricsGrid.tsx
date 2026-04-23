'use client'

import { useEffect, useRef, useState } from 'react'
import { Brain, Check, ChevronDown, Timer, Users } from 'lucide-react'
import type { DashboardHomeSuccess, DashboardMetric } from '../types'

type WellbeingPatch = {
  mentalState?: number
  fatigue?: number
  attendingTraining?: boolean
  trainingId?: string
}

type MetricsGridProps = {
  metrics: DashboardMetric[]
  wellbeing: DashboardHomeSuccess['wellbeing']
  isSaving: boolean
  onUpdateWellbeing: (patch: WellbeingPatch) => void
}

function clampScore(value: number) {
  if (value < 1) return 1
  if (value > 10) return 10
  return value
}

function MetricIcon({ id }: { id: DashboardMetric['icon'] }) {
  if (id === 'mental') return <Brain className="h-5 w-5" strokeWidth={1.9} />
  if (id === 'attendance') return <Users className="h-5 w-5" strokeWidth={1.9} />
  return <Timer className="h-5 w-5" strokeWidth={1.9} />
}

function formatRecordedAt(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MetricsGrid({ metrics, wellbeing, isSaving, onUpdateWellbeing }: MetricsGridProps) {
  const mentalValue = wellbeing.mentalState ?? 5
  const fatigueValue = wellbeing.fatigue ?? 5
  const attending = wellbeing.attendingTraining ?? false
  const mentalRecordedAt = formatRecordedAt(wellbeing.mentalStateUpdatedAt)
  const fatigueRecordedAt = formatRecordedAt(wellbeing.fatigueUpdatedAt)
  const hasUpcomingTraining = wellbeing.attendanceOptions.length > 0
  const selectedAttendanceOption =
    wellbeing.attendanceOptions.find((option) => option.id === wellbeing.attendanceTrainingId) ?? null
  const attendanceTimeLabel = selectedAttendanceOption?.time
    ? selectedAttendanceOption.time.slice(11, 16)
    : null
  const [isAttendanceMenuOpen, setIsAttendanceMenuOpen] = useState(false)
  const attendanceMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAttendanceMenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!attendanceMenuRef.current?.contains(event.target as Node)) {
        setIsAttendanceMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isAttendanceMenuOpen])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => {
        const isMental = metric.id === 'mental'
        const isFatigue = metric.id === 'fatigue'
        const isAttendance = metric.id === 'attendance'

        return (
          <article
            key={metric.id}
            className="rounded-2xl bg-white p-6 shadow-[0_20px_40px_rgba(0,93,182,0.05)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="text-[#727785]">
                <MetricIcon id={metric.icon} />
              </span>
              <span className="text-[10px] font-bold tracking-[0.18em] text-[#705d00]">{metric.label}</span>
            </div>

            <p className="mb-1 [font-family:var(--font-plus-jakarta)] text-4xl font-extrabold text-[#005db6]">{metric.value}</p>
            <p className="mb-4 text-xs font-medium text-[#5f6776]">{metric.helper}</p>

            {isMental && (
              <div className="space-y-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={mentalValue}
                  disabled={isSaving}
                  onChange={(event) => {
                    onUpdateWellbeing({
                      mentalState: clampScore(Number(event.target.value)),
                    })
                  }}
                  className="w-full accent-[#005db6]"
                />
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#7b8291]">
                  <span>1</span>
                  <span>10</span>
                </div>
                {mentalRecordedAt && (
                  <p className="text-[11px] text-[#8b92a3]">Registrado: {mentalRecordedAt}</p>
                )}
              </div>
            )}

            {isFatigue && (
              <div className="space-y-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={fatigueValue}
                  disabled={isSaving}
                  onChange={(event) => {
                    onUpdateWellbeing({
                      fatigue: clampScore(Number(event.target.value)),
                    })
                  }}
                  className="w-full accent-[#005db6]"
                />
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#7b8291]">
                  <span>1</span>
                  <span>10</span>
                </div>
                {fatigueRecordedAt && (
                  <p className="text-[11px] text-[#8b92a3]">Registrado: {fatigueRecordedAt}</p>
                )}
              </div>
            )}

            {isAttendance && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#d8e4fb] bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_100%)] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6d7b95]">
                    Entreno
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#10213c]">
                    {selectedAttendanceOption?.label ?? 'Sin proximos entrenos'}
                  </p>
                  {attendanceTimeLabel ? (
                    <p className="mt-1 text-xs font-semibold text-[#667085]">{attendanceTimeLabel}</p>
                  ) : null}
                </div>

                <div ref={attendanceMenuRef} className="relative">
                  <button
                    type="button"
                    disabled={isSaving || !hasUpcomingTraining}
                    onClick={() => setIsAttendanceMenuOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#ccd9f1] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1f2530] shadow-[0_12px_32px_-24px_rgba(15,23,42,0.35)] transition hover:border-[#aebfe4] focus:border-[#7ca6e8] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="truncate">
                        {selectedAttendanceOption?.label ?? 'Sin proximos entrenos'}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#6d7b95] transition ${isAttendanceMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isAttendanceMenuOpen && hasUpcomingTraining ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-2xl border border-[#ccd9f1] bg-white shadow-[0_28px_60px_-30px_rgba(15,23,42,0.45)]">
                      <div className="max-h-64 overflow-y-auto p-2">
                        {wellbeing.attendanceOptions.map((option) => {
                          const isSelected = option.id === wellbeing.attendanceTrainingId

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setIsAttendanceMenuOpen(false)
                                onUpdateWellbeing({ trainingId: option.id })
                              }}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                                isSelected
                                  ? 'bg-[#edf3ff] text-[#214b9a]'
                                  : 'text-[#334155] hover:bg-[#f5f8ff]'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{option.label}</p>
                                {option.time ? (
                                  <p className="mt-1 text-xs text-[#7b8799]">{option.time.slice(11, 16)}</p>
                                ) : null}
                              </div>
                              {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={isSaving || !hasUpcomingTraining || !wellbeing.attendanceTrainingId}
                  onClick={() =>
                    onUpdateWellbeing({
                      trainingId: wellbeing.attendanceTrainingId ?? undefined,
                      attendingTraining: !attending,
                    })
                  }
                  className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    attending
                      ? 'bg-[linear-gradient(135deg,#d8f5df_0%,#c6efcf_100%)] text-[#0f7a33] shadow-[0_18px_36px_-24px_rgba(15,122,51,0.45)] hover:brightness-[0.98]'
                      : 'bg-[linear-gradient(135deg,#eef4ff_0%,#e4ebf7_100%)] text-[#425169] shadow-[0_18px_36px_-24px_rgba(15,23,42,0.22)] hover:brightness-[0.98]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {!hasUpcomingTraining
                    ? 'Sin proximo entreno'
                    : attending
                      ? 'Confirmado: voy a este entreno'
                      : 'Marcar asistencia a este entreno'}
                </button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
