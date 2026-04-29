import type * as React from "react"
import { notFound, redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import {
  ClubTrainingCalendar,
  type ClubTrainingCalendarItem,
} from "@/components/club-training-calendar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { createSupabaseServer } from "@/lib/supabase/server"

type ParamsInput = { clubId: string }

type ClubRow = {
  id: string
  nombre: string | null
  campo_juego: string | null
}

type EquipoRow = {
  id: string
  nombre: string | null
  categoria: string | null
  campo_juego: string | null
}

type EntrenamientoRow = {
  id: string
  equipo_id: string | null
  fecha: string | null
  hora_inicio: string | null
  hora_fin: string | null
  titulo: string | null
  tipo: string | null
  lugar: string | null
  estado: string | null
}

type CoachRow = {
  equipo_id: string | null
  perfiles:
    | {
        nombre: string | null
      }
    | {
        nombre: string | null
      }[]
    | null
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "-"
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function categoriaLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    PREBENJAMIN: "Prebenjamin",
    BENJAMIN: "Benjamin",
    ALEVIN: "Alevin",
    INFANTIL: "Infantil",
    CADETE: "Cadete",
    JUVENIL: "Juvenil",
    AMATEUR: "Amateur",
  }

  return labels[value ?? ""] ?? valueOrDash(value)
}

function normalizeRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function buildTrainingCalendarItems(
  entrenamientos: EntrenamientoRow[],
  equipos: EquipoRow[],
  club: ClubRow,
  coachByTeam: Map<string, string>
): ClubTrainingCalendarItem[] {
  const equipoById = new Map(equipos.map((equipo) => [equipo.id, equipo]))

  return entrenamientos
    .map((entrenamiento) => {
      const equipo = entrenamiento.equipo_id ? equipoById.get(entrenamiento.equipo_id) : null
      const date = toIsoDate(entrenamiento.fecha)

      if (!date) return null

      return {
        id: entrenamiento.id,
        date,
        startTime: entrenamiento.hora_inicio,
        endTime: entrenamiento.hora_fin,
        title: valueOrDash(entrenamiento.titulo) === "-" ? "Entrenamiento" : valueOrDash(entrenamiento.titulo),
        type: entrenamiento.tipo,
        status: entrenamiento.estado,
        teamName: valueOrDash(equipo?.nombre),
        teamCategory: categoriaLabel(equipo?.categoria),
        coachName: entrenamiento.equipo_id
          ? coachByTeam.get(entrenamiento.equipo_id) ?? "Entrenador no indicado"
          : "Entrenador no indicado",
        field: valueOrDash(entrenamiento.lugar ?? equipo?.campo_juego ?? club.campo_juego),
      }
    })
    .filter((item): item is ClubTrainingCalendarItem => item !== null)
}

export default async function ClubTrainingsPage({
  params,
}: {
  params: Promise<ParamsInput> | ParamsInput
}) {
  const { clubId } = await params
  const supabase = await createSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: clubData, error: clubError } = await supabase
    .from("clubes")
    .select("id, nombre, campo_juego")
    .eq("id", clubId)
    .maybeSingle()

  if (clubError || !clubData) notFound()

  const { data: equiposData, error: equiposError } = await supabase
    .from("equipos")
    .select("id, nombre, categoria, campo_juego")
    .eq("club_id", clubId)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true })

  if (equiposError) throw new Error(equiposError.message)

  const club = clubData as ClubRow
  const equipos = (equiposData ?? []) as EquipoRow[]
  const equipoIds = equipos.map((equipo) => equipo.id)

  const [entrenamientosResult, coachesResult] = equipoIds.length
    ? await Promise.all([
        supabase
          .from("entrenamientos_equipo")
          .select("id, equipo_id, fecha, hora_inicio, hora_fin, titulo, tipo, lugar, estado")
          .in("equipo_id", equipoIds)
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true }),
        supabase
          .from("miembros_equipo")
          .select("equipo_id, perfiles(nombre)")
          .in("equipo_id", equipoIds)
          .eq("estado", "ACTIVO")
          .in("rol", ["ENTRENADOR", "STAFF"]),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ]

  if (entrenamientosResult.error) throw new Error(entrenamientosResult.error.message)
  if (coachesResult.error) throw new Error(coachesResult.error.message)

  const entrenamientos = (entrenamientosResult.data ?? []) as EntrenamientoRow[]
  const coaches = (coachesResult.data ?? []) as CoachRow[]
  const coachByTeam = coaches.reduce<Map<string, string>>((acc, row) => {
    if (!row.equipo_id || acc.has(row.equipo_id)) return acc
    const profile = normalizeRelated(row.perfiles)
    acc.set(row.equipo_id, valueOrDash(profile?.nombre))
    return acc
  }, new Map())

  const clubName = valueOrDash(club.nombre)
  const clubDashboardHref = `/club-dashboard/${encodeURIComponent(clubId)}`
  const clubInfoHref = `${clubDashboardHref}/informacion-club`

  return (
    <SidebarProvider
      className="bg-[linear-gradient(145deg,#f8fbff_0%,#edf3ff_46%,#dfeaff_100%)]"
      style={
        {
          "--header-height": "calc(var(--spacing) * 12)",
          "--primary": "var(--bp-primary)",
          "--ring": "var(--bp-mid)",
          "--accent": "var(--bp-soft)",
          "--accent-foreground": "var(--bp-ink)",
        } as React.CSSProperties
      }
    >
      <AppSidebar clubName={clubName} clubHref={clubInfoHref} />
      <SidebarInset className="h-screen overflow-hidden bg-transparent">
        <SiteHeader clubName={clubName} backHref={clubDashboardHref} />
        <div className="@container/main flex h-[calc(100vh-var(--header-height))] min-h-0 flex-col px-4 py-4 md:px-6 md:py-6">
          <ClubTrainingCalendar
            trainings={buildTrainingCalendarItems(entrenamientos, equipos, club, coachByTeam)}
          />
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
