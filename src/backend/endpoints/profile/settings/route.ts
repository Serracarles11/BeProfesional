import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const FULL_SELECT =
  'nombre, genero, edad, peso_kg, altura_cm, posicion, pie_dominante, foto_url, telefono, ciudad, pais, bio, instagram, objetivo, perfil_completo'
const BASIC_SELECT =
  'nombre, genero, edad, peso_kg, altura_cm, posicion, pie_dominante, foto_url, perfil_completo'

function trimIfString(value: unknown) {
  if (typeof value !== 'string') return value
  return value.trim()
}

function normalizePayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {}

  const textFields = [
    'nombre',
    'genero',
    'posicion',
    'pie_dominante',
    'foto_url',
    'telefono',
    'ciudad',
    'pais',
    'bio',
    'instagram',
    'objetivo',
  ]

  for (const key of textFields) {
    if (body[key] !== undefined) {
      const raw = trimIfString(body[key])
      payload[key] = raw === '' ? null : raw
    }
  }

  const numericFields = ['edad', 'peso_kg', 'altura_cm']
  for (const key of numericFields) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      const numeric = Number(body[key])
      if (!Number.isNaN(numeric)) payload[key] = numeric
    } else if (body[key] === null || body[key] === '') {
      payload[key] = null
    }
  }

  payload.actualizado_en = new Date().toISOString()
  return payload
}

function validatePayload(payload: Record<string, unknown>) {
  const edad = payload.edad
  if (typeof edad === 'number' && (edad < 10 || edad > 100)) {
    return 'La edad debe estar entre 10 y 100.'
  }

  const peso = payload.peso_kg
  if (typeof peso === 'number' && (peso < 20 || peso > 300)) {
    return 'El peso debe estar entre 20 y 300 kg.'
  }

  const altura = payload.altura_cm
  if (typeof altura === 'number' && (altura < 100 || altura > 250)) {
    return 'La altura debe estar entre 100 y 250 cm.'
  }

  const textLimits: Record<string, number> = {
    nombre: 90,
    posicion: 60,
    pie_dominante: 25,
    foto_url: 2000,
    telefono: 30,
    ciudad: 90,
    pais: 90,
    bio: 1000,
    instagram: 120,
    objetivo: 500,
  }

  for (const [field, limit] of Object.entries(textLimits)) {
    const value = payload[field]
    if (typeof value === 'string' && value.length > limit) {
      return `El campo ${field} supera el maximo (${limit}).`
    }
  }

  return null
}

async function loadProfileWithFallback(supabase: Awaited<ReturnType<typeof createSupabaseRouteHandler>>, userId: string) {
  const full = await supabase.from('perfiles').select(FULL_SELECT).eq('id', userId).maybeSingle()
  if (!full.error) {
    return full
  }

  if (full.error.code !== '42703') {
    return full
  }

  return supabase.from('perfiles').select(BASIC_SELECT).eq('id', userId).maybeSingle()
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const profileResult = await loadProfileWithFallback(supabase, user.id)
    if (profileResult.error) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo cargar el perfil.', details: profileResult.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      profile: profileResult.data ?? {},
      email: user.email ?? '',
    })
  } catch (error) {
    console.error('GET /api/profile/settings error:', error)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = (await request.json()) as Record<string, unknown>
    const payload = normalizePayload(body)

    const validationError = validatePayload(payload)
    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 })
    }

    const updateResult = await supabase
      .from('perfiles')
      .update(payload)
      .eq('id', user.id)

    if (updateResult.error) {
      return NextResponse.json(
        { ok: false, error: 'No se pudo guardar el perfil.', details: updateResult.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/profile/settings error:', error)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor.' }, { status: 500 })
  }
}
