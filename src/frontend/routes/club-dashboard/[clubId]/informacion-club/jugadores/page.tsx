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
import { PlayerGrid } from "@/app/jugadores/components/PlayerGrid"
import type { SquadPlayer } from "@/app/jugadores/types"

type ParamsInput = { clubId: string }

type ClubRow = {
  id: string
  nombre: string | null
}

type EquipoRow = {
  id: string
  nombre: string | null
  categoria: string | null
  temporada: string | null
}

type MemberRow = {
  usuario_id: string | null
  equipo_id: string | null
  dorsal: number | string | null
  fecha_alta: string | null
}

type ProfileRow = {
  id: string
  nombre: string | null
  genero: string | null
  foto_url: string | null
  posicion: string | null
  edad: number | string | null
  pie_dominante: string | null
  altura_cm: number | string | null
  peso_kg: number | string | null
  telefono: string | null
  ciudad: string | null
  pais: string | null
  bio?: string | null
  instagram?: string | null
  objetivo?: string | null
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
}

type ClubPlayerBase = Omit<SquadPlayer, "stats"> & {
  sourceUserId: string
  teamId: string
  gender: string | null
  phone: string | null
  city: string | null
  country: string | null
  bio: string | null
  instagram: string | null
  objective: string | null
  joinedAt: string | null
}

type ClubSquadPlayer = SquadPlayer & {
  teamId: string
}

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "-"
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
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

function isGoalEvent(value: string | null | undefined) {
  return normalizeText(value).includes("GOL")
}

function isYellowCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes("AMAR") || normalized.includes("YELLOW")
}

function isAssistEvent(value: string | null | undefined) {
  return normalizeText(value).includes("ASIST")
}

function isRedCardEvent(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized.includes("ROJA") || normalized.includes("RED")
}

