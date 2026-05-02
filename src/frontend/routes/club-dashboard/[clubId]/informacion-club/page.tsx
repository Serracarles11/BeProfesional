import type * as React from "react"
import { notFound, redirect } from "next/navigation"

import {
  ClubAdminDashboard,
  type ClubAdminDashboardData,
} from "./ClubAdminDashboard"
import { AppSidebar } from "@/components/app-sidebar"
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

type JugadorRow = {
  id: string
  equipo_id: string | null
  usuario_id: string | null
  dorsal: string | number | null
  equipos?: {
    id: string
    nombre: string | null
    categoria: string | null
  } | {
    id: string
    nombre: string | null
    categoria: string | null
  }[] | null
  perfiles?: {
    id: string
    nombre: string | null
    foto_url: string | null
    edad: number | null
    posicion: string | null
    altura_cm: number | null
    peso_kg: number | null
  } | {
    id: string
    nombre: string | null
    foto_url: string | null
    edad: number | null
    posicion: string | null
    altura_cm: number | null
    peso_kg: number | null
  }[] | null
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
  equipos?: { id: string; nombre: string | null } | { id: string; nombre: string | null }[] | null
}

type PartidoRow = {
  id: string
  equipo_id: string | null
  fecha_hora: string | null
  competicion: string | null
  rival_nombre: string | null
  lugar: string | null
  estado: string | null
  goles_favor: number | null
  goles_contra: number | null
  equipos?: { id: string; nombre: string | null } | { id: string; nombre: string | null }[] | null
}

function related<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "-"
}

