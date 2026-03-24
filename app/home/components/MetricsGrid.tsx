'use client'

import { Bolt, HeartPulse, Timer } from 'lucide-react'
import type { DashboardMetric } from '../types'

type MetricsGridProps = {
  metrics: DashboardMetric[]
}

function MetricIcon({ id }: { id: DashboardMetric['icon'] }) {
  if (id === 'health') return <HeartPulse className="h-5 w-5" strokeWidth={1.9} />
  if (id === 'availability') return <Timer className="h-5 w-5" strokeWidth={1.9} />
  return <Bolt className="h-5 w-5" strokeWidth={1.9} />
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
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
          <p className="text-xs font-medium text-[#5f6776]">{metric.helper}</p>
        </article>
      ))}
    </div>
  )
}
