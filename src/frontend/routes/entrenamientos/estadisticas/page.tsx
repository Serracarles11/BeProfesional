import { redirect } from 'next/navigation'

type SearchParamsInput = Record<string, string | string[] | undefined>

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function EntrenamientosEstadisticasPage({
  searchParams,
}: {
  searchParams: SearchParamsInput | Promise<SearchParamsInput>
}) {
  const resolvedSearchParams = await searchParams
  const equipoId = getQueryValue(resolvedSearchParams.equipo)

  if (equipoId) {
    redirect(`/entrenamientos?equipo=${encodeURIComponent(equipoId)}`)
  }

  redirect('/entrenamientos')
}
