'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Search,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'
import { mapStatisticsToCharts } from '@/frontend/routes/estadisticas/charts/chart-mappers'
import { StatisticsCharts } from '@/frontend/routes/estadisticas/charts/StatisticsCharts'
import type { FatigueTrendDatum } from '@/frontend/routes/estadisticas/charts/types'

type Equipo = {
  id: string
  nombre: string | null
  categoria: string | null
  categoria_anio: string | null
  temporada: string | null
  ubicacion: string | null
  campo_juego: string | null
  ciudad: string | null
  provincia: string | null
  pais: string | null
  jugadoresCount: number
}

type Jugador = {
  id: string
  equipoId: string | null
  usuarioId: string | null
  dorsal: string | number | null
  equipoNombre: string
  categoria: string | null
  categoriaAnio: string | null
  temporada: string | null
  nombre: string
  edad: number | null
  posicion: string | null
  fotoUrl: string | null
  alturaCm: number | null
  pesoKg: number | null
  telefono: string | null
}

type RelatedEquipo = {
  id: string
  nombre: string | null
  club_id: string | null
  categoria: string | null
  categoria_anio: string | null
}

type Entrenamiento = {
  id: string
  equipo_id: string | null
  fecha: string | null
  hora_inicio: string | null
  hora_fin: string | null
  titulo: string | null
  tipo: string | null
  intensidad: string | number | null
  lugar: string | null
  estado: string | null
  equipos?: RelatedEquipo | RelatedEquipo[] | null
}

type Partido = {
  id: string
  equipo_id: string | null
  fecha_hora: string | null
  competicion: string | null
  casa_fuera: string | null
  rival_nombre: string | null
  lugar: string | null
  estado: string | null
  goles_favor: number | null
  goles_contra: number | null
  equipos?: RelatedEquipo | RelatedEquipo[] | null
}

type BienestarItem = Record<string, string | number | boolean | null>

type DashboardPayload = {
  ok: boolean
  error?: string
  membership?: {
    role: string
    clubId: string
    clubName: string
  }
  summary?: {
    totalEquipos: number
    totalJugadores: number
    temporadaActual: string | null
  }
  equipos?: Equipo[]
  jugadores?: Jugador[]
  entrenamientos?: Entrenamiento[]
  partidos?: Partido[]
  bienestar?: {
    home: BienestarItem[]
    checkins: BienestarItem[]
    actividad: BienestarItem[]
  }
  warnings?: string[]
}

const EMPTY_EQUIPOS: Equipo[] = []
const EMPTY_JUGADORES: Jugador[] = []
const EMPTY_ENTRENAMIENTOS: Entrenamiento[] = []
const EMPTY_PARTIDOS: Partido[] = []
const EMPTY_BIENESTAR = { home: [], checkins: [], actividad: [] } satisfies DashboardPayload['bienestar']

function categoriaLabel(value: string | null) {
  const labels: Record<string, string> = {
    PREBENJAMIN: 'Prebenjamin',
    BENJAMIN: 'Benjamin',
    ALEVIN: 'Alevin',
    INFANTIL: 'Infantil',
    CADETE: 'Cadete',
    JUVENIL: 'Juvenil',
    AMATEUR: 'Amateur',
  }
  return value ? labels[value] ?? value : '-'
}

