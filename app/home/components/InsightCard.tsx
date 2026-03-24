'use client'

import Link from 'next/link'
import { ArrowRight, BrainCircuit } from 'lucide-react'

type InsightCardProps = {
  title: string
  description: string
  actionHref: string
}

export function InsightCard({ title, description, actionHref }: InsightCardProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-[#005db6]/15 bg-white p-7">
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#005db6]/10 blur-3xl" />

      <div className="relative z-10 flex items-start gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3176d2] text-white">
          <BrainCircuit className="h-5 w-5" strokeWidth={1.9} />
        </div>

        <div className="space-y-2">
          <h3 className="[font-family:var(--font-plus-jakarta)] text-xl font-bold text-[#005db6]">{title}</h3>
          <p className="leading-relaxed text-[#414754]">{description}</p>
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1 text-sm font-bold text-[#005db6] transition-all hover:gap-2"
          >
            Ver informe detallado
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
