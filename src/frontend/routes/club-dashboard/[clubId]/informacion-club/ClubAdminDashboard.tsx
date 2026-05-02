'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

export type ClubAdminDashboardData = {
  clubId: string
  clubName: string
  clubCity: string
  clubCountry: string
  clubField: string
  backHref: string
  equipos: Array<{
    id: string
    nombre: string
    categoria: string
    categoriaAnio: string
    temporada: string
    campoJuego: string
    ciudad: string
    jugadoresCount: number
  }>
  jugadores: Array<{
    id: string
    nombre: string
    equipoId: string | null
    equipoNombre: string
    categoria: string
    dorsal: string | number | null
    fotoUrl: string | null
    edad: number | null
    posicion: string | null
    alturaCm: number | null
    pesoKg: number | null
  }>
  entrenamientos: Array<{
    id: string
    equipoId: string | null
    equipoNombre: string
    fecha: string | null
    horaInicio: string | null
    horaFin: string | null
    titulo: string
    tipo: string
    lugar: string
    estado: string
  }>
  partidos: Array<{
    id: string
    equipoId: string | null
    equipoNombre: string
    fechaHora: string | null
    competicion: string
    rivalNombre: string
    lugar: string
    estado: string
    golesFavor: number | null
    golesContra: number | null
  }>
  temporadaActual: string
  totalCampos: number
}