function anioLabel(value: string | null) {
  if (value === '1R') return '1r año'
  if (value === '2N') return '2º año'
  if (value === '3R') return '3r año'
  return '-'
}

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function relatedEquipo(value: RelatedEquipo | RelatedEquipo[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function matchesDate(value: string | null, dateFilter: string) {
  if (!dateFilter) return true
  return Boolean(value?.startsWith(dateFilter))
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Sesion'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function average(values: number[]) {
  if (values.length === 0) return null
  const total = values.reduce((acc, value) => acc + value, 0)
  return Number((total / values.length).toFixed(1))
}

function itemString(row: BienestarItem, key: string) {
  const value = row[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function itemBoolean(row: BienestarItem, key: string) {
  const value = row[key]
  return typeof value === 'boolean' ? value : null
}

function buildClubFatigueTrend(
  rows: BienestarItem[],
  players: Array<{ usuarioId: string }>
): FatigueTrendDatum[] {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 41)

  const buckets = Array.from({ length: 6 }, (_, index) => {
    const from = new Date(start)
    from.setDate(start.getDate() + index * 7)
    const to = new Date(from)
    to.setDate(from.getDate() + 6)

    return {
      id: `club-week-${index + 1}`,
      label: formatShortDate(formatDateKey(from)),
      from: formatDateKey(from),
      to: formatDateKey(to),
      teamValues: [] as number[],
      playerValues: new Map<string, number[]>(),
    }
  })

  for (const player of players) {
    for (const bucket of buckets) {
      bucket.playerValues.set(player.usuarioId, [])
    }
  }

  const playerIds = new Set(players.map((player) => player.usuarioId))

  for (const row of rows) {
    const playerId = itemString(row, 'jugador_id') ?? itemString(row, 'usuario_id')
    const dateValue = itemString(row, 'fecha')
    const fatigue = toNumber(row.fatiga)

    if (!playerId || !playerIds.has(playerId) || !dateValue || fatigue <= 0) continue

    const date = new Date(`${dateValue}T00:00:00`)
    if (Number.isNaN(date.getTime()) || date < start || date > now) continue

    const daysFromStart = Math.floor((date.getTime() - start.getTime()) / 86400000)
    const bucketIndex = Math.min(5, Math.max(0, Math.floor(daysFromStart / 7)))
    const bucket = buckets[bucketIndex]
    if (!bucket) continue

    bucket.teamValues.push(fatigue)
    bucket.playerValues.get(playerId)?.push(fatigue)
  }

  return buckets.map((bucket) => {
    const playerValues: Record<string, number | null> = {}
    for (const player of players) {
      playerValues[player.usuarioId] = average(bucket.playerValues.get(player.usuarioId) ?? [])
    }

    return {
      id: bucket.id,
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      teamAverage: average(bucket.teamValues),
      playerValues,
    }
  })
}

function buildClubChartData({
  jugadores,
  partidos,
  bienestar,
}: {
  jugadores: Jugador[]
  partidos: Partido[]
  bienestar: DashboardPayload['bienestar']
}) {
  const playersBase = jugadores
    .map((jugador) => {
      if (!jugador.usuarioId) return null
      return {
        usuarioId: jugador.usuarioId,
        nombre: jugador.nombre,
        fotoUrl: jugador.fotoUrl,
        posicion: jugador.posicion,
      }
    })
    .filter((player): player is NonNullable<typeof player> => player !== null)

  const playerIds = new Set(playersBase.map((player) => player.usuarioId))
  const attendanceByPlayer = new Map<string, number>()
  const attendanceByDate = new Map<string, number>()
  const attendanceDates = new Set<string>()

  for (const row of bienestar?.home ?? []) {
    const playerId = itemString(row, 'usuario_id')
    const date = itemString(row, 'fecha')
    const attendsTraining = itemBoolean(row, 'asiste_entrenamiento')

    if (!playerId || !playerIds.has(playerId) || !date) continue

    attendanceDates.add(date)
    if (attendsTraining === true) {
      attendanceByPlayer.set(playerId, (attendanceByPlayer.get(playerId) ?? 0) + 1)
      attendanceByDate.set(date, (attendanceByDate.get(date) ?? 0) + 1)
    }
  }

  const totalAttendanceSessions = attendanceDates.size
  const players = playersBase.map((player) => {
    const trainingAttendances = attendanceByPlayer.get(player.usuarioId) ?? 0
    return {
      ...player,
      goles: 0,
      asistencias: 0,
      contribucion: 0,
      minutos: 0,
      asistenciasEntreno: trainingAttendances,
      asistenciaPct:
        totalAttendanceSessions > 0
          ? (trainingAttendances / totalAttendanceSessions) * 100
          : null,
    }
  })

  const attendanceTrend = [...attendanceDates]
    .sort((left, right) => left.localeCompare(right))
    .slice(-12)
    .map((date) => {
      const attended = attendanceByDate.get(date) ?? 0
      return {
        id: `club-attendance-${date}`,
        label: formatShortDate(date),
        date,
        attended,
        totalPlayers: playerIds.size,
        percentage: playerIds.size > 0 ? (attended / playerIds.size) * 100 : null,
      }
    })

  return mapStatisticsToCharts({
    matches: partidos,
    players,
    fatigueTrend: buildClubFatigueTrend([...(bienestar?.checkins ?? []), ...(bienestar?.home ?? [])], playersBase),
    attendanceTrend,
  })
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#c9d6ea] bg-white/70 px-5 py-8 text-center text-sm font-semibold text-[#657086]">
      {text}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-[22px] border border-[#dbe5f4] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#005db6]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a8699]">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#121826]">{value}</p>
        </div>
      </div>
    </div>
  )
}

function ClubDashboardContent() {
  const searchParams = useSearchParams()
  const requestedClubId = searchParams.get('club')
  const [payload, setPayload] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEquipoId, setSelectedEquipoId] = useState('')
  const [jugadorNombre, setJugadorNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [categoriaAnio, setCategoriaAnio] = useState('')
  const [trainingDate, setTrainingDate] = useState('')
  const [matchDate, setMatchDate] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        setLoading(true)
        const url = requestedClubId
          ? `/api/club/dashboard?club=${encodeURIComponent(requestedClubId)}`
          : '/api/club/dashboard'
        const response = await fetch(url, { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as DashboardPayload | null

        if (cancelled) return

        if (!response.ok || !data?.ok) {
          setError(data?.error || 'No se pudo cargar el panel de club.')
          setPayload(null)
          return
        }

        setPayload(data)
        setError('')
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el panel de club.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [requestedClubId])

  const equipos = payload?.equipos ?? EMPTY_EQUIPOS
  const jugadores = payload?.jugadores ?? EMPTY_JUGADORES
  const entrenamientos = payload?.entrenamientos ?? EMPTY_ENTRENAMIENTOS
  const partidos = payload?.partidos ?? EMPTY_PARTIDOS
  const bienestar = payload?.bienestar ?? EMPTY_BIENESTAR

  const categorias = useMemo(
    () => [...new Set(equipos.map((equipo) => equipo.categoria).filter(Boolean))] as string[],
    [equipos]
  )
  const anios = useMemo(
    () => [...new Set(equipos.map((equipo) => equipo.categoria_anio).filter(Boolean))] as string[],
    [equipos]
  )

  const jugadoresFiltrados = useMemo(() => {
    const search = jugadorNombre.trim().toLowerCase()
    return jugadores.filter((jugador) => {
      const byEquipo = !selectedEquipoId || jugador.equipoId === selectedEquipoId
      const byCategoria = !categoria || jugador.categoria === categoria
      const byAnio = !categoriaAnio || jugador.categoriaAnio === categoriaAnio
      const byName = !search || jugador.nombre.toLowerCase().includes(search)
      return byEquipo && byCategoria && byAnio && byName
    })
  }, [categoria, categoriaAnio, jugadorNombre, jugadores, selectedEquipoId])

  const entrenamientosFiltrados = useMemo(
    () =>
      entrenamientos.filter((entrenamiento) => {
        const equipo = relatedEquipo(entrenamiento.equipos)
        return (
          (!selectedEquipoId || equipo?.id === selectedEquipoId || entrenamiento.equipo_id === selectedEquipoId) &&
          matchesDate(entrenamiento.fecha, trainingDate)
        )
      }),
    [entrenamientos, selectedEquipoId, trainingDate]
  )

  const partidosFiltrados = useMemo(
    () =>
      partidos.filter((partido) => {
        const equipo = relatedEquipo(partido.equipos)
        return (
          (!selectedEquipoId || equipo?.id === selectedEquipoId || partido.equipo_id === selectedEquipoId) &&
          (!categoria || equipo?.categoria === categoria) &&
          matchesDate(partido.fecha_hora, matchDate)
        )
      }),
    [categoria, matchDate, partidos, selectedEquipoId]
  )

  const chartJugadores = useMemo(
    () =>
      jugadores.filter((jugador) => {
        const byEquipo = !selectedEquipoId || jugador.equipoId === selectedEquipoId
        const byCategoria = !categoria || jugador.categoria === categoria
        const byAnio = !categoriaAnio || jugador.categoriaAnio === categoriaAnio
        return byEquipo && byCategoria && byAnio
      }),
    [categoria, categoriaAnio, jugadores, selectedEquipoId]
  )

  const chartPartidos = useMemo(
    () =>
      partidos.filter((partido) => {
        const equipo = relatedEquipo(partido.equipos)
        return (
          (!selectedEquipoId || equipo?.id === selectedEquipoId || partido.equipo_id === selectedEquipoId) &&
          (!categoria || equipo?.categoria === categoria)
        )
      }),
    [categoria, partidos, selectedEquipoId]
  )

  const chartBienestar = useMemo(() => {
    const playerIds = new Set(chartJugadores.map((jugador) => jugador.usuarioId).filter(Boolean))
    const equipoIds = new Set(chartJugadores.map((jugador) => jugador.equipoId).filter(Boolean))

    const filterRows = (rows: BienestarItem[]) =>
      rows.filter((row) => {
        const playerId = itemString(row, 'jugador_id') ?? itemString(row, 'usuario_id')
        const equipoId = itemString(row, 'equipo_id')

        if (playerId && playerIds.has(playerId)) return true
        if (equipoId && equipoIds.has(equipoId)) return true
        return false
      })

    return {
      home: filterRows(bienestar.home),
      checkins: filterRows(bienestar.checkins),
      actividad: filterRows(bienestar.actividad),
    }
  }, [bienestar.actividad, bienestar.checkins, bienestar.home, chartJugadores])

  const clubCharts = useMemo(
    () =>
      buildClubChartData({
        jugadores: chartJugadores,
        partidos: chartPartidos,
        bienestar: chartBienestar,
      }),
    [chartBienestar, chartJugadores, chartPartidos]
  )

  const selectedEquipo = equipos.find((equipo) => equipo.id === selectedEquipoId) ?? null
  const hasBienestar = bienestar.home.length > 0 || bienestar.checkins.length > 0 || bienestar.actividad.length > 0

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f3f6fb] px-6 py-10">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-[#dbe5f4] bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-[#005db6]">Cargando panel de club...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f3f6fb] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#f2c6c6] bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b42318]">Panel de club</p>
          <h1 className="mt-2 text-3xl font-black text-[#121826]">No hay club asignado</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-[#657086]">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-6 text-[#121826] sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[30px] border border-[#dbe5f4] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#005db6]">
                <ShieldCheck className="h-4 w-4" />
                Panel de club
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#121826] sm:text-4xl">
                {payload?.membership?.clubName ?? 'Club'}
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#657086]">
                Rol: {payload?.membership?.role ?? '-'}
                {selectedEquipo ? ` · Vista filtrada: ${selectedEquipo.nombre}` : ' · Vista global del club'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEquipoId('')}
              className="h-11 rounded-2xl border border-[#cbd7ea] px-4 text-sm font-bold text-[#005db6] transition hover:bg-[#eaf2ff]"
            >
              Ver todos
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Users} label="Equipos" value={payload?.summary?.totalEquipos ?? equipos.length} />
          <StatCard icon={Activity} label="Jugadores" value={payload?.summary?.totalJugadores ?? jugadores.length} />
          <StatCard icon={CalendarDays} label="Temporada" value={payload?.summary?.temporadaActual ?? '-'} />
        </section>

        <section className="rounded-[28px] border border-[#dbe5f4] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#121826]">Estadisticas del club</h2>
              <p className="text-sm font-medium text-[#657086]">
                Graficas agregadas para el entrenador con los filtros actuales del panel.
              </p>
            </div>
            <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#005db6]">
              {chartJugadores.length} jugadores
            </span>
          </div>
          <StatisticsCharts data={clubCharts} />
        </section>

        <section className="rounded-[28px] border border-[#dbe5f4] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#121826]">Equipos del club</h2>
              <p className="text-sm font-medium text-[#657086]">Todos los equipos vinculados por club_id.</p>
            </div>
          </div>
          {equipos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-[#7a8699]">
                  <tr>
                    <th className="py-3 pr-4">Equipo</th>
                    <th className="py-3 pr-4">Categoria</th>
                    <th className="py-3 pr-4">Año</th>
                    <th className="py-3 pr-4">Temporada</th>
                    <th className="py-3 pr-4">Ciudad</th>
                    <th className="py-3 pr-4">Campo</th>
                    <th className="py-3 pr-4">Jugadores</th>
                    <th className="py-3 pr-4">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f8]">
                  {equipos.map((equipo) => (
                    <tr key={equipo.id}>
                      <td className="py-4 pr-4 font-bold">{equipo.nombre ?? 'Equipo'}</td>
                      <td className="py-4 pr-4">{categoriaLabel(equipo.categoria)}</td>
                      <td className="py-4 pr-4">{anioLabel(equipo.categoria_anio)}</td>
                      <td className="py-4 pr-4">{equipo.temporada ?? '-'}</td>
                      <td className="py-4 pr-4">{equipo.ciudad ?? equipo.ubicacion ?? '-'}</td>
                      <td className="py-4 pr-4">{equipo.campo_juego ?? '-'}</td>
                      <td className="py-4 pr-4">{equipo.jugadoresCount}</td>
                      <td className="py-4 pr-4">
                        <button
                          type="button"
                          onClick={() => setSelectedEquipoId(equipo.id)}
                          className="rounded-xl bg-[#0d1b39] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#005db6]"
                        >
                          Ver equipo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="Este club todavia no tiene equipos vinculados." />
          )}
        </section>

        <section className="rounded-[28px] border border-[#dbe5f4] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#121826]">Jugadores del club</h2>
              <p className="text-sm font-medium text-[#657086]">Jugadores activos de todos los equipos.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8699]" />
                <input
                  value={jugadorNombre}
                  onChange={(event) => setJugadorNombre(event.target.value)}
                  placeholder="Buscar jugador"
                  className="h-11 w-full rounded-2xl border border-[#cbd7ea] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#005db6]"
                />
              </label>
              <select
                value={selectedEquipoId}
                onChange={(event) => setSelectedEquipoId(event.target.value)}
                className="h-11 rounded-2xl border border-[#cbd7ea] bg-white px-3 text-sm outline-none focus:border-[#005db6]"
              >
                <option value="">Todos los equipos</option>
                {equipos.map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </option>
                ))}
              </select>
              <select
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                className="h-11 rounded-2xl border border-[#cbd7ea] bg-white px-3 text-sm outline-none focus:border-[#005db6]"
              >
                <option value="">Todas las categorias</option>
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {categoriaLabel(item)}
                  </option>
                ))}
              </select>
              <select
                value={categoriaAnio}
                onChange={(event) => setCategoriaAnio(event.target.value)}
                className="h-11 rounded-2xl border border-[#cbd7ea] bg-white px-3 text-sm outline-none focus:border-[#005db6]"
              >
                <option value="">Todos los años</option>
                {anios.map((item) => (
                  <option key={item} value={item}>
                    {anioLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {jugadoresFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-[#7a8699]">
                  <tr>
                    <th className="py-3 pr-4">Nombre</th>
                    <th className="py-3 pr-4">Equipo</th>
                    <th className="py-3 pr-4">Categoria</th>
                    <th className="py-3 pr-4">Dorsal</th>
                    <th className="py-3 pr-4">Posicion</th>
                    <th className="py-3 pr-4">Edad</th>
                    <th className="py-3 pr-4">Altura</th>
                    <th className="py-3 pr-4">Peso</th>
                    <th className="py-3 pr-4">Telefono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f8]">
                  {jugadoresFiltrados.map((jugador) => (
                    <tr key={jugador.id}>
                      <td className="py-4 pr-4 font-bold">{jugador.nombre}</td>
                      <td className="py-4 pr-4">{jugador.equipoNombre}</td>
                      <td className="py-4 pr-4">
                        {categoriaLabel(jugador.categoria)} {anioLabel(jugador.categoriaAnio)}
                      </td>
                      <td className="py-4 pr-4">{jugador.dorsal ?? '-'}</td>
                      <td className="py-4 pr-4">{jugador.posicion ?? '-'}</td>
                      <td className="py-4 pr-4">{jugador.edad ?? '-'}</td>
                      <td className="py-4 pr-4">{jugador.alturaCm ? `${jugador.alturaCm} cm` : '-'}</td>
                      <td className="py-4 pr-4">{jugador.pesoKg ? `${jugador.pesoKg} kg` : '-'}</td>
                      <td className="py-4 pr-4">{jugador.telefono ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No hay jugadores que coincidan con los filtros." />
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-[28px] border border-[#dbe5f4] bg-white p-5 shadow-sm xl:col-span-1">
            <h2 className="flex items-center gap-2 text-xl font-black text-[#121826]">
              <Activity className="h-5 w-5 text-[#005db6]" />
              Bienestar / datos fisicos
            </h2>
            {hasBienestar ? (
              <div className="mt-4 space-y-3 text-sm">
                <p className="font-semibold text-[#657086]">Bienestar home: {bienestar.home.length}</p>
                <p className="font-semibold text-[#657086]">Check-ins diarios: {bienestar.checkins.length}</p>
                <p className="font-semibold text-[#657086]">Registros de actividad: {bienestar.actividad.length}</p>
                <div className="rounded-2xl bg-[#f6f8fc] p-4 text-xs font-semibold text-[#657086]">
                  Ultimos registros cargados para el club. Las tablas completas quedan disponibles para ampliar el detalle.
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState text="Todavia no hay datos de bienestar o actividad para este club." />
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[#dbe5f4] bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-[#121826]">
                  <Dumbbell className="h-5 w-5 text-[#005db6]" />
                  Entrenamientos
                </h2>
                <p className="text-sm font-medium text-[#657086]">Sesiones de todos los equipos del club.</p>
              </div>
              <input
                type="date"
                value={trainingDate}
                onChange={(event) => setTrainingDate(event.target.value)}
                className="h-11 rounded-2xl border border-[#cbd7ea] bg-white px-3 text-sm outline-none focus:border-[#005db6]"
              />
            </div>
            {entrenamientosFiltrados.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.14em] text-[#7a8699]">
                    <tr>
                      <th className="py-3 pr-4">Fecha</th>
                      <th className="py-3 pr-4">Equipo</th>
                      <th className="py-3 pr-4">Titulo</th>
                      <th className="py-3 pr-4">Tipo</th>
                      <th className="py-3 pr-4">Lugar</th>
                      <th className="py-3 pr-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f8]">
                    {entrenamientosFiltrados.map((entrenamiento) => {
                      const equipo = relatedEquipo(entrenamiento.equipos)
                      return (
                        <tr key={entrenamiento.id}>
                          <td className="py-4 pr-4">{formatDate(entrenamiento.fecha)}</td>
                          <td className="py-4 pr-4">{equipo?.nombre ?? '-'}</td>
                          <td className="py-4 pr-4 font-bold">{entrenamiento.titulo ?? 'Entrenamiento'}</td>
                          <td className="py-4 pr-4">{entrenamiento.tipo ?? '-'}</td>
                          <td className="py-4 pr-4">{entrenamiento.lugar ?? '-'}</td>
                          <td className="py-4 pr-4">{entrenamiento.estado ?? '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="No hay entrenamientos con los filtros actuales." />
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#dbe5f4] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-[#121826]">
                <Trophy className="h-5 w-5 text-[#005db6]" />
                Partidos
              </h2>
              <p className="text-sm font-medium text-[#657086]">Calendario y resultados del club.</p>
            </div>
            <input
              type="date"
              value={matchDate}
              onChange={(event) => setMatchDate(event.target.value)}
              className="h-11 rounded-2xl border border-[#cbd7ea] bg-white px-3 text-sm outline-none focus:border-[#005db6]"
            />
          </div>
          {partidosFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-[#7a8699]">
                  <tr>
                    <th className="py-3 pr-4">Fecha</th>
                    <th className="py-3 pr-4">Equipo</th>
                    <th className="py-3 pr-4">Categoria</th>
                    <th className="py-3 pr-4">Competicion</th>
                    <th className="py-3 pr-4">Rival</th>
                    <th className="py-3 pr-4">Lugar</th>
                    <th className="py-3 pr-4">Resultado</th>
                    <th className="py-3 pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f8]">
                  {partidosFiltrados.map((partido) => {
                    const equipo = relatedEquipo(partido.equipos)
                    return (
                      <tr key={partido.id}>
                        <td className="py-4 pr-4">{formatDate(partido.fecha_hora)}</td>
                        <td className="py-4 pr-4">{equipo?.nombre ?? '-'}</td>
                        <td className="py-4 pr-4">
                          {categoriaLabel(equipo?.categoria ?? null)} {anioLabel(equipo?.categoria_anio ?? null)}
                        </td>
                        <td className="py-4 pr-4">{partido.competicion ?? '-'}</td>
                        <td className="py-4 pr-4 font-bold">{partido.rival_nombre ?? '-'}</td>
                        <td className="py-4 pr-4">{partido.lugar ?? '-'}</td>
                        <td className="py-4 pr-4">
                          {partido.goles_favor ?? '-'} - {partido.goles_contra ?? '-'}
                        </td>
                        <td className="py-4 pr-4">{partido.estado ?? '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No hay partidos con los filtros actuales." />
          )}
        </section>
      </div>
    </main>
  )
}

export default function ClubDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f6fb] px-6 py-10">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-[#dbe5f4] bg-white p-8 shadow-sm">
            <p className="text-sm font-bold text-[#005db6]">Cargando panel de club...</p>
          </div>
        </main>
      }
    >
      <ClubDashboardContent />
    </Suspense>
  )
}
