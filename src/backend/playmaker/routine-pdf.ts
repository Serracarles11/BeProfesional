import { normalizeRoutineDisplayTitle, splitRoutineDetailText, type RoutineBlock, type RoutineDetail } from './routines'

export type RoutinePdfTeam = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  logo_url: string | null
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getLevelLabel(value: number) {
  if (value <= 2) return 'Inicial'
  if (value === 3) return 'Intermedio'
  if (value === 4) return 'Avanzado'
  return 'Elite'
}

function formatIssuedDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function buildDetailSections(block: RoutineBlock) {
  return [
    { title: 'Objetivo', items: splitRoutineDetailText(block.purpose), tone: 'primary' },
    { title: 'Montaje', items: splitRoutineDetailText(block.setup), tone: 'neutral' },
    { title: 'Consignas', items: splitRoutineDetailText(block.instructions), tone: 'primary' },
    { title: 'Puntos de coaching', items: block.coachingPoints, tone: 'neutral' },
    { title: 'Progresión o variante', items: splitRoutineDetailText(block.progression), tone: 'muted' },
    { title: 'Notas', items: splitRoutineDetailText(block.notes), tone: 'muted' },
  ].filter((section) => section.items.length > 0)
}

function totalVolume(blocks: RoutineBlock[]) {
  return blocks.reduce((acc, block) => {
    const sets = Number(block.sets)
    const firstRep = Number(block.reps.trim().split('-')[0])
    const reps = Number.isFinite(firstRep) && firstRep > 0 ? firstRep : 1
    const load = Number(block.load)

    if (!Number.isFinite(sets) || !Number.isFinite(load) || sets <= 0 || load <= 0) return acc
    return acc + sets * reps * load
  }, 0)
}

function imageForBlock(routine: RoutineDetail, block: RoutineBlock, index: number) {
  const exerciseMedia = block.exerciseData?.gifUrl ?? block.exerciseData?.imageUrl
  if (exerciseMedia) return exerciseMedia
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

    sections.push({ title, blocks: [block] })
  }

  return sections
}

function detailItemCount(block: RoutineBlock) {
  return buildDetailSections(block).reduce((acc, section) => acc + section.items.length, 0)
}

function shouldAllowCardSplit(block: RoutineBlock) {
  const longTextLength = [
    block.purpose,
    block.setup,
    block.instructions,
    block.progression,
    block.notes,
    ...block.coachingPoints,
  ].join(' ').length

  return detailItemCount(block) > 12 || longTextLength > 1200
}

function renderListItems(items: string[]) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

function renderDetailSection(section: { title: string; items: string[]; tone: string }) {
  return `
    <section class="box detail-box detail-${escapeHtml(section.tone)}">
      <h5>${escapeHtml(section.title)}</h5>
      <ul>${renderListItems(section.items)}</ul>
    </section>
  `
}

