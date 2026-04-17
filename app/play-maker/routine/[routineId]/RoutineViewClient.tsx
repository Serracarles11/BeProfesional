'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Bolt, Download, Dumbbell, Pencil, Star, Target } from 'lucide-react'
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google'
import { withEquipo } from '@/app/home/utils'
import type { RoutineBlock, RoutineDetail } from '@/lib/playmaker/routines'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
})

type RoutineViewClientProps = {
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
    logo_url: string | null
  }
  routine: RoutineDetail
  canEdit?: boolean
}

function formatIssuedDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getLevelLabel(value: number) {
  if (value <= 2) return 'Inicial'
  if (value === 3) return 'Intermedio'
  if (value === 4) return 'Avanzado'
  return 'Elite'
}

function getPrimaryTag(category: string) {
  if (/recup/i.test(category)) return 'Recovery'
  if (/resist/i.test(category)) return 'Endurance'
  if (/potenc/i.test(category)) return 'Power'
  if (/fuerza/i.test(category)) return 'Strength & Performance'
  return category || 'Routine'
}

function getBlockTag(block: RoutineBlock) {
  const load = Number(block.load)
  if (Number.isFinite(load) && load > 0) return 'Compound'
  if (/salt|pliom|jump|sprint/i.test(block.name)) return 'Power'
  if (/core|plancha|estab/i.test(block.name)) return 'Core'
  return 'Technical'
}

function splitDetailText(value: string) {
  const normalized = value.trim()
  if (!normalized) return []

  const items = normalized
    .split(/\r?\n|[.;](?=\s|$)/)
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? items : [normalized]
}

function buildDetailSections(block: RoutineBlock) {
  return [
    {
      title: 'Objetivo',
      items: splitDetailText(block.purpose),
      tone: 'primary' as const,
    },
    {
      title: 'Montaje',
      items: splitDetailText(block.setup),
      tone: 'neutral' as const,
    },
    {
      title: 'Consignas',
      items: splitDetailText(block.instructions),
      tone: 'primary' as const,
    },
    {
      title: 'Puntos de coaching',
      items: block.coachingPoints.length > 0 ? block.coachingPoints : [],
      tone: 'neutral' as const,
    },
    {
      title: 'Progresion o variante',
      items: splitDetailText(block.progression),
      tone: 'muted' as const,
    },
    {
      title: 'Notas',
      items: splitDetailText(block.notes),
      tone: 'muted' as const,
    },
  ].filter((section) => section.items.length > 0)
}

function totalVolume(blocks: RoutineBlock[]) {
  return blocks.reduce((acc, block) => {
    const sets = Number(block.sets)
    const repsText = block.reps.trim()
    const firstRep = Number(repsText.split('-')[0])
    const reps = Number.isFinite(firstRep) && firstRep > 0 ? firstRep : 1
    const load = Number(block.load)

    if (!Number.isFinite(sets) || !Number.isFinite(load) || sets <= 0 || load <= 0) return acc
    return acc + sets * reps * load
  }, 0)
}

function imageForBlock(routine: RoutineDetail, index: number) {
  if (routine.imageUrls.length === 0) return null
  return routine.imageUrls[index % routine.imageUrls.length] ?? null
}

function buildPhaseSections(blocks: RoutineBlock[]) {
  const sections: Array<{ title: string; blocks: RoutineBlock[] }> = []

  for (const block of blocks) {
    const title = block.phase.trim() || 'Bloque principal'
    const lastSection = sections[sections.length - 1]

    if (lastSection && lastSection.title === title) {
      lastSection.blocks.push(block)
      continue
    }

    sections.push({
      title,
      blocks: [block],
    })
  }

  return sections
}

