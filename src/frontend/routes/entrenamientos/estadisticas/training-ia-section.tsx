'use client'

import { useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import type { TrainingInsightHistoryItem, TrainingInsightPayload } from '@/lib/training-stats'

type TrainingIaSectionProps = {
  equipoId: string
  initialHistory: TrainingInsightHistoryItem[]
}

type ApiSuccess = { ok: true; data: TrainingInsightPayload }
type ApiError = { ok: false; error: string; code?: string }
type ApiResponse = ApiSuccess | ApiError

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InsightContent({ insight }: { insight: TrainingInsightPayload }) {
  const hasContent =
    insight.key_metrics.length > 0 ||
    insight.risks.length > 0 ||
    insight.recommendations.length > 0 ||
    insight.next_session_focus.length > 0

  if (!hasContent) {
    return <p className="text-sm text-gray-500">Aun no hay una recomendacion generada para mostrar.</p>
  }

  return (
    <div className="space-y-4">
      {insight.key_metrics.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Metricas clave</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {insight.key_metrics.map((metric, index) => (
              <div key={`${metric.label}-${index}`} className="rounded-2xl bg-white/80 p-3">
                <p className="text-xs text-gray-400">{metric.label}</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <BulletList title="Riesgos" items={insight.risks} />
      <BulletList title="Recomendaciones" items={insight.recommendations} />
      <BulletList title="Foco próxima sesión" items={insight.next_session_focus} />
    </div>
  )
}

export default function TrainingIaSection({
  equipoId,
  initialHistory,
}: TrainingIaSectionProps) {
  const [history, setHistory] = useState<TrainingInsightHistoryItem[]>(initialHistory)
  const [activeInsight, setActiveInsight] = useState<TrainingInsightPayload | null>(
    initialHistory[0]?.data ?? null
  )
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleGenerate() {
    setError(null)
    setIsGenerating(true)

    try {
      const response = await fetch('/api/ia/entrenamientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, days: 14 }),
      })

      const payload = (await response.json()) as ApiResponse

      if (!response.ok || !payload.ok) {
        setError(payload.ok ? 'No se pudo generar la recomendacion.' : payload.error)
        return
      }

      const newItem: TrainingInsightHistoryItem = {
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        tipo: 'training_insights',
        data: payload.data,
      }

      setActiveInsight(payload.data)
      setHistory((prev) => [newItem, ...prev].slice(0, 10))
    } catch {
      setError('No se pudo generar la recomendacion.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
      <section className="dashboard-card shadow-soft-lg rounded-3xl p-5 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">IA Coach</h2>
              <p className="text-xs text-gray-500">Insights de entreno basados en asistencia, carga y bienestar.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Generando...' : 'Generar recomendaciones'}
          </button>
        </header>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4">
          {isGenerating && !activeInsight ? (
            <div className="rounded-2xl bg-white/80 p-4 text-sm text-gray-500">Generando recomendaciones...</div>
          ) : activeInsight ? (
            <InsightContent insight={activeInsight} />
          ) : (
            <div className="rounded-2xl bg-white/80 p-4 text-sm text-gray-500">
              Pulsa el boton para generar recomendaciones personalizadas con IA para el equipo.
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-card shadow-soft-lg rounded-3xl p-5 md:p-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Historial IA</h2>
            <p className="text-xs text-gray-500">Ultimas 10 recomendaciones guardadas.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
            {history.length}
          </span>
        </header>

        {history.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-gray-500">
            Aun no hay recomendaciones guardadas para este equipo.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveInsight(item.data)}
                className="w-full rounded-2xl bg-white/80 px-3 py-3 text-left transition hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-medium text-gray-800">
                    {item.data.recommendations[0] || item.data.next_session_focus[0] || 'Recomendacion de entrenamientos'}
                  </p>
                  <span className="shrink-0 text-[11px] text-gray-400">{formatDateTime(item.createdAt)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.data.recommendations.slice(0, 2).map((rec, index) => (
                    <span
                      key={`${item.id}-rec-${index}`}
                      className="max-w-full truncate rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
                      title={rec}
                    >
                      {rec}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
