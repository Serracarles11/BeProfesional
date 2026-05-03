import { NextRequest, NextResponse } from 'next/server'
import { notifyTeamMembers } from '@/lib/notifications'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type TrainingType = 'FISICO' | 'TECNICO' | 'TACTICO' | 'RECUPERACION'

type WeeklyTrainingBody = {
  equipoId?: unknown
  weekdays?: unknown
  time?: unknown
  title?: unknown
  type?: unknown
  place?: unknown
  weeks?: unknown
}

const WEEKDAY_LABELS = new Map([
  [1, 'lunes'],
  [2, 'martes'],
  [3, 'miercoles'],
  [4, 'jueves'],
  [5, 'viernes'],
  [6, 'sabado'],
  [7, 'domingo'],
])

function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function normalizeText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function isCoachRole(role: string | null | undefined) {
  const normalized = normalizeText(role)
  return normalized.includes('ENTREN') || normalized.includes('COACH') || normalized === 'ADMIN'
}

function parseTrainingType(value: unknown): TrainingType | null {
  if (
    value === 'FISICO' ||
    value === 'TECNICO' ||
    value === 'TACTICO' ||
    value === 'RECUPERACION'
  ) {
    return value
  }

  return null
}

function parseWeekdays(value: unknown) {
  if (!Array.isArray(value)) return null

  const weekdays = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7)

  return Array.from(new Set(weekdays)).sort((left, right) => left - right)
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value)
}

function getMadridTodayUtcNoon() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
}

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getIsoWeekday(date: Date) {
  const day = date.getUTCDay()
  return day === 0 ? 7 : day
}

function buildTrainingDates(weekdays: number[], weeks: number) {
  const weekdaySet = new Set(weekdays)
  const start = getMadridTodayUtcNoon()
  const dates: string[] = []
  const totalDays = weeks * 7

  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + offset)
    if (weekdaySet.has(getIsoWeekday(date))) {
      dates.push(toUtcDateKey(date))
    }
  }

  return dates
}