export default function RoutineViewClient({ equipo, routine, canEdit = true }: RoutineViewClientProps) {
  const editHref = `/play-maker/create?equipo=${encodeURIComponent(equipo.id)}&routine=${encodeURIComponent(routine.id)}`
  const backHref = withEquipo('/play-maker', equipo.id)
  const issuedAt = formatIssuedDate(routine.createdAt)
  const levelLabel = getLevelLabel(routine.difficulty)
  const volumeLabel = `${totalVolume(routine.blocks).toLocaleString('es-ES')} kg`
  const primaryTag = getPrimaryTag(routine.category)
  const phaseSections = buildPhaseSections(routine.blocks)

  return (
    <div className={`${plusJakarta.variable} ${manrope.variable} min-h-screen bg-[#f1f4f9] px-6 py-6 text-[#181c20] [font-family:var(--font-manrope)] print:bg-white print:px-0 print:py-0`}>
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }
      `}</style>

      <div className="mx-auto max-w-[1100px] print:max-w-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Link href={backHref} className="rounded-full border border-[#c1c6d6] bg-white px-4 py-2 text-sm font-bold text-[#005db6] transition hover:bg-[#f7f9fe]">
              Volver
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">Vista previa PDF</p>
              <h1 className="text-2xl font-extrabold tracking-tight [font-family:var(--font-plus-jakarta)]">{routine.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canEdit ? (
              <Link href={editHref} className="inline-flex items-center gap-2 rounded-xl border border-[#c1c6d6] bg-white px-4 py-3 text-sm font-bold text-[#005db6] transition hover:bg-[#f7f9fe]">
                <Pencil className="h-4 w-4" />
                <span>Editar</span>
              </Link>
            ) : null}
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#005db6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#004e98]">
              <Download className="h-4 w-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>

        <article className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col overflow-hidden bg-white p-10 text-[#111827] shadow-[0_20px_50px_rgba(0,0,0,0.12)] print:min-h-0 print:max-w-none print:p-10 print:shadow-none">
          <header className="mb-9 flex items-start justify-between gap-8 border-b border-[#d8dee8] pb-7">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md border border-[#005db6] bg-white px-3 py-1 text-[10px] font-black uppercase text-[#005db6]">
                  {primaryTag}
                </span>
                <span className="rounded-md border border-[#d8dee8] bg-[#f8fafc] px-3 py-1 text-[10px] font-black uppercase text-[#374151]">
                  {levelLabel}
                </span>
              </div>

              <h1 className="mb-2 text-[2.15rem] font-extrabold leading-tight tracking-normal text-[#111827] [font-family:var(--font-plus-jakarta)]">
                {equipo.nombre}
                <span className="mt-1 block text-[#005db6]">{routine.title}</span>
              </h1>
            </div>

            <div className="text-right">
              <div className="mb-2 ml-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#005db6] bg-white text-[#005db6]">
                <Bolt className="h-7 w-7" />
              </div>
              <p className="text-[10px] font-black uppercase text-[#4b5563]">Emitido: {issuedAt}</p>
            </div>
          </header>

          <section className="mb-8 grid grid-cols-4 gap-4 rounded-xl border border-[#d8dee8] bg-white p-5">
            <MetaItem label="Equipo" value={equipo.nombre} />
            <MetaItem label="Categoria" value={routine.category || equipo.categoria || 'Sin categoria'} />
            <MetaItem label="Fases" value={routine.phases.join(' / ') || routine.phase || 'Sin fase'} />
            <MetaItem label="Duracion" value={`${routine.duration} minutos`} />
          </section>

          <section className="mb-10 grid grid-cols-4 gap-4">
            <SummaryPrimary icon={<Dumbbell className="h-6 w-6" />} value={String(routine.blockCount)} label="Ejercicios" />
            <SummaryNeutral icon={<Target className="h-6 w-6 text-[#005db6]" />} value={routine.category || 'Rutina'} label="Objetivo" />
            <SummaryNeutral icon={<Star className="h-6 w-6 text-[#caa900]" />} value={levelLabel} label="Nivel" />
            <SummaryMuted icon={<Bolt className="h-6 w-6" />} value={volumeLabel} label="Volumen total" />
          </section>

          <section className="space-y-8">
            {phaseSections.map((section, sectionIndex) => (
              <div key={`${section.title}-${sectionIndex}`} className="space-y-6">
                <h3 className="mb-5 flex items-center gap-3 text-lg font-extrabold text-[#111827] [font-family:var(--font-plus-jakarta)]">
                  <span className="h-[3px] w-9 bg-[#005db6]" />
                  {`${String.fromCharCode(65 + sectionIndex)}. ${section.title.toUpperCase()}`}
                </h3>

                {section.blocks.map((block) => {
                  const globalIndex = routine.blocks.findIndex((candidate) => candidate.rowId === block.rowId)
                  const imageUrl = imageForBlock(routine, globalIndex === -1 ? 0 : globalIndex)
                  const detailSections = buildDetailSections(block)
                  const borderColor = globalIndex % 2 === 0 ? 'border-[#005db6]' : 'border-[#759efd]'

                  return (
                    <article key={block.rowId} className={`overflow-hidden rounded-xl border border-[#d8dee8] border-l-[7px] ${borderColor} bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] print:break-inside-avoid`}>
                      <div className="flex flex-col md:flex-row">
                        <div className="relative w-full md:w-64">
                          {imageUrl ? (
                            <img src={imageUrl} alt={block.name} className="h-48 w-full object-cover md:h-full" />
                          ) : (
                            <div className="flex h-48 w-full items-center justify-center bg-[#eef2f7] text-[#005db6] md:h-full">
                              <Dumbbell className="h-10 w-10" />
                            </div>
                          )}
                          <div className="absolute left-2 top-2 rounded bg-[#005db6] px-2 py-1 text-xs font-black text-white">
                            {String(globalIndex + 1).padStart(2, '0')}
                          </div>
                        </div>

                        <div className="flex-1 p-6">
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <h4 className="text-2xl font-extrabold tracking-normal text-[#111827] [font-family:var(--font-plus-jakarta)]">{block.name}</h4>
                            <span className="shrink-0 rounded border border-[#d8dee8] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-black uppercase text-[#374151]">
                              {getBlockTag(block)}
                            </span>
                          </div>

                          <div className="mb-5 grid grid-cols-4 gap-3">
                            <ExerciseStat label="Series" value={block.sets || '-'} />
                            <ExerciseStat label="Repeticiones" value={block.reps || '-'} />
                            <ExerciseStat label="Descanso" value={block.rest ? `${block.rest}s` : '-'} />
                            <ExerciseStat label="Carga" value={block.load ? `${block.load}kg` : '-'} highlight />
                          </div>

                          {detailSections.length > 0 ? (
                            <div className="space-y-3 border-t border-[#d8dee8] pt-4">
                              <p className="text-[11px] font-black uppercase text-[#374151]">Informacion del ejercicio</p>
                              <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
                                {detailSections.map((detail) => (
                                  <DetailSection
                                    key={`${block.rowId}-${detail.title}`}
                                    title={detail.title}
                                    items={detail.items}
                                    tone={detail.tone}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="border-t border-[#d8dee8] pt-4">
                              <p className="text-sm font-semibold text-[#4b5563]">Sin informacion adicional para este ejercicio.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ))}
          </section>

          <footer className="mt-auto pt-12 text-center">
            <p className="text-[10px] font-medium text-slate-400">
              Documento interno de BeProfesional generado a partir de la rutina almacenada en la base de datos del equipo.
            </p>
            <div className="mt-4 flex justify-center gap-8">
              <FooterItem label="BEPROFESIONAL" value={equipo.club || equipo.nombre} />
              <FooterItem label="TEMPORADA" value={equipo.temporada || 'Actual'} />
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase text-[#4b5563]">{label}</p>
      <p className="text-sm font-extrabold leading-snug text-[#111827]">{value}</p>
    </div>
  )
}

function SummaryPrimary({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex aspect-square flex-col justify-between rounded-xl bg-[#005db6] p-4 text-white shadow-lg shadow-[#005db6]/10">
      <div>{icon}</div>
      <div>
        <p className="text-3xl font-black">{value}</p>
        <p className="text-[10px] font-black uppercase text-white/90">{label}</p>
      </div>
    </div>
  )
}

function SummaryNeutral({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex aspect-square flex-col justify-between rounded-xl border border-[#d8dee8] bg-white p-4">
      <div>{icon}</div>
      <div>
        <p className="text-lg font-black leading-tight text-[#111827]">{value}</p>
        <p className="text-[10px] font-black uppercase text-[#4b5563]">{label}</p>
      </div>
    </div>
  )
}

function SummaryMuted({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex aspect-square flex-col justify-between rounded-xl border border-[#d8dee8] bg-[#f3f6fa] p-4 text-[#111827]">
      <div>{icon}</div>
      <div>
        <p className="text-lg font-black leading-tight">{value}</p>
        <p className="text-[10px] font-black uppercase text-[#4b5563]">{label}</p>
      </div>
    </div>
  )
}

function ExerciseStat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? 'border-[#005db6] bg-white' : 'border-[#d8dee8] bg-[#f8fafc]'}`}>
      <p className={`mb-1 text-[10px] font-black uppercase ${highlight ? 'text-[#005db6]' : 'text-[#4b5563]'}`}>{label}</p>
      <p className="text-lg font-black text-[#111827]">{value}</p>
    </div>
  )
}

function DetailSection({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'primary' | 'neutral' | 'muted'
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-l-[#005db6] bg-white'
      : tone === 'neutral'
        ? 'border-l-[#64748b] bg-white'
        : 'border-l-[#9ca3af] bg-white'
  const markerClass = tone === 'primary' ? 'text-[#005db6]' : tone === 'neutral' ? 'text-[#374151]' : 'text-[#6b7280]'

  return (
    <div className={`rounded-lg border border-[#d8dee8] border-l-4 p-4 ${toneClass}`}>
      <p className="mb-2 text-[11px] font-black uppercase text-[#111827]">{title}</p>
      <ul className="space-y-1.5 text-[13px] leading-relaxed text-[#1f2937]">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className={`mt-0.5 font-black ${markerClass}`}>-</span>
            <span className="font-medium">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FooterItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold text-[#005db6]">{label}</span>
      <span className="text-[9px] font-bold text-[#111827]">{value}</span>
    </div>
  )
}
