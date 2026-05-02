import type * as React from "react"
import { notFound, redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServer } from "@/lib/supabase/server"
import { ClubPlayerPhotosManager } from "./ClubPlayerPhotosManager"

type ParamsInput = { clubId: string }

type ClubRow = {
  id: string
  nombre: string | null
}

type EquipoRow = {
  id: string
  nombre: string | null
  categoria: string | null
  categoria_anio: string | null
  temporada: string | null
}

type MemberRow = {
  id: string
  usuario_id: string | null
  equipo_id: string | null
  dorsal: number | string | null
  perfiles?: {
    id: string
    nombre: string | null
    foto_url: string | null
    posicion: string | null
    edad: number | string | null
  } | {
    id: string
    nombre: string | null
    foto_url: string | null
    posicion: string | null
    edad: number | string | null
  }[] | null
}

type MatchRow = {
  id: string
}

type MatchEventRow = {
  partido_id: string | null
  tipo: string | null
  jugador_id: string | null
  jugador_relacionado_id: string | null
}

type MatchParticipantRow = {
  partido_id: string | null
  jugador_id: string | null
  minutos_jugados: number | string | null
  titular?: boolean | null
}

function related<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "-"
}

function normalizeText(value: string | null | undefined) {
  if (!value) return ""
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase()
}

function valueWithLettersOrFallback(value: string | null | undefined, fallback: string) {
  const normalized = normalizeText(value)
  return /[A-Z]/.test(normalized) ? value?.trim() || fallback : fallback
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toNumberOrNull(value: number | string | null | undefined) {
  const parsed = toNumber(value)
  return parsed > 0 ? parsed : null
}

function isGoalEvent(value: string | null | undefined) {
  return normalizeText(value).includes("GOL")
}

function isAssistEvent(value: string | null | undefined) {
  return normalizeText(value).includes("ASIST")
}

function isYellowCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes("AMAR") || normalized.includes("YELLOW")
}

function isRedCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes("ROJA") || normalized.includes("RED")
}

