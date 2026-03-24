import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/app/components/dashboard-sidebar'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const EVENT_GOAL = 'GOL'
const EVENT_ASSIST = 'ASISTENCIA'
// Si tu enum usa otros valores (ej. 'GOL_FAVOR' o 'ASIST'), cambialos aqui.

const APPLE_CARD_STYLE = {
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
}

type SearchParamsInput = Record<string, string | string[] | undefined>

type EquipoRow = {
  id: string
  nombre: string
  categoria: string | null
  temporada: string | null
  club: string | null
  logo_url: string | null
}

type PerfilRow = {
  nombre: string | null
  foto_url: string | null
  posicion: string | null
}

type MiembroJugadorRow = {
  usuario_id: string | null
  dorsal: string | number | null
  perfiles: unknown
}

type PartidoRow = {
  id: string
  goles_favor: number | null
  goles_contra: number | null
}

type EventoRow = {
  tipo: string | null
  jugador_id: string | null
  jugador_relacionado_id: string | null
}

type JugadorEstadistica = {
  usuarioId: string
  nombre: string
  fotoUrl: string | null
  posicion: string | null
  dorsal: string
  goles: number
  asistencias: number
  contribucion: number
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function buildEquipoHref(path: string, equipoId: string | null) {
  if (!equipoId) return path
  return `${path}?equipo=${encodeURIComponent(equipoId)}`
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatDorsal(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function normalizeProfile(raw: unknown): PerfilRow | null {
  const profile = Array.isArray(raw) ? raw[0] : raw
  if (!profile || typeof profile !== 'object') return null

  const row = profile as Record<string, unknown>
  return {
    nombre: typeof row.nombre === 'string' ? row.nombre : null,
    foto_url: typeof row.foto_url === 'string' ? row.foto_url : null,
    posicion: typeof row.posicion === 'string' ? row.posicion : null,
  }
}

function topRows(
  rows: JugadorEstadistica[],
  selector: (row: JugadorEstadistica) => number
) {
  return [...rows]
    .sort((a, b) => {
      const diff = selector(b) - selector(a)
      if (diff !== 0) return diff
      return a.nombre.localeCompare(b.nombre, 'es')
    })
    .slice(0, 5)
}

async function loadStatsData(equipoId: string, userId: string) {
  const supabase = await createSupabaseServer()

  const { data: membership, error: membershipError } = await supabase
    .from('miembros_equipo')
    .select('equipo_id')
    .eq('equipo_id', equipoId)
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  if (membershipError) {
    return { error: 'No se pudo validar el equipo activo.' } as const
  }

  if (!membership) {
    return { error: 'No perteneces al equipo solicitado.' } as const
  }

  const [equipoResult, jugadoresResult, partidosResult] = await Promise.all([
    supabase
      .from('equipos')
      .select('id, nombre, categoria, temporada, club, logo_url')
      .eq('id', equipoId)
      .maybeSingle(),
    supabase
      .from('miembros_equipo')
      .select('usuario_id, dorsal, perfiles(nombre, foto_url, posicion)')
      .eq('equipo_id', equipoId)
      .eq('rol', 'JUGADOR')
      .eq('estado', 'ACTIVO'),
    supabase
      .from('partidos')
      .select('id, goles_favor, goles_contra')
      .eq('equipo_id', equipoId),
  ])

  if (equipoResult.error) {
    return { error: 'No se pudo cargar el equipo.' } as const
  }

  if (!equipoResult.data) {
    return { error: 'No encontramos ese equipo.' } as const
  }

  if (jugadoresResult.error) {
    return { error: 'No se pudieron cargar los jugadores.' } as const
  }

  if (partidosResult.error) {
    return { error: 'No se pudieron cargar los partidos del equipo.' } as const
  }

  const equipo = equipoResult.data as EquipoRow
  const partidos = (partidosResult.data ?? []) as PartidoRow[]
  const jugadoresRaw = (jugadoresResult.data ?? []) as MiembroJugadorRow[]

  const jugadoresBase = jugadoresRaw
    .map((row) => {
      const usuarioId = row.usuario_id
      if (!usuarioId) return null

      const profile = normalizeProfile(row.perfiles)

      return {
        usuarioId,
        nombre: profile?.nombre ?? 'Jugador sin nombre',
        fotoUrl: profile?.foto_url ?? null,
        posicion: profile?.posicion ?? null,
        dorsal: formatDorsal(row.dorsal),
      }
    })
    .filter((row): row is Omit<JugadorEstadistica, 'goles' | 'asistencias' | 'contribucion'> => row !== null)

  const matchIds = partidos.map((partido) => partido.id)

  let eventos: EventoRow[] = []
  let eventosWarning: string | null = null

  if (matchIds.length > 0) {
    const { data: eventosData, error: eventosError } = await supabase
      .from('eventos_partido')
      .select('tipo, jugador_id, jugador_relacionado_id')
      .in('partido_id', matchIds)

    if (eventosError) {
      eventosWarning = 'No se pudieron leer todos los eventos del equipo.'
    } else {
      eventos = (eventosData ?? []) as EventoRow[]
    }
  }

  const statsByPlayer = new Map<string, { goles: number; asistencias: number }>()

  for (const player of jugadoresBase) {
    statsByPlayer.set(player.usuarioId, { goles: 0, asistencias: 0 })
  }

  for (const event of eventos) {
    const eventType = event.tipo ?? ''

    if (eventType === EVENT_GOAL && event.jugador_id && statsByPlayer.has(event.jugador_id)) {
      const current = statsByPlayer.get(event.jugador_id)
      if (current) current.goles += 1
    }

    if (eventType === EVENT_ASSIST) {
      // Se prioriza jugador_relacionado_id; si tu modelo guarda la asistencia en jugador_id, se toma como fallback.
      const assistPlayerId = event.jugador_relacionado_id ?? event.jugador_id
      if (assistPlayerId && statsByPlayer.has(assistPlayerId)) {
        const current = statsByPlayer.get(assistPlayerId)
        if (current) current.asistencias += 1
      }
    }
  }

  const jugadores = jugadoresBase
    .map((player) => {
      const stat = statsByPlayer.get(player.usuarioId) ?? { goles: 0, asistencias: 0 }
      return {
        ...player,
        goles: stat.goles,
        asistencias: stat.asistencias,
        contribucion: stat.goles + stat.asistencias,
      }
    })
    .sort((a, b) => {
      if (b.contribucion !== a.contribucion) return b.contribucion - a.contribucion
      if (b.goles !== a.goles) return b.goles - a.goles
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  const totalPartidos = partidos.length
  const golesFavor = partidos.reduce((acc, row) => acc + toNumber(row.goles_favor), 0)
  const golesContra = partidos.reduce((acc, row) => acc + toNumber(row.goles_contra), 0)
  const mediaGoles = totalPartidos > 0 ? (golesFavor / totalPartidos).toFixed(2) : '0.00'

  return {
    equipo,
    jugadores,
    totalPartidos,
    golesFavor,
    golesContra,
    mediaGoles,
    topGoleadores: topRows(jugadores, (row) => row.goles),
    topAsistentes: topRows(jugadores, (row) => row.asistencias),
    topContribucion: topRows(jugadores, (row) => row.contribucion),
    noEvents: eventos.length === 0,
    eventosWarning,
  } as const
}

function RankingCard({
  title,
  rows,
  metricLabel,
  metricSelector,
}: {
  title: string
  rows: JugadorEstadistica[]
  metricLabel: string
  metricSelector: (row: JugadorEstadistica) => number
}) {
  return (
    <section className="dashboard-card rounded-3xl p-5" style={APPLE_CARD_STYLE}>
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Sin datos disponibles</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={`${title}-${row.usuarioId}`}
              className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2"
            >
              <span className="truncate pr-3 text-sm font-medium text-gray-700">{row.nombre}</span>
              <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white">
                {metricLabel} {metricSelector(row)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: SearchParamsInput | Promise<SearchParamsInput>
}) {
  const resolvedSearchParams = await searchParams
  const equipoId = getQueryValue(resolvedSearchParams.equipo)
  const supabase = await createSupabaseServer()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  if (!equipoId) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-6">
        <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[84px_1fr]">
          <DashboardSidebar />
          <section className="dashboard-card rounded-3xl p-6 md:p-8" style={APPLE_CARD_STYLE}>
            <h1 className="text-2xl font-bold text-gray-900">Selecciona un equipo</h1>
            <p className="mt-2 text-sm text-gray-500">
              Necesitamos un `equipo` en la URL para mostrar estadísticas.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/equipos"
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Ir a equipos
              </Link>
              <Link
                href="/home"
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Volver al home
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  const stats = await loadStatsData(equipoId, session.user.id)

  if ('error' in stats) {
    return (
      <div className="dashboard-bg min-h-screen p-4 md:p-6">
        <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[84px_1fr]">
          <DashboardSidebar equipoId={equipoId} />
          <section className="dashboard-card rounded-3xl p-6 md:p-8" style={APPLE_CARD_STYLE}>
            <h1 className="text-2xl font-bold text-gray-900">No se pudo cargar estadísticas</h1>
            <p className="mt-2 text-sm text-red-600">{stats.error}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={buildEquipoHref('/home', equipoId)}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Volver al dashboard
              </Link>
              <Link
                href="/equipos"
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cambiar equipo
              </Link>
            </div>
          </section>
        </div>
      </div>
    )
  }

  const teamInitial = stats.equipo.nombre.charAt(0).toUpperCase()

  const kpiCards = [
    { label: 'Partidos', value: stats.totalPartidos },
    { label: 'Goles a favor', value: stats.golesFavor },
    { label: 'Goles en contra', value: stats.golesContra },
    { label: 'Media goles / partido', value: stats.mediaGoles },
  ]

  return (
    <div className="dashboard-bg min-h-screen p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-[84px_1fr]">
        <DashboardSidebar equipoId={equipoId} />

        <div className="space-y-3">
          <header className="dashboard-card rounded-3xl p-5 md:p-6" style={APPLE_CARD_STYLE}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Estadisticas</p>
                <h1 className="text-2xl font-bold text-gray-900">{stats.equipo.nombre}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {[stats.equipo.club, stats.equipo.categoria, stats.equipo.temporada].filter(Boolean).join(' · ') ||
                    'Resumen del equipo'}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white/75 px-4 py-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-soft">
                  {stats.equipo.logo_url ? (
                    <img
                      src={stats.equipo.logo_url}
                      alt={stats.equipo.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold">{teamInitial}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Equipo activo</p>
                  <p className="text-xs text-gray-500">{stats.equipo.club || 'Sin club'}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((item) => (
              <article
                key={item.label}
                className="dashboard-card rounded-3xl p-5"
                style={APPLE_CARD_STYLE}
              >
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-3 xl:grid-cols-3">
            <RankingCard
              title="Top goleadores"
              rows={stats.topGoleadores}
              metricLabel="G"
              metricSelector={(row) => row.goles}
            />
            <RankingCard
              title="Top asistentes"
              rows={stats.topAsistentes}
              metricLabel="A"
              metricSelector={(row) => row.asistencias}
            />
            <RankingCard
              title="Top contribucion"
              rows={stats.topContribucion}
              metricLabel="G+A"
              metricSelector={(row) => row.contribucion}
            />
          </section>

          <section className="dashboard-card rounded-3xl p-5 md:p-6" style={APPLE_CARD_STYLE}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Top jugadores</h2>
                <p className="text-sm text-gray-500">Ranking de goles, asistencias y contribucion total.</p>
              </div>
            </div>

            {stats.jugadores.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-gray-500">
                No hay jugadores registrados
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-3 py-2 font-semibold">Jugador</th>
                      <th className="px-3 py-2 font-semibold">Posicion</th>
                      <th className="px-3 py-2 font-semibold">Dorsal</th>
                      <th className="px-3 py-2 font-semibold">Goles</th>
                      <th className="px-3 py-2 font-semibold">Asistencias</th>
                      <th className="px-3 py-2 font-semibold">G+A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.jugadores.map((row) => (
                      <tr key={row.usuarioId} className="rounded-2xl bg-white/80 text-gray-700">
                        <td className="rounded-l-2xl px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
                              {row.fotoUrl ? (
                                <img src={row.fotoUrl} alt={row.nombre} className="h-full w-full object-cover" />
                              ) : (
                                row.nombre.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="font-medium text-gray-800">{row.nombre}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">{row.posicion || '—'}</td>
                        <td className="px-3 py-3">{row.dorsal}</td>
                        <td className="px-3 py-3 font-semibold">{row.goles}</td>
                        <td className="px-3 py-3 font-semibold">{row.asistencias}</td>
                        <td className="rounded-r-2xl px-3 py-3 font-semibold">{row.contribucion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(stats.noEvents || stats.eventosWarning) && (
              <p className="mt-4 text-xs text-gray-500">
                {stats.eventosWarning ||
                  'Aun no hay eventos registrados para este equipo. Goles y asistencias se muestran en 0.'}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
