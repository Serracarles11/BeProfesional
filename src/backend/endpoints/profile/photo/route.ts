import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const PROFILE_BUCKET = 'profile-photos'
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const MAX_FILE_SIZE = 5 * 1024 * 1024

function safePath(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/')) return fallback
  return value
}

function getExtension(file: File) {
  const byMime = ALLOWED_TYPES.get(file.type)
  if (byMime) return byMime

  const parts = file.name.split('.')
  const extension = parts.length > 1 ? parts.pop()?.toLowerCase() : null
  if (extension === 'jpg' || extension === 'jpeg') return 'jpg'
  if (extension === 'png') return 'png'
  if (extension === 'webp') return 'webp'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { action?: string; next?: string | null }

      if (body.action === 'skip') {
        return NextResponse.json({
          ok: true,
          redirectTo: safePath(body.next ?? null, '/equipos'),
        })
      }

      return NextResponse.json({ ok: false, error: 'Accion no valida' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const next = safePath(String(formData.get('next') ?? '/equipos'), '/equipos')

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No se ha recibido ninguna imagen.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: 'La imagen supera el maximo de 5 MB.' }, { status: 400 })
    }

    const extension = getExtension(file)
    if (!extension) {
      return NextResponse.json(
        { ok: false, error: 'Formato no válido. Usa JPG, PNG o WEBP.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = `${user.id}/avatar.${extension}`

    const uploadResult = await supabase.storage.from(PROFILE_BUCKET).upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (uploadResult.error) {
      console.error('Error subiendo foto de perfil:', uploadResult.error)
      return NextResponse.json(
        { ok: false, error: 'No se pudo subir la imagen al almacenamiento.' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(filePath)

    const updateResult = await supabase
      .from('perfiles')
      .update({
        foto_url: publicUrlData.publicUrl,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateResult.error) {
      console.error('Error guardando foto_url en perfiles:', updateResult.error)
      return NextResponse.json(
        { ok: false, error: 'La imagen se subio, pero no se pudo guardar en tu perfil.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      foto_url: publicUrlData.publicUrl,
      redirectTo: next,
    })
  } catch (error) {
    console.error('Error en POST /api/profile/photo:', error)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
