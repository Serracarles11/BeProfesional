'use client'

import { useMemo, useState } from 'react'
import { Brain, Timer, Users, X } from 'lucide-react'
import type { DashboardHomeSuccess } from '../types'

type CoachMetricId = 'mental' | 'fatigue' | 'availability'

type CoachMetricsGridProps = {
  coachWellbeing: DashboardHomeSuccess['coachWellbeing']
}

function formatPct(value: number | null) {
  if (value === null) return '--%'
  return `${value}%`
}

function metricTitle(metric: CoachMetricId) {
  if (metric === 'mental') return 'Estado mental por jugador'
  if (metric === 'fatigue') return 'Fatiga por jugador'
  return 'Disponibilidad por jugador'
}

function MetricIcon({ id }: { id: CoachMetricId }) {
  if (id === 'mental') return <Brain className="h-5 w-5" strokeWidth={1.9} />
  if (id === 'availability') return <Users className="h-5 w-5" strokeWidth={1.9} />
  return <Timer className="h-5 w-5" strokeWidth={1.9} />
}

export function CoachMetricsGrid({ coachWellbeing }: CoachMetricsGridProps) {
  const [activeMetric, setActiveMetric] = useState<CoachMetricId | null>(null)

  const cards = useMemo(
    () => [
      {
        id: 'mental' as const,
        label: 'ESTADO MENTAL',
        value: formatPct(coachWellbeing.mentalPct),
        helper: 'Promedio del estado mental del equipo',
      },
      {
        id: 'fatigue' as const,
        label: 'FATIGA',
        value: formatPct(coachWellbeing.fatiguePct),
        helper: 'Promedio de fatiga reportada por el equipo',
      },
      {
        id: 'availability' as const,
        label: 'DISPONIBILIDAD',
        value: `${coachWellbeing.availabilityPct}%`,
        helper: 'Jugadores que asistirán al entrenamiento de hoy',
      },
    ],
    [coachWellbeing.availabilityPct, coachWellbeing.fatiguePct, coachWellbeing.mentalPct]
  )

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((metric) => (
          <button
            key={metric.id}
            type="button"
            onClick={() => setActiveMetric(metric.id)}
            className="rounded-2xl bg-white p-6 text-left shadow-[0_20px_40px_rgba(0,93,182,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_44px_rgba(0,93,182,0.08)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="text-[#727785]">
                <MetricIcon id={metric.id} />
              </span>
              <span className="text-[10px] font-bold tracking-[0.18em] text-[#705d00]">{metric.label}</span>
            </div>
            <p className="mb-1 [font-family:var(--font-plus-jakarta)] text-4xl font-extrabold text-[#005db6]">{metric.value}</p>
            <p className="text-xs font-medium text-[#5f6776]">{metric.helper}</p>
          </button>
        ))}
      </div>

      {activeMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="[font-family:var(--font-plus-jakarta)] text-lg font-bold text-[#181c20]">
                {metricTitle(activeMetric)}
              </h3>
              <button
                type="button"
                onClick={() => setActiveMetric(null)}
                className="rounded-md p-1 text-[#6d7381] transition hover:bg-[#f1f4f9]"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {coachWellbeing.players.length === 0 ? (
                <p className="rounded-xl border border-[#e4e8f0] bg-[#f8faff] px-3 py-2 text-sm text-[#5f6776]">
                  No hay jugadores activos para mostrar.
                </p>
              ) : (
                coachWellbeing.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl border border-[#e4e8f0] bg-[#f8faff] px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-[#1f2530]">{player.name}</span>
                    <span className="text-sm font-bold text-[#005db6]">
                      {activeMetric === 'mental' && `${player.mentalState ?? '--'}/10`}
                      {activeMetric === 'fatigue' && `${player.fatigue ?? '--'}/10`}
                      {activeMetric === 'availability' &&
                        (player.attendingTraining === null
                          ? '--'
                          : player.attendingTraining
                          ? 'SI'
                          : 'NO')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