function formatWeekdayList(weekdays: number[]) {
  const labels = weekdays.map((day) => WEEKDAY_LABELS.get(day)).filter(Boolean)
  if (labels.length <= 1) return labels[0] ?? 'los días seleccionados'
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const body = (await request.json()) as WeeklyTrainingBody
    const equipoId = typeof body.equipoId === 'string' ? body.equipoId.trim() : ''
    const weekdays = parseWeekdays(body.weekdays)
    const time = typeof body.time === 'string' ? body.time.trim() : ''
    const title = typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : 'Entrenamiento semanal'
    const type = parseTrainingType(body.type) ?? 'TACTICO'
    const place = typeof body.place === 'string' ? body.place.trim() : ''
    const weeksValue = Number(body.weeks ?? 12)
    const weeks = Number.isFinite(weeksValue) ? Math.min(Math.max(Math.trunc(weeksValue), 1), 24) : 12

    if (!equipoId) return createErrorResponse('equipoId inválido.', 400)
    if (!weekdays || weekdays.length === 0) {
      return createErrorResponse('Selecciona al menos un día de entrenamiento.', 400)
    }
    if (!time || !isValidTime(time)) return createErrorResponse('Hora invalida.', 400)

    const [membershipResult, teamOwnerResult] = await Promise.all([
      supabase
        .from('miembros_equipo')
        .select('rol')
        .eq('equipo_id', equipoId)
        .eq('usuario_id', user.id)
        .eq('estado', 'ACTIVO')
        .maybeSingle(),
      supabase
        .from('equipos')
        .select('creado_por')
        .eq('id', equipoId)
        .maybeSingle(),
    ])

    if (teamOwnerResult.error) {
      return createErrorResponse('No se pudo validar el equipo.', 500)
    }

    const isTeamOwner = teamOwnerResult.data?.creado_por === user.id

    if (membershipResult.error && !isTeamOwner) {
      return createErrorResponse('No se pudo validar tu rol en el equipo.', 500)
    }

    if (!membershipResult.data && !isTeamOwner) {
      return createErrorResponse('No perteneces al equipo solicitado.', 403)
    }

    if (!isTeamOwner && !isCoachRole(membershipResult.data?.rol)) {
      return createErrorResponse('Solo un entrenador puede crear entrenamientos.', 403)
    }

    const dates = buildTrainingDates(weekdays, weeks)
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    if (!startDate || !endDate) {
      return createErrorResponse('No se pudieron calcular las fechas de entrenamiento.', 400)
    }

    const writeClient = createSupabaseAdmin() ?? supabase
    const startTime = `${time}:00`
    const fixedGroupId = crypto.randomUUID()

    const deletePreviousFixedResult = await writeClient
      .from('entrenamientos_equipo')
      .delete()
      .eq('equipo_id', equipoId)
      .eq('creado_como_fijo', true)
      .gte('fecha', startDate)

    if (
      deletePreviousFixedResult.error &&
      deletePreviousFixedResult.error.code !== 'PGRST204' &&
      !deletePreviousFixedResult.error.message?.includes("'creado_como_fijo'")
    ) {
      console.error('No se pudieron limpiar entrenamientos fijos anteriores:', deletePreviousFixedResult.error)
      return createErrorResponse('No se pudieron reemplazar los entrenamientos fijos anteriores.', 500)
    }

    const existingResult = await writeClient
      .from('entrenamientos_equipo')
      .select('fecha, hora_inicio, titulo')
      .eq('equipo_id', equipoId)
      .gte('fecha', startDate)
      .lte('fecha', endDate)

    if (existingResult.error) {
      console.error('No se pudieron validar entrenamientos existentes:', existingResult.error)
      return createErrorResponse('No se pudieron validar entrenamientos existentes.', 500)
    }

    const existingKeys = new Set(
      (existingResult.data ?? []).map((row) => `${row.fecha}|${row.hora_inicio}|${row.titulo}`)
    )
    const rows = dates
      .filter((date) => !existingKeys.has(`${date}|${startTime}|${title}`))
      .map((date) => ({
        id: crypto.randomUUID(),
        equipo_id: equipoId,
        fecha: date,
        titulo: title,
        tipo: type,
        estado: 'PUBLICADO' as const,
        creado_por: user.id,
        hora_inicio: startTime,
        lugar: place || null,
        creado_como_fijo: true,
        grupo_fijo_id: fixedGroupId,
      }))

    if (rows.length > 0) {
      const insertResult = await writeClient.from('entrenamientos_equipo').insert(rows)
      if (insertResult.error) {
        if (
          insertResult.error.code === 'PGRST204' ||
          insertResult.error.message?.includes("'creado_como_fijo'") ||
          insertResult.error.message?.includes("'grupo_fijo_id'")
        ) {
          const fallbackRows = rows.map((row) => ({
            id: row.id,
            equipo_id: row.equipo_id,
            fecha: row.fecha,
            titulo: row.titulo,
            tipo: row.tipo,
            estado: row.estado,
            creado_por: row.creado_por,
            hora_inicio: row.hora_inicio,
            lugar: row.lugar,
          }))
          const fallbackInsertResult = await writeClient.from('entrenamientos_equipo').insert(fallbackRows)
          if (fallbackInsertResult.error) {
            console.error('No se pudieron insertar entrenamientos semanales:', fallbackInsertResult.error)
            return createErrorResponse('No se pudieron crear los entrenamientos semanales.', 500)
          }
        } else {
          console.error('No se pudieron insertar entrenamientos semanales:', insertResult.error)
          return createErrorResponse('No se pudieron crear los entrenamientos semanales.', 500)
        }
      }
    }

    await notifyTeamMembers(writeClient, equipoId, {
      tipo: 'entrenamiento_creado',
      titulo: 'Entrenamientos fijos',
      mensaje: `Se han anadido entrenamientos los ${formatWeekdayList(weekdays)} a las ${time}${place ? ` en ${place}` : ''}.`,
      enlace: `/home?equipo=${encodeURIComponent(equipoId)}`,
    })

    return NextResponse.json({
      ok: true,
      createdCount: rows.length,
      skippedCount: dates.length - rows.length,
    })
  } catch (error) {
    console.error('Error en POST /api/dashboard/home/trainings/weekly:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