function buildPlayers(
  members: MemberRow[],
  equiposById: Map<string, EquipoRow>,
  profilesById: Map<string, ProfileRow>,
  events: MatchEventRow[],
  participants: MatchParticipantRow[]
): ClubSquadPlayer[] {
  const statsByPlayer = new Map<
    string,
    {
      appMatches: Set<string>
      minutes: number
      goals: number
      assists: number
      yellows: number
      reds: number
    }
  >()

  const basePlayers = members
    .map((member) => {
      if (!member.usuario_id || !member.equipo_id) return null
      const profile = profilesById.get(member.usuario_id)
      const team = equiposById.get(member.equipo_id)

      statsByPlayer.set(member.usuario_id, {
        appMatches: new Set<string>(),
        minutes: 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
      })

      return {
        id: `${member.equipo_id}:${member.usuario_id}`,
        sourceUserId: member.usuario_id,
        teamId: member.equipo_id,
        name: profile?.nombre?.trim() || "Jugador",
        team: [
          valueOrDash(team?.nombre),
          team?.categoria?.trim() ? team.categoria.trim() : null,
          team?.temporada?.trim() ? team.temporada.trim() : null,
        ].filter(Boolean).join(" · "),
        position: profile?.posicion ?? null,
        age: profile?.edad == null ? null : toNumber(profile.edad),
        dorsal:
          typeof member.dorsal === "number" || typeof member.dorsal === "string"
            ? toNumber(member.dorsal)
            : null,
        avatarUrl: profile?.foto_url ?? null,
        dominantFoot: profile?.pie_dominante?.trim() || null,
        heightCm: profile?.altura_cm == null ? null : toNumber(profile.altura_cm),
        weightKg: profile?.peso_kg == null ? null : toNumber(profile.peso_kg),
        gender: profile?.genero?.trim() || null,
        phone: profile?.telefono?.trim() || null,
        city: profile?.ciudad?.trim() || null,
        country: profile?.pais?.trim() || null,
        bio: profile?.bio?.trim() || null,
        instagram: profile?.instagram?.trim() || null,
        objective: profile?.objetivo?.trim() || null,
        joinedAt: member.fecha_alta,
      }
    })
    .filter((player): player is ClubPlayerBase => player !== null)

  for (const participant of participants) {
    if (!participant.jugador_id || !participant.partido_id) continue
    const current = statsByPlayer.get(participant.jugador_id)
    if (!current) continue
    current.appMatches.add(participant.partido_id)
    current.minutes += Math.max(toNumber(participant.minutos_jugados), 0)
  }

  for (const event of events) {
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
      if (!relatedId) continue
      const current = statsByPlayer.get(relatedId)
      if (current) current.assists += 1
    }
  }

  return basePlayers
    .map((player) => {
      const stats = statsByPlayer.get(player.sourceUserId)
      const apps = stats?.appMatches.size ?? 0
      const minutes = stats?.minutes ?? 0
      const goals = stats?.goals ?? 0
      const assists = stats?.assists ?? 0
      const yellows = stats?.yellows ?? 0
      const reds = stats?.reds ?? 0
      return {
        id: player.id,
        teamId: player.teamId,
        name: player.name,
        team: player.team,
        position: player.position,
        age: player.age,
        dorsal: player.dorsal,
        avatarUrl: player.avatarUrl,
        dominantFoot: player.dominantFoot,
        heightCm: player.heightCm,
        weightKg: player.weightKg,
        gender: player.gender,
        phone: player.phone,
        city: player.city,
        country: player.country,
        bio: player.bio,
        instagram: player.instagram,
        objective: player.objective,
        joinedAt: player.joinedAt,
        stats: {
          apps,
          minutes,
          goals,
          assists,
          goalsPerMinute: minutes > 0 ? goals / minutes : 0,
          yellows,
          reds,
          starts: apps,
        },
      }
    })
    .sort((a, b) => {
      if (a.team !== b.team) return a.team.localeCompare(b.team, "es")
      if (a.dorsal !== null && b.dorsal !== null && a.dorsal !== b.dorsal) return a.dorsal - b.dorsal
      return a.name.localeCompare(b.name, "es")
    })
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

  const db = createSupabaseAdmin() ?? supabase

  const { data: clubData, error: clubError } = await db
    .from("clubes")
    .select("id, nombre")
    .eq("id", clubId)
    .maybeSingle()

  if (clubError || !clubData) notFound()

  const { data: equiposData, error: equiposError } = await db
    .from("equipos")
    .select("id, nombre, categoria, temporada")
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
          .select("usuario_id, equipo_id, dorsal, fecha_alta")
          .in("equipo_id", equipoIds)
          .eq("rol", "JUGADOR")
          .eq("estado", "ACTIVO")
          .order("fecha_alta", { ascending: false }),
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

  const members = (membersResult.data ?? []) as MemberRow[]
  const userIds = [...new Set(members.map((member) => member.usuario_id).filter((id): id is string => Boolean(id)))]
  const matches = (matchesResult.data ?? []) as MatchRow[]
  const matchIds = matches.map((match) => match.id)

  const extendedProfilesPromise = userIds.length
    ? db
        .from("perfiles")
        .select("id, nombre, genero, foto_url, posicion, edad, pie_dominante, altura_cm, peso_kg, telefono, ciudad, pais, bio, instagram, objetivo")
        .in("id", userIds)
    : Promise.resolve({ data: [], error: null })

  const [profilesResult, eventsResult, participantsResult] = await Promise.all([
    extendedProfilesPromise,
    matchIds.length
      ? db
          .from("eventos_partido")
          .select("partido_id, tipo, jugador_id, jugador_relacionado_id")
          .in("partido_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length && userIds.length
      ? db
          .from("participantes_partido")
          .select("partido_id, jugador_id, minutos_jugados")
          .in("partido_id", matchIds)
          .in("jugador_id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  let profilesData = profilesResult.data ?? []

  if (profilesResult.error && userIds.length) {
    const baseProfilesResult = await db
      .from("perfiles")
      .select("id, nombre, genero, foto_url, posicion, edad, pie_dominante, altura_cm, peso_kg, telefono, ciudad, pais")
      .in("id", userIds)

    if (baseProfilesResult.error) throw new Error(baseProfilesResult.error.message)
    profilesData = baseProfilesResult.data ?? []
  }

  if (eventsResult.error) throw new Error(eventsResult.error.message)
  if (participantsResult.error) throw new Error(participantsResult.error.message)

  const profilesById = new Map(
    (profilesData as ProfileRow[]).map((profile) => [profile.id, profile])
  )
  const players = buildPlayers(
    members,
    equiposById,
    profilesById,
    (eventsResult.data ?? []) as MatchEventRow[],
    (participantsResult.data ?? []) as MatchParticipantRow[]
  )
  const playersByTeam = equipos.map((equipo) => ({
    equipo,
    players: players.filter((player) => player.teamId === equipo.id),
  }))

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
      <SidebarInset className="bg-transparent">
        <SiteHeader clubName={clubName} backHref={clubDashboardHref} />
        <main className="px-5 py-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#005db6]">
              Plantilla del club
            </p>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h2 className="[font-family:var(--font-plus-jakarta)] text-3xl font-black text-[#181c20]">
                  Jugadores
                </h2>
                <p className="mt-1 text-sm font-medium text-[#657086]">
                  {players.length} jugadores activos de {equipos.length} equipos.
                </p>
              </div>
            </div>
          </div>

          {players.length > 0 ? (
            <div className="space-y-12">
              {playersByTeam.map(({ equipo, players: teamPlayers }) => {
                if (teamPlayers.length === 0) return null

                const teamTitle = [
                  valueOrDash(equipo.nombre),
                  equipo.categoria?.trim() ? equipo.categoria.trim() : null,
                ]
                  .filter(Boolean)
                  .join(" · ")

                return (
                  <section key={equipo.id} className="space-y-5">
                    <div className="flex flex-col gap-2 border-b border-[#d9e4f7] pb-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#005db6]">
                          Equipo
                        </p>
                        <h3 className="[font-family:var(--font-plus-jakarta)] text-2xl font-black text-[#181c20]">
                          {teamTitle}
                        </h3>
                        {equipo.temporada ? (
                          <p className="mt-1 text-sm font-semibold text-[#657086]">
                            Temporada {equipo.temporada}
                          </p>
                        ) : null}
                      </div>
                      <span className="w-fit rounded-full bg-[#d6e3ff] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#00468c]">
                        {teamPlayers.length} jugadores
                      </span>
                    </div>
                    <PlayerGrid players={teamPlayers} equipoId={equipo.id} />
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#d9e4f7] bg-white p-8 text-sm font-semibold text-[#657086]">
              No hay jugadores activos registrados en este club.
            </div>
          )}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
