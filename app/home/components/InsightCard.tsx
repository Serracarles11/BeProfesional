'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, CalendarDays } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { withEquipo } from '../utils'

type InsightCardProps = {
  equipoId?: string
}

const actionButtonClassName =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#005db6] px-3.5 py-2 text-sm font-bold text-white shadow-[0_18px_38px_-20px_rgba(0,93,182,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#004b92] hover:shadow-[0_22px_42px_-20px_rgba(0,93,182,0.95)] sm:w-auto'

function formatSelectedDate(date?: Date) {
  if (!date) return 'Sin fecha'

  const formatted = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function InsightCard({ equipoId }: InsightCardProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())

  const selectedDateLabel = useMemo(() => formatSelectedDate(date), [date])

  return (
    <section className="grid items-start gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <article className="relative overflow-hidden rounded-2xl border-2 border-[#005db6]/15 bg-white p-3.5">
        <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-[#005db6]/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-2.5 flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3176d2] text-white">
              <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="[font-family:var(--font-plus-jakarta)] text-base font-bold text-[#005db6]">
                  Calendario del equipo
                </h3>
                <span className="inline-flex rounded-full bg-[#e8f0ff] px-2.5 py-1 text-[10px] font-bold text-[#00468c]">
                  {selectedDateLabel}
                </span>
              </div>

              <p className="mt-0.5 text-sm leading-relaxed text-[#414754]">
                Selecciona una fecha del mes.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl">
            <div className="origin-top-left scale-[0.78] w-[128%] -mb-[4.75rem]">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-2xl border-[#d9e4f7] bg-[#f8fbff] p-2"
              />
            </div>
          </div>

          <div className="mt-2.5 flex justify-end">
            <Link href={withEquipo('/entrenamientos', equipoId)} className={actionButtonClassName}>
              Abrir calendario
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>

      <article className="relative self-start overflow-hidden rounded-2xl border-2 border-[#005db6]/15 bg-white p-3.5">
        <div className="absolute -right-16 top-6 h-24 w-24 rounded-full bg-[#8bb4ff]/20 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-2.5 flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3176d2] text-white">
              <Bot className="h-4 w-4" strokeWidth={1.9} />
            </div>

            <div>
              <h3 className="[font-family:var(--font-plus-jakarta)] text-base font-bold text-[#005db6]">
                Chat con IA
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#414754]">
                Recomendaciones y ayuda rapida.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d9e4f7] bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-bold text-[#0d2147]">AI Assistant</p>
              <span className="text-[11px] font-semibold text-[#005db6]">Online</span>
            </div>

            <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 text-sm leading-relaxed text-[#334155] shadow-[0_12px_30px_-26px_rgba(15,23,42,0.45)]">
              Manana conviene una sesion corta con mas bloque tactico.
            </div>
          </div>

          <div className="mt-2.5 flex justify-end">
            <Link href={withEquipo('/chat', equipoId)} className={actionButtonClassName}>
              Ir al chat con IA
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    </section>
  )
}