export default async function ClubPlayersPage({
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

  const { data: staffMembership, error: staffMembershipError } = await supabase
    .from("miembros_club")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("club_id", clubId)
    .eq("estado", "ACTIVO")
    .in("rol", ["ADMINISTRATIVO", "DIRECTOR", "COORDINADOR"])
    .maybeSingle()

  if (staffMembershipError) throw new Error(staffMembershipError.message)
  if (!staffMembership) redirect("/equipos")

  const db = createSupabaseAdmin() ?? supabase

  const { data: clubData, error: clubError } = await db
    .from("clubes")
    .select("id, nombre")
    .eq("id", clubId)
    .maybeSingle()

  if (clubError || !clubData) notFound()

  const { data: equiposData, error: equiposError } = await db
    .from("equipos")
    .select("id, nombre, categoria, categoria_anio, temporada")
    .eq("club_id", clubId)
    .order("nombre", { ascending: true })

  if (equiposError) throw new Error(equiposError.message)

  const club = clubData as ClubRow
  const equipos = (equiposData ?? []) as EquipoRow[]
  const equipoIds = equipos.map((equipo) => equipo.id)
  const equiposById = new Map(equipos.map((equipo) => [equipo.id, equipo]))

  const [membersResult, matchesResult] = equipoIds.length
    ? await Promise.all([
        db
          .from("miembros_equipo")
          .select(
            `
            id,
            usuario_id,
            equipo_id,
            dorsal,
            perfiles!inner (
              id,
              nombre,
              foto_url,
              posicion,
              edad
            )
          `
          )
          .in("equipo_id", equipoIds)
          .eq("rol", "JUGADOR")
          .eq("estado", "ACTIVO"),
        db
          .from("partidos")
          .select("id")
          .in("equipo_id", equipoIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ]

  if (membersResult.error) throw new Error(membersResult.error.message)
  if (matchesResult.error) throw new Error(matchesResult.error.message)

  const matchIds = ((matchesResult.data ?? []) as MatchRow[]).map((match) => match.id)
  const members = (membersResult.data ?? []) as MemberRow[]
  const userIds = [...new Set(members.map((member) => member.usuario_id).filter((id): id is string => Boolean(id)))]

  const [eventsResult, participantsResult] = await Promise.all([
    matchIds.length
      ? db
          .from("eventos_partido")
          .select("partido_id, tipo, jugador_id, jugador_relacionado_id")
          .in("partido_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length && userIds.length
      ? db
          .from("participantes_partido")
          .select("partido_id, jugador_id, minutos_jugados, titular")
          .in("partido_id", matchIds)
          .in("jugador_id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (eventsResult.error) throw new Error(eventsResult.error.message)
  if (participantsResult.error) throw new Error(participantsResult.error.message)

  const statsByPlayer = new Map<
    string,
    {
      appMatches: Set<string>
      starts: number
      minutes: number
      goals: number
      assists: number
      yellows: number
      reds: number
    }
  >()

  userIds.forEach((userId) => {
    statsByPlayer.set(userId, {
      appMatches: new Set(),
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellows: 0,
      reds: 0,
    })
  })

  ;((participantsResult.data ?? []) as MatchParticipantRow[]).forEach((participant) => {
    if (!participant.jugador_id || !participant.partido_id) return
    const current = statsByPlayer.get(participant.jugador_id)
    if (!current) return
    current.appMatches.add(participant.partido_id)
    current.minutes += Math.max(toNumber(participant.minutos_jugados), 0)
    if (participant.titular) current.starts += 1
  })

  ;((eventsResult.data ?? []) as MatchEventRow[]).forEach((event) => {
    if (event.jugador_id) {
      const current = statsByPlayer.get(event.jugador_id)
      if (current) {
        if (isGoalEvent(event.tipo)) current.goals += 1
        if (isYellowCardEvent(event.tipo)) current.yellows += 1
        if (isRedCardEvent(event.tipo)) current.reds += 1
      }
    }

    if (isAssistEvent(event.tipo)) {
      const relatedId = event.jugador_relacionado_id ?? event.jugador_id
      const current = relatedId ? statsByPlayer.get(relatedId) : null
      if (current) current.assists += 1
    }
  })

  const clubName = valueOrDash(club.nombre)
  const clubDashboardHref = `/club-dashboard/${encodeURIComponent(clubId)}`
  const clubInfoHref = `${clubDashboardHref}/informacion-club`
  const teams = equipos.map((equipo) => ({
    id: equipo.id,
    nombre: valueOrDash(equipo.nombre),
    categoria: valueOrDash(equipo.categoria),
    categoriaAnio: valueOrDash(equipo.categoria_anio),
    temporada: valueOrDash(equipo.temporada),
  }))
  const players = members
    .map((member) => {
      if (!member.usuario_id || !member.equipo_id) return null

      const equipo = equiposById.get(member.equipo_id)
      const perfil = related(member.perfiles)
      const stats = statsByPlayer.get(member.usuario_id)

      return {
        id: member.id,
        profileId: member.usuario_id,
        teamId: member.equipo_id,
        name: valueWithLettersOrFallback(perfil?.nombre, "Jugador"),
        teamName: valueOrDash(equipo?.nombre),
        teamCategory: valueOrDash(equipo?.categoria),
        teamCategoryYear: valueOrDash(equipo?.categoria_anio),
        dorsal: toNumberOrNull(member.dorsal),
        position: perfil?.posicion?.trim() || null,
        age: toNumberOrNull(perfil?.edad),
        avatarUrl: perfil?.foto_url?.trim() || null,
        stats: {
          apps: stats?.appMatches.size ?? 0,
          starts: stats?.starts ?? 0,
          minutes: stats?.minutes ?? 0,
          goals: stats?.goals ?? 0,
          assists: stats?.assists ?? 0,
          yellows: stats?.yellows ?? 0,
          reds: stats?.reds ?? 0,
        },
      }
    })
    .filter((player): player is NonNullable<typeof player> => player !== null)
    .sort((a, b) => {
      if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName, "es")
      if (a.dorsal !== null && b.dorsal !== null && a.dorsal !== b.dorsal) return a.dorsal - b.dorsal
      return a.name.localeCompare(b.name, "es")
    })

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
      <SidebarInset className="bg-transparent">
        <SiteHeader clubName={clubName} backHref={clubDashboardHref} />
        <main className="px-5 py-6 lg:px-8">
          <ClubPlayerPhotosManager
            clubId={clubId}
            clubName={clubName}
            teams={teams}
            players={players}
            canEdit
          />
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
