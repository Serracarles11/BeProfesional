'use client'

import { Brain, Timer, Users } from 'lucide-react'
import type { DashboardHomeSuccess, DashboardMetric } from '../types'

type WellbeingPatch = {
  mentalState?: number
  fatigue?: number
  attendingTraining?: boolean
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

export function MetricsGrid({ metrics, wellbeing, isSaving, onUpdateWellbeing }: MetricsGridProps) {
  const mentalValue = wellbeing.mentalState ?? 5
  const fatigueValue = wellbeing.fatigue ?? 5
  const attending = wellbeing.attendingTraining ?? false

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
              </div>
            )}

            {isAttendance && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onUpdateWellbeing({ attendingTraining: !attending })}
                className={`inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  attending
                    ? 'bg-[#d8f5df] text-[#0f7a33] hover:bg-[#c5efcf]'
                    : 'bg-[#eef2f7] text-[#4e5767] hover:bg-[#e3e8f0]'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {attending ? 'Confirmado: voy al entreno' : 'Marcar asistencia al entreno'}
              </button>
            )}
          </article>
        )
      })}
    </div>
  )
}
