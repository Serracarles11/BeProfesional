import { createSupabaseServer } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServer>>

type TeamSummary = {
  id: string
  nombre: string
  club: string | null
  categoria: string | null
  temporada: string | null
  logoUrl: string | null
}

type TopPlayerItem = {
  usuarioId: string
  nombre: string
  fotoUrl: string | null
  posicion: string | null
  primaryLabel: string
  primaryValue: string
  secondaryLabel?: string
  secondaryValue?: string
}

type RecentTrainingItem = {
  id: string
  fecha: string
  horaInicio: string | null
  titulo: string
  tipo: string | null
  intensidad: string | null
  estado: string | null
  asistentes: number
  totalJugadores: number
  asistenciaPct: number | null
  avgRpe: number | null
}

export type TrainingInsightPayload = {
  summary: string
  key_metrics: Array<{ label: string; value: string }>
  risks: string[]
  recommendations: string[]
  next_session_focus: string[]
}

export type TrainingInsightHistoryItem = {
  id: string
  createdAt: string
  tipo: string | null
  data: TrainingInsightPayload
}

export type TrainingStatsDashboardData = {
  team: TeamSummary
  role: string | null
  totalJugadores: number
  totalMiembrosActivos: number
  summaryWeekly: {
    entrenos7d: number
    entrenosProx7d: number
    asistenciaMedia7dPct: number | null
    avgRpe7d: number | null
  }
  attendanceCard: {
    asistenciaMediaPct: number | null
    asistentesTotal: number
    cuposTotales: number
    entrenosContabilizados: number
  }
  loadCard: {
    avgRpeEntrenos: number | null
    avgIntensityScore: number | null
    avgIntensityLabel: string
    cargaTotal14d: number
    sesionesExtra14d: number
    avgRpeActividad14d: number | null
    duracionTotalMin14d: number
  }
  wellnessCard: {
    suenoMedioHoras: number | null
    animoMedio: number | null
    fatigaMedia: number | null
    estresMedio: number | null
    dolorMuscularMedio: number | null
    alerts: string[]
    muestras: number
  }
  topPlayers: {
    byRpe: TopPlayerItem[]
    byAttendance: TopPlayerItem[]
    byLoad: TopPlayerItem[]
  }
  recentTrainings: RecentTrainingItem[]
  history: TrainingInsightHistoryItem[]
  meta: {
    today: string
    rangeTrainingsFrom: string
    rangeTrainingsTo: string
    rangeWellnessFrom: string
  }
}

export type LoadTrainingStatsResult =
  | { ok: true; data: TrainingStatsDashboardData }
  | { ok: false; error: string; code?: string | null; details?: string | null; hint?: string | null }

function dateKey(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function avg(values: Array<number | null | undefined>, digits = 1) {
  let sum = 0
  let count = 0
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      sum += v
      count += 1
    }
  }
  return count > 0 ? round(sum / count, digits) : null
}

function pct(n: number, d: number, digits = 1) {
  if (d <= 0) return null
  return round((n / d) * 100, digits)
}

