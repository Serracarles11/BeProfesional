import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServer } from '@/lib/supabase/server'
import {
  buildRoutineDetails,
  buildRoutineObjective,
  parseRoutineMaterial,
  parseRoutineObjective,
  serializeRoutineMaterial,
  type RoutineExerciseRow,
} from '@/lib/playmaker/routines'

type SearchParamsInput = Record<string, string | string[] | undefined>

type ExerciseCopyRow = RoutineExerciseRow & {
  creado_por: string
}

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function buildPlayerRoutineId(sourceRoutineId: string, userId: string) {
  return `player-${userId}-${sourceRoutineId}`
}

async function getCoachName(admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>, coachId: string) {
  const result = await admin.from('perfiles').select('nombre').eq('id', coachId).maybeSingle()
  return result.data?.nombre?.trim() || 'tu entrenador'
}

async function incrementSourceCloneCount(
  admin: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  sourceRows: ExerciseCopyRow[]
) {
  const firstRow = [...sourceRows].sort((left, right) => {
    const leftOrder = parseRoutineMaterial(left.material).order ?? 0
    const rightOrder = parseRoutineMaterial(right.material).order ?? 0
    return leftOrder - rightOrder
  })[0]

  if (!firstRow?.id) return

  const material = parseRoutineMaterial(firstRow.material)
  const nextCloneCount = Math.max(0, material.communityCloneCount ?? 0) + 1

  await admin
    .from('ejercicios')
    .update({
      material: serializeRoutineMaterial({
        ...material,
        communityCloneCount: nextCloneCount,
      }),
    })
    .eq('id', firstRow.id)
}

function materialForPlayerCopy(value: string | null) {
  const material = parseRoutineMaterial(value)
  return serializeRoutineMaterial({
    ...material,
    communityLikes: [],
    communityCloneCount: 0,
    communityVisibility: 'private',
  })
}

export default async function SavePlayMakerRoutinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput> | SearchParamsInput
}) {
  const resolvedSearchParams = await searchParams
  const equipoId = getQueryValue(resolvedSearchParams.equipo).trim()
  const sourceRoutineId = getQueryValue(resolvedSearchParams.routine).trim()
  const requestedCoachId = getQueryValue(resolvedSearchParams.coach).trim()

  if (!equipoId || !sourceRoutineId) notFound()

  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const userId = session.user.id
  const membershipResult = await supabase
    .from('miembros_equipo')
    .select('id')
    .eq('equipo_id', equipoId)
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  if (membershipResult.error || !membershipResult.data) notFound()

  const admin = createSupabaseAdmin()
  if (!admin) {
    return (
      <main className="min-h-screen bg-[#f7f9fe] px-6 py-10 text-[#181c20]">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold">No se pudo guardar el ejercicio</h1>
          <p className="mt-2 text-sm text-[#64748b]">
            Falta una clave de servicio valida de Supabase para copiar ejercicios.
          </p>
          <Link href={`/play-maker?equipo=${encodeURIComponent(equipoId)}`} className="mt-5 inline-flex rounded-xl bg-[#005db6] px-4 py-2 text-sm font-bold text-white">
            Volver
          </Link>
        </div>
      </main>
    )
  }

  const sourceResult = await admin
    .from('ejercicios')
    .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material, creado_en, creado_por')
    .eq('equipo_id', equipoId)
    .ilike('objetivo', `routine::${sourceRoutineId}::%`)
    .order('creado_en', { ascending: true })

  if (sourceResult.error) notFound()

  let sourceRows = (sourceResult.data ?? []) as ExerciseCopyRow[]
  if (sourceRows.length === 0) {
    const publicSourceResult = await admin
      .from('ejercicios')
      .select('id, nombre, descripcion, tipo, objetivo, duracion_estimada_min, dificultad, material, creado_en, creado_por')
      .ilike('objetivo', `routine::${sourceRoutineId}::%`)
      .order('creado_en', { ascending: true })

    if (publicSourceResult.error || !publicSourceResult.data || publicSourceResult.data.length === 0) notFound()

    const publicRows = publicSourceResult.data as ExerciseCopyRow[]
    const publicRoutine = buildRoutineDetails(publicRows)[0] ?? null
    if (publicRoutine?.visibility !== 'public') notFound()
    sourceRows = publicRows
  }

  const sourceTitle =
    parseRoutineObjective(sourceRows[0]?.objetivo)?.title || sourceRows[0]?.nombre || 'Entrenamiento'
  const sourceCoachId = sourceRows[0].creado_por
  let coachIdForTitle = sourceCoachId

  if (requestedCoachId) {
    const coachMembershipResult = await admin
      .from('miembros_equipo')
      .select('usuario_id')
      .eq('equipo_id', equipoId)
      .eq('usuario_id', requestedCoachId)
      .eq('estado', 'ACTIVO')
      .maybeSingle()

    if (!coachMembershipResult.error && coachMembershipResult.data?.usuario_id) {
      coachIdForTitle = requestedCoachId
    }
  }

  const coachName = await getCoachName(admin, coachIdForTitle)
  const playerTitle = `Ejercicio de ${coachName}: ${sourceTitle}`
  const playerRoutineId = buildPlayerRoutineId(sourceRoutineId, userId)
  const existingResult = await admin
    .from('ejercicios')
    .select('id, objetivo')
    .eq('equipo_id', equipoId)
    .eq('creado_por', userId)
    .ilike('objetivo', `routine::${playerRoutineId}::%`)
    .limit(50)

  if (!existingResult.error && (existingResult.data?.length ?? 0) > 0) {
    const existingIds = existingResult.data.map((row) => row.id).filter(Boolean)
    if (existingIds.length > 0) {
      await admin
        .from('ejercicios')
        .update({ objetivo: buildRoutineObjective(playerRoutineId, playerTitle) })
        .in('id', existingIds)
    }
    redirect(`/play-maker/routine/${encodeURIComponent(playerRoutineId)}?equipo=${encodeURIComponent(equipoId)}`)
  }

  const copyRows = sourceRows.map((row) => ({
    equipo_id: equipoId,
    nombre: row.nombre,
    descripcion: row.descripcion,
    tipo: row.tipo,
    objetivo: buildRoutineObjective(playerRoutineId, playerTitle),
    duracion_estimada_min: row.duracion_estimada_min,
    dificultad: row.dificultad,
    material: materialForPlayerCopy(row.material),
    creado_por: userId,
  }))

  const insertResult = await admin.from('ejercicios').insert(copyRows)
  if (insertResult.error) {
    return (
      <main className="min-h-screen bg-[#f7f9fe] px-6 py-10 text-[#181c20]">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold">No se pudo guardar el ejercicio</h1>
          <p className="mt-2 text-sm text-[#64748b]">{insertResult.error.message}</p>
          <Link href={`/play-maker?equipo=${encodeURIComponent(equipoId)}`} className="mt-5 inline-flex rounded-xl bg-[#005db6] px-4 py-2 text-sm font-bold text-white">
            Volver
          </Link>
        </div>
      </main>
    )
  }

  await incrementSourceCloneCount(admin, sourceRows)

  redirect(`/play-maker/routine/${encodeURIComponent(playerRoutineId)}?equipo=${encodeURIComponent(equipoId)}`)
}