function renderExerciseCard(block: RoutineBlock, routine: RoutineDetail, index: number) {
  const imageUrl = imageForBlock(routine, block, index)
  const details = buildDetailSections(block)
  const canSplitClass = shouldAllowCardSplit(block) ? ' exercise-card--split' : ''

  return `
    <article class="exercise-card${canSplitClass}">
      <div class="exercise-head">
        <div>
          <p class="exercise-kicker">Ejercicio ${String(index + 1).padStart(2, '0')}</p>
          <h4>${escapeHtml(block.name)}</h4>
        </div>
        <span class="exercise-duration">${escapeHtml(block.duration || '-')} min</span>
      </div>

      <div class="exercise-body">
        ${
          imageUrl
            ? `<figure class="exercise-media"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(block.name)}" /></figure>`
            : '<div class="exercise-media exercise-media--empty">Sin imagen</div>'
        }

        <div class="exercise-content">
          <div class="info-grid">
            <div class="box stat-box"><span>Series</span><strong>${escapeHtml(block.sets || '-')}</strong></div>
            <div class="box stat-box"><span>Repeticiones</span><strong>${escapeHtml(block.reps || '-')}</strong></div>
            <div class="box stat-box"><span>Descanso</span><strong>${block.rest ? `${escapeHtml(block.rest)}s` : '-'}</strong></div>
            <div class="box stat-box stat-box--strong"><span>Carga</span><strong>${block.load ? `${escapeHtml(block.load)}kg` : '-'}</strong></div>
          </div>

          ${
            details.length > 0
              ? `<div class="detail-grid">${details.map(renderDetailSection).join('')}</div>`
              : '<p class="empty-note">Sin informacion adicional para este ejercicio.</p>'
          }
        </div>
      </div>
    </article>
  `
}

function renderPhaseSection(
  section: { title: string; blocks: RoutineBlock[] },
  routine: RoutineDetail,
  sectionIndex: number
) {
  return `
    <section class="section phase-section">
      <h3 class="section-title">${String.fromCharCode(65 + sectionIndex)}. ${escapeHtml(section.title)}</h3>
      ${section.blocks
        .map((block) => {
          const index = routine.blocks.findIndex((candidate) => candidate.rowId === block.rowId)
          return renderExerciseCard(block, routine, index === -1 ? 0 : index)
        })
        .join('')}
    </section>
  `
}

export function buildRoutinePdfCss() {
  return `
    @page {
      size: A4;
      margin: 12mm;

      @bottom-left {
        content: "BeProfesional";
        color: #64748b;
        font-size: 8pt;
      }

      @bottom-right {
        content: "Pagina " counter(page) " / " counter(pages);
        color: #64748b;
        font-size: 8pt;
      }
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      width: 100%;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
    }

    .pdf-document {
      width: 100%;
      background: #ffffff;
    }

    .document-header,
    .section,
    .info-grid,
    .box,
    .summary-grid,
    .meta-grid {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .document-header {
      display: table;
      width: 100%;
      padding-bottom: 8mm;
      margin-bottom: 5mm;
      border-bottom: 1px solid #d8dee8;
    }

    .header-main,
    .header-aside {
      display: table-cell;
      vertical-align: top;
    }

    .header-aside {
      width: 38mm;
      text-align: right;
      color: #475569;
    }

    .eyebrow {
      margin: 0 0 2.5mm;
      color: #005db6;
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 2mm;
      color: #0f172a;
      font-size: 22pt;
      line-height: 1.06;
      letter-spacing: 0;
    }

    .routine-title {
      color: #005db6;
      display: block;
    }

    .subtitle {
      max-width: 150mm;
      margin: 0;
      color: #475569;
      font-size: 9.5pt;
      font-weight: 600;
    }

    .badge-row {
      margin-bottom: 3mm;
    }

    .badge {
      display: inline-block;
      margin-right: 2mm;
      padding: 1.2mm 2.4mm;
      border: 1px solid #bfd0ef;
      border-radius: 3mm;
      background: #f8fbff;
      color: #005db6;
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
    }

    .meta-grid,
    .summary-grid,
    .info-grid,
    .detail-grid {
      display: grid;
      gap: 3mm;
    }

    .meta-grid {
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 4mm;
      padding: 3mm;
      border: 1px solid #d8dee8;
      border-radius: 3mm;
      background: #f8fafc;
    }

    .summary-grid {
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 5mm;
    }

    .summary-card,
    .box {
      border: 1px solid #d8dee8;
      border-radius: 3mm;
      background: #ffffff;
    }

    .summary-card {
      min-height: 20mm;
      padding: 3mm;
    }

    .summary-card--primary {
      border-color: #005db6;
      background: #005db6;
      color: #ffffff;
    }

    .label,
    .summary-card span,
    .stat-box span,
    .detail-box h5 {
      display: block;
      margin-bottom: 1mm;
      color: #64748b;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: .05em;
      text-transform: uppercase;
    }

    .summary-card--primary span {
      color: rgba(255, 255, 255, .78);
    }

    .value,
    .summary-card strong,
    .stat-box strong {
      color: #0f172a;
      font-size: 11pt;
      font-weight: 800;
      line-height: 1.1;
    }

    .summary-card--primary strong {
      color: #ffffff;
      font-size: 18pt;
    }

    .section {
      margin-top: 5mm;
    }

    .section + .section {
      margin-top: 7mm;
    }

    .section-title {
      break-after: avoid;
      page-break-after: avoid;
      margin: 0 0 3mm;
      padding-bottom: 1.8mm;
      border-bottom: 1px solid #d8dee8;
      color: #0f172a;
      font-size: 12pt;
      font-weight: 900;
      letter-spacing: .03em;
      text-transform: uppercase;
    }

    .exercise-card {
      break-inside: avoid;
      page-break-inside: avoid;
      margin: 0 0 4mm;
      border: 1px solid #d8dee8;
      border-left: 2mm solid #005db6;
      border-radius: 3mm;
      background: #ffffff;
    }

    .exercise-card--split {
      break-inside: auto;
      page-break-inside: auto;
    }

    .exercise-card--split .exercise-head,
    .exercise-card--split .info-grid,
    .exercise-card--split .detail-box {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .exercise-head {
      break-after: avoid;
      page-break-after: avoid;
      display: table;
      width: 100%;
      padding: 3mm 3.5mm 2.5mm;
      border-bottom: 1px solid #e6edf7;
      background: #f8fbff;
    }

    .exercise-head > div {
      display: table-cell;
      vertical-align: top;
    }

    .exercise-kicker {
      margin: 0 0 1mm;
      color: #005db6;
      font-size: 7.5pt;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .exercise-head h4 {
      margin: 0;
      color: #0f172a;
      font-size: 13pt;
      line-height: 1.15;
    }

    .exercise-duration {
      display: table-cell;
      width: 18mm;
      vertical-align: top;
      text-align: right;
      color: #005db6;
      font-size: 9pt;
      font-weight: 900;
    }

    .exercise-body {
      display: grid;
      grid-template-columns: 42mm 1fr;
      gap: 3mm;
      padding: 3mm;
    }

    .exercise-media {
      margin: 0;
      border: 1px solid #d8dee8;
      border-radius: 2.5mm;
      background: #eef2f7;
    }

    .exercise-media img {
      width: 100%;
      max-height: 34mm;
      object-fit: cover;
      border-radius: 2.5mm;
    }

    .exercise-media--empty {
      min-height: 24mm;
      padding: 10mm 2mm;
      color: #64748b;
      font-size: 8pt;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
    }

    .exercise-content {
      min-width: 0;
    }

    .info-grid {
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 3mm;
    }

    .stat-box {
      padding: 2.2mm;
      background: #f8fafc;
      text-align: center;
    }

    .stat-box--strong {
      border-color: #005db6;
      background: #ffffff;
    }

    .stat-box--strong span,
    .stat-box--strong strong {
      color: #005db6;
    }

    .detail-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    .detail-box {
      padding: 2.5mm;
      border-left-width: 1mm;
    }

    .detail-primary {
      border-left-color: #005db6;
    }

    .detail-neutral {
      border-left-color: #64748b;
    }

    .detail-muted {
      border-left-color: #94a3b8;
    }

    .detail-box h5 {
      color: #111827;
    }

    .detail-box ul {
      margin: 0;
      padding-left: 4mm;
    }

    .detail-box li {
      margin: 0 0 1mm;
      color: #1f2937;
      font-size: 8.8pt;
      line-height: 1.32;
    }

    .empty-note {
      margin: 0;
      padding: 3mm;
      border: 1px dashed #cbd5e1;
      border-radius: 3mm;
      color: #64748b;
      font-weight: 700;
    }

    .document-footer {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 7mm;
      padding-top: 4mm;
      border-top: 1px solid #d8dee8;
      color: #64748b;
      font-size: 8pt;
      text-align: center;
    }

    @media screen {
      body {
        background: #f1f4f9;
        padding: 24px;
      }

      .pdf-document {
        max-width: 210mm;
        margin: 0 auto;
        padding: 12mm;
        box-shadow: 0 18px 50px rgba(15, 23, 42, .14);
      }
    }

    @media print {
      body {
        background: #ffffff;
      }

      .pdf-document {
        padding: 0;
      }

      a {
        color: inherit;
        text-decoration: none;
      }
    }
  `
}

export function buildRoutinePdfHtml({
  equipo,
  routine,
}: {
  equipo: RoutinePdfTeam
  routine: RoutineDetail
}) {
  const displayTitle = normalizeRoutineDisplayTitle(routine.title, equipo.nombre)
  const issuedAt = formatIssuedDate(routine.createdAt)
  const levelLabel = getLevelLabel(routine.difficulty)
  const volumeLabel = `${totalVolume(routine.blocks).toLocaleString('es-ES')} kg`
  const phaseSections = buildPhaseSections(routine.blocks)
  const phasesLabel = routine.phases.join(' / ') || routine.phase || 'Sin fase'
  const categoryLabel = routine.category || equipo.categoria || 'Sin categoria'

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(displayTitle)} - PDF</title>
    <style>${buildRoutinePdfCss()}</style>
  </head>
  <body>
    <main class="pdf-document">
      <header class="document-header">
        <div class="header-main">
          <div class="badge-row">
            <span class="badge">${escapeHtml(categoryLabel)}</span>
            <span class="badge">${escapeHtml(levelLabel)}</span>
          </div>
          <p class="eyebrow">Rutina de entrenamiento</p>
          <h1>${escapeHtml(equipo.nombre)}<span class="routine-title">${escapeHtml(displayTitle)}</span></h1>
          <p class="subtitle">${escapeHtml(routine.objective || routine.description || 'Documento de trabajo para el entrenamiento del equipo.')}</p>
        </div>
        <aside class="header-aside">
          <p class="label">Emitido</p>
          <p class="value">${escapeHtml(issuedAt)}</p>
          <p class="label">Temporada</p>
          <p class="value">${escapeHtml(equipo.temporada || 'Actual')}</p>
        </aside>
      </header>

      <section class="meta-grid">
        <div><span class="label">Equipo</span><strong class="value">${escapeHtml(equipo.nombre)}</strong></div>
        <div><span class="label">Categoría</span><strong class="value">${escapeHtml(categoryLabel)}</strong></div>
        <div><span class="label">Fases</span><strong class="value">${escapeHtml(phasesLabel)}</strong></div>
        <div><span class="label">Duración</span><strong class="value">${escapeHtml(routine.duration)} minutos</strong></div>
      </section>

      <section class="summary-grid">
        <div class="summary-card summary-card--primary"><span>Ejercicios</span><strong>${escapeHtml(routine.blockCount)}</strong></div>
        <div class="summary-card"><span>Objetivo</span><strong>${escapeHtml(routine.trainingCategory || routine.category || 'Rutina')}</strong></div>
        <div class="summary-card"><span>Nivel</span><strong>${escapeHtml(levelLabel)}</strong></div>
        <div class="summary-card"><span>Volumen total</span><strong>${escapeHtml(volumeLabel)}</strong></div>
      </section>

      ${phaseSections.map((section, index) => renderPhaseSection(section, routine, index)).join('')}

      <footer class="document-footer">
        Documento interno de BeProfesional generado a partir de la rutina almacenada en la base de datos del equipo.
        ${equipo.club ? `<br />${escapeHtml(equipo.club)}` : ''}
      </footer>
    </main>
  </body>
</html>`
}

export function buildRoutinePdfFileName(routine: RoutineDetail) {
  const slug = normalizeRoutineDisplayTitle(routine.title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)

  return `${slug || 'rutina'}-beprofesional.pdf`
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const PDF_MARGIN = 34
const PAGE_BOTTOM = A4_HEIGHT - PDF_MARGIN
const CONTENT_WIDTH = A4_WIDTH - PDF_MARGIN * 2

type PdfPage = {
  commands: string[]
}

type TextStyle = {
  size: number
  font?: 'regular' | 'bold'
  color?: string
  lineHeight?: number
}

const COLOR = {
  ink: '0.067 0.094 0.157',
  muted: '0.392 0.455 0.545',
  blue: '0 0.365 0.714',
  paleBlue: '0.933 0.965 1',
  line: '0.847 0.871 0.910',
  slate: '0.973 0.980 0.988',
  white: '1 1 1',
}

function cleanPdfText(value: string | number | null | undefined) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, '')
}

function escapePdfString(value: string) {
  return cleanPdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ')
}

function textWidth(value: string, size: number) {
  return cleanPdfText(value).split('').reduce((acc, char) => {
    if (char === ' ') return acc + size * 0.28
    if ('ilI.,:;!|'.includes(char)) return acc + size * 0.24
    if ('mwMW@#'.includes(char)) return acc + size * 0.82
    if (/[A-ZÁÉÍÓÚÑ]/.test(char)) return acc + size * 0.62
    return acc + size * 0.5
  }, 0)
}

function wrapText(value: string, width: number, size: number, maxLines = Number.POSITIVE_INFINITY) {
  const normalized = cleanPdfText(value).replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const lines: string[] = []
  let line = ''

  for (const word of normalized.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (textWidth(next, size) <= width) {
      line = next
      continue
    }

    if (line) lines.push(line)
    line = word

    if (lines.length >= maxLines) break
  }

  if (line && lines.length < maxLines) lines.push(line)

  if (lines.length === maxLines && textWidth(lines[lines.length - 1] ?? '', size) > width) {
    const last = lines[lines.length - 1] ?? ''
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, last.length - 3))}...`
  }

  return lines
}

function streamLength(commands: string[]) {
  return Buffer.byteLength(commands.join('\n'), 'latin1')
}

class PdfBuilder {
  pages: PdfPage[] = []
  page: PdfPage
  cursorY = PDF_MARGIN

  constructor() {
    this.page = this.addPage()
  }

  addPage() {
    const page = { commands: [] as string[] }
    this.pages.push(page)
    this.page = page
    this.cursorY = PDF_MARGIN
    return page
  }

  ensureSpace(height: number) {
    if (this.cursorY + height > PAGE_BOTTOM) this.addPage()
  }

  rect(x: number, y: number, width: number, height: number, options: { fill?: string; stroke?: string; lineWidth?: number } = {}) {
    const bottomY = A4_HEIGHT - y - height
    if (options.fill) this.page.commands.push(`${options.fill} rg`)
    if (options.stroke) this.page.commands.push(`${options.stroke} RG`)
    this.page.commands.push(`${options.lineWidth ?? 0.7} w`)
    this.page.commands.push(`${x.toFixed(2)} ${bottomY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${options.fill && options.stroke ? 'B' : options.fill ? 'f' : 'S'}`)
  }

  line(x1: number, y1: number, x2: number, y2: number, color = COLOR.line, width = 0.7) {
    const py1 = A4_HEIGHT - y1
    const py2 = A4_HEIGHT - y2
    this.page.commands.push(`${color} RG`)
    this.page.commands.push(`${width} w`)
    this.page.commands.push(`${x1.toFixed(2)} ${py1.toFixed(2)} m ${x2.toFixed(2)} ${py2.toFixed(2)} l S`)
  }

  text(value: string, x: number, y: number, style: TextStyle) {
    const size = style.size
    const fontName = style.font === 'bold' ? 'F2' : 'F1'
    const color = style.color ?? COLOR.ink
    const baseline = A4_HEIGHT - y - size
    this.page.commands.push('BT')
    this.page.commands.push(`${color} rg`)
    this.page.commands.push(`/${fontName} ${size.toFixed(2)} Tf`)
    this.page.commands.push(`1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm`)
    this.page.commands.push(`(${escapePdfString(value)}) Tj`)
    this.page.commands.push('ET')
  }

  wrappedText(value: string, x: number, y: number, width: number, style: TextStyle, maxLines?: number) {
    const lineHeight = style.lineHeight ?? style.size * 1.28
    const lines = wrapText(value, width, style.size, maxLines)
    lines.forEach((line, index) => this.text(line, x, y + index * lineHeight, style))
    return lines.length * lineHeight
  }
}

function renderFooter(pdf: PdfBuilder) {
  const totalPages = pdf.pages.length
  pdf.pages.forEach((page, index) => {
    const original = pdf.page
    pdf.page = page
    pdf.line(PDF_MARGIN, A4_HEIGHT - 24, A4_WIDTH - PDF_MARGIN, A4_HEIGHT - 24, COLOR.line, 0.5)
    pdf.text('BeProfesional', PDF_MARGIN, A4_HEIGHT - 18, { size: 7, color: COLOR.muted, font: 'bold' })
    pdf.text(`Pagina ${index + 1} / ${totalPages}`, A4_WIDTH - PDF_MARGIN - 54, A4_HEIGHT - 18, { size: 7, color: COLOR.muted })
    pdf.page = original
  })
}

function writePdf(pdf: PdfBuilder) {
  renderFooter(pdf)

  const objects: Buffer[] = []
  const addObject = (body: string | Buffer) => {
    const id = objects.length + 1
    const header = Buffer.from(`${id} 0 obj\n`, 'latin1')
    const footer = Buffer.from('\nendobj\n', 'latin1')
    const content = typeof body === 'string' ? Buffer.from(body, 'latin1') : body
    objects.push(Buffer.concat([header, content, footer]))
    return id
  }

  const catalogId = 1
  const pagesId = 2
  objects.push(Buffer.alloc(0), Buffer.alloc(0))
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

  const pageIds: number[] = []
  for (const page of pdf.pages) {
    const stream = page.commands.join('\n')
    const streamId = addObject(Buffer.concat([
      Buffer.from(`<< /Length ${streamLength(page.commands)} >>\nstream\n`, 'latin1'),
      Buffer.from(stream, 'latin1'),
      Buffer.from('\nendstream', 'latin1'),
    ]))
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${streamId} 0 R >>`)
    pageIds.push(pageId)
  }

  objects[catalogId - 1] = Buffer.from(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`, 'latin1')
  objects[pagesId - 1] = Buffer.from(`${pagesId} 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>\nendobj\n`, 'latin1')

  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary')
  const offsets: number[] = [0]
  let offset = header.length
  for (const object of objects) {
    offsets.push(offset)
    offset += object.length
  }

  const xrefStart = offset
  const xref = [
    `xref`,
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((value) => `${String(value).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>`,
    'startxref',
    String(xrefStart),
    '%%EOF',
  ].join('\n')

  return Buffer.concat([header, ...objects, Buffer.from(xref, 'latin1')])
}

function drawHeader(pdf: PdfBuilder, equipo: RoutinePdfTeam, routine: RoutineDetail) {
  const displayTitle = normalizeRoutineDisplayTitle(routine.title, equipo.nombre)
  pdf.rect(PDF_MARGIN, PDF_MARGIN, CONTENT_WIDTH, 96, { fill: COLOR.paleBlue, stroke: COLOR.line })
  pdf.text('RUTINA DE ENTRENAMIENTO', PDF_MARGIN + 16, PDF_MARGIN + 14, { size: 8, font: 'bold', color: COLOR.blue })
  pdf.wrappedText(equipo.nombre, PDF_MARGIN + 16, PDF_MARGIN + 30, CONTENT_WIDTH - 32, { size: 20, font: 'bold', color: COLOR.ink, lineHeight: 23 }, 1)
  pdf.wrappedText(displayTitle, PDF_MARGIN + 16, PDF_MARGIN + 55, CONTENT_WIDTH - 32, { size: 14, font: 'bold', color: COLOR.blue, lineHeight: 16 }, 2)
  pdf.text(`Emitido: ${formatIssuedDate(routine.createdAt)}`, A4_WIDTH - PDF_MARGIN - 104, PDF_MARGIN + 15, { size: 8, color: COLOR.muted })
  pdf.cursorY = PDF_MARGIN + 110
}

function drawMeta(pdf: PdfBuilder, equipo: RoutinePdfTeam, routine: RoutineDetail) {
  const y = pdf.cursorY
  const gap = 7
  const width = (CONTENT_WIDTH - gap * 3) / 4
  const items = [
    ['Categoría', routine.category || equipo.categoria || 'Sin categoría'],
    ['Fases', routine.phases.join(' / ') || routine.phase || 'Sin fase'],
    ['Duración', `${routine.duration} min`],
    ['Ejercicios', String(routine.blockCount)],
  ]

  items.forEach(([label, value], index) => {
    const x = PDF_MARGIN + index * (width + gap)
    pdf.rect(x, y, width, 42, { fill: index === 3 ? COLOR.blue : COLOR.slate, stroke: index === 3 ? COLOR.blue : COLOR.line })
    pdf.text(label, x + 8, y + 8, { size: 7, font: 'bold', color: index === 3 ? COLOR.white : COLOR.muted })
    pdf.wrappedText(value, x + 8, y + 22, width - 16, { size: 9, font: 'bold', color: index === 3 ? COLOR.white : COLOR.ink, lineHeight: 10 }, 1)
  })

  pdf.cursorY += 56
}

function detailSectionsForPdf(block: RoutineBlock) {
  return buildDetailSections(block).map((section) => ({
    title: section.title,
    items: section.items.flatMap((item) => wrapText(item, 210, 8.2, 4)),
  }))
}

function estimateExerciseHeight(block: RoutineBlock) {
  const sections = detailSectionsForPdf(block)
  let leftHeight = 0
  let rightHeight = 0

  for (const section of sections) {
    const boxHeight = 22 + section.items.length * 10

    if (leftHeight <= rightHeight) {
      leftHeight += boxHeight + 8
    } else {
      rightHeight += boxHeight + 8
    }
  }

  return 109 + Math.max(leftHeight, rightHeight)
}

function drawSectionTitle(pdf: PdfBuilder, title: string, index: number) {
  pdf.ensureSpace(34)
  pdf.text(`${String.fromCharCode(65 + index)}. ${title.toUpperCase()}`, PDF_MARGIN, pdf.cursorY, { size: 12, font: 'bold', color: COLOR.ink })
  pdf.line(PDF_MARGIN, pdf.cursorY + 18, A4_WIDTH - PDF_MARGIN, pdf.cursorY + 18, COLOR.line)
  pdf.cursorY += 30
}

function drawStat(pdf: PdfBuilder, x: number, y: number, width: number, label: string, value: string, strong = false) {
  pdf.rect(x, y, width, 33, { fill: strong ? COLOR.white : COLOR.slate, stroke: strong ? COLOR.blue : COLOR.line })
  pdf.text(label, x + 6, y + 6, { size: 6.8, font: 'bold', color: strong ? COLOR.blue : COLOR.muted })
  pdf.wrappedText(value || '-', x + 6, y + 18, width - 12, { size: 9, font: 'bold', color: strong ? COLOR.blue : COLOR.ink, lineHeight: 10 }, 1)
}

function drawExerciseCard(pdf: PdfBuilder, block: RoutineBlock, index: number) {
  const fullHeight = estimateExerciseHeight(block)
  const usablePageHeight = PAGE_BOTTOM - PDF_MARGIN

  if (fullHeight <= usablePageHeight && pdf.cursorY + fullHeight > PAGE_BOTTOM) {
    pdf.addPage()
  } else if (fullHeight > usablePageHeight && pdf.cursorY > PDF_MARGIN + 80) {
    pdf.addPage()
  }

  const startY = pdf.cursorY
  const cardX = PDF_MARGIN
  const cardW = CONTENT_WIDTH
  pdf.rect(cardX, startY, cardW, 48, { fill: COLOR.paleBlue, stroke: COLOR.line })
  pdf.rect(cardX, startY, 5, 48, { fill: COLOR.blue })
  pdf.text(`EJERCICIO ${String(index + 1).padStart(2, '0')}`, cardX + 13, startY + 8, { size: 7, font: 'bold', color: COLOR.blue })
  pdf.wrappedText(block.name, cardX + 13, startY + 22, cardW - 95, { size: 13, font: 'bold', color: COLOR.ink, lineHeight: 15 }, 2)
  pdf.text(`${block.duration || '-'} min`, cardX + cardW - 52, startY + 18, { size: 10, font: 'bold', color: COLOR.blue })

  let y = startY + 58
  const statGap = 6
  const statW = (cardW - statGap * 3) / 4
  drawStat(pdf, cardX, y, statW, 'Series', block.sets || '-', false)
  drawStat(pdf, cardX + statW + statGap, y, statW, 'Repeticiones', block.reps || '-', false)
  drawStat(pdf, cardX + (statW + statGap) * 2, y, statW, 'Descanso', block.rest ? `${block.rest}s` : '-', false)
  drawStat(pdf, cardX + (statW + statGap) * 3, y, statW, 'Carga', block.load ? `${block.load}kg` : '-', true)
  y += 45

  const sections = detailSectionsForPdf(block)
  const colGap = 10
  const colW = (cardW - colGap) / 2
  let leftY = y
  let rightY = y

  for (const [sectionIndex, section] of sections.entries()) {
    let targetLeft = leftY <= rightY
    let x = targetLeft ? cardX : cardX + colW + colGap
    let boxY = targetLeft ? leftY : rightY
    const boxHeight = 22 + section.items.length * 10

    if (boxY + boxHeight > PAGE_BOTTOM) {
      pdf.addPage()
      boxY = PDF_MARGIN
      leftY = boxY
      rightY = boxY
      targetLeft = true
      x = cardX
    }

    pdf.rect(x, boxY, colW, boxHeight, { fill: COLOR.white, stroke: COLOR.line })
    pdf.rect(x, boxY, 3, boxHeight, { fill: sectionIndex % 2 === 0 ? COLOR.blue : '0.392 0.455 0.545' })
    pdf.text(section.title, x + 8, boxY + 7, { size: 7.4, font: 'bold', color: COLOR.ink })
    section.items.forEach((item, itemIndex) => {
      pdf.text(`- ${item}`, x + 8, boxY + 20 + itemIndex * 10, { size: 8.2, color: COLOR.ink })
    })

    if (targetLeft) leftY = boxY + boxHeight + 8
    else rightY = boxY + boxHeight + 8
  }

  pdf.cursorY = Math.max(leftY, rightY, y) + 6
}

export function buildRoutinePdfBuffer({
  equipo,
  routine,
}: {
  equipo: RoutinePdfTeam
  routine: RoutineDetail
}) {
  const pdf = new PdfBuilder()
  drawHeader(pdf, equipo, routine)
  drawMeta(pdf, equipo, routine)

  if (routine.objective || routine.description) {
    pdf.ensureSpace(56)
    pdf.text('OBJETIVO GENERAL', PDF_MARGIN, pdf.cursorY, { size: 9, font: 'bold', color: COLOR.blue })
    const used = pdf.wrappedText(routine.objective || routine.description, PDF_MARGIN, pdf.cursorY + 16, CONTENT_WIDTH, { size: 9.2, color: COLOR.ink, lineHeight: 12 }, 4)
    pdf.cursorY += used + 28
  }

  buildPhaseSections(routine.blocks).forEach((section, sectionIndex) => {
    const firstBlockHeight = section.blocks[0] ? estimateExerciseHeight(section.blocks[0]) : 0
    pdf.ensureSpace(34 + Math.min(firstBlockHeight, PAGE_BOTTOM - PDF_MARGIN - 34))
    drawSectionTitle(pdf, section.title, sectionIndex)
    section.blocks.forEach((block) => {
      const index = routine.blocks.findIndex((candidate) => candidate.rowId === block.rowId)
      drawExerciseCard(pdf, block, index === -1 ? 0 : index)
    })
  })

  return writePdf(pdf)
}