function anioLabel(value: string | null) {
  if (value === "1R") return "1r año"
  if (value === "2N") return "2º año"
  if (value === "3R") return "3r año"
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

  const { data: staffMembership } = await supabase
    .from("miembros_club")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("club_id", clubId)
    .eq("estado", "ACTIVO")
    .in("rol", ["ADMINISTRATIVO", "DIRECTOR", "COORDINADOR"])
    .maybeSingle()

  if (!staffMembership) redirect("/equipos")

  const { data: equiposData, error: equiposError } = await supabase
    .from("equipos")
    .select(
      "id, nombre, categoria, categoria_anio, temporada, ubicacion, campo_juego, ciudad, provincia, pais"
    )
    .eq("club_id", clubId)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true })

  if (equiposError) throw new Error(equiposError.message)

  const club = clubData as ClubRow
  const equipos = (equiposData ?? []) as EquipoRow[]
  const equipoIds = equipos.map((equipo) => equipo.id)

  const [jugadoresResult, entrenamientosResult, partidosResult] = equipoIds.length
    ? await Promise.all([
        supabase
          .from("miembros_equipo")
          .select(
            `
            id,
            equipo_id,
            usuario_id,
            dorsal,
            equipos!inner (
              id,
              nombre,
              categoria
            ),
            perfiles!inner (
              id,
              nombre,
              foto_url,
              edad,
              posicion,
              altura_cm,
              peso_kg
            )
          `
          )
          .in("equipo_id", equipoIds)
          .eq("estado", "ACTIVO")
          .eq("rol", "JUGADOR"),
        supabase
          .from("entrenamientos_equipo")
          .select(
            `
            id,
            equipo_id,
            fecha,
            hora_inicio,
            hora_fin,
            titulo,
            tipo,
            lugar,
            estado,
            equipos (
              id,
              nombre
            )
          `
          )
          .in("equipo_id", equipoIds)
          .order("fecha", { ascending: false })
          .limit(200),
        supabase
          .from("partidos")
          .select(
            `
            id,
            equipo_id,
            fecha_hora,
            competicion,
            rival_nombre,
            lugar,
            estado,
            goles_favor,
            goles_contra,
            equipos (
              id,
              nombre
            )
          `
          )
          .in("equipo_id", equipoIds)
          .order("fecha_hora", { ascending: false })
          .limit(200),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]

  if (jugadoresResult.error) throw new Error(jugadoresResult.error.message)
  if (entrenamientosResult.error) throw new Error(entrenamientosResult.error.message)
  if (partidosResult.error) throw new Error(partidosResult.error.message)

  const jugadoresRows = (jugadoresResult.data ?? []) as JugadorRow[]
  const entrenamientosRows = (entrenamientosResult.data ?? []) as EntrenamientoRow[]
  const partidosRows = (partidosResult.data ?? []) as PartidoRow[]
  const jugadoresPorEquipo = jugadoresRows.reduce<Record<string, number>>((acc, jugador) => {
    if (jugador.equipo_id) acc[jugador.equipo_id] = (acc[jugador.equipo_id] ?? 0) + 1
    return acc
  }, {})

  const teams = equipos.map((equipo) => ({
    id: equipo.id,
    nombre: valueOrDash(equipo.nombre),
    categoria: valueOrDash(equipo.categoria),
    categoriaAnio: anioLabel(equipo.categoria_anio),
    temporada: valueOrDash(equipo.temporada),
    campoJuego: valueOrDash(equipo.campo_juego ?? club.campo_juego),
    ciudad: valueOrDash(equipo.ciudad ?? equipo.ubicacion ?? club.ciudad ?? club.ubicacion),
    jugadoresCount: jugadoresPorEquipo[equipo.id] ?? 0,
  }))

  const data: ClubAdminDashboardData = {
    clubId,
    clubName: valueOrDash(club.nombre),
    clubCity: valueOrDash(club.ciudad ?? club.ubicacion),
    clubCountry: valueOrDash(club.pais),
    clubField: valueOrDash(club.campo_juego),
    backHref: `/club-dashboard/${encodeURIComponent(clubId)}`,
    equipos: teams,
    jugadores: jugadoresRows.map((row) => {
      const equipo = related(row.equipos)
      const perfil = related(row.perfiles)

      return {
        id: row.id,
        nombre: valueOrDash(perfil?.nombre),
        equipoId: equipo?.id ?? row.equipo_id,
        equipoNombre: valueOrDash(equipo?.nombre),
        categoria: valueOrDash(equipo?.categoria),
        dorsal: row.dorsal,
        fotoUrl: perfil?.foto_url ?? null,
        edad: perfil?.edad ?? null,
        posicion: perfil?.posicion ?? null,
        alturaCm: perfil?.altura_cm ?? null,
        pesoKg: perfil?.peso_kg ?? null,
      }
    }),
    entrenamientos: entrenamientosRows.map((row) => {
      const equipo = related(row.equipos)

      return {
        id: row.id,
        equipoId: equipo?.id ?? row.equipo_id,
        equipoNombre: valueOrDash(equipo?.nombre),
        fecha: row.fecha,
        horaInicio: row.hora_inicio,
        horaFin: row.hora_fin,
        titulo: valueOrDash(row.titulo) === "-" ? "Entrenamiento" : valueOrDash(row.titulo),
        tipo: valueOrDash(row.tipo),
        lugar: valueOrDash(row.lugar),
        estado: valueOrDash(row.estado),
      }
    }),
    partidos: partidosRows.map((row) => {
      const equipo = related(row.equipos)

      return {
        id: row.id,
        equipoId: equipo?.id ?? row.equipo_id,
        equipoNombre: valueOrDash(equipo?.nombre),
        fechaHora: row.fecha_hora,
        competicion: valueOrDash(row.competicion),
        rivalNombre: valueOrDash(row.rival_nombre) === "-" ? "Partido" : valueOrDash(row.rival_nombre),
        lugar: valueOrDash(row.lugar),
        estado: valueOrDash(row.estado),
        golesFavor: row.goles_favor,
        golesContra: row.goles_contra,
      }
    }),
    temporadaActual: pickTemporada(equipos),
    totalCampos: new Set(teams.map((team) => team.campoJuego).filter((field) => field !== "-")).size,
  }

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
      <AppSidebar clubName={data.clubName} clubHref={`/club-dashboard/${encodeURIComponent(clubId)}/informacion-club`} />
      <SidebarInset className="bg-transparent">
        <SiteHeader clubName={data.clubName} backHref={data.backHref} />
        <ClubAdminDashboard data={data} />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
