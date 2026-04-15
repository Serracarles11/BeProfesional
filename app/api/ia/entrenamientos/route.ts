import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerOpenAiConfig, getServerOpenAiKeyError } from '@/lib/openai-server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'
import { loadTrainingStatsDashboardData, normalizeTrainingInsightPayload } from '@/lib/training-stats'

type RequestBody = {
  equipoId?: unknown
  days?: unknown
}

function errorResponse(error: string, status = 500, code?: string) {
  return NextResponse.json({ ok: false, error, code }, { status })
}

function clampDays(value: unknown) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n)) return 14
  return Math.max(7, Math.min(30, Math.round(n)))
}

function extractJson(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1)
  }
  return null
}

function buildModelInput(stats: Awaited<ReturnType<typeof loadTrainingStatsDashboardData>>) {
  if (!stats.ok) return null

  return {
    team: stats.data.team,
    role: stats.data.role,
    total_players: stats.data.totalJugadores,
    summary_weekly: stats.data.summaryWeekly,
    attendance: stats.data.attendanceCard,
    load: stats.data.loadCard,
    wellness: stats.data.wellnessCard,
    recent_trainings: stats.data.recentTrainings.slice(0, 8).map((t) => ({
      fecha: t.fecha,
      titulo: t.titulo,
      tipo: t.tipo,
      intensidad: t.intensidad,
      estado: t.estado,
      asistentes: t.asistentes,
      totalJugadores: t.totalJugadores,
      asistenciaPct: t.asistenciaPct,
      avgRpe: t.avgRpe,
    })),
    top_players: {
      by_rpe: stats.data.topPlayers.byRpe.map((p) => ({
        nombre: p.nombre,
        primary: `${p.primaryLabel}: ${p.primaryValue}`,
        secondary: p.secondaryLabel && p.secondaryValue ? `${p.secondaryLabel}: ${p.secondaryValue}` : null,
      })),
      by_attendance: stats.data.topPlayers.byAttendance.map((p) => ({
        nombre: p.nombre,
        primary: `${p.primaryLabel}: ${p.primaryValue}`,
        secondary: p.secondaryLabel && p.secondaryValue ? `${p.secondaryLabel}: ${p.secondaryValue}` : null,
      })),
      by_load: stats.data.topPlayers.byLoad.map((p) => ({
        nombre: p.nombre,
        primary: `${p.primaryLabel}: ${p.primaryValue}`,
        secondary: p.secondaryLabel && p.secondaryValue ? `${p.secondaryLabel}: ${p.secondaryValue}` : null,
      })),
    },
    meta: stats.data.meta,
  }
}

export async function POST(request: NextRequest) {
  try {
    const openAiConfig = getServerOpenAiConfig()
    if (!openAiConfig) {
      return errorResponse(getServerOpenAiKeyError(), 500)
    }
    const apiKey = openAiConfig.apiKey

    const body = (await request.json()) as RequestBody
    const equipoId = typeof body.equipoId === 'string' ? body.equipoId.trim() : ''
    const days = clampDays(body.days)

    if (!equipoId) {
      return errorResponse('equipoId es obligatorio.', 400, 'INVALID_BODY')
    }

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse('No autorizado', 401, 'UNAUTHORIZED')
    }

    const stats = await loadTrainingStatsDashboardData({
      supabase,
      equipoId,
      userId: user.id,
      includeHistory: false,
    })

    if (!stats.ok) {
      const status = stats.code === 'TEAM_FORBIDDEN' ? 403 : 500
      return errorResponse(stats.error, status, stats.code ?? 'STATS_ERROR')
    }

    const modelInput = buildModelInput(stats)
    if (!modelInput) {
      return errorResponse('No se pudo preparar el contexto de IA.', 500, 'MODEL_INPUT_ERROR')
    }

    const systemPrompt = [
      'Eres un analista de rendimiento para un equipo deportivo.',
      'Responde SIEMPRE en espanol.',
      'Devuelve SOLO JSON valido (sin markdown, sin comentarios).',
      'Usa este esquema exacto:',
      '{"summary":"", "key_metrics":[{"label":"","value":""}], "risks":[""], "recommendations":[""], "next_session_focus":[""]}',
      'Las recomendaciones deben ser practicas y accionables para el cuerpo tecnico.',
      'Si faltan datos, dilo explicitamente en summary y evita inventar.',
    ].join(' ')

    const userPrompt = JSON.stringify(
      {
        objetivo: `Generar recomendaciones de entreno enfocadas en los ultimos ${days} dias`,
        contexto: modelInput,
      },
      null,
      2
    )

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.25,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const rawText = completion.choices[0]?.message?.content?.trim()
    if (!rawText) {
      return errorResponse('La IA no devolvio contenido.', 502, 'EMPTY_AI_RESPONSE')
    }

    const jsonText = extractJson(rawText)
    if (!jsonText) {
      return errorResponse('No se pudo interpretar la respuesta de IA como JSON.', 502, 'INVALID_AI_JSON')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return errorResponse('La IA devolvio JSON invalido.', 502, 'INVALID_AI_JSON')
    }

    const insight = normalizeTrainingInsightPayload(parsed)
    if (
      !insight.summary &&
      insight.key_metrics.length === 0 &&
      insight.risks.length === 0 &&
      insight.recommendations.length === 0 &&
      insight.next_session_focus.length === 0
    ) {
      return errorResponse('La IA devolvio una respuesta vacia.', 502, 'EMPTY_AI_JSON')
    }

    const insertRes = await supabase.from('ia_recomendaciones').insert({
      equipo_id: equipoId,
      usuario_id: user.id,
      tipo: 'training_insights',
      datos: insight,
    })

    if (insertRes.error) {
      console.error('Error guardando ia_recomendaciones:', insertRes.error)
      return errorResponse('Se genero la recomendacion pero no se pudo guardar.', 500, 'SAVE_FAILED')
    }

    return NextResponse.json({
      ok: true,
      data: insight,
    })
  } catch (error) {
    console.error('Error en POST /api/ia/entrenamientos:', error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) return errorResponse('API key de OpenAI invalida.', 401, 'OPENAI_UNAUTHORIZED')
      if (error.status === 429) return errorResponse('Limite de OpenAI alcanzado. Intenta de nuevo.', 429, 'OPENAI_RATE_LIMIT')
    }

    return errorResponse('Error interno del servidor.', 500, 'INTERNAL_ERROR')
  }
}