type PageId = 'home' | 'equipos' | 'estadisticas' | 'entrenamientos' | 'jugadores' | 'settings'

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS_ES = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']
const COLORS = ['#4F46E5', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EC4899']

const IC = {
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  team: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  chart: 'M18 20V10 M12 20V4 M6 20v-6',
  cal: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  bell: ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  chevL: 'M15 18l-6-6 6-6',
  chevR: 'M9 18l6-6-6-6',
  chevD: 'M6 9l6 6 6-6',
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  plus: 'M12 5v14 M5 12h14',
  dots: 'M12 5v.01 M12 12v.01 M12 19v.01',
  map: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
}

function Ic({ d, size = 16, sw = 1.8, style = {} }: { d: string | string[]; size?: number; sw?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  )
}

function formatShortDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()].slice(0, 3).toLowerCase()}`
}

function isoDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function localDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function categoryDisplay(value: string) {
  const map: Record<string, string> = {
    PREBENJAMIN: 'Prebenjamin',
    BENJAMIN: 'Benjamin',
    ALEVIN: 'Alevín',
    INFANTIL: 'Infantil',
    CADETE: 'Cadete',
    JUVENIL: 'Juvenil',
    AMATEUR: 'Amateur',
  }
  return map[value] ?? value
}

function categoryClass(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('cadete')) return 'badge-cadete'
  if (normalized.includes('juvenil')) return 'badge-juvenil'
  if (normalized.includes('infantil')) return 'badge-infantil'
  if (normalized.includes('alev')) return 'badge-alevin'
  return 'badge-gray'
}

function CatBadge({ cat }: { cat: string }) {
  return <span className={`badge ${categoryClass(cat)}`}>{categoryDisplay(cat)}</span>
}

function buildChartData(data: ClubAdminDashboardData, days: 7 | 30 | 90) {
  const allDates = [
    ...data.entrenamientos.map((item) => isoDate(item.fecha)),
    ...data.partidos.map((item) => isoDate(item.fechaHora)),
  ].filter((date): date is string => Boolean(date))
  const reference = allDates.length ? new Date([...allDates].sort().at(-1) as string) : new Date()
  const start = addDays(reference, -(days - 1))
  const rows = Array.from({ length: days }, (_, index) => {
    const date = addDays(start, index).toISOString().slice(0, 10)
    return { date, d: new Date(date), entrenamientos: 0, partidos: 0 }
  })
  const byDate = new Map(rows.map((row) => [row.date, row]))
  data.entrenamientos.forEach((item) => {
    const row = byDate.get(isoDate(item.fecha) ?? '')
    if (row) row.entrenamientos += 1
  })
  data.partidos.forEach((item) => {
    const row = byDate.get(isoDate(item.fechaHora) ?? '')
    if (row) row.partidos += 1
  })
  return rows
}

function AreaChart({ data }: { data: ReturnType<typeof buildChartData> }) {
  const W = 900
  const H = 180
  const PL = 36
  const PR = 16
  const PT = 12
  const PB = 28
  const cW = W - PL - PR
  const cH = H - PT - PB
  const maxVal = Math.max(...data.map((d) => d.partidos + d.entrenamientos), 4)
  const pts = data.map((d, i) => ({
    x: PL + (data.length === 1 ? 0 : (i / (data.length - 1)) * cW),
    yP: PT + cH - (d.partidos / maxVal) * cH,
    yE: PT + cH - ((d.partidos + d.entrenamientos) / maxVal) * cH,
    ...d,
  }))
  const smooth = (key: 'yP' | 'yE') => {
    if (pts.length < 2) return ''
    let path = `M ${pts[0].x} ${pts[0][key]}`
    for (let i = 1; i < pts.length; i += 1) {
      const prev = pts[i - 1]
      const curr = pts[i]
      const cpx = (prev.x + curr.x) / 2
      path += ` C ${cpx} ${prev[key]}, ${cpx} ${curr[key]}, ${curr.x} ${curr[key]}`
    }
    return path
  }
  const pathE = smooth('yE')
  const pathP = smooth('yP')
  const areaE = `${pathE} L ${pts.at(-1)?.x ?? PL} ${PT + cH} L ${pts[0]?.x ?? PL} ${PT + cH} Z`
  const areaP = `${pathP} L ${pts.at(-1)?.x ?? PL} ${PT + cH} L ${pts[0]?.x ?? PL} ${PT + cH} Z`
  const labelStep = data.length > 30 ? 14 : data.length > 10 ? 7 : 1
  const yLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: PT + cH * (1 - f), val: Math.round(maxVal * f) }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="clubGradE" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity=".25" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity=".02" />
        </linearGradient>
        <linearGradient id="clubGradP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity=".2" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity=".01" />
        </linearGradient>
      </defs>
      {yLines.map(({ y, val }) => (
        <g key={val}>
          <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#E2E8F0" strokeWidth=".8" strokeDasharray={val === 0 ? '0' : '4 3'} />
          <text x={PL - 4} y={y + 4} fontSize="9" fill="#94A3B8" textAnchor="end">{val}</text>
        </g>
      ))}
      {pts.filter((_, i) => i % labelStep === 0).map(({ x, d }) => (
        <text key={d.getTime()} x={x} y={H - 4} fontSize="9" fill="#94A3B8" textAnchor="middle">
          {d.getDate()} {MONTHS_ES[d.getMonth()].slice(0, 3).toLowerCase()}
        </text>
      ))}
      <path d={areaE} fill="url(#clubGradE)" />
      <path d={areaP} fill="url(#clubGradP)" />
      <path d={pathE} fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={pathP} fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />
    </svg>
  )
}

function CalendarView({ data }: { data: ClubAdminDashboardData }) {
  const eventDates = useMemo(() => {
    const map = new Map<string, Array<{ type: 'partido' | 'entrenamiento'; title: string; team: string; time: string; field: string; color: string }>>()
    data.entrenamientos.forEach((item, index) => {
      const date = isoDate(item.fecha)
      if (!date) return
      const color = COLORS[index % COLORS.length]
      map.set(date, [...(map.get(date) ?? []), { type: 'entrenamiento', title: item.titulo, team: item.equipoNombre, time: item.horaInicio ?? '-', field: item.lugar, color }])
    })
    data.partidos.forEach((item, index) => {
      const date = isoDate(item.fechaHora)
      if (!date) return
      const color = COLORS[(index + 2) % COLORS.length]
      map.set(date, [...(map.get(date) ?? []), { type: 'partido', title: item.rivalNombre, team: item.equipoNombre, time: item.fechaHora ? new Date(item.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-', field: item.lugar, color }])
    })
    return map
  }, [data.entrenamientos, data.partidos])
  const firstRealDate = [...eventDates.keys()].sort()[0]
  const initial = firstRealDate ? new Date(firstRealDate) : new Date()
  const [year, setYear] = useState(initial.getFullYear())
  const [month, setMonth] = useState(initial.getMonth())
  const [selected, setSelected] = useState(initial.getDate())
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const prevDays = new Date(year, month, 0).getDate()
  const cells: Array<{ day: number; cur: boolean }> = []
  for (let i = 0; i < startOffset; i += 1) cells.push({ day: prevDays - startOffset + 1 + i, cur: false })
  for (let i = 1; i <= daysInMonth; i += 1) cells.push({ day: i, cur: true })
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - startOffset - daysInMonth + 1, cur: false })
  const selectedIso = localDateKey(year, month, selected)
  const selectedEvents = eventDates.get(selectedIso) ?? []
  const fields = [...new Set(data.equipos.map((team) => team.campoJuego).filter((field) => field !== '-'))]

  return (
    <div className="cal-wrap">
      <div className="cal-main">
        <div className="cal-header">
          <div className="cal-month"><span>MES</span>{MONTHS_ES[month]} De {year}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="cal-nav-btn" onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}><Ic d={IC.chevL} size={14} /></button>
            <button className="cal-nav-btn" onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}><Ic d={IC.chevR} size={14} /></button>
          </div>
        </div>
        <div className="cal-grid">
          {DAYS_ES.map((day) => <div key={day} className="cal-dow">{day}</div>)}
          {cells.map((cell, i) => {
            const date = localDateKey(year, month, cell.day)
            const events = cell.cur ? (eventDates.get(date) ?? []) : []
            return (
              <button key={`${cell.day}-${i}`} className={`cal-day${!cell.cur ? ' other-month' : ''}${cell.cur && cell.day === selected ? ' selected' : ''}`} onClick={() => cell.cur && setSelected(cell.day)}>
                <div className="cal-day-num">{cell.day}{events.length > 1 && <span className="cal-event-count">{events.length}</span>}</div>
                <div className="cal-dots">{events.slice(0, 4).map((event, index) => <span key={index} className="cal-dot" style={{ background: event.color }} />)}</div>
              </button>
            )
          })}
        </div>
      </div>
      <div className="cal-sidebar">
        <div className="field-legend">
          <div className="field-title">Campos</div>
          {(fields.length ? fields : [data.clubField]).map((field, index) => (
            <div key={`${field}-${index}`} className="field-item">
              <span className="field-color" style={{ background: COLORS[index % COLORS.length] }} />
              <span className="field-item-name">{field}</span>
            </div>
          ))}
        </div>
        <div className="event-detail">
          <div className="event-date">{selected} de {MONTHS_ES[month].toLowerCase()}</div>
          {selectedEvents.length === 0 ? (
            <div className="empty-small">Sin eventos este día</div>
          ) : selectedEvents.map((event, index) => (
            <div key={`${event.title}-${index}`} className="event-card" style={{ borderLeftColor: event.color }}>
              <div className="event-type">{event.type === 'partido' ? 'PARTIDO' : 'ENTRENAMIENTO'}</div>
              <div className="event-name">{event.title}</div>
              <div className="event-team">{event.team}</div>
              <div className="event-detail-row">{event.time}</div>
              <div className="event-detail-row"><span style={{ color: event.color }}>{event.field}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlayerCard({ player }: { player: ClubAdminDashboardData['jugadores'][number] }) {
  const [imgErr, setImgErr] = useState(false)
  const initials = player.nombre.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  return (
    <article className="player-card">
      <div className="player-card-photo">
        {player.fotoUrl && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.fotoUrl} alt={player.nombre} onError={() => setImgErr(true)} />
        ) : (
          <div className="player-card-photo-fallback">{initials || 'J'}</div>
        )}
      </div>
      <div className="player-card-body">
        <div className="player-card-pos">{player.posicion ?? 'Sin posición'}<span>{player.edad ? `${player.edad} yrs` : '-'}</span></div>
        <div className="player-card-name">{player.nombre}</div>
        <div className="player-card-team">{player.equipoNombre} · {categoryDisplay(player.categoria)}</div>
        <div className="player-stats-grid">
          <div><span>MINUTOS</span><strong>0</strong></div>
          <div><span>GOLES</span><strong className="blue">0</strong></div>
          <div><span>ASIST.</span><strong>0</strong></div>
        </div>
        <div className="player-stat-bottom">
          <div><span>DORSAL</span><strong>{player.dorsal ?? '-'}</strong></div>
          <div><span>ALTURA</span><strong>{player.alturaCm ?? '-'}</strong></div>
          <div><span>PESO</span><strong>{player.pesoKg ?? '-'}</strong></div>
        </div>
      </div>
    </article>
  )
}

function HomePage({ data, setPage }: { data: ClubAdminDashboardData; setPage: (page: PageId) => void }) {
  const [range, setRange] = useState<7 | 30 | 90>(90)
  const chartData = useMemo(() => buildChartData(data, range), [data, range])
  const stats = [
    { label: 'Equipos', value: data.equipos.length, sub: 'Plantillas vinculadas al club', icon: IC.team, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Jugadores', value: data.jugadores.length, sub: 'Jugadores activos en equipos', icon: IC.user, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Temporada', value: data.temporadaActual, sub: 'Temporada más repetida', icon: IC.cal, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Campos', value: data.totalCampos, sub: 'Campos de juego registrados', icon: IC.map, color: '#8B5CF6', bg: '#F5F3FF' },
  ]

  return (
    <>
      <div className="stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-badge" style={{ background: stat.bg, color: stat.color }}><Ic d={stat.icon} size={12} />Club</div>
            <div className="stat-num">{stat.value}</div>
            <div className="stat-label">{stat.sub}</div>
            <div className="stat-sub">Datos de la base de datos</div>
          </div>
        ))}
      </div>
      <section className="card card-pad mb-5">
        <div className="sec-header">
          <div><div className="sec-title">Actividad del club</div><div className="sec-sub">Entrenamientos y partidos registrados</div></div>
          <div className="chart-controls">
            {[[90, 'Últimos 3 meses'], [30, 'Últimos 30 días'], [7, 'Últimos 7 días']].map(([value, label]) => (
              <button key={value} className={`chart-btn ${range === value ? 'on' : ''}`} onClick={() => setRange(value as 7 | 30 | 90)}>{label}</button>
            ))}
          </div>
        </div>
        <AreaChart data={chartData} />
        <div className="chart-legend"><span><i style={{ background: '#4F46E5' }} />Entrenamientos</span><span><i style={{ background: '#8B5CF6' }} />Partidos</span></div>
      </section>
      <section className="card">
        <div className="table-head">
          <div><div className="sec-title">Equipos del club</div><div className="sec-sub">Datos cargados desde la base de datos.</div></div>
          <span>{data.equipos.length} filas</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Equipo</th><th>Categoría</th><th>Temporada</th><th>Jugadores</th><th>Campo</th><th>Ciudad</th><th /></tr></thead>
            <tbody>
              {data.equipos.map((team) => (
                <tr key={team.id}>
                  <td><button className="td-link" onClick={() => setPage('equipos')}>{team.nombre}</button></td>
                  <td><CatBadge cat={team.categoria} /></td>
                  <td className="td-muted">{team.temporada}</td>
                  <td><span className="cell-icon"><Ic d={IC.user} size={14} />{team.jugadoresCount}</span></td>
                  <td className="td-muted">{team.campoJuego}</td>
                  <td className="td-muted">{team.ciudad}</td>
                  <td className="td-actions"><button className="btn btn-ghost btn-sm"><Ic d={IC.dots} size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function TeamsPage({ data, setPage }: { data: ClubAdminDashboardData; setPage: (page: PageId) => void }) {
  return (
    <>
      <section className="club-hero">
        <div className="club-hero-left"><div className="club-logo">{data.clubName[0]}</div><div><div className="club-label">Panel de club</div><div className="club-name">{data.clubName}</div></div></div>
        <div className="club-hero-stat"><div className="club-hero-stat-label"><Ic d={IC.team} size={12} />Total equipos</div><div className="club-hero-stat-num">{data.equipos.length}</div></div>
      </section>
      <section className="card">
        <div className="table-head"><div><div className="sec-title">Equipos del club</div><div className="sec-sub">Equipos vinculados a {data.clubName}.</div></div></div>
        {data.equipos.map((team, index) => (
          <article key={team.id} className="team-item-row">
            <div className="team-av" style={{ background: COLORS[index % COLORS.length] }}>{team.nombre[0]}</div>
            <div className="team-item-info">
              <button className="team-item-name" onClick={() => setPage('home')}>{team.nombre}</button>
              <div className="team-item-tags"><CatBadge cat={team.categoria} /><span className="badge badge-gray">{team.categoriaAnio}</span><span className="badge badge-gray">{team.temporada}</span></div>
            </div>
            <div className="team-item-right"><div>{team.ciudad}</div><strong>{team.campoJuego}</strong></div>
          </article>
        ))}
      </section>
    </>
  )
}

function loadStatus(pct: number): { name: string; color: string; soft: string; text: string } {
  if (pct >= 86) return { name: 'Crítica', color: '#DC2626', soft: '#FEE2E2', text: '#7F1D1D' }
  if (pct >= 66) return { name: 'Alta', color: '#F97316', soft: '#FFEDD5', text: '#7C2D12' }
  if (pct >= 41) return { name: 'Moderada', color: '#F59E0B', soft: '#FEF3C7', text: '#78350F' }
  return { name: 'Baja', color: '#059669', soft: '#D1FAE5', text: '#064E3B' }
}

function computeTeamLoad(
  team: ClubAdminDashboardData['equipos'][number],
  entrenamientos: ClubAdminDashboardData['entrenamientos'],
  partidos: ClubAdminDashboardData['partidos']
) {
  const now = Date.now()
  const dayMs = 86400000
  const inWindow = (date: string | null, days: number) => {
    if (!date) return false
    const t = new Date(date).getTime()
    if (Number.isNaN(t)) return false
    const diff = (now - t) / dayMs
    return diff >= 0 && diff <= days
  }
  const teamTrainings = entrenamientos.filter((item) => item.equipoId === team.id)
  const teamMatches = partidos.filter((item) => item.equipoId === team.id)
  const trainings14 = teamTrainings.filter((item) => inWindow(item.fecha, 14)).length
  const matches14 = teamMatches.filter((item) => inWindow(item.fechaHora, 14)).length
  const loadRaw = trainings14 + matches14 * 2
  let fatigaRaw = 0
  teamTrainings.forEach((item) => {
    if (!item.fecha || !inWindow(item.fecha, 7)) return
    const days = (now - new Date(item.fecha).getTime()) / dayMs
    fatigaRaw += Math.max(0, 7 - days) * 1.4
  })
  teamMatches.forEach((item) => {
    if (!item.fechaHora || !inWindow(item.fechaHora, 7)) return
    const days = (now - new Date(item.fechaHora).getTime()) / dayMs
    fatigaRaw += Math.max(0, 7 - days) * 3.2
  })
  return { loadRaw, fatigaRaw, trainings14, matches14 }
}

function BarsChart({ rows }: { rows: Array<{ label: string; favor: number; contra: number }> }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.favor, row.contra]))
  return (
    <div className="bars-chart">
      {rows.length === 0 ? (
        <div className="empty-small">Aún no hay equipos con partidos finalizados.</div>
      ) : rows.map((row) => (
        <div key={row.label} className="bars-row">
          <div className="bars-label">{row.label}</div>
          <div className="bars-track">
            <div className="bars-seg" style={{ width: `${(row.favor / max) * 100}%`, background: 'linear-gradient(90deg,#4F46E5,#6366F1)' }}>
              <span>{row.favor}</span>
            </div>
          </div>
          <div className="bars-track">
            <div className="bars-seg" style={{ width: `${(row.contra / max) * 100}%`, background: 'linear-gradient(90deg,#EF4444,#F87171)' }}>
              <span>{row.contra}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatsPage({ data }: { data: ClubAdminDashboardData }) {
  type MatchOutcome = 'V' | 'E' | 'D'
  const finished = data.partidos.filter(
    (match) => match.golesFavor !== null && match.golesContra !== null
  )
  const outcomeOf = (match: typeof finished[number]): MatchOutcome => {
    const gf = Number(match.golesFavor)
    const gc = Number(match.golesContra)
    if (gf > gc) return 'V'
    if (gf < gc) return 'D'
    return 'E'
  }

  const wins = finished.filter((match) => outcomeOf(match) === 'V').length
  const draws = finished.filter((match) => outcomeOf(match) === 'E').length
  const losses = finished.filter((match) => outcomeOf(match) === 'D').length
  const golesFavor = finished.reduce((sum, match) => sum + Number(match.golesFavor ?? 0), 0)
  const golesContra = finished.reduce((sum, match) => sum + Number(match.golesContra ?? 0), 0)
  const goalDiff = golesFavor - golesContra
  const efectividad = finished.length === 0 ? 0 : Math.round(((wins * 3 + draws) / (finished.length * 3)) * 100)
  const cleanSheets = finished.filter((match) => Number(match.golesContra) === 0).length
  const trainingsCount = data.entrenamientos.length

  const teamLoadData = data.equipos.map((team) => ({
    team,
    ...computeTeamLoad(team, data.entrenamientos, data.partidos),
  }))
  const maxLoad = Math.max(14, ...teamLoadData.map((row) => row.loadRaw))
  const maxFatiga = Math.max(20, ...teamLoadData.map((row) => row.fatigaRaw))
  const teamLoadRows = teamLoadData
    .map((row) => ({
      ...row,
      cargaPct: Math.round((row.loadRaw / maxLoad) * 100),
      fatigaPct: Math.round((row.fatigaRaw / maxFatiga) * 100),
    }))
    .sort((a, b) => b.cargaPct + b.fatigaPct - (a.cargaPct + a.fatigaPct))

  const teamRanking = data.equipos
    .map((team) => {
      const rows = finished.filter((match) => match.equipoId === team.id)
      const tWins = rows.filter((match) => outcomeOf(match) === 'V').length
      const tDraws = rows.filter((match) => outcomeOf(match) === 'E').length
      const tLosses = rows.filter((match) => outcomeOf(match) === 'D').length
      const tFavor = rows.reduce((sum, match) => sum + Number(match.golesFavor ?? 0), 0)
      const tContra = rows.reduce((sum, match) => sum + Number(match.golesContra ?? 0), 0)
      const points = tWins * 3 + tDraws
      return {
        id: team.id,
        nombre: team.nombre,
        categoria: team.categoria,
        played: rows.length,
        wins: tWins,
        draws: tDraws,
        losses: tLosses,
        favor: tFavor,
        contra: tContra,
        diff: tFavor - tContra,
        points,
      }
    })
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.favor - a.favor)

  const maxPoints = Math.max(1, ...teamRanking.map((row) => row.points))

  const recentForm = [...finished]
    .sort((a, b) => {
      const aDate = a.fechaHora ? new Date(a.fechaHora).getTime() : 0
      const bDate = b.fechaHora ? new Date(b.fechaHora).getTime() : 0
      return bDate - aDate
    })
    .slice(0, 8)

  const categoryBreakdown = data.equipos.reduce<Record<string, number>>((acc, team) => {
    const key = categoryDisplay(team.categoria)
    acc[key] = (acc[key] ?? 0) + team.jugadoresCount
    return acc
  }, {})
  const categoryEntries = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])
  const categoryMax = Math.max(1, ...categoryEntries.map(([, value]) => value))

  const topScorers = data.equipos
    .map((team) => {
      const teamMatches = finished.filter((match) => match.equipoId === team.id)
      const total = teamMatches.reduce((sum, match) => sum + Number(match.golesFavor ?? 0), 0)
      return { name: team.nombre, value: total, played: teamMatches.length }
    })
    .filter((row) => row.played > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const topMaxValue = Math.max(1, ...topScorers.map((row) => row.value))

  const trainingByType = data.entrenamientos.reduce<Record<string, number>>((acc, item) => {
    const key = item.tipo && item.tipo !== '-' ? item.tipo : 'Sin tipo'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const trainingTypeEntries = Object.entries(trainingByType).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const trainingTypeMax = Math.max(1, ...trainingTypeEntries.map(([, value]) => value))
  const palette = ['#4F46E5', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B']

  const barsRows = teamRanking
    .filter((row) => row.played > 0)
    .slice(0, 6)
    .map((row) => ({ label: row.nombre, favor: row.favor, contra: row.contra }))

  const formRibbon = recentForm.slice().reverse()
  const ribbonPadded: Array<typeof recentForm[number] | null> = [
    ...new Array(Math.max(0, 8 - formRibbon.length)).fill(null),
    ...formRibbon,
  ]
  const totalSafe = finished.length || 1

  return (
    <div className="stats-redesign">
      <section className="stats-hero" style={{ display: "none" }}>
        <div className="stats-hero-grid">
          <div className="stats-hero-meta">
            <div className="stats-hero-eyebrow">Performance brief · Temporada {data.temporadaActual}</div>
            <h1 className="stats-hero-title">{data.clubName}</h1>
            <p className="stats-hero-sub">{data.equipos.length} equipos · {data.jugadores.length} jugadores · {finished.length} partidos finalizados</p>
          </div>
          <div className="stats-hero-mega">
            <div className="stats-hero-mega-num">{efectividad}<span>%</span></div>
            <div className="stats-hero-mega-label">Efectividad</div>
            <div className="stats-hero-mega-sub">{wins}V · {draws}E · {losses}D</div>
          </div>
          <div className="stats-hero-form">
            <div className="stats-hero-form-label">Forma reciente</div>
            <div className="stats-hero-form-ribbon">
              {ribbonPadded.map((match, idx) => {
                if (!match) return <span key={`empty-${idx}`} className="form-bead form-bead-empty">·</span>
                const r = outcomeOf(match)
                return <span key={match.id} className={`form-bead form-bead-${r.toLowerCase()}`}>{r}</span>
              })}
            </div>
          </div>
        </div>
        <div className="stats-hero-microstats">
          <div><span>Partidos</span><strong>{finished.length}</strong></div>
          <div><span>Goles a favor</span><strong>{golesFavor}</strong></div>
          <div><span>Goles en contra</span><strong>{golesContra}</strong></div>
          <div><span>Diferencia</span><strong className={goalDiff >= 0 ? 'pos' : 'neg'}>{goalDiff >= 0 ? `+${goalDiff}` : goalDiff}</strong></div>
          <div><span>Porterías a 0</span><strong>{cleanSheets}</strong></div>
          <div><span>Entrenamientos</span><strong>{trainingsCount}</strong></div>
        </div>
      </section>

      <section className="card load-panel mb-5">
        <div className="load-panel-head">
          <div>
            <div className="eyebrow">Control de rendimiento</div>
            <h2 className="load-panel-title">Carga y fatiga por equipo</h2>
            <p className="load-panel-sub">Estimación derivada de la actividad de los últimos 14 días · partidos cuentan x2</p>
          </div>
          <div className="load-panel-legend">
            <span><i style={{ background: '#10B981' }} />Baja</span>
            <span><i style={{ background: '#F59E0B' }} />Moderada</span>
            <span><i style={{ background: '#F97316' }} />Alta</span>
            <span><i style={{ background: '#DC2626' }} />Crítica</span>
          </div>
        </div>
        {teamLoadRows.length === 0 ? (
          <div style={{ padding: 28 }}><div className="empty-small">Sin equipos para evaluar.</div></div>
        ) : (
          <div className="load-grid">
            {teamLoadRows.map((row, idx) => {
              const carga = loadStatus(row.cargaPct)
              const fatiga = loadStatus(row.fatigaPct)
              const dominant = row.cargaPct >= row.fatigaPct ? carga : fatiga
              return (
                <article key={row.team.id} className="load-card" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="load-card-head">
                    <div>
                      <div className="load-card-name">{row.team.nombre}</div>
                      <div className="load-card-cat">{categoryDisplay(row.team.categoria)} · {row.trainings14} ses · {row.matches14} part</div>
                    </div>
                    <span className="load-card-status" style={{ background: dominant.soft, color: dominant.text, borderColor: dominant.color }}>
                      {dominant.name}
                    </span>
                  </div>
                  <div className="load-meter">
                    <div className="load-meter-label"><span>Carga</span><strong style={{ color: carga.color }}>{row.cargaPct}%</strong></div>
                    <div className="load-meter-bar">
                      <div className="load-meter-fill" style={{ width: `${row.cargaPct}%`, background: `linear-gradient(90deg, ${carga.color}, ${carga.color}cc)` }} />
                    </div>
                  </div>
                  <div className="load-meter">
                    <div className="load-meter-label"><span>Fatiga</span><strong style={{ color: fatiga.color }}>{row.fatigaPct}%</strong></div>
                    <div className="load-meter-bar">
                      <div className="load-meter-fill" style={{ width: `${row.fatigaPct}%`, background: `linear-gradient(90deg, ${fatiga.color}, ${fatiga.color}cc)` }} />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="stats-grid-2 mb-5">
        <div className="card results-card">
          <div className="results-head">
            <div>
              <div className="eyebrow">Distribución de resultados</div>
              <h3>Cómo termina el club</h3>
            </div>
            <div className="results-total">{finished.length}<span>partidos</span></div>
          </div>
          <div className="results-bar">
            <div className="results-seg results-v" style={{ flex: wins || 0.001 }}>
              <div className="results-seg-num">{wins}</div>
              <div className="results-seg-label">Victorias</div>
              <div className="results-seg-pct">{Math.round((wins / totalSafe) * 100)}%</div>
            </div>
            <div className="results-seg results-e" style={{ flex: draws || 0.001 }}>
              <div className="results-seg-num">{draws}</div>
              <div className="results-seg-label">Empates</div>
              <div className="results-seg-pct">{Math.round((draws / totalSafe) * 100)}%</div>
            </div>
            <div className="results-seg results-d" style={{ flex: losses || 0.001 }}>
              <div className="results-seg-num">{losses}</div>
              <div className="results-seg-label">Derrotas</div>
              <div className="results-seg-pct">{Math.round((losses / totalSafe) * 100)}%</div>
            </div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="stats-section-head">
            <div>
              <div className="eyebrow">Producción ofensiva / defensiva</div>
              <h2>Goles por equipo</h2>
              <p>A favor (azul) vs en contra (rojo) · top 6</p>
            </div>
          </div>
          <BarsChart rows={barsRows} />
        </div>
      </section>

      <section className="card mb-5">
        <div className="table-head">
          <div>
            <div className="eyebrow">Clasificación interna</div>
            <h2 className="load-panel-title" style={{ fontSize: 20 }}>Rendimiento por equipo</h2>
            <p className="load-panel-sub">Ordenado por puntos · diferencia de gol · goles a favor</p>
          </div>
          <span className="stats-section-tag">{teamRanking.filter((row) => row.played > 0).length} activos</span>
        </div>
        {teamRanking.length === 0 ? (
          <div style={{ padding: 28 }}><div className="empty-small">Sin equipos disponibles.</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Equipo</th>
                  <th>Categoría</th>
                  <th>PJ</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>GF</th>
                  <th>GC</th>
                  <th>DG</th>
                  <th>Pts</th>
                  <th style={{ width: 160 }}>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {teamRanking.map((row, index) => (
                  <tr key={row.id}>
                    <td className="td-muted">{index + 1}</td>
                    <td><strong style={{ color: '#0F172A' }}>{row.nombre}</strong></td>
                    <td><CatBadge cat={row.categoria} /></td>
                    <td className="td-muted">{row.played}</td>
                    <td><span className="rank-pip rank-pip-v">{row.wins}</span></td>
                    <td><span className="rank-pip rank-pip-e">{row.draws}</span></td>
                    <td><span className="rank-pip rank-pip-d">{row.losses}</span></td>
                    <td className="td-muted">{row.favor}</td>
                    <td className="td-muted">{row.contra}</td>
                    <td style={{ fontWeight: 800, color: row.diff > 0 ? '#10B981' : row.diff < 0 ? '#EF4444' : '#64748B' }}>{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                    <td><strong style={{ color: '#4F46E5', fontSize: 15 }}>{row.points}</strong></td>
                    <td>
                      <div className="rank-progress">
                        <span style={{ width: `${(row.points / maxPoints) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stats-grid-3 mb-5">
        <div className="card card-pad">
          <div className="stats-section-head">
            <div>
              <div className="eyebrow">Goleadores</div>
              <h2>Top equipos</h2>
            </div>
          </div>
          {topScorers.length === 0 ? (
            <div className="empty-small">Sin datos de goles aún.</div>
          ) : (
            <div className="rank-list">
              {topScorers.map((row, index) => (
                <div key={row.name} className="rank-list-row">
                  <div className="rank-list-pos">{index + 1}</div>
                  <div className="rank-list-body">
                    <div className="rank-list-head">
                      <span>{row.name}</span>
                      <strong>{row.value}</strong>
                    </div>
                    <div className="rank-list-bar"><span style={{ width: `${(row.value / topMaxValue) * 100}%` }} /></div>
                    <div className="rank-list-sub">{row.played} partido{row.played === 1 ? '' : 's'} · {(row.value / row.played).toFixed(2)} por partido</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="stats-section-head">
            <div>
              <div className="eyebrow">Plantilla</div>
              <h2>Por categoría</h2>
            </div>
          </div>
          {categoryEntries.length === 0 ? (
            <div className="empty-small">Sin equipos registrados.</div>
          ) : (
            <div className="cat-list">
              {categoryEntries.map(([label, value], index) => {
                const color = palette[index % palette.length]
                return (
                  <div key={label} className="cat-row">
                    <div className="cat-row-head">
                      <span><span className="cat-dot" style={{ background: color }} />{label}</span>
                      <strong>{value}</strong>
                    </div>
                    <div className="cat-row-bar"><span style={{ width: `${(value / categoryMax) * 100}%`, background: color }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="stats-section-head">
            <div>
              <div className="eyebrow">Entrenamientos</div>
              <h2>Por tipo</h2>
            </div>
          </div>
          {trainingTypeEntries.length === 0 ? (
            <div className="empty-small">No hay entrenamientos registrados.</div>
          ) : (
            <div className="cat-list">
              {trainingTypeEntries.map(([label, value], index) => {
                const color = palette[(index + 2) % palette.length]
                return (
                  <div key={label} className="cat-row">
                    <div className="cat-row-head">
                      <span><span className="cat-dot" style={{ background: color }} />{label}</span>
                      <strong>{value}</strong>
                    </div>
                    <div className="cat-row-bar"><span style={{ width: `${(value / trainingTypeMax) * 100}%`, background: color }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="card card-pad mb-5">
        <div className="stats-section-head">
          <div>
            <div className="eyebrow">Cronología</div>
            <h2>Actividad temporal · 90 días</h2>
            <p>Entrenamientos y partidos registrados</p>
          </div>
        </div>
        <AreaChart data={buildChartData(data, 90)} />
        <div className="chart-legend"><span><i style={{ background: '#4F46E5' }} />Entrenamientos</span><span><i style={{ background: '#8B5CF6' }} />Partidos</span></div>
      </section>
    </div>
  )
}

function PlayersPage({ data }: { data: ClubAdminDashboardData }) {
  const groups = data.equipos.map((team) => ({ team, players: data.jugadores.filter((player) => player.equipoId === team.id) }))
  return (
    <>
      <div className="page-title"><div><div className="sec-title big">Jugadores</div><div className="sec-sub">{data.jugadores.length} jugadores activos de {data.equipos.length} equipos.</div></div><button className="btn btn-primary"><Ic d={IC.plus} size={14} />Añadir jugador</button></div>
      {groups.map(({ team, players }) => (
        <section key={team.id} className="players-section">
          <div className="players-section-header"><div className="eyebrow">EQUIPO</div><div className="players-section-team">{team.nombre} · <span>{categoryDisplay(team.categoria)}</span><em>{players.length} JUGADORES</em></div></div>
          {players.length ? <div className="player-grid">{players.map((player) => <PlayerCard key={player.id} player={player} />)}</div> : <div className="empty-small boxed">Sin jugadores activos.</div>}
        </section>
      ))}
    </>
  )
}

function SettingsPage({ data }: { data: ClubAdminDashboardData }) {
  const sections = [
    { title: 'Información del club', sub: 'Datos generales del club', fields: [['Nombre del club', data.clubName], ['Ciudad', data.clubCity], ['País', data.clubCountry], ['Campo principal', data.clubField]] },
    { title: 'Temporada', sub: 'Configuración de la temporada actual', fields: [['Temporada activa', data.temporadaActual], ['Equipos', String(data.equipos.length)], ['Jugadores', String(data.jugadores.length)]] },
  ]
  return (
    <><div className="page-title"><div><div className="sec-title big">Configuración</div><div className="sec-sub">Vista conectada a los datos actuales del club.</div></div></div><div className="settings-grid">{sections.map((section) => <section key={section.title} className="settings-card"><div className="settings-card-header"><div className="settings-card-title">{section.title}</div><div className="settings-card-sub">{section.sub}</div></div><div className="settings-card-body">{section.fields.map(([label, value]) => <label key={label} className="settings-field"><span>{label}</span><input readOnly value={value} /></label>)}</div></section>)}</div></>
  )
}

const PAGE_IDS: PageId[] = ['home', 'equipos', 'estadisticas', 'entrenamientos', 'jugadores', 'settings']

export function ClubAdminDashboard({ data }: { data: ClubAdminDashboardData }) {
  const router = useRouter()
  const [page, setPage] = useState<PageId>('home')

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '') as PageId
      if (!hash) {
        setPage('home')
        return
      }
      if (PAGE_IDS.includes(hash)) {
        setPage(hash)
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])
  const titles: Record<PageId, string> = {
    home: `Información club · ${data.clubName}`,
    equipos: `Equipos · ${data.clubName}`,
    estadisticas: `Estadísticas · ${data.clubName}`,
    entrenamientos: `Entrenamientos · ${data.clubName}`,
    jugadores: `Jugadores · ${data.clubName}`,
    settings: `Configuración · ${data.clubName}`,
  }
  const nav = [
    ['home', 'Home', IC.home],
    ['equipos', 'Equipos', IC.team],
    ['estadisticas', 'Estadísticas', IC.chart],
    ['entrenamientos', 'Entrenamientos', IC.cal],
    ['jugadores', 'Jugadores', IC.user],
    ['settings', 'Settings', IC.settings],
  ] as const
  const latestTraining = data.entrenamientos[0]

  return (
    <div className="club-admin-scope">
      <nav className="sidebar">
        <div className="sb-brand"><div className="sb-brand-name">BeProfesional</div><div className="sb-brand-club">{data.clubName}</div></div>
        <div className="sb-nav">
          {nav.map(([id, label, icon]) => (
            <button
              key={id}
              className={`nav-item${page === id ? ' active' : ''}`}
              onClick={() => {
                if (id === 'jugadores') {
                  router.push(`/club-dashboard/${encodeURIComponent(data.clubId)}/informacion-club/jugadores`)
                  return
                }
                setPage(id)
              }}
            >
              <Ic d={icon} size={15} />
              {label}
            </button>
          ))}
        </div>
        <div className="sb-notif"><div className="notif-header"><span>Notificaciones</span><Ic d={IC.bell} size={14} /></div><div className="notif-count">{latestTraining ? '1 sin leer' : '0 sin leer'}</div><div className="notif-item"><strong>Nuevo entrenamiento</strong><p>{latestTraining ? `${latestTraining.titulo} · ${latestTraining.horaInicio ?? '-'}` : 'No hay entrenamientos recientes.'}</p></div></div>
        <div className="sb-user"><div className="sb-user-av">A</div><div><div>Administrador</div><span>{data.clubName}</span></div></div>
      </nav>
      <div className="main">
        <header className="topbar">
          <div className="topbar-title"><Ic d={IC.grid} size={16} />{titles[page]}</div>
          <div className="topbar-right"><button className="tb-btn" onClick={() => router.push(data.backHref)}><Ic d={IC.chevL} size={13} />Volver al club</button><button className="tb-btn primary" onClick={() => setPage('equipos')}><Ic d={IC.info} size={13} />Ver información club</button></div>
        </header>
        <main className="content">
          {page === 'home' && <HomePage data={data} setPage={setPage} />}
          {page === 'equipos' && <TeamsPage data={data} setPage={setPage} />}
          {page === 'estadisticas' && <StatsPage data={data} />}
          {page === 'entrenamientos' && <section className="card card-pad"><div className="sec-header"><div><div className="sec-title">Calendario de entrenamientos</div><div className="sec-sub">Entrenamientos y partidos del club diferenciados por campo.</div></div><button className="btn btn-primary btn-sm"><Ic d={IC.plus} size={13} />Nuevo entrenamiento</button></div><CalendarView data={data} /></section>}
          {page === 'jugadores' && <PlayersPage data={data} />}
          {page === 'settings' && <SettingsPage data={data} />}
        </main>
      </div>
      <style jsx global>{`
        .club-admin-scope{--indigo:#4F46E5;--indigo-d:#3730A3;--indigo-l:#6366F1;--indigo-100:#E0E7FF;--indigo-50:#EEF2FF;--bg:#F3F4FB;--sidebar-w:210px;--white:#fff;--slate-900:#0F172A;--slate-800:#1E293B;--slate-700:#334155;--slate-600:#475569;--slate-500:#64748B;--slate-400:#94A3B8;--slate-300:#CBD5E1;--slate-200:#E2E8F0;--slate-100:#F1F5F9;--green:#10B981;--green-50:#ECFDF5;--amber:#F59E0B;--amber-50:#FFFBEB;--red:#EF4444;--red-50:#FEF2F2;--purple-50:#F5F3FF;display:flex;min-height:100vh;background:var(--bg);color:var(--slate-800);font-family:Inter,system-ui,sans-serif}
        .club-admin-scope *{box-sizing:border-box}.club-admin-scope button{font-family:inherit}.club-admin-scope .sidebar{width:var(--sidebar-w);position:fixed;inset:0 auto 0 0;background:var(--white);border-right:1px solid var(--slate-200);display:flex;flex-direction:column;z-index:50}.club-admin-scope .main{margin-left:var(--sidebar-w);flex:1;min-height:100vh}.sb-brand{padding:20px 16px 14px;border-bottom:1px solid var(--slate-100)}.sb-brand-name{font-size:14px;font-weight:800;color:var(--slate-900)}.sb-brand-club{font-size:11px;color:var(--slate-500);margin-top:2px}.sb-nav{flex:1;padding:12px 8px;display:flex;flex-direction:column;gap:2px}.nav-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border:0;border-radius:8px;background:transparent;font-size:13px;font-weight:500;color:var(--slate-600);cursor:pointer;text-align:left}.nav-item:hover{background:#F8FAFC;color:var(--slate-900)}.nav-item.active{background:var(--indigo-50);color:var(--indigo);font-weight:600}.sb-notif{padding:12px;border-top:1px solid var(--slate-100)}.notif-header{display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:var(--slate-400);text-transform:uppercase}.notif-count{font-size:11px;font-weight:600;color:var(--slate-700);margin:10px 0 8px}.notif-item{background:#F8FAFC;border:1px solid var(--slate-200);border-radius:8px;padding:10px 12px;font-size:11px}.notif-item strong{display:block;color:var(--slate-800);margin-bottom:3px}.notif-item p{margin:0;color:var(--slate-500);line-height:1.4}.sb-user{display:flex;gap:9px;align-items:center;padding:12px;border-top:1px solid var(--slate-100);font-size:12px;font-weight:700}.sb-user span{display:block;font-size:10px;color:var(--slate-400);font-weight:500}.sb-user-av{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,var(--indigo),var(--indigo-l));display:flex;align-items:center;justify-content:center;color:#fff}
        .topbar{height:52px;background:var(--white);border-bottom:1px solid var(--slate-200);display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:40}.topbar-title{font-size:13px;font-weight:600;color:var(--slate-700);display:flex;gap:8px;align-items:center}.topbar-right{display:flex;gap:10px}.tb-btn,.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}.tb-btn{padding:6px 14px;border:1.5px solid var(--slate-200);background:#fff;color:var(--slate-600)}.tb-btn:hover{border-color:var(--indigo);color:var(--indigo);background:var(--indigo-50)}.tb-btn.primary,.btn-primary{background:var(--indigo);color:#fff;border-color:var(--indigo)}.tb-btn.primary:hover,.btn-primary:hover{background:var(--indigo-d)}.content{padding:24px}.card{background:#fff;border:1px solid var(--slate-200);border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,.07)}.card-pad{padding:20px}.mb-5{margin-bottom:20px}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}.stat-card{background:#fff;border:1px solid var(--slate-200);border-radius:16px;padding:18px 20px}.stat-badge{display:inline-flex;gap:5px;align-items:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:3px 8px;border-radius:5px;margin-bottom:10px}.stat-num{font-size:28px;font-weight:900;color:var(--slate-900);line-height:1}.stat-label{font-size:12px;color:var(--slate-500);margin-top:5px;font-weight:500}.stat-sub{font-size:10px;color:var(--slate-400);margin-top:3px}.sec-header,.table-head,.page-title{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px}.table-head{padding:18px 20px 14px;border-bottom:1px solid var(--slate-100);margin:0}.table-head span{font-size:12px;color:var(--slate-500)}.sec-title{font-size:16px;font-weight:800;color:var(--slate-900)}.sec-title.big{font-size:22px}.sec-sub{font-size:12px;color:var(--slate-500);margin-top:3px}.chart-controls{display:flex;gap:4px}.chart-btn{padding:5px 12px;border-radius:6px;border:0;font-size:11px;font-weight:600;cursor:pointer;color:var(--slate-500);background:transparent}.chart-btn.on{background:var(--indigo-50);color:var(--indigo)}.chart-legend{display:flex;gap:16px;margin-top:12px}.chart-legend span{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--slate-500);font-weight:500}.chart-legend i{width:10px;height:10px;border-radius:50%}
        .table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}thead tr{border-bottom:1px solid var(--slate-200)}th{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:var(--slate-500);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}td{padding:12px 14px;border-bottom:1px solid var(--slate-100);color:var(--slate-700)}.td-link{border:0;background:transparent;color:var(--indigo);font-weight:700;cursor:pointer;padding:0}.td-muted{color:var(--slate-500);font-size:12px}.td-actions{text-align:right}.cell-icon{display:flex;align-items:center;gap:6px;font-weight:700}.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap}.badge-cadete{background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}.badge-juvenil{background:var(--purple-50);color:#6D28D9;border:1px solid #DDD6FE}.badge-infantil{background:var(--green-50);color:#065F46;border:1px solid #A7F3D0}.badge-alevin{background:var(--amber-50);color:#92400E;border:1px solid #FDE68A}.badge-gray{background:var(--slate-100);color:var(--slate-600);border:1px solid var(--slate-200)}.btn{padding:9px 16px;border:0;font-size:13px}.btn-ghost{background:transparent;border:1.5px solid var(--slate-200);color:var(--slate-600)}.btn-sm{padding:6px 12px;font-size:12px}
        .club-hero{background:#fff;border:1px solid var(--slate-200);border-radius:20px;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}.club-hero-left{display:flex;align-items:center;gap:20px}.club-logo{width:60px;height:60px;border-radius:16px;background:linear-gradient(135deg,var(--indigo),var(--indigo-l));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff}.club-label{font-size:10px;font-weight:800;color:var(--indigo);text-transform:uppercase;letter-spacing:.08em}.club-name{font-size:26px;font-weight:900;color:var(--slate-900)}.club-hero-stat{text-align:right}.club-hero-stat-label{font-size:10px;font-weight:800;color:var(--slate-400);text-transform:uppercase;display:flex;gap:5px;justify-content:flex-end}.club-hero-stat-num{font-size:36px;font-weight:900;color:var(--slate-900)}.team-item-row{display:flex;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid var(--slate-100)}.team-av{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff}.team-item-info{flex:1}.team-item-name{border:0;background:transparent;padding:0;font-size:15px;font-weight:800;color:var(--slate-900);cursor:pointer}.team-item-tags{display:flex;gap:6px;margin-top:6px}.team-item-right{text-align:right;font-size:11px;color:var(--slate-400)}.team-item-right strong{display:block;font-size:13px;color:var(--slate-700)}
        .cal-wrap{display:flex;gap:20px}.cal-main{flex:1;min-width:0}.cal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.cal-month{font-size:16px;font-weight:800;color:var(--slate-900)}.cal-month span{display:block;font-size:11px;color:var(--indigo);text-transform:uppercase}.cal-nav-btn{width:30px;height:30px;border-radius:7px;border:1.5px solid var(--slate-200);background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.cal-dow{font-size:10px;font-weight:800;color:var(--slate-400);text-align:center;padding:6px 0}.cal-day{min-height:72px;border-radius:8px;border:1px solid var(--slate-100);padding:5px 7px;background:#fff;cursor:pointer;text-align:left}.cal-day.selected{border-color:var(--indigo);background:var(--indigo-50)}.cal-day.other-month{background:transparent;border-color:transparent}.cal-day-num{font-size:12px;font-weight:700;color:var(--slate-700);display:flex;justify-content:space-between}.cal-event-count{font-size:9px;background:var(--indigo);color:#fff;border-radius:4px;padding:1px 5px}.cal-dots{display:flex;gap:3px;margin-top:6px;flex-wrap:wrap}.cal-dot{width:6px;height:6px;border-radius:50%}.cal-sidebar{width:220px;display:flex;flex-direction:column;gap:14px}.field-legend,.event-detail{background:#fff;border:1px solid var(--slate-200);border-radius:16px;padding:16px}.field-title{font-size:12px;font-weight:800;margin-bottom:12px}.field-item{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--slate-600);padding:5px 0}.field-color{width:9px;height:9px;border-radius:50%}.event-date{font-size:11px;font-weight:800;color:var(--slate-500);text-transform:uppercase;margin-bottom:12px}.event-card{padding:12px;border-radius:8px;border-left:3px solid var(--amber);background:#F8FAFC;margin-bottom:10px}.event-type{font-size:9px;font-weight:900;color:var(--slate-400)}.event-name{font-size:13px;font-weight:800;color:var(--slate-900);margin-top:4px}.event-team,.event-detail-row{font-size:11px;color:var(--slate-600);margin-top:4px}.empty-small{font-size:12px;color:var(--slate-400);text-align:center;padding:20px 0}.empty-small.boxed{border:1px dashed var(--slate-200);border-radius:16px;background:#fff}
        .players-section{margin-bottom:32px}.eyebrow{font-size:11px;font-weight:800;color:var(--indigo);letter-spacing:.07em;margin-bottom:6px}.players-section-team{font-size:18px;font-weight:900;color:var(--slate-900);display:flex;align-items:center;gap:10px}.players-section-team span{color:var(--slate-400)}.players-section-team em{font-style:normal;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;background:var(--slate-100);color:var(--slate-600)}.player-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}.player-card{background:#fff;border:1px solid var(--slate-200);border-radius:20px;overflow:hidden}.player-card-photo{height:180px;background:var(--slate-100)}.player-card-photo img{width:100%;height:100%;object-fit:cover;object-position:center top}.player-card-photo-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--indigo),var(--indigo-l));font-size:48px;font-weight:900;color:#fff}.player-card-body{padding:14px}.player-card-pos{font-size:9px;font-weight:900;color:var(--indigo);text-transform:uppercase;display:flex;justify-content:space-between}.player-card-name{font-size:14px;font-weight:900;color:var(--slate-900);text-transform:uppercase;margin-top:4px}.player-card-team{font-size:10px;color:var(--slate-500);margin:2px 0 12px;text-transform:uppercase}.player-stats-grid,.player-stat-bottom{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--slate-100);padding-top:10px;text-align:center}.player-stat-bottom{margin-top:8px}.player-stats-grid span,.player-stat-bottom span{display:block;font-size:8px;font-weight:800;color:var(--slate-400);text-transform:uppercase}.player-stats-grid strong{font-size:16px}.player-stats-grid .blue{color:var(--indigo)}.player-stat-bottom strong{font-size:11px;color:var(--slate-700)}
        .settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.settings-card{background:#fff;border:1px solid var(--slate-200);border-radius:16px;overflow:hidden}.settings-card-header{padding:18px 20px;border-bottom:1px solid var(--slate-100)}.settings-card-title{font-size:14px;font-weight:800;color:var(--slate-900)}.settings-card-sub{font-size:12px;color:var(--slate-500);margin-top:3px}.settings-card-body{padding:20px;display:flex;flex-direction:column;gap:14px}.settings-field span{display:block;font-size:12px;font-weight:700;color:var(--slate-700);margin-bottom:6px}.settings-field input{width:100%;padding:9px 12px;border:1.5px solid var(--slate-200);border-radius:8px;font-size:13px;background:#F8FAFC;color:var(--slate-900)}
        .stats-redesign{font-feature-settings:'tnum','ss01';animation:statsFadeIn .5s ease both}@keyframes statsFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .stats-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.stats-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:1100px){.stats-grid-2,.stats-grid-3{grid-template-columns:1fr}}
        .stats-redesign .eyebrow{font-size:10px;font-weight:800;letter-spacing:.22em;color:var(--indigo);text-transform:uppercase;margin-bottom:0}
        .stats-section-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;gap:16px}.stats-section-head h2{margin:6px 0 4px;font-size:20px;font-weight:900;color:var(--slate-900);letter-spacing:-.01em}.stats-section-head h3{margin:6px 0 0;font-size:18px;font-weight:900;color:var(--slate-900);letter-spacing:-.01em}.stats-section-head p{margin:0;font-size:12px;color:var(--slate-500);font-weight:500}.stats-section-tag{font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--slate-500);padding:5px 10px;background:var(--slate-100);border-radius:6px;white-space:nowrap}
        .stats-hero{position:relative;overflow:hidden;border-radius:24px;color:#fff;padding:36px 36px 0;margin-bottom:20px;background:radial-gradient(1100px 380px at 85% -10%,rgba(99,102,241,.42),transparent 60%),radial-gradient(800px 320px at -10% 110%,rgba(139,92,246,.28),transparent 60%),linear-gradient(135deg,#0B1020 0%,#1E1B4B 55%,#312E81 100%);box-shadow:0 18px 60px rgba(15,23,42,.18)}
        .stats-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse at center,#000 40%,transparent 100%);pointer-events:none}
        .stats-hero::after{content:'';position:absolute;top:-50%;right:-10%;width:420px;height:420px;background:radial-gradient(circle,rgba(167,139,250,.25) 0%,transparent 70%);filter:blur(40px);pointer-events:none}
        .stats-hero-grid{position:relative;display:grid;grid-template-columns:1.4fr 1fr 1.2fr;gap:36px;align-items:start}@media(max-width:1100px){.stats-hero-grid{grid-template-columns:1fr 1fr}}@media(max-width:760px){.stats-hero-grid{grid-template-columns:1fr;gap:24px}}
        .stats-hero-eyebrow{font-size:11px;font-weight:800;letter-spacing:.22em;color:#A5B4FC;text-transform:uppercase}
        .stats-hero-title{margin:10px 0 6px;font-size:clamp(28px,4vw,44px);font-weight:900;line-height:1.02;letter-spacing:-.025em}
        .stats-hero-sub{margin:0;font-size:13px;color:#CBD5E1;font-weight:500;line-height:1.5}
        .stats-hero-mega{padding-left:24px;border-left:1px solid rgba(255,255,255,.1)}@media(max-width:1100px){.stats-hero-mega{padding-left:0;border-left:0}}
        .stats-hero-mega-num{display:flex;align-items:flex-start;font-size:78px;font-weight:900;line-height:.85;letter-spacing:-.045em;background:linear-gradient(135deg,#FFFFFF,#C7D2FE 75%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
        .stats-hero-mega-num span{font-size:30px;margin:6px 0 0 4px;color:#A5B4FC;-webkit-text-fill-color:#A5B4FC}
        .stats-hero-mega-label{font-size:11px;font-weight:800;letter-spacing:.22em;color:#A5B4FC;margin-top:10px;text-transform:uppercase}
        .stats-hero-mega-sub{font-size:13px;color:#E0E7FF;margin-top:6px;font-weight:600;letter-spacing:.02em}
        .stats-hero-form-label{font-size:11px;font-weight:800;letter-spacing:.22em;color:#A5B4FC;margin-bottom:14px;text-transform:uppercase}
        .stats-hero-form-ribbon{display:flex;flex-wrap:wrap;gap:6px}
        .form-bead{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;letter-spacing:.04em;transition:transform .2s}
        .form-bead:hover{transform:translateY(-2px)}
        .form-bead-v{background:linear-gradient(135deg,#10B981,#059669);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15),0 6px 14px rgba(16,185,129,.35)}
        .form-bead-e{background:linear-gradient(135deg,#F59E0B,#D97706);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15),0 6px 14px rgba(245,158,11,.35)}
        .form-bead-d{background:linear-gradient(135deg,#EF4444,#DC2626);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15),0 6px 14px rgba(239,68,68,.35)}
        .form-bead-empty{background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.14);color:rgba(255,255,255,.28);box-shadow:none}
        .stats-hero-microstats{position:relative;display:flex;gap:0;margin-top:30px;padding:18px 0;border-top:1px solid rgba(255,255,255,.08)}
        .stats-hero-microstats>div{flex:1;padding:0 22px;border-right:1px solid rgba(255,255,255,.06)}
        .stats-hero-microstats>div:first-child{padding-left:0}
        .stats-hero-microstats>div:last-child{border-right:0;padding-right:0}
        .stats-hero-microstats span{display:block;font-size:9px;font-weight:800;letter-spacing:.22em;color:#818CF8;text-transform:uppercase}
        .stats-hero-microstats strong{display:block;font-size:24px;font-weight:900;color:#fff;margin-top:6px;letter-spacing:-.015em}
        .stats-hero-microstats strong.pos{color:#34D399}
        .stats-hero-microstats strong.neg{color:#F87171}
        @media(max-width:760px){.stats-hero{padding:24px 24px 0}.stats-hero-microstats{flex-wrap:wrap;gap:0;padding:14px 0}.stats-hero-microstats>div{flex:0 0 50%;border-right:0;padding:10px 0}.stats-hero-mega-num{font-size:56px}}
        .load-panel{padding:0;overflow:hidden;border:1px solid var(--slate-200)}
        .load-panel-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;padding:22px 28px;border-bottom:1px solid var(--slate-100);flex-wrap:wrap;background:linear-gradient(180deg,#FAFBFD,#fff)}
        .load-panel-title{margin:6px 0 4px;font-size:22px;font-weight:900;letter-spacing:-.015em;color:var(--slate-900)}
        .load-panel-sub{margin:0;font-size:12px;color:var(--slate-500);font-weight:500;line-height:1.5}
        .load-panel-legend{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
        .load-panel-legend span{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:800;color:var(--slate-600);text-transform:uppercase;letter-spacing:.12em}
        .load-panel-legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
        .load-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:0}
        .load-card{padding:20px 24px;border-right:1px solid var(--slate-100);border-bottom:1px solid var(--slate-100);background:#fff;transition:background .2s ease;animation:loadCardIn .5s ease both;opacity:0}
        @keyframes loadCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .load-card:hover{background:#FAFBFD}
        .load-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
        .load-card-name{font-size:14px;font-weight:900;color:var(--slate-900);letter-spacing:-.005em;line-height:1.2}
        .load-card-cat{font-size:10px;font-weight:700;color:var(--slate-400);text-transform:uppercase;letter-spacing:.1em;margin-top:4px}
        .load-card-status{display:inline-flex;align-items:center;font-size:10px;font-weight:900;letter-spacing:.12em;padding:5px 11px;border-radius:99px;border:1px solid;white-space:nowrap;text-transform:uppercase}
        .load-meter{margin-top:10px}
        .load-meter-label{display:flex;justify-content:space-between;align-items:baseline;font-size:9px;font-weight:800;letter-spacing:.22em;color:var(--slate-500);text-transform:uppercase;margin-bottom:5px}
        .load-meter-label strong{font-size:14px;letter-spacing:-.01em;font-weight:900}
        .load-meter-bar{height:8px;background:#F1F5F9;border-radius:99px;overflow:hidden;position:relative}
        .load-meter-fill{height:100%;border-radius:99px;transition:width .9s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
        .load-meter-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:loadShimmer 2.6s infinite}
        @keyframes loadShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .results-card{padding:24px 28px}
        .results-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px;gap:16px}
        .results-head h3{margin:6px 0 0}
        .results-total{text-align:right;font-size:40px;font-weight:900;color:var(--slate-900);line-height:1;letter-spacing:-.025em}
        .results-total span{display:block;font-size:10px;font-weight:800;color:var(--slate-400);text-transform:uppercase;letter-spacing:.22em;margin-top:7px}
        .results-bar{display:flex;height:96px;border-radius:14px;overflow:hidden;gap:3px}
        .results-seg{position:relative;display:flex;flex-direction:column;justify-content:center;padding:14px 18px;color:#fff;min-width:80px;transition:flex-grow .5s ease}
        .results-v{background:linear-gradient(135deg,#10B981 0%,#059669 100%)}
        .results-e{background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%)}
        .results-d{background:linear-gradient(135deg,#EF4444 0%,#DC2626 100%)}
        .results-seg-num{font-size:34px;font-weight:900;line-height:1;letter-spacing:-.025em}
        .results-seg-label{font-size:10px;font-weight:800;letter-spacing:.2em;margin-top:7px;opacity:.92;text-transform:uppercase}
        .results-seg-pct{position:absolute;top:14px;right:18px;font-size:13px;font-weight:800;opacity:.9;letter-spacing:-.005em}
        .bars-legend{display:flex;gap:16px;margin:4px 0 14px}.bars-legend span{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--slate-500)}.bars-legend i{width:18px;height:8px;border-radius:99px;display:inline-block}
        .bars-chart{display:flex;flex-direction:column;gap:14px}.bars-row{display:grid;grid-template-columns:120px 1fr 1fr;gap:10px;align-items:center}.bars-label{font-size:12px;font-weight:700;color:var(--slate-700);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bars-track{height:22px;border-radius:6px;background:var(--slate-100);overflow:hidden;position:relative}.bars-seg{height:100%;display:flex;align-items:center;justify-content:flex-end;padding:0 8px;color:#fff;font-size:11px;font-weight:800;border-radius:6px;transition:width .4s ease}.bars-seg span{display:block}@media(max-width:700px){.bars-row{grid-template-columns:90px 1fr 1fr}}
        .rank-pip{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 6px;border-radius:6px;font-size:11px;font-weight:800}.rank-pip-v{background:#ECFDF5;color:#047857;border:1px solid #A7F3D0}.rank-pip-e{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A}.rank-pip-d{background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}
        .rank-progress{height:6px;background:var(--slate-100);border-radius:99px;overflow:hidden}.rank-progress span{display:block;height:100%;background:linear-gradient(90deg,#4F46E5,#8B5CF6);border-radius:99px;transition:width .4s ease}
        .rank-list{display:flex;flex-direction:column;gap:14px}.rank-list-row{display:flex;gap:12px;align-items:flex-start}.rank-list-pos{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--indigo-50),var(--purple-50));color:var(--indigo);font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:-.01em}.rank-list-body{flex:1;min-width:0}.rank-list-head{display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:var(--slate-800)}.rank-list-head strong{font-size:14px;color:var(--indigo);font-weight:900;letter-spacing:-.01em}.rank-list-bar{height:6px;background:var(--slate-100);border-radius:99px;margin:7px 0 4px;overflow:hidden}.rank-list-bar span{display:block;height:100%;background:linear-gradient(90deg,#4F46E5,#8B5CF6);border-radius:99px;transition:width .4s ease}.rank-list-sub{font-size:10px;color:var(--slate-400);font-weight:600;letter-spacing:.02em}
        .cat-list{display:flex;flex-direction:column;gap:14px}.cat-row-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:var(--slate-700);margin-bottom:6px}.cat-row-head strong{color:var(--slate-900);font-size:14px;font-weight:900;letter-spacing:-.01em}.cat-row-head>span{display:flex;align-items:center;gap:8px}.cat-dot{width:9px;height:9px;border-radius:3px}.cat-row-bar{height:8px;border-radius:99px;background:var(--slate-100);overflow:hidden}.cat-row-bar span{display:block;height:100%;border-radius:99px;transition:width .4s ease}
        .club-admin-scope{display:block;min-height:auto;background:transparent}.club-admin-scope>.sidebar,.club-admin-scope .topbar{display:none}.club-admin-scope .main{margin-left:0;min-height:auto}.club-admin-scope .content{padding:24px}
        @media (max-width:900px){.club-admin-scope{display:block}.club-admin-scope .sidebar{position:static;width:100%;height:auto}.club-admin-scope .main{margin-left:0}.stat-grid,.settings-grid{grid-template-columns:1fr}.topbar{height:auto;gap:12px;align-items:flex-start;padding:14px;flex-direction:column}.cal-wrap{flex-direction:column}.cal-sidebar{width:auto}.content{padding:16px}.club-hero{align-items:flex-start;gap:16px;flex-direction:column}.club-hero-stat{text-align:left}.club-hero-stat-label{justify-content:flex-start}}
      `}</style>
    </div>
  )
}
