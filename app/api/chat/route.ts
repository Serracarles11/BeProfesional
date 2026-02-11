import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `Eres un asistente deportivo profesional especializado en futbol y gestion de equipos.
Tu nombre es BePro AI. Ayudas a entrenadores y jugadores con:
- Analisis tactico y estrategias de juego
- Planificacion de entrenamientos
- Analisis de rendimiento de jugadores
- Consejos de nutricion y preparacion fisica
- Motivacion y liderazgo deportivo
- Estadisticas y metricas de rendimiento

Responde siempre en espanol de forma clara, concisa y profesional.
Usa un tono amigable pero experto. Si te preguntan sobre algo fuera del ambito deportivo,
redirige la conversacion amablemente hacia temas deportivos.`

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'La API key de OpenAI no esta configurada. Agrega OPENAI_API_KEY en las variables de entorno.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Mensajes invalidos' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-20),
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const reply = completion.choices[0]?.message?.content || 'No pude generar una respuesta.'

    return NextResponse.json({ message: reply })
  } catch (error) {
    console.error('Chat API error:', error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'API key de OpenAI invalida. Verifica tu configuracion.' },
          { status: 401 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
