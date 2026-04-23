import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function cleanText(value: unknown) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeText(value: unknown) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      equipoId?: string
      categoria?: string
      force?: boolean
    }

    const equipoId = cleanText(body?.equipoId)
    const categoria = cleanText(body?.categoria).toLowerCase()
    const force = body?.force === true

    if (!equipoId || !categoria) {
      return NextResponse.json(
        { ok: false, error: 'Necesitamos equipoId y categoria.' },
        { status: 400 },
      )
    }

    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 })
    }

    const membership = await supabase
      .from('miembros_equipo')
      .select('equipo:equipos(id, nombre, categoria)')
      .eq('equipo_id', equipoId)
      .eq('usuario_id', user.id)
      .eq('estado', 'ACTIVO')
      .maybeSingle()

    if (membership.error) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo validar el equipo activo.' },
        { status: 500 },
      )
    }

    if (!membership.data) {
      return NextResponse.json(
        { ok: false, error: 'No perteneces al equipo solicitado.' },
        { status: 403 },
      )
    }

    const equipoRaw = Array.isArray((membership.data as { equipo?: unknown }).equipo)
      ? ((membership.data as { equipo?: Array<Record<string, unknown>> }).equipo?.[0] ?? null)
      : ((membership.data as { equipo?: Record<string, unknown> | null }).equipo ?? null)

    if (!equipoRaw || typeof equipoRaw !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'No se encontro el equipo solicitado.' },
        { status: 404 },
      )
    }

    const equipoNombre = cleanText((equipoRaw as Record<string, unknown>).nombre)
    const equipoCategoria = cleanText((equipoRaw as Record<string, unknown>).categoria).toLowerCase()

    if (
      normalizeText(equipoNombre) !== 'PE SANT JORDI' ||
      normalizeText(categoria) !== 'REGIONAL'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Por ahora solo soportamos imports FFIB para PE SANT JORDI en categoria regional.',
        },
        { status: 400 },
      )
    }

    if (equipoCategoria && equipoCategoria !== categoria) {
      return NextResponse.json(
        {
          ok: false,
          error: `La categoria enviada (${categoria}) no coincide con la categoria del equipo (${equipoCategoria}).`,
        },
        { status: 400 },
      )
    }

    const { importFfIbToAppTables } = (await import(
      '@/scrapers/importFfIbToAppTables.js'
    )) as {
      importFfIbToAppTables: (args: {
        equipoId: string
        categoria: string
        force?: boolean
        forceScrape?: boolean
      }) => Promise<unknown>
    }

    const summary = await importFfIbToAppTables({
      equipoId,
      categoria,
      force,
      forceScrape: force,
    })

    return NextResponse.json({
      ok: true,
      summary,
    })
  } catch (error) {
    console.error('Error en POST /api/import/ffib:', error)

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor.',
      },
      { status: 500 },
    )
  }
}