function norm(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function isCancelled(estado: string | null | undefined) {
  return norm(estado).includes('CANCEL')
}

function intensityInfo(raw: unknown) {
  const n = toNumber(raw)
  if (n !== null) return { label: String(raw), score: n }
  if (typeof raw !== 'string' || !raw.trim()) return { label: null, score: null as number | null }
  const v = norm(raw)
  if (v.includes('MUY_ALTA')) return { label: raw, score: 4 }
  if (v.includes('ALTA')) return { label: raw, score: 3 }
  if (v.includes('MEDIA')) return { label: raw, score: 2 }
  if (v.includes('BAJA')) return { label: raw, score: 1 }
  return { label: raw, score: null as number | null }
}

function intensityLabel(score: number | null) {
  if (score === null) return 'Sin datos'
  if (score >= 3.5) return 'Muy alta'
  if (score >= 2.5) return 'Alta'
  if (score >= 1.5) return 'Media'
  return 'Baja'
}

function formatNum(value: number | null, suffix = '') {
  return value === null ? '—' : `${round(value, 1)}${suffix}`
}

function getErrorMeta(error: unknown) {
  const e = (error ?? {}) as { code?: string | null; details?: string | null; hint?: string | null }
  return { code: e.code ?? null, details: e.details ?? null, hint: e.hint ?? null }
}

function isPresentAttendanceState(estado: unknown) {
  if (typeof estado !== 'string') return false

  const v = estado
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()

  if (!v) return false
  if (v.includes('AUSEN') || v.includes('NO_ASIST') || v.includes('FALTA')) return false
  return v.includes('ASIST') || v.includes('PRES') || v === 'CONFIRMADO' || v === 'OK'
}

function parseProfile(raw: unknown) {
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  return {
    nombre: typeof r.nombre === 'string' ? r.nombre : null,
    foto_url: typeof r.foto_url === 'string' ? r.foto_url : null,
    posicion: typeof r.posicion === 'string' ? r.posicion : null,
  }
}

function parseTeamFromMembership(raw: unknown): TeamSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const equipoRaw = Array.isArray(row.equipo) ? row.equipo[0] : row.equipo
  if (!equipoRaw || typeof equipoRaw !== 'object') return null
  const equipo = equipoRaw as Record<string, unknown>
  const id = typeof equipo.id === 'string' ? equipo.id : null
  const nombre = typeof equipo.nombre === 'string' ? equipo.nombre : null
  if (!id || !nombre) return null
  return {
    id,
    nombre,
    club: typeof equipo.club === 'string' ? equipo.club : null,
    categoria: typeof equipo.categoria === 'string' ? equipo.categoria : null,
    temporada: typeof equipo.temporada === 'string' ? equipo.temporada : null,
    logoUrl: typeof equipo.logo_url === 'string' ? equipo.logo_url : null,
  }
}

function stringArray(value: unknown, max = 10) {
  if (!Array.isArray(value)) return [] as string[]
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max)
}

export function normalizeTrainingInsightPayload(raw: unknown): TrainingInsightPayload {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const keyMetricsRaw = Array.isArray(data.key_metrics) ? data.key_metrics : []
  const key_metrics = keyMetricsRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const r = item as Record<string, unknown>
      const label = typeof r.label === 'string' ? r.label.trim() : ''
      const value = typeof r.value === 'string' ? r.value.trim() : ''
      if (!label || !value) return null
      return { label, value }
    })
    .filter((row): row is { label: string; value: string } => row !== null)
    .slice(0, 8)

  return {
    summary: typeof data.summary === 'string' ? data.summary.trim() : '',
    key_metrics,
    risks: stringArray(data.risks, 10),
    recommendations: stringArray(data.recommendations, 12),
    next_session_focus: stringArray(data.next_session_focus, 10),
  }
}

