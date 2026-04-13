import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

type PlaymakerDraftPayload = {
  version: number
  name?: string
  activePhaseId: string
  phases: unknown[]
}

type PlaymakerRow = {
  id: string
  titulo: string
  draft: PlaymakerDraftPayload
  actualizado_en: string
}

function createErrorResponse(message: string, status = 500, details?: string) {
  return NextResponse.json({ ok: false, error: message, details }, { status })
}

function isPlaymakerDraftPayload(value: unknown): value is PlaymakerDraftPayload {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<PlaymakerDraftPayload>
  return (
    draft.version === 1 &&
    typeof draft.activePhaseId === 'string' &&
    Array.isArray(draft.phases)
  )
}

function normalizeTitle(value: unknown, fallbackName?: string) {
  const base =
    (typeof value === 'string' && value.trim()) ||
    (typeof fallbackName === 'string' && fallbackName.trim()) ||
    'Play Maker Draft'

  return base.slice(0, 120)
}

function normalizeUuid(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null
}

function mapPlayRow(row: PlaymakerRow) {
  return {
    id: row.id,
    title: row.titulo,
    updatedAt: row.actualizado_en,
    draft: row.draft,
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse('No autorizado', 401)
    }

    const result = await supabase
      .from('playmaker_plays')
      .select('id, titulo, draft, actualizado_en')
      .eq('usuario_id', user.id)
      .order('actualizado_en', { ascending: false })

    if (result.error) {
      return createErrorResponse('No se pudieron cargar las jugadas.', 500, result.error.message)
    }

    const plays = ((result.data ?? []) as PlaymakerRow[])
      .filter((row) => isPlaymakerDraftPayload(row.draft))
      .map(mapPlayRow)

    return NextResponse.json({ ok: true, plays })
  } catch (error) {
    console.error('GET /api/playmaker/plays error:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
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

    const body = (await request.json()) as Record<string, unknown>
    const draft = body.draft

    if (!isPlaymakerDraftPayload(draft)) {
      return createErrorResponse('El tablero recibido no es valido.', 400)
    }

    const now = new Date().toISOString()
    const title = normalizeTitle(body.title, draft.name)
    const playId = normalizeUuid(body.id)
    const equipoId = normalizeUuid(body.equipoId)

    const draftToStore: PlaymakerDraftPayload = {
      ...draft,
      name: title,
    }

    const basePayload = {
      usuario_id: user.id,
      equipo_id: equipoId,
      titulo: title,
      draft: draftToStore,
      actualizado_en: now,
    }

    let persistedRow: PlaymakerRow | null = null

    if (playId) {
      const updateResult = await supabase
        .from('playmaker_plays')
        .update(basePayload)
        .eq('id', playId)
        .eq('usuario_id', user.id)
        .select('id, titulo, draft, actualizado_en')
        .maybeSingle()

      if (updateResult.error) {
        return createErrorResponse('No se pudo actualizar la jugada.', 500, updateResult.error.message)
      }

      if (updateResult.data) {
        persistedRow = updateResult.data as PlaymakerRow
      }
    }

    if (!persistedRow) {
      const insertResult = await supabase
        .from('playmaker_plays')
        .insert({
          id: playId ?? undefined,
          ...basePayload,
        })
        .select('id, titulo, draft, actualizado_en')
        .single()

      if (insertResult.error || !insertResult.data) {
        return createErrorResponse('No se pudo guardar la jugada.', 500, insertResult.error?.message)
      }

      persistedRow = insertResult.data as PlaymakerRow
    }

    return NextResponse.json({ ok: true, play: mapPlayRow(persistedRow) })
  } catch (error) {
    console.error('POST /api/playmaker/plays error:', error)
    return createErrorResponse('Error interno del servidor.', 500)
  }
}
