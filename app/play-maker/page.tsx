import { redirect } from 'next/navigation'
import TrainingAssistantClient from './PlayMakerClient'
import { createSupabaseServer } from '@/lib/supabase/server'

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

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function isCoachRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return normalized.includes('ENTREN') || normalized.includes('COACH') || normalized === 'ADMIN'
}

export default async function PlayMakerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput> | SearchParamsInput
}) {
  const resolvedSearchParams = await searchParams
  const requestedTeamId = Array.isArray(resolvedSearchParams.equipo)
    ? resolvedSearchParams.equipo[0]
    : resolvedSearchParams.equipo

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

  const activeMembership = memberships.find((membership) => {
    const equipo = normalizeEquipo(membership)
    return equipo?.id === activeTeam?.id
  })

  const role = activeMembership?.rol ?? null
  const isCoach = isCoachRole(role)

  const profileResult = await supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', userId)
    .maybeSingle()

  const playerName =
    profileResult.data?.nombre ??
    (typeof session.user.user_metadata?.nombre === 'string' ? session.user.user_metadata.nombre : null) ??
    session.user.email?.split('@')[0] ??
    'Jugador'

  let exercises: Array<{
    id: string
    nombre: string
    descripcion: string | null
    tipo: string | null
    objetivo: string | null
    duracion_estimada_min: number | null
    dificultad: number | null
    material: string | null
  }> = []

  let upcomingTrainings: Array<{
    id: string
    fecha: string
    hora_inicio: string | null
    titulo: string
    tipo: string | null
    lugar: string | null
  }> = []

  if (activeTeam) {
    const exercisesResult = await supabase
      .from('ejercicios')
      .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material')
      .or(`equipo_id.eq.${activeTeam.id},equipo_id.is.null`)
      .order('creado_en', { ascending: false })
      .limit(12)

    exercises = (exercisesResult.data ?? []) as typeof exercises

    const trainingsResult = await supabase
      .from('entrenamientos_equipo')
      .select('id, fecha, hora_inicio, titulo, tipo, lugar')
      .eq('equipo_id', activeTeam.id)
      .gte('fecha', new Date().toISOString().slice(0, 10))
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(8)

    const allTrainings = (trainingsResult.data ?? []) as typeof upcomingTrainings

    if (isCoach) {
      upcomingTrainings = allTrainings
    } else if (allTrainings.length > 0) {
      const audienceResult = await supabase
        .from('entrenamiento_destinatarios')
        .select('entrenamiento_id, usuario_id')
        .in(
          'entrenamiento_id',
          allTrainings.map((training) => training.id)
        )

      const audienceRows = audienceResult.data ?? []
      upcomingTrainings = allTrainings.filter((training) => {
        const audience = audienceRows
          .filter((row) => row.entrenamiento_id === training.id)
          .map((row) => row.usuario_id)

        if (audience.length === 0) return true
        return audience.includes(userId)
      })
    }
  }

  return (
    <TrainingAssistantClient
      equipo={activeTeam}
      role={role}
      isCoach={isCoach}
      playerName={playerName}
      exercises={exercises}
      upcomingTrainings={upcomingTrainings}
    />
  )
}
