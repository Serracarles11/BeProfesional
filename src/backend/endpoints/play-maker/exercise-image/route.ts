import { NextRequest, NextResponse } from 'next/server'

const EXERCISEDB_BASE_URL = process.env.EXERCISEDB_BASE_URL?.trim() || 'https://exercisedb.p.rapidapi.com'
const EXERCISEDB_HOST = process.env.EXERCISEDB_RAPIDAPI_HOST?.trim() || 'exercisedb.p.rapidapi.com'
const EXERCISEDB_KEY = process.env.EXERCISEDB_RAPIDAPI_KEY?.trim() || ''

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(request: NextRequest) {
  try {
    if (!EXERCISEDB_KEY) {
      return errorResponse('Falta configurar EXERCISEDB_RAPIDAPI_KEY.', 500)
    }

    const exerciseId = request.nextUrl.searchParams.get('exerciseId')?.trim() ?? ''
    const requestedResolution = request.nextUrl.searchParams.get('resolution')?.trim() ?? '180'
    const resolution = ['180', '360', '720'].includes(requestedResolution) ? requestedResolution : '180'

    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(exerciseId)) {
      return errorResponse('exerciseId inválido.', 400)
    }

    const url = new URL('/image', EXERCISEDB_BASE_URL)
    url.searchParams.set('exerciseId', exerciseId)
    url.searchParams.set('resolution', resolution)

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': EXERCISEDB_KEY,
        'X-RapidAPI-Host': EXERCISEDB_HOST,
        Accept: 'image/gif,image/*,*/*',
      },
      next: { revalidate: 60 * 60 * 24 * 7 },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return errorResponse(errorText || `ExerciseDB respondio con estado ${response.status}.`, response.status)
    }

    const contentType = response.headers.get('content-type') || 'image/gif'
    const body = await response.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'No se pudo cargar la imagen del ejercicio.', 500)
  }
}
