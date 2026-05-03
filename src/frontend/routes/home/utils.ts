import type {
  DashboardActivityItem,
  DashboardHomeSuccess,
  DashboardMetric,
  WeeklyCalendarDay,
} from './types'

const ES_DAY_LABELS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']

function toDateKey(input: string | Date) {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    return String(input).slice(0, 10)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const offset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - offset)
  start.setHours(0, 0, 0, 0)
  return start
}

export function withEquipo(path: string, equipoId?: string | null) {
  if (!equipoId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}equipo=${encodeURIComponent(equipoId)}`
}

export function isActivePath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function getMorningBriefingSubtitle(payload: DashboardHomeSuccess) {
  const now = Date.now()
  const nextTraining = payload.schedule.activityItems
    .filter((item) => item.type === 'entrenamiento')
    .filter((item) => {
      const source = item.time ?? item.date
      const timestamp = new Date(source).getTime()
      return Number.isFinite(timestamp) && timestamp >= now
    })
    .sort((a, b) => {
      const left = new Date(a.time ?? a.date).getTime()
      const right = new Date(b.time ?? b.date).getTime()
      return left - right
    })[0]

  if (nextTraining?.time) {
    const date = new Date(nextTraining.time)
    const hour = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    return `Sesion de entrenamiento programada para las ${hour}`
  }

  if (payload.schedule.nextMatch?.fecha_hora) {
    const matchDate = new Date(payload.schedule.nextMatch.fecha_hora)
    const label = matchDate.toLocaleString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    return `Proximo partido ${label}`
  }

  return 'Sin actividad programada para hoy'
}

export function getSeasonLabel(payload: DashboardHomeSuccess) {
  if (payload.equipo?.temporada?.trim()) {
    return payload.equipo.temporada.toUpperCase()
  }

  const now = new Date()
  const year = now.getFullYear()
  const next = String((year + 1) % 100).padStart(2, '0')
  const current = String(year % 100).padStart(2, '0')
  return `TEMPORADA ${current}/${next}`
}

export function buildMetrics(payload: DashboardHomeSuccess): DashboardMetric[] {
  const { wellbeing } = payload
  const mentalLabel = wellbeing.mentalState !== null ? `${wellbeing.mentalState}/10` : '--/10'
  const fatigueLabel = wellbeing.fatigue !== null ? `${wellbeing.fatigue}/10` : '--/10'
  const attendanceLabel = wellbeing.attendanceDate
    ? new Date(`${wellbeing.attendanceDate}T12:00:00`).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      })
    : null

  return [
    {
      id: 'mental',
      label: 'ESTADO MENTAL',
      value: mentalLabel,
      helper: 'Como te encuentras hoy (1-10)',
      icon: 'mental',
    },
    {
      id: 'fatigue',
      label: 'FATIGA',
      value: fatigueLabel,
      helper: 'Nivel de fatiga actual (1-10)',
      icon: 'fatigue',
    },
    {
      id: 'attendance',
      label: 'ASISTENCIA ENTRENO',
      value: String(wellbeing.attendingCount),
      helper: attendanceLabel
        ? `${wellbeing.attendanceTrainingLabel ?? 'Entrenamiento'} · ${attendanceLabel}`
        : 'No hay un proximo entrenamiento programado',
      icon: 'attendance',
    },
  ]
}

export function buildInsight(payload: DashboardHomeSuccess) {
  const { kpis, schedule, teamSummary } = payload

  if (kpis.goalsAgainst > kpis.goalsFor) {
    return {
      title: 'AI Insight: Ajuste Defensivo',
      description:
        'El equipo está recibiendo más goles de los que anota en la muestra reciente. Se recomienda reforzar bloque medio y transiciones tras pérdida durante esta semana.',
    }
  }

  if (kpis.yellowCards >= 6) {
    return {
      title: 'AI Insight: Control de Riesgo',
      description:
        'Se detecta una carga disciplinaria alta. Conviene reducir entradas al limite en tareas competitivas y reforzar toma de decision en duelos.',
    }
  }

  if (schedule.nextMatch?.fecha_hora) {
    const rival = schedule.nextMatch.rival_nombre ?? 'rival pendiente'
    return {
      title: 'AI Insight: Preparacion de Partido',
      description: `Próximo encuentro frente a ${rival}. Recomendación: sesión táctica corta y trabajo específico por líneas para llegar con mejor frescura.`,
    }
  }

  return {
    title: 'AI Insight: Carga Balanceada',
    description: `Plantilla de ${teamSummary.playerCount || teamSummary.totalMembers} jugadores con dinamica estable. Mantener alternancia de cargas y bloque de recuperacion activo.`,
  }
}

export function buildWeekDays(
  calendarDays: DashboardHomeSuccess['schedule']['calendarDays'],
  activityItems: DashboardActivityItem[],
  weekOffset: number
): WeeklyCalendarDay[] {
  const today = new Date()
  const todayKey = toDateKey(today)

  const eventMap = new Map<string, number>()
  for (const day of calendarDays) {
    if (day.hasEvent) {
      eventMap.set(day.date, (eventMap.get(day.date) ?? 0) + 1)
    }
  }

  for (const item of activityItems) {
    const source = item.time ?? item.date
    const key = toDateKey(source)
    eventMap.set(key, (eventMap.get(key) ?? 0) + 1)
  }

  const baseWeek = getStartOfWeek(today)
  baseWeek.setDate(baseWeek.getDate() + weekOffset * 7)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseWeek)
    date.setDate(baseWeek.getDate() + index)

    const key = toDateKey(date)
    const dayNumber = date.getDate()
    const isToday = key === todayKey

    return {
      key,
      dayLabel: ES_DAY_LABELS[index],
      dayNumber,
      isToday,
      isSelected: isToday,
      eventCount: eventMap.get(key) ?? 0,
    }
  })
}

export function getPlayerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PL'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '--'
  return new Intl.NumberFormat('es-ES').format(value)
}

export function getPassAccuracy(payload: DashboardHomeSuccess) {
  if (payload.playerSpotlight.passAccPct !== null) {
    return clamp(payload.playerSpotlight.passAccPct, 0, 100)
  }

  const base = payload.kpis.winrate > 0 ? payload.kpis.winrate * 0.85 : 0
  return clamp(Math.round(base), 0, 100)
}

export function getEstimatedTopSpeed(payload: DashboardHomeSuccess) {
  if (payload.playerSpotlight.avgRating !== null) {
    return Number((27 + payload.playerSpotlight.avgRating).toFixed(1))
  }

  const base = 24 + payload.kpis.pointsPerGame * 2.1
  return Number(clamp(base, 24, 36).toFixed(1))
}
