import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 5 * 1024 * 1024

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.REMOVEBG_API_KEY
    if (!apiKey) {
      return errorResponse('Falta configurar REMOVEBG_API_KEY en variables de entorno.', 500)
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return errorResponse('Content-Type invalido. Debe ser multipart/form-data.', 400)
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return errorResponse('No se ha recibido el archivo.', 400)
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return errorResponse('Formato no valido. Usa JPG, PNG o WEBP.', 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('La imagen supera el maximo de 5 MB.', 400)
    }

    const removeBgForm = new FormData()
    removeBgForm.append('image_file', file, file.name || 'upload')
    removeBgForm.append('size', 'auto')

    const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgForm,
      cache: 'no-store',
    })

    if (!removeBgResponse.ok) {
      const responseType = removeBgResponse.headers.get('content-type') ?? ''
      let details = ''

      if (responseType.includes('application/json')) {
        const body = (await removeBgResponse.json()) as { errors?: Array<{ title?: string }> }
        details = body.errors?.[0]?.title ?? ''
      } else {
        details = await removeBgResponse.text()
      }

      const message = details
        ? `remove.bg devolvio error: ${details}`
        : 'No se pudo quitar el fondo de la imagen.'

      return errorResponse(message, 502)
    }

    const resultBuffer = await removeBgResponse.arrayBuffer()

    return new NextResponse(resultBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('POST /api/remove-background error:', error)
    return errorResponse('Error interno al procesar la imagen.', 500)
  }
}
