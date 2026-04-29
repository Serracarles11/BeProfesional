import type * as React from "react"
import { notFound, redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import {
  ChartAreaInteractive,
  type ClubActivityChartDatum,
} from "@/components/chart-area-interactive"
import { DataTable, type ClubTeamTableRow } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
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
  ubicacion: string | null
  campo_juego: string | null
  direccion_campo: string | null
  ciudad: string | null
  provincia: string | null
  pais: string | null
}

type EquipoRow = {
  id: string
  nombre: string | null
  categoria: string | null
  categoria_anio: string | null
  temporada: string | null
  ubicacion: string | null
  campo_juego: string | null
  ciudad: string | null
  provincia: string | null
  pais: string | null
}

type MiembroEquipoRow = {
  id: string
  equipo_id: string | null
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

type PartidoRow = {
  fecha_hora: string | null
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "-"
}

function anioLabel(value: string | null) {
  if (value === "1R") return "1r ano"
  if (value === "2N") return "2o ano"
  if (value === "3R") return "3r ano"
  return valueOrDash(value)
}

function pickTemporada(equipos: EquipoRow[]) {
  const counts = new Map<string, number>()
  equipos.forEach((equipo) => {
    if (!equipo.temporada) return
    counts.set(equipo.temporada, (counts.get(equipo.temporada) ?? 0) + 1)
  })

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? "-"
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function buildActivityChartData(
  entrenamientos: EntrenamientoRow[],
  partidos: PartidoRow[]
): ClubActivityChartDatum[] {
  const counts = new Map<string, ClubActivityChartDatum>()
  const dates = [
    ...entrenamientos.map((item) => toIsoDate(item.fecha)),
    ...partidos.map((item) => toIsoDate(item.fecha_hora)),
  ].filter((date): date is string => Boolean(date))

  const referenceDate = dates.length
    ? new Date([...dates].sort().at(-1) as string)
    : new Date()
  const startDate = addDays(referenceDate, -89)

  for (let index = 0; index < 90; index += 1) {
    const date = addDays(startDate, index).toISOString().slice(0, 10)
    counts.set(date, { date, entrenamientos: 0, partidos: 0 })
  }

  entrenamientos.forEach((item) => {
    const date = toIsoDate(item.fecha)
    const current = date ? counts.get(date) : null
    if (current) current.entrenamientos += 1
  })

  partidos.forEach((item) => {
    const date = toIsoDate(item.fecha_hora)
    const current = date ? counts.get(date) : null
    if (current) current.partidos += 1
  })

  return [...counts.values()]
}

export default async function ClubInfoDashboardPage({
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
    .select("id, nombre, ubicacion, campo_juego, direccion_campo, ciudad, provincia, pais")
    .eq("id", clubId)
    .maybeSingle()

  if (clubError || !clubData) notFound()

  const { data: equiposData, error: equiposError } = await supabase
    .from("equipos")
    .select(
      "id, nombre, categoria, categoria_anio, temporada, ubicacion, campo_juego, ciudad, provincia, pais"
    )
    .eq("club_id", clubId)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true })

  if (equiposError) {
    throw new Error(equiposError.message)
  }

  const club = clubData as ClubRow
  const equipos = (equiposData ?? []) as EquipoRow[]
  const equipoIds = equipos.map((equipo) => equipo.id)

  const jugadoresResult = equipoIds.length
    ? await supabase
        .from("miembros_equipo")
        .select("id, equipo_id")
        .in("equipo_id", equipoIds)
        .eq("estado", "ACTIVO")
        .eq("rol", "JUGADOR")
    : { data: [], error: null }

  if (jugadoresResult.error) {
    throw new Error(jugadoresResult.error.message)
  }

  const [entrenamientosResult, partidosResult] = equipoIds.length
    ? await Promise.all([
        supabase
          .from("entrenamientos_equipo")
          .select("id, equipo_id, fecha, hora_inicio, hora_fin, titulo, tipo, lugar, estado")
          .in("equipo_id", equipoIds)
          .order("fecha", { ascending: true }),
        supabase
          .from("partidos")
          .select("fecha_hora")
          .in("equipo_id", equipoIds)
          .order("fecha_hora", { ascending: true }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ]

  if (entrenamientosResult.error) {
    throw new Error(entrenamientosResult.error.message)
  }

  if (partidosResult.error) {
    throw new Error(partidosResult.error.message)
  }

  const jugadores = (jugadoresResult.data ?? []) as MiembroEquipoRow[]
  const entrenamientos = (entrenamientosResult.data ?? []) as EntrenamientoRow[]
  const partidos = (partidosResult.data ?? []) as PartidoRow[]
  const jugadoresPorEquipo = jugadores.reduce<Record<string, number>>((acc, jugador) => {
    if (jugador.equipo_id) acc[jugador.equipo_id] = (acc[jugador.equipo_id] ?? 0) + 1
    return acc
  }, {})

  const tableRows: ClubTeamTableRow[] = equipos.map((equipo) => ({
    id: equipo.id,
    nombre: valueOrDash(equipo.nombre),
    categoria: valueOrDash(equipo.categoria),
    categoriaAnio: anioLabel(equipo.categoria_anio),
    temporada: valueOrDash(equipo.temporada),
    ubicacion: valueOrDash(equipo.ubicacion ?? club.ubicacion),
    campoJuego: valueOrDash(equipo.campo_juego ?? club.campo_juego),
    ciudad: valueOrDash(equipo.ciudad ?? club.ciudad),
    provincia: valueOrDash(equipo.provincia ?? club.provincia),
    pais: valueOrDash(equipo.pais ?? club.pais),
    jugadoresCount: jugadoresPorEquipo[equipo.id] ?? 0,
  }))

  const clubName = valueOrDash(club.nombre)
  const clubDashboardHref = `/club-dashboard/${encodeURIComponent(clubId)}`
  const clubInfoHref = `${clubDashboardHref}/informacion-club`
  const totalCampos = new Set(tableRows.map((row) => row.campoJuego).filter((campo) => campo !== "-")).size

  return (
    <SidebarProvider
      className="bg-[linear-gradient(145deg,#f8fbff_0%,#edf3ff_46%,#dfeaff_100%)]"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
          "--primary": "var(--bp-primary)",
          "--ring": "var(--bp-mid)",
          "--accent": "var(--bp-soft)",
          "--accent-foreground": "var(--bp-ink)",
          "--sidebar": "#f8fbff",
          "--sidebar-foreground": "var(--bp-ink)",
          "--sidebar-primary": "var(--bp-primary)",
          "--sidebar-primary-foreground": "#ffffff",
          "--sidebar-accent": "var(--bp-soft)",
          "--sidebar-accent-foreground": "var(--bp-ink)",
          "--sidebar-border": "rgba(179, 197, 245, 0.7)",
          "--sidebar-ring": "var(--bp-mid)",
        } as React.CSSProperties
      }
    >
      <AppSidebar clubName={clubName} clubHref={clubInfoHref} />
      <SidebarInset className="bg-transparent">
        <SiteHeader clubName={clubName} backHref={clubDashboardHref} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards
                totalEquipos={tableRows.length}
                totalJugadores={jugadores.length}
                temporadaActual={pickTemporada(equipos)}
                totalCampos={totalCampos}
              />
              <div id="categorias" className="px-4 lg:px-6">
                <ChartAreaInteractive
                  data={buildActivityChartData(entrenamientos, partidos)}
                />
              </div>
              <div id="equipos">
                <DataTable data={tableRows} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
