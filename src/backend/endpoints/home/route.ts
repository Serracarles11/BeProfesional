import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type EquipoActivo = {
  id: string
  nombre: string
  categoria: string | null
  temporada: string | null
}

type HomeApiResponse = {
  ok: boolean
  error?: string
  equipo: EquipoActivo | null
  kpis: {
    winRate: number
    pointsPerGame: number
    goals: number
    conceded: number
    possession: number
  }
  playerStats: Array<{
    id: string
    nombre: string
    posicion: string
    rating: number
    goals: number
    assists: number
    passAccuracy: number
  }>
  schedule: Array<{
    id: string
    tipo: 'Entrenamiento' | 'Partido'
    titulo: string
    fecha: string
    hora: string
    lugar: string
    rival?: string | null
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
    estado: string
  }>
}

type MembershipRow = {
  rol: string | null
  equipo: {
    id: string
    nombre: string
    categoria: string | null
    temporada: string | null
  } | {
    id: string
    nombre: string
    categoria: string | null
    temporada: string | null
  }[] | null
}

const EMPTY_PAYLOAD: Omit<HomeApiResponse, 'ok'> = {
  error: undefined,
  equipo: null,
  kpis: {
    winRate: 0,
    pointsPerGame: 0,
    goals: 0,
    conceded: 0,
    possession: 0,
  },
  playerStats: [],
  schedule: [],
  standings: [],
  scores: [],
}

const MOCK_PAYLOAD: Omit<HomeApiResponse, 'ok' | 'equipo'> = {
  error: undefined,
  kpis: {
    winRate: 68,
    pointsPerGame: 2.3,
    goals: 21,
    conceded: 9,
    possession: 57,
  },
  playerStats: [
    {
      id: 'player-1',
      nombre: 'Alex Medina',
      posicion: 'MC',
      rating: 7.9,
      goals: 6,
      assists: 4,
      passAccuracy: 88,
    },
    {
      id: 'player-2',
      nombre: 'Dani Lopez',
      posicion: 'DC',
      rating: 7.4,
      goals: 8,
      assists: 2,
      passAccuracy: 74,
    },
    {
      id: 'player-3',
      nombre: 'Sofia Ruiz',
      posicion: 'LD',
      rating: 7.2,
      goals: 1,
      assists: 5,
      passAccuracy: 83,
    },
  ],
  schedule: [
    {
      id: 'schedule-1',
      tipo: 'Entrenamiento',
      titulo: 'Sesion tactica',
      fecha: '2026-02-07',
      hora: '18:30',
      lugar: 'Campo Norte',
    },
    {
      id: 'schedule-2',
      tipo: 'Partido',
      titulo: 'Liga vs Atletico',
      fecha: '2026-02-10',
      hora: '19:00',
      lugar: 'Estadio Central',
      rival: 'Atletico',
    },
    {
      id: 'schedule-3',
      tipo: 'Entrenamiento',
      titulo: 'Trabajo fisico',
      fecha: '2026-02-12',
      hora: '17:45',
      lugar: 'Gimnasio Club',
    },
  ],
  standings: [
    { pos: 1, team: 'City', p: 12, w: 9, d: 2, l: 1, gd: 14, pts: 29 },
    { pos: 2, team: 'United', p: 12, w: 8, d: 2, l: 2, gd: 10, pts: 26 },
    { pos: 3, team: 'Liverpool', p: 12, w: 7, d: 3, l: 2, gd: 8, pts: 24 },
    { pos: 4, team: 'Arsenal', p: 12, w: 6, d: 3, l: 3, gd: 5, pts: 21 },
  ],
  scores: [
    { id: 'score-1', home: 'United', away: 'Wolves', homeScore: 3, awayScore: 1, estado: 'FT' },
    { id: 'score-2', home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 2, estado: 'FT' },
    { id: 'score-3', home: 'Liverpool', away: 'Brighton', homeScore: 2, awayScore: 1, estado: 'FT' },
  ],
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
    categoria: equipo.categoria,
    temporada: equipo.temporada,
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
      return NextResponse.json({ ok: false, error: 'No autorizado', ...EMPTY_PAYLOAD }, { status: 401 })
    }

    const { data: memberships, error: membershipError } = await supabase
      .from('miembros_equipo')
      .select('rol, equipo:equipos(id, nombre, categoria, temporada)')
      .eq('usuario_id', user.id)

    if (membershipError) {
      return NextResponse.json(
        { ok: false, error: 'No se pudieron obtener los equipos del usuario.', ...EMPTY_PAYLOAD },
        { status: 500 }
      )
    }

    const equipos = (memberships ?? [])
      .map((row) => normalizeEquipo(row as MembershipRow))
      .filter((equipo): equipo is EquipoActivo => equipo !== null)

    if (equipos.length === 0) {
      const emptyResponse: HomeApiResponse = {
        ok: true,
        ...EMPTY_PAYLOAD,
      }

      return NextResponse.json(emptyResponse)
    }

    const requestedTeamId = new URL(request.url).searchParams.get('equipo')
    const selectedTeam = requestedTeamId
      ? equipos.find((team) => team.id === requestedTeamId)
      : equipos[0]

    if (requestedTeamId && !selectedTeam) {
      return NextResponse.json(
        { ok: false, error: 'No perteneces al equipo solicitado.', ...EMPTY_PAYLOAD },
        { status: 403 }
      )
    }

    const response: HomeApiResponse = {
      ok: true,
      equipo: selectedTeam ?? null,
      ...MOCK_PAYLOAD,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error en GET /api/home:', error)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor.', ...EMPTY_PAYLOAD },
      { status: 500 }
    )
  }
}
