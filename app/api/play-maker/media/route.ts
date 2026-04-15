import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandler } from '@/lib/supabase/server'

const MEDIA_BUCKET = 'profile-photos'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 5 * 1024 * 1024

function sanitizeBaseName(filename: string) {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  const cleaned = withoutExtension.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return cleaned || 'imagen'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandler()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No se ha recibido ninguna imagen.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: 'Formato no valido. Usa JPG, PNG o WEBP.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: 'La imagen supera el maximo de 5 MB.' }, { status: 400 })
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer())
    const webpBuffer = await sharp(inputBuffer)
      .rotate()
      .webp({ quality: 84, effort: 5 })
      .toBuffer()

    const fileBaseName = sanitizeBaseName(file.name)
    const filePath = `${user.id}/routine-media/${Date.now()}-${randomUUID()}-${fileBaseName}.webp`

    const uploadResult = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, webpBuffer, {
      contentType: 'image/webp',
      upsert: false,
    })

    if (uploadResult.error) {
      console.error('Error subiendo multimedia de rutina:', uploadResult.error)
      return NextResponse.json(
        { ok: false, error: 'No se pudo subir la imagen al almacenamiento.' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath)

    return NextResponse.json({
      ok: true,
      imageUrl: publicUrlData.publicUrl,
      path: filePath,
      name: `${fileBaseName}.webp`,
      contentType: 'image/webp',
    })
  } catch (error) {
    console.error('Error en POST /api/play-maker/media:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}