import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import CreateExerciseClient from './CreateExerciseClient'
import { buildRoutineDetails, type RoutineExerciseRow } from '@/lib/playmaker/routines'

type SearchParamsInput = Record<string, string | string[] | undefined>

type MembershipRow = {
  rol: string | null
  fecha_alta: string | null
  equipo:
    | {
        id: string
        nombre: string
        club: string | null
        categoria: string | null
        temporada: string | null
        logo_url: string | null
      }
    | {
        id: string
        nombre: string
        club: string | null
        categoria: string | null
        temporada: string | null
        logo_url: string | null
      }[]
    | null
}

function normalizeEquipo(row: MembershipRow) {
  const raw = Array.isArray(row.equipo) ? row.equipo[0] : row.equipo
  if (!raw?.id) return null

  return {
    id: raw.id,
    nombre: raw.nombre,
    club: raw.club,
    categoria: raw.categoria,
    temporada: raw.temporada,
    logo_url: raw.logo_url,
  }
}

export default async function CreateExercisePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput> | SearchParamsInput
}) {
  const resolvedSearchParams = await searchParams
  const requestedTeamId = Array.isArray(resolvedSearchParams.equipo)
    ? resolvedSearchParams.equipo[0]
    : resolvedSearchParams.equipo
  const requestedRoutineId = Array.isArray(resolvedSearchParams.routine)
    ? resolvedSearchParams.routine[0]
    : resolvedSearchParams.routine

  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const userId = session.user.id

  const membershipsResult = await supabase
    .from('miembros_equipo')
    .select('rol, fecha_alta, equipo:equipos(id, nombre, club, categoria, temporada, logo_url)')
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .order('fecha_alta', { ascending: false })

  const memberships = (membershipsResult.data ?? []) as MembershipRow[]
  const equipos = memberships
    .map((row) => normalizeEquipo(row))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeEquipo>> => value !== null)

  const activeTeam = requestedTeamId
    ? equipos.find((team) => team.id === requestedTeamId) ?? equipos[0] ?? null
    : equipos[0] ?? null

  let initialRoutine = null

  if (activeTeam && requestedRoutineId) {
    const rowsResult = await supabase
      .from('ejercicios')
      .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material, creado_en')
      .eq('equipo_id', activeTeam.id)
      .ilike('objetivo', `routine::${requestedRoutineId}::%`)
      .order('creado_en', { ascending: true })

    const rows = (rowsResult.data ?? []) as RoutineExerciseRow[]
    initialRoutine = buildRoutineDetails(rows)[0] ?? null
  }

  return <CreateExerciseClient equipo={activeTeam} initialRoutine={initialRoutine} />
}
