import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type EquipoListItem = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  rol: string
}

type HomeApiResponse = {
  ok: boolean
  error?: string
  usuario?: {
    id: string
    nombre: string
    email: string | null
  }
  equipo: {
    id: string
    nombre: string
    club: string | null
    categoria: string | null
    temporada: string | null
  } | null
  rolUsuario: string | null
  proximoEntreno: {
    id: string
    fecha: string
    lugar: string | null
  } | null
  proximoPartido: {
    id: string
    fechaHora: string
    rival: string | null
    lugar: string | null
  } | null
  kpis: {
    winrate: number
    pointsPerGame: number
    goals: number
    conceded: number
    possession: number
  }
  playerStats: Array<{
    id: string
    nombre: string
    rating: number
    passAcc: number
    goals: number
    assists: number
  }>
  standings: Array<{
    pos: number
    team: string
    p: number
    w: number
    d: number
    l: number
    gd: number
    pts: number
  }>
  scores: Array<{
    id: string
    home: string
    away: string
    homeScore: number
    awayScore: number
  }>
  recentForm: Array<{
    match: number
    value: number
  }>
  equiposDelUsuario: EquipoListItem[]
}

function defaultPayload(): Omit<HomeApiResponse, 'ok' | 'usuario'> {
  return {
    equipo: null,
    rolUsuario: null,
    proximoEntreno: null,
    proximoPartido: null,
    kpis: {
      winrate: 64,
      pointsPerGame: 2.1,
      goals: 22,
      conceded: 11,
      possession: 58,
    },
    playerStats: [
      {
        id: 'mock-1',
        nombre: 'Tu mejor jugador',
        rating: 7.8,
        passAcc: 86,
        goals: 7,
        assists: 5,
      },
    ],
    standings: [
      { pos: 1, team: 'City', p: 8, w: 6, d: 1, l: 1, gd: 10, pts: 19 },
      { pos: 2, team: 'United', p: 8, w: 5, d: 2, l: 1, gd: 8, pts: 17 },
      { pos: 3, team: 'Liverpool', p: 8, w: 5, d: 1, l: 2, gd: 7, pts: 16 },
      { pos: 4, team: 'Arsenal', p: 8, w: 4, d: 2, l: 2, gd: 5, pts: 14 },
    ],
    scores: [
      { id: 'score-1', home: 'United', away: 'Wolves', homeScore: 3, awayScore: 1 },
      { id: 'score-2', home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 2 },
      { id: 'score-3', home: 'Liverpool', away: 'Brighton', homeScore: 2, awayScore: 1 },
    ],
    recentForm: [
      { match: 1, value: 2 },
      { match: 2, value: 3 },
      { match: 3, value: 2 },
      { match: 4, value: 1 },
      { match: 5, value: 2 },
      { match: 6, value: 3 },
    ],
    equiposDelUsuario: [],
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const payload = defaultPayload()

    const { data: profile } = await supabase
      .from('perfiles')
      .select('nombre')
      .eq('id', user.id)
      .maybeSingle()

    const { data: memberships, error: membershipsError } = await supabase
      .from('miembros_equipo')
      .select(
        'rol, equipo_id, equipo:equipos(id, nombre, club, categoria, temporada)'
      )
      .eq('usuario_id', user.id)

    if (membershipsError) {
      return NextResponse.json(
        { ok: false, error: 'No se pudieron obtener los equipos del usuario.' },
        { status: 500 }
      )
    }

    const equiposDelUsuario: EquipoListItem[] = (memberships ?? [])
      .map((row) => {
        const rawEquipo = row.equipo as
          | {
              id: string
              nombre: string
              club: string | null
              categoria: string | null
              temporada: string | null
            }
          | {
              id: string
              nombre: string
              club: string | null
              categoria: string | null
              temporada: string | null
            }[]
          | null

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
          rol: row.rol ?? 'jugador',
        }
      })
      .filter((value): value is EquipoListItem => value !== null)

    payload.equiposDelUsuario = equiposDelUsuario

    if (equiposDelUsuario.length === 0) {
      const emptyResponse: HomeApiResponse = {
        ok: true,
        usuario: {
          id: user.id,
          nombre: profile?.nombre ?? user.email?.split('@')[0] ?? 'Usuario',
          email: user.email ?? null,
        },
        ...payload,
      }

      return NextResponse.json(emptyResponse)
    }

    const requestedTeamId = new URL(request.url).searchParams.get('equipo')

    const selectedFromMembership = requestedTeamId
      ? equiposDelUsuario.find((team) => team.id === requestedTeamId)
      : equiposDelUsuario[0]

    if (requestedTeamId && !selectedFromMembership) {
      return NextResponse.json(
        { ok: false, error: 'No perteneces al equipo solicitado.' },
        { status: 401 }
      )
    }

    const selectedTeam = selectedFromMembership ?? equiposDelUsuario[0]

    const { data: equipoRow, error: equipoError } = await supabase
      .from('equipos')
      .select('id, nombre, club, categoria, temporada')
      .eq('id', selectedTeam.id)
      .single()

    if (equipoError || !equipoRow) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo obtener el equipo seleccionado.' },
        { status: 500 }
      )
    }

    const { data: rolRow } = await supabase
      .from('miembros_equipo')
      .select('rol')
      .eq('usuario_id', user.id)
      .eq('equipo_id', selectedTeam.id)
      .maybeSingle()

    payload.equipo = {
      id: equipoRow.id,
      nombre: equipoRow.nombre,
      club: equipoRow.club,
      categoria: equipoRow.categoria,
      temporada: equipoRow.temporada,
    }
    payload.rolUsuario = rolRow?.rol ?? selectedTeam.rol

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: entrenos } = await supabase
      .from('entrenamientos_equipo')
      .select('id, fecha, lugar')
      .eq('equipo_id', selectedTeam.id)
      .gte('fecha', today.toISOString().slice(0, 10))
      .order('fecha', { ascending: true })
      .limit(1)

    if (entrenos?.[0]) {
      payload.proximoEntreno = {
        id: String(entrenos[0].id),
        fecha: String(entrenos[0].fecha),
        lugar: entrenos[0].lugar ? String(entrenos[0].lugar) : null,
      }
    }

    const { data: partidos } = await supabase
      .from('partidos')
      .select('id, fecha_hora, rival, lugar')
      .eq('equipo_id', selectedTeam.id)
      .gte('fecha_hora', new Date().toISOString())
      .order('fecha_hora', { ascending: true })
      .limit(1)

    if (partidos?.[0]) {
      payload.proximoPartido = {
        id: String(partidos[0].id),
        fechaHora: String(partidos[0].fecha_hora),
        rival: partidos[0].rival ? String(partidos[0].rival) : null,
        lugar: partidos[0].lugar ? String(partidos[0].lugar) : null,
      }
    }

    const response: HomeApiResponse = {
      ok: true,
      usuario: {
        id: user.id,
        nombre: profile?.nombre ?? user.email?.split('@')[0] ?? 'Usuario',
        email: user.email ?? null,
      },
      ...payload,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error en GET /api/home:', error)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
