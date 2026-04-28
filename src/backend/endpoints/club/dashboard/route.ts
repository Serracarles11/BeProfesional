import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const CLUB_STAFF_ROLES = ['ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR']

type MembershipRow = {
  id: string
  rol: string
  estado: string
  club_id: string
  clubes?: { id: string; nombre: string } | { id: string; nombre: string }[] | null
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
  equipo_id?: string | null
  usuario_id?: string | null
  dorsal: string | number | null
  estado: string | null
  rol: string | null
  equipos?: {
    id: string
    nombre: string | null
    club_id: string | null
    categoria: string | null
    categoria_anio: string | null
    temporada: string | null
  } | null
  perfiles?: {
    id: string
    nombre: string | null
    foto_url: string | null
    edad: number | null
    posicion: string | null
    pie_dominante: string | null
    altura_cm: number | null
    peso_kg: number | null
    telefono: string | null
    ciudad: string | null
    pais: string | null
  } | null
}

function normalizeClub(clubes: MembershipRow['clubes']) {
  if (Array.isArray(clubes)) return clubes[0] ?? null
  return clubes ?? null
}

function normalizeRelated<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function pickTemporada(equipos: EquipoRow[]) {
  const counts = new Map<string, number>()
  equipos.forEach((equipo) => {
    if (!equipo.temporada) return
    counts.set(equipo.temporada, (counts.get(equipo.temporada) ?? 0) + 1)
  })

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? null
}

