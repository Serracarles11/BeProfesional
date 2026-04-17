import { redirect, notFound } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { buildRoutineDetails, type RoutineExerciseRow } from '@/lib/playmaker/routines'
import RoutineViewClient from './RoutineViewClient'

type ParamsInput = { routineId: string }
type SearchParamsInput = Record<string, string | string[] | undefined>

type MembershipRow = {
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
  return raw
}

export default async function RoutineViewPage({
  params,
  searchParams,
}: {
  params: Promise<ParamsInput> | ParamsInput
  searchParams: Promise<SearchParamsInput> | SearchParamsInput
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const requestedTeamId = Array.isArray(resolvedSearchParams.equipo)
    ? resolvedSearchParams.equipo[0]
    : resolvedSearchParams.equipo

  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const membershipsResult = await supabase
    .from('miembros_equipo')
    .select('equipo:equipos(id, nombre, club, categoria, temporada, logo_url)')
    .eq('usuario_id', session.user.id)
    .eq('estado', 'ACTIVO')

  const equipos = ((membershipsResult.data ?? []) as MembershipRow[])
    .map((row) => normalizeEquipo(row))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeEquipo>> => value !== null)

  const activeTeam = requestedTeamId ? equipos.find((team) => team.id === requestedTeamId) ?? equipos[0] ?? null : equipos[0] ?? null
  if (!activeTeam) notFound()

  const rowsResult = await supabase
    .from('ejercicios')
    .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material, creado_en')
    .eq('equipo_id', activeTeam.id)
    .eq('creado_por', session.user.id)
    .ilike('objetivo', `routine::${resolvedParams.routineId}::%`)
    .order('creado_en', { ascending: true })

  const routine = buildRoutineDetails((rowsResult.data ?? []) as RoutineExerciseRow[])[0] ?? null
  if (!routine) notFound()

  return <RoutineViewClient equipo={activeTeam} routine={routine} />
}
