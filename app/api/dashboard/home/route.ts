import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type EquipoActivo = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  logo_url: string | null
}

type HomeSuccessResponse = {
  ok: true
  equipo: EquipoActivo | null
  role: string | null
  kpis: {
    winrate: number
    pointsPerGame: number
    goalsFor: number
    goalsAgainst: number
    possession: number | null
  }
  playerSpotlight: {
    nombre: string
    foto_url: string | null
    posicion: string | null
    matchesPlayed: number
    avgRating: number | null
    goalsAssistsPct: number | null
    passAccPct: number | null
  }
  schedule: {
    monthLabel: string
    nextMatch: {
      fecha_hora: string
      rival_nombre: string | null
      casa_fuera: string | null
      lugar: string | null
    } | null
    calendarDays: Array<{ date: string; hasEvent: boolean }>
  }
  standings: Array<{
    posicion: number
    nombre: string
    puntos: number
    pj: number
    v: number
    e: number
    d: number
    gf: number
    gc: number
  }>
  scores: Array<{
    equipo_nombre: string
    rival_nombre: string | null
    goles_favor: number
    goles_contra: number
    fecha_hora: string
  }>
}

type HomeErrorResponse = {
  ok: false
  error: string
  code?: string | null
  details?: string | null
  hint?: string | null
}

type MembershipRow = {
  rol: string | null
  fecha_alta: string | null
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
    logo_url: string | null
  } | null | {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
    logo_url: string | null
  }[]
}

const EMPTY_SUCCESS: HomeSuccessResponse = {
  ok: true,
  equipo: null,
  role: null,
  kpis: {
    winrate: 0,
    pointsPerGame: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    possession: null,
  },
  playerSpotlight: {
    nombre: 'Sin jugadores',
    foto_url: null,
    posicion: null,
    matchesPlayed: 0,
    avgRating: null,
    goalsAssistsPct: null,
    passAccPct: null,
  },
  schedule: {
    monthLabel: new Date().toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    }),
    nextMatch: null,
    calendarDays: [],
  },
  standings: [],
  scores: [],
}

function buildErrorResponse(
  message: string,
  status: number,
  error?: { code?: string | null; details?: string | null; hint?: string | null }
) {
  const payload: HomeErrorResponse = {
    ok: false,
    error: message,
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  }

  console.error('API /api/dashboard/home error:', message, error ?? null)
  return NextResponse.json(payload, { status })
}

function normalizeEquipo(row: MembershipRow): EquipoActivo | null {
  const rawEquipo = row.equipo
  const equipo = Array.isArray(rawEquipo) ? rawEquipo[0] : rawEquipo

  if (!equipo?.id) {
    return null
  }

  return {
    id: equipo.id,
    nombre: equipo.nombre,
    club: equipo.club,
    categoria: equipo.categoria,
    temporada: equipo.temporada,
    logo_url: equipo.logo_url,
  }
}

function toDateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function buildCalendarDays(date: Date, eventDates: Set<string>) {
  const { start, end } = getMonthRange(date)
  const days: Array<{ date: string; hasEvent: boolean }> = []
  const cursor = new Date(start)

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    days.push({ date: key, hasEvent: eventDates.has(key) })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return buildErrorResponse('No autorizado', 401, authError ?? undefined)
    }

    const requestedTeamId = new URL(request.url).searchParams.get('equipo')

    const { data: memberships, error: membershipError } = await supabase
      .from('miembros_equipo')
      .select(
        'rol, fecha_alta, equipo:equipos(id, nombre, club, categoria, temporada, logo_url)'
      )
      .eq('usuario_id', user.id)
      .order('fecha_alta', { ascending: false })

    if (membershipError) {
      return buildErrorResponse(
        'No se pudieron obtener los equipos del usuario.',
        500,
        membershipError
      )
    }

    const equipos = (memberships ?? [])
      .map((row) => normalizeEquipo(row as MembershipRow))
      .filter((equipo): equipo is EquipoActivo => equipo !== null)

    if (equipos.length === 0) {
      return NextResponse.json(EMPTY_SUCCESS)
    }

    const activeTeam = requestedTeamId
      ? equipos.find((team) => team.id === requestedTeamId)
      : equipos[0]

    if (requestedTeamId && !activeTeam) {
      return buildErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    const activeMembership = (memberships ?? []).find((row) => {
      const equipo = normalizeEquipo(row as MembershipRow)
      return equipo?.id === activeTeam?.id
    }) as MembershipRow | undefined

    const role = activeMembership?.rol
      ? String(activeMembership.rol).toUpperCase()
      : null

    const now = new Date()

    const { data: clasificacionRow, error: clasificacionError } = await supabase
      .from('clasificacion_liga')
      .select(
        'posicion, puntos, partidos_jugados, victorias, empates, derrotas, goles_favor, goles_contra'
      )
      .eq('equipo_id', activeTeam!.id)
      .maybeSingle()

    if (clasificacionError) {
      return buildErrorResponse(
        'No se pudo obtener la clasificacion del equipo.',
        500,
        clasificacionError
      )
    }

    const { data: finalizados, error: finalizadosError } = await supabase
      .from('partidos')
      .select('goles_favor, goles_contra')
      .eq('equipo_id', activeTeam!.id)
      .eq('estado', 'FINALIZADO')

    if (finalizadosError) {
      return buildErrorResponse(
        'No se pudieron obtener los partidos finalizados del equipo.',
        500,
        finalizadosError
      )
    }

    let wins = 0
    let draws = 0
    let losses = 0
    let goalsForFromMatches = 0
    let goalsAgainstFromMatches = 0

    for (const match of finalizados ?? []) {
      const gf = Number(match.goles_favor ?? 0)
      const ga = Number(match.goles_contra ?? 0)

      goalsForFromMatches += gf
      goalsAgainstFromMatches += ga

      if (gf > ga) wins += 1
      else if (gf === ga) draws += 1
      else losses += 1
    }

    const matchesFinalizados = finalizados?.length ?? 0

    const puntos = clasificacionRow?.puntos ?? wins * 3 + draws
    const partidosJugados = clasificacionRow?.partidos_jugados ?? matchesFinalizados
    const goalsFor = clasificacionRow?.goles_favor ?? goalsForFromMatches
    const goalsAgainst = clasificacionRow?.goles_contra ?? goalsAgainstFromMatches

    const kpis = {
      winrate: matchesFinalizados > 0 ? Math.round((wins / matchesFinalizados) * 100) : 0,
      pointsPerGame: partidosJugados > 0 ? Number((puntos / partidosJugados).toFixed(2)) : 0,
      goalsFor,
      goalsAgainst,
      possession: null,
    }

    const { data: spotlightRows, error: spotlightError } = await supabase
      .from('miembros_equipo')
      .select('usuario_id, perfiles(nombre, foto_url, posicion)')
      .eq('equipo_id', activeTeam!.id)
      .order('fecha_alta', { ascending: false })
      .limit(1)

    if (spotlightError) {
      console.error('Error obteniendo player spotlight:', spotlightError)
    }

    const spotlightRow = spotlightRows?.[0]
    const spotlightProfile = spotlightRow?.perfiles as
      | { nombre: string | null; foto_url: string | null; posicion: string | null }
      | null

    let matchesPlayed = 0

    if (spotlightRow?.usuario_id) {
      const { count, error: participationError } = await supabase
        .from('participantes_partido')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', spotlightRow.usuario_id)

      if (participationError) {
        console.error('Error obteniendo participaciones:', participationError)
      } else {
        matchesPlayed = count ?? 0
      }
    }

    const playerSpotlight = {
      nombre: spotlightProfile?.nombre ?? 'Sin jugadores',
      foto_url: spotlightProfile?.foto_url ?? null,
      posicion: spotlightProfile?.posicion ?? null,
      matchesPlayed,
      avgRating: null,
      goalsAssistsPct: null,
      passAccPct: null,
    }

    const { data: nextMatches, error: nextMatchError } = await supabase
      .from('partidos')
      .select('fecha_hora, rival_nombre, casa_fuera, lugar, estado')
      .eq('equipo_id', activeTeam!.id)
      .gte('fecha_hora', now.toISOString())
      .neq('estado', 'FINALIZADO')
      .order('fecha_hora', { ascending: true })
      .limit(1)

    if (nextMatchError) {
      return buildErrorResponse(
        'No se pudo obtener el proximo partido.',
        500,
        nextMatchError
      )
    }

    const { start, end } = getMonthRange(now)

    const { data: calendarMatches, error: calendarError } = await supabase
      .from('partidos')
      .select('fecha_hora')
      .eq('equipo_id', activeTeam!.id)
      .gte('fecha_hora', start.toISOString())
      .lte('fecha_hora', end.toISOString())

    if (calendarError) {
      return buildErrorResponse(
        'No se pudo obtener el calendario del equipo.',
        500,
        calendarError
      )
    }

    const eventDates = new Set((calendarMatches ?? []).map((item) => toDateKey(item.fecha_hora)))

    const schedule = {
      monthLabel: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      nextMatch: nextMatches?.[0]
        ? {
            fecha_hora: nextMatches[0].fecha_hora,
            rival_nombre: nextMatches[0].rival_nombre ?? null,
            casa_fuera: nextMatches[0].casa_fuera ?? null,
            lugar: nextMatches[0].lugar ?? null,
          }
        : null,
      calendarDays: buildCalendarDays(now, eventDates),
    }

    let standings: HomeSuccessResponse['standings'] = []

    if (activeTeam!.temporada) {
      const { data: standingsRows, error: standingsError } = await supabase
        .from('clasificacion_liga')
        .select(
          'posicion, puntos, partidos_jugados, victorias, empates, derrotas, goles_favor, goles_contra, equipos(nombre, temporada)'
        )
        .eq('equipos.temporada', activeTeam!.temporada)
        .order('posicion', { ascending: true })
        .limit(10)

      if (standingsError) {
        return buildErrorResponse(
          'No se pudo obtener la clasificacion de la liga.',
          500,
          standingsError
        )
      }

      standings = (standingsRows ?? []).map((row) => {
        const equipoRow = Array.isArray(row.equipos) ? row.equipos[0] : row.equipos
        return {
          posicion: Number(row.posicion ?? 0),
          nombre: String(equipoRow?.nombre ?? 'Equipo'),
          puntos: Number(row.puntos ?? 0),
          pj: Number(row.partidos_jugados ?? 0),
          v: Number(row.victorias ?? 0),
          e: Number(row.empates ?? 0),
          d: Number(row.derrotas ?? 0),
          gf: Number(row.goles_favor ?? 0),
          gc: Number(row.goles_contra ?? 0),
        }
      })
    }

    let scores: HomeSuccessResponse['scores'] = []

    if (activeTeam!.temporada) {
      const { data: scoreRows, error: scoresError } = await supabase
        .from('partidos')
        .select('fecha_hora, goles_favor, goles_contra, rival_nombre, equipos(nombre, temporada)')
        .eq('estado', 'FINALIZADO')
        .eq('equipos.temporada', activeTeam!.temporada)
        .order('fecha_hora', { ascending: false })
        .limit(5)

      if (scoresError) {
        return buildErrorResponse(
          'No se pudieron obtener los resultados recientes.',
          500,
          scoresError
        )
      }

      scores = (scoreRows ?? []).map((row) => {
        const equipoRow = Array.isArray(row.equipos) ? row.equipos[0] : row.equipos
        return {
          equipo_nombre: String(equipoRow?.nombre ?? 'Equipo'),
          rival_nombre: row.rival_nombre ?? null,
          goles_favor: Number(row.goles_favor ?? 0),
          goles_contra: Number(row.goles_contra ?? 0),
          fecha_hora: row.fecha_hora,
        }
      })
    }

    const response: HomeSuccessResponse = {
      ok: true,
      equipo: activeTeam ?? null,
      role,
      kpis,
      playerSpotlight,
      schedule,
      standings,
      scores,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error en GET /api/dashboard/home:', error)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