async function safeQuery<T>(promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const { data, error } = await promise
  return {
    data: error ? [] : data ?? [],
    error: error?.message ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 })
    }

    const requestedClubId = request.nextUrl.searchParams.get('club')

    let membershipQuery = supabase
      .from('miembros_club')
      .select(
        `
        id,
        rol,
        estado,
        club_id,
        clubes (
          id,
          nombre
        )
      `
      )
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .in('rol', CLUB_STAFF_ROLES)

    if (requestedClubId) {
      membershipQuery = membershipQuery.eq('club_id', requestedClubId)
    }

    const { data: membershipData, error: membershipError } = await membershipQuery
      .limit(1)

    if (membershipError) {
      return NextResponse.json({ ok: false, error: membershipError.message }, { status: 400 })
    }

    const membership = (membershipData?.[0] ?? null) as MembershipRow | null
    const club = membership ? normalizeClub(membership.clubes) : null

    if (!membership || !club) {
      return NextResponse.json(
        { ok: false, error: 'No tienes un club asignado como staff administrativo.' },
        { status: 403 }
      )
    }

    const db = createSupabaseAdmin() ?? supabase
    const clubId = membership.club_id

    const { data: equiposRaw, error: equiposError } = await db
      .from('equipos')
      .select(
        'id, nombre, categoria, categoria_anio, temporada, ubicacion, campo_juego, ciudad, provincia, pais'
      )
      .eq('club_id', clubId)
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true })

    if (equiposError) {
      return NextResponse.json({ ok: false, error: equiposError.message }, { status: 400 })
    }

    const equipos = (equiposRaw ?? []) as EquipoRow[]
    const equipoIds = equipos.map((equipo) => equipo.id)

    const jugadoresResult = await safeQuery<JugadorRow>(
      db
        .from('miembros_equipo')
        .select(
          `
          id,
          equipo_id,
          usuario_id,
          dorsal,
          estado,
          rol,
          equipos!inner (
            id,
            nombre,
            club_id,
            categoria,
            categoria_anio,
            temporada
          ),
          perfiles!inner (
            id,
            nombre,
            foto_url,
            edad,
            posicion,
            pie_dominante,
            altura_cm,
            peso_kg,
            telefono,
            ciudad,
            pais
          )
        `
        )
        .eq('estado', 'ACTIVO')
        .eq('rol', 'JUGADOR')
        .eq('equipos.club_id', clubId)
    )

    const jugadores = jugadoresResult.data.map((row) => {
      const equipo = normalizeRelated(row.equipos)
      const perfil = normalizeRelated(row.perfiles)

      return {
        id: row.id,
        equipoId: equipo?.id ?? row.equipo_id ?? null,
        usuarioId: perfil?.id ?? row.usuario_id ?? null,
        dorsal: row.dorsal ?? null,
        equipoNombre: equipo?.nombre ?? 'Equipo',
        categoria: equipo?.categoria ?? null,
        categoriaAnio: equipo?.categoria_anio ?? null,
        temporada: equipo?.temporada ?? null,
        nombre: perfil?.nombre ?? 'Jugador',
        fotoUrl: perfil?.foto_url ?? null,
        edad: perfil?.edad ?? null,
        posicion: perfil?.posicion ?? null,
        pieDominante: perfil?.pie_dominante ?? null,
        alturaCm: perfil?.altura_cm ?? null,
        pesoKg: perfil?.peso_kg ?? null,
        telefono: perfil?.telefono ?? null,
        ciudad: perfil?.ciudad ?? null,
        pais: perfil?.pais ?? null,
      }
    })

    const jugadoresPorEquipo = jugadores.reduce<Record<string, number>>((acc, jugador) => {
      if (jugador.equipoId) acc[jugador.equipoId] = (acc[jugador.equipoId] ?? 0) + 1
      return acc
    }, {})

    const [entrenamientosResult, partidosResult, bienestarResult, checkinsResult, actividadResult] =
      await Promise.all([
        safeQuery(
          db
            .from('entrenamientos_equipo')
            .select(
              `
              id,
              equipo_id,
              fecha,
              hora_inicio,
              hora_fin,
              titulo,
              tipo,
              intensidad,
              lugar,
              estado,
              equipos!inner (
                id,
                nombre,
                club_id,
                categoria,
                categoria_anio
              )
            `
            )
            .eq('equipos.club_id', clubId)
            .order('fecha', { ascending: false })
            .limit(100)
        ),
        safeQuery(
          db
            .from('partidos')
            .select(
              `
              id,
              equipo_id,
              fecha_hora,
              competicion,
              casa_fuera,
              rival_nombre,
              lugar,
              estado,
              goles_favor,
              goles_contra,
              equipos!inner (
                id,
                nombre,
                club_id,
                categoria,
                categoria_anio
              )
            `
            )
            .eq('equipos.club_id', clubId)
            .order('fecha_hora', { ascending: false })
            .limit(100)
        ),
        equipoIds.length
          ? safeQuery(
              db
                .from('home_bienestar_diario')
                .select('id, equipo_id, usuario_id, fecha, estado_mental, fatiga, asiste_entrenamiento')
                .in('equipo_id', equipoIds)
                .order('fecha', { ascending: false })
                .limit(100)
            )
          : Promise.resolve({ data: [], error: null }),
        equipoIds.length
          ? safeQuery(
              db
                .from('checkins_diarios')
                .select(
                  'id, equipo_id, jugador_id, fecha, horas_sueno, animo, fatiga, dolor_muscular, estres, molestias_lesion, comentario'
                )
                .in('equipo_id', equipoIds)
                .order('fecha', { ascending: false })
                .limit(100)
            )
          : Promise.resolve({ data: [], error: null }),
        equipoIds.length
          ? safeQuery(
              db
                .from('registros_actividad')
                .select(
                  'id, equipo_id, jugador_id, fecha_hora, tipo, duracion_min, distancia_km, rpe_esfuerzo, carga, notas'
                )
                .in('equipo_id', equipoIds)
                .order('fecha_hora', { ascending: false })
                .limit(100)
            )
          : Promise.resolve({ data: [], error: null }),
      ])

    return NextResponse.json({
      ok: true,
      membership: {
        id: membership.id,
        role: membership.rol,
        status: membership.estado,
        clubId,
        clubName: club.nombre,
      },
      summary: {
        totalEquipos: equipos.length,
        totalJugadores: jugadores.length,
        temporadaActual: pickTemporada(equipos),
      },
      equipos: equipos.map((equipo) => ({
        ...equipo,
        jugadoresCount: jugadoresPorEquipo[equipo.id] ?? 0,
      })),
      jugadores,
      entrenamientos: entrenamientosResult.data,
      partidos: partidosResult.data,
      bienestar: {
        home: bienestarResult.data,
        checkins: checkinsResult.data,
        actividad: actividadResult.data,
      },
      warnings: [
        jugadoresResult.error,
        entrenamientosResult.error,
        partidosResult.error,
        bienestarResult.error,
        checkinsResult.error,
        actividadResult.error,
      ].filter(Boolean),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor.'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