export async function loadTrainingStatsDashboardData({
  supabase,
  equipoId,
  userId,
  includeHistory = true,
  historyLimit = 10,
}: {
  supabase: SupabaseClient
  equipoId: string
  userId: string
  includeHistory?: boolean
  historyLimit?: number
}): Promise<LoadTrainingStatsResult> {
  const now = new Date()
  const today = dateKey(now)
  const last7From = dateKey(addDays(now, -6))
  const last30From = dateKey(addDays(now, -30))
  const next7To = dateKey(addDays(now, 7))
  const next14To = dateKey(addDays(now, 14))
  const wellnessFrom = dateKey(addDays(now, -13))
  const wellnessFromIso = new Date(`${wellnessFrom}T00:00:00`).toISOString()

  const membershipQuery = await supabase
    .from('miembros_equipo')
    .select('rol, estado, equipo:equipos(id, nombre, club, categoria, temporada, logo_url)')
    .eq('equipo_id', equipoId)
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .maybeSingle()

  if (membershipQuery.error) {
    return { ok: false, error: 'No se pudo validar tu acceso al equipo.', ...getErrorMeta(membershipQuery.error) }
  }
  if (!membershipQuery.data) {
    return { ok: false, error: 'No perteneces al equipo solicitado.', code: 'TEAM_FORBIDDEN' }
  }

  const team = parseTeamFromMembership(membershipQuery.data)
  if (!team) {
    return { ok: false, error: 'No se pudo leer el equipo seleccionado.', code: 'TEAM_NOT_FOUND' }
  }

  const [membersRes, trainingsRes, checkinsRes, activityRes, historyRes] = await Promise.all([
    supabase
      .from('miembros_equipo')
      .select('usuario_id, rol, dorsal, estado, perfiles(nombre, foto_url, posicion)')
      .eq('equipo_id', equipoId)
      .eq('estado', 'ACTIVO'),
    supabase
      .from('entrenamientos_equipo')
      .select('id, fecha, hora_inicio, hora_fin, titulo, tipo, intensidad, estado')
      .eq('equipo_id', equipoId)
      .gte('fecha', last30From)
      .lte('fecha', next14To)
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false }),
    supabase
      .from('checkins_diarios')
      .select('jugador_id, fecha, horas_sueno, animo, fatiga, dolor_muscular, estres')
      .eq('equipo_id', equipoId)
      .gte('fecha', wellnessFrom)
      .lte('fecha', today),
    supabase
      .from('registros_actividad')
      .select('jugador_id, fecha_hora, tipo, duracion_min, rpe_esfuerzo, carga')
      .eq('equipo_id', equipoId)
      .gte('fecha_hora', wellnessFromIso),
    includeHistory
      ? supabase
          .from('ia_recomendaciones')
          .select('id, tipo, datos, creado_en')
          .eq('equipo_id', equipoId)
          .eq('tipo', 'training_insights')
          .order('creado_en', { ascending: false })
          .limit(Math.max(0, historyLimit))
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ])

  if (membersRes.error) {
    return { ok: false, error: 'No se pudieron cargar los miembros del equipo.', ...getErrorMeta(membersRes.error) }
  }
  if (trainingsRes.error) {
    return { ok: false, error: 'No se pudieron cargar los entrenamientos.', ...getErrorMeta(trainingsRes.error) }
  }
  if (checkinsRes.error) {
    return { ok: false, error: 'No se pudieron cargar los check-ins.', ...getErrorMeta(checkinsRes.error) }
  }
  if (activityRes.error) {
    return { ok: false, error: 'No se pudieron cargar los registros de actividad.', ...getErrorMeta(activityRes.error) }
  }
  if (historyRes.error) {
    return { ok: false, error: 'No se pudo cargar el historial IA.', ...getErrorMeta(historyRes.error) }
  }

  const members = ((membersRes.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const usuarioId = typeof row.usuario_id === 'string' ? row.usuario_id : null
      if (!usuarioId) return null
      const p = parseProfile(row.perfiles)
      return {
        usuarioId,
        rol: typeof row.rol === 'string' ? row.rol : null,
        nombre: p?.nombre ?? 'Jugador',
        fotoUrl: p?.foto_url ?? null,
        posicion: p?.posicion ?? null,
      }
    })
    .filter(
      (
        row
      ): row is { usuarioId: string; rol: string | null; nombre: string; fotoUrl: string | null; posicion: string | null } =>
        row !== null
    )

  const jugadores = members.filter((m) => norm(m.rol) === 'JUGADOR')
  const totalJugadores = jugadores.length
  const playerIds = new Set(jugadores.map((j) => j.usuarioId))

  const trainings = ((trainingsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const info = intensityInfo(row.intensidad)
    return {
      id: typeof row.id === 'string' ? row.id : '',
      fecha: typeof row.fecha === 'string' ? row.fecha : '',
      horaInicio: typeof row.hora_inicio === 'string' ? row.hora_inicio : null,
      titulo: typeof row.titulo === 'string' && row.titulo.trim() ? row.titulo : 'Entrenamiento',
      tipo: typeof row.tipo === 'string' ? row.tipo : null,
      intensidad: info.label,
      intensidadScore: info.score,
      estado: typeof row.estado === 'string' ? row.estado : null,
    }
  }).filter((t) => t.id && t.fecha)

  const trainingIds = trainings.map((t) => t.id)
  const attendanceByTraining = new Map<string, { asistentes: number; rpeSum: number; rpeCount: number }>()
  const attendanceByPlayer = new Map<string, { count: number; rpeSum: number; rpeCount: number }>()
  for (const j of jugadores) attendanceByPlayer.set(j.usuarioId, { count: 0, rpeSum: 0, rpeCount: 0 })

  if (trainingIds.length > 0) {
    const currentAttendanceRes = await supabase
      .from('entrenamiento_asistencias')
      .select('entrenamiento_id, usuario_id, asiste')
      .in('entrenamiento_id', trainingIds)

    if (!currentAttendanceRes.error) {
      for (const raw of (currentAttendanceRes.data ?? []) as Array<Record<string, unknown>>) {
        const entrenamientoId = typeof raw.entrenamiento_id === 'string' ? raw.entrenamiento_id : null
        const jugadorId = typeof raw.usuario_id === 'string' ? raw.usuario_id : null
        const present = raw.asiste === true
        if (!entrenamientoId) continue

        const row = attendanceByTraining.get(entrenamientoId) ?? { asistentes: 0, rpeSum: 0, rpeCount: 0 }
        if (present) {
          row.asistentes += 1
          if (jugadorId && playerIds.has(jugadorId)) {
            const p = attendanceByPlayer.get(jugadorId)
            if (p) p.count += 1
          }
        }
        attendanceByTraining.set(entrenamientoId, row)
      }
    } else {
      const attendanceRes = await supabase
        .from('asistencia_entrenamientos')
        .select('entrenamiento_id, jugador_id, estado, rpe')
        .in('entrenamiento_id', trainingIds)

      if (attendanceRes.error) {
        return { ok: false, error: 'No se pudo cargar la asistencia.', ...getErrorMeta(currentAttendanceRes.error) }
      }

      for (const raw of (attendanceRes.data ?? []) as Array<Record<string, unknown>>) {
        const entrenamientoId = typeof raw.entrenamiento_id === 'string' ? raw.entrenamiento_id : null
        if (!entrenamientoId) continue
        const row = attendanceByTraining.get(entrenamientoId) ?? { asistentes: 0, rpeSum: 0, rpeCount: 0 }
        const present = isPresentAttendanceState(raw.estado)
        const rpe = toNumber(raw.rpe)
        const jugadorId = typeof raw.jugador_id === 'string' ? raw.jugador_id : null

        if (present) {
          row.asistentes += 1
          if (jugadorId && playerIds.has(jugadorId)) {
            const p = attendanceByPlayer.get(jugadorId)
            if (p) p.count += 1
          }
        }
        if (rpe !== null) {
          row.rpeSum += rpe
          row.rpeCount += 1
          if (jugadorId && playerIds.has(jugadorId)) {
            const p = attendanceByPlayer.get(jugadorId)
            if (p) {
              p.rpeSum += rpe
              p.rpeCount += 1
            }
          }
        }
        attendanceByTraining.set(entrenamientoId, row)
      }
    }
  }

  const trainingsWithStats = trainings.map((t) => {
    const a = attendanceByTraining.get(t.id)
    return {
      ...t,
      asistentes: a?.asistentes ?? 0,
      avgRpe: a && a.rpeCount > 0 ? round(a.rpeSum / a.rpeCount, 1) : null,
    }
  })

  const completedTrainings = trainingsWithStats.filter((t) => t.fecha <= today && !isCancelled(t.estado))
  const last7Trainings = completedTrainings.filter((t) => t.fecha >= last7From)
  const next7Trainings = trainingsWithStats.filter((t) => t.fecha > today && t.fecha <= next7To && !isCancelled(t.estado))

  const totalAsistentes = completedTrainings.reduce((acc, t) => acc + t.asistentes, 0)
  const cuposTotales = totalJugadores * completedTrainings.length
  const weeklyAsistentes = last7Trainings.reduce((acc, t) => acc + t.asistentes, 0)
  const weeklyCupos = totalJugadores * last7Trainings.length

  const activityByPlayer = new Map<string, { carga: number; sesiones: number }>()
  for (const j of jugadores) activityByPlayer.set(j.usuarioId, { carga: 0, sesiones: 0 })
  let cargaTotal14d = 0
  let sesionesExtra14d = 0
  let duracionTotalMin14d = 0
  let activityRpeSum = 0
  let activityRpeCount = 0

  for (const raw of (activityRes.data ?? []) as Array<Record<string, unknown>>) {
    const dur = toNumber(raw.duracion_min) ?? 0
    const rpe = toNumber(raw.rpe_esfuerzo)
    const carga = toNumber(raw.carga) ?? (rpe !== null ? round(rpe * dur, 1) : 0)
    const jugadorId = typeof raw.jugador_id === 'string' ? raw.jugador_id : null

    cargaTotal14d += carga
    sesionesExtra14d += 1
    duracionTotalMin14d += dur
    if (rpe !== null) {
      activityRpeSum += rpe
      activityRpeCount += 1
    }

    if (jugadorId && playerIds.has(jugadorId)) {
      const item = activityByPlayer.get(jugadorId)
      if (item) {
        item.carga += carga
        item.sesiones += 1
      }
    }
  }

  const checkins = (checkinsRes.data ?? []) as Array<Record<string, unknown>>
  const suenoMedioHoras = avg(checkins.map((c) => toNumber(c.horas_sueno)))
  const animoMedio = avg(checkins.map((c) => toNumber(c.animo)))
  const fatigaMedia = avg(checkins.map((c) => toNumber(c.fatiga)))
  const dolorMuscularMedio = avg(checkins.map((c) => toNumber(c.dolor_muscular)))
  const estresMedio = avg(checkins.map((c) => toNumber(c.estres)))

  const alerts: string[] = []
  if (suenoMedioHoras !== null && suenoMedioHoras < 7) alerts.push(`Sueno medio bajo (${suenoMedioHoras}h).`)
  if (fatigaMedia !== null && fatigaMedia >= 7) alerts.push(`Fatiga media alta (${fatigaMedia}/10).`)
  if (estresMedio !== null && estresMedio >= 7) alerts.push(`Estres medio alto (${estresMedio}/10).`)
  if (dolorMuscularMedio !== null && dolorMuscularMedio >= 6) alerts.push(`Dolor muscular elevado (${dolorMuscularMedio}/10).`)

  const recentTrainings: RecentTrainingItem[] = [...completedTrainings]
    .sort((a, b) => {
      const ka = `${a.fecha}T${a.horaInicio ?? '00:00:00'}`
      const kb = `${b.fecha}T${b.horaInicio ?? '00:00:00'}`
      return ka > kb ? -1 : ka < kb ? 1 : 0
    })
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      fecha: t.fecha,
      horaInicio: t.horaInicio,
      titulo: t.titulo,
      tipo: t.tipo,
      intensidad: t.intensidad,
      estado: t.estado,
      asistentes: t.asistentes,
      totalJugadores,
      asistenciaPct: totalJugadores > 0 ? pct(t.asistentes, totalJugadores) : null,
      avgRpe: t.avgRpe,
    }))

  const denominatorAttendance = completedTrainings.length

  const byRpe = jugadores
    .map((j) => {
      const m = attendanceByPlayer.get(j.usuarioId) ?? { count: 0, rpeSum: 0, rpeCount: 0 }
      const avgRpe = m.rpeCount > 0 ? round(m.rpeSum / m.rpeCount, 1) : null
      return { j, count: m.count, avgRpe }
    })
    .filter((x) => x.avgRpe !== null)
    .sort((a, b) => (b.avgRpe ?? 0) - (a.avgRpe ?? 0) || a.j.nombre.localeCompare(b.j.nombre, 'es'))
    .slice(0, 5)
    .map<TopPlayerItem>((x) => ({
      usuarioId: x.j.usuarioId,
      nombre: x.j.nombre,
      fotoUrl: x.j.fotoUrl,
      posicion: x.j.posicion,
      primaryLabel: 'RPE',
      primaryValue: formatNum(x.avgRpe),
      secondaryLabel: 'Asist.',
      secondaryValue: String(x.count),
    }))

  const byAttendance =
    denominatorAttendance > 0
      ? jugadores
          .map((j) => {
            const m = attendanceByPlayer.get(j.usuarioId) ?? { count: 0, rpeSum: 0, rpeCount: 0 }
            const rate = pct(m.count, denominatorAttendance)
            return { j, count: m.count, rate }
          })
          .sort(
            (a, b) =>
              b.count - a.count || (b.rate ?? 0) - (a.rate ?? 0) || a.j.nombre.localeCompare(b.j.nombre, 'es')
          )
          .slice(0, 5)
          .map<TopPlayerItem>((x) => ({
            usuarioId: x.j.usuarioId,
            nombre: x.j.nombre,
            fotoUrl: x.j.fotoUrl,
            posicion: x.j.posicion,
            primaryLabel: 'Asist.',
            primaryValue: String(x.count),
            secondaryLabel: 'Cobertura',
            secondaryValue: x.rate === null ? '—' : `${x.rate}%`,
          }))
      : []

  const byLoad = jugadores
    .map((j) => {
      const a = activityByPlayer.get(j.usuarioId) ?? { carga: 0, sesiones: 0 }
      return { j, carga: round(a.carga, 1), sesiones: a.sesiones }
    })
    .filter((x) => x.carga > 0)
    .sort((a, b) => b.carga - a.carga || a.j.nombre.localeCompare(b.j.nombre, 'es'))
    .slice(0, 5)
    .map<TopPlayerItem>((x) => ({
      usuarioId: x.j.usuarioId,
      nombre: x.j.nombre,
      fotoUrl: x.j.fotoUrl,
      posicion: x.j.posicion,
      primaryLabel: 'Carga',
      primaryValue: String(x.carga),
      secondaryLabel: 'Sesiones',
      secondaryValue: String(x.sesiones),
    }))

  const history = ((historyRes.data ?? []) as Array<Record<string, unknown>>).map<TrainingInsightHistoryItem>((row) => ({
    id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
    createdAt: typeof row.creado_en === 'string' ? row.creado_en : new Date().toISOString(),
    tipo: typeof row.tipo === 'string' ? row.tipo : null,
    data: normalizeTrainingInsightPayload(row.datos),
  }))

  const avgIntensityScore = avg(completedTrainings.map((t) => t.intensidadScore))
  const avgRpeEntrenos = avg(completedTrainings.map((t) => t.avgRpe))

  return {
    ok: true,
    data: {
      team,
      role: typeof (membershipQuery.data as Record<string, unknown>).rol === 'string' ? norm((membershipQuery.data as Record<string, unknown>).rol as string) : null,
      totalJugadores,
      totalMiembrosActivos: members.length,
      summaryWeekly: {
        entrenos7d: last7Trainings.length,
        entrenosProx7d: next7Trainings.length,
        asistenciaMedia7dPct: totalJugadores > 0 ? pct(weeklyAsistentes, weeklyCupos) : null,
        avgRpe7d: avg(last7Trainings.map((t) => t.avgRpe)),
      },
      attendanceCard: {
        asistenciaMediaPct: totalJugadores > 0 ? pct(totalAsistentes, cuposTotales) : null,
        asistentesTotal: totalAsistentes,
        cuposTotales,
        entrenosContabilizados: completedTrainings.length,
      },
      loadCard: {
        avgRpeEntrenos,
        avgIntensityScore,
        avgIntensityLabel: intensityLabel(avgIntensityScore),
        cargaTotal14d: round(cargaTotal14d, 1),
        sesionesExtra14d,
        avgRpeActividad14d: activityRpeCount > 0 ? round(activityRpeSum / activityRpeCount, 1) : null,
        duracionTotalMin14d: Math.round(duracionTotalMin14d),
      },
      wellnessCard: {
        suenoMedioHoras,
        animoMedio,
        fatigaMedia,
        estresMedio,
        dolorMuscularMedio,
        alerts,
        muestras: checkins.length,
      },
      topPlayers: { byRpe, byAttendance, byLoad },
      recentTrainings,
      history,
      meta: {
        today,
        rangeTrainingsFrom: last30From,
        rangeTrainingsTo: next14To,
        rangeWellnessFrom: wellnessFrom,
      },
    },
  }
}
