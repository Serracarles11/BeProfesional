type WebhookBody = {
  record?: Record<string, unknown>
  new?: Record<string, unknown>
  [key: string]: unknown
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        error: 'Method not allowed',
        details: `Metodo recibido: ${req.method}`,
      },
      405
    )
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('EMAIL_FROM')
    const appUrl = Deno.env.get('APP_URL') ?? ''

    if (!resendApiKey) {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing RESEND_API_KEY',
          details: 'No existe la secret RESEND_API_KEY en la Edge Function.',
        },
        500
      )
    }

    if (!emailFrom) {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing EMAIL_FROM',
          details: 'No existe la secret EMAIL_FROM en la Edge Function.',
        },
        500
      )
    }

    const body = (await req.json().catch((error) => {
      console.error('ERROR PARSEANDO BODY', error)
      return null
    })) as WebhookBody | null

    console.log('BODY RECIBIDO', JSON.stringify(body, null, 2))

    if (!body || typeof body !== 'object') {
      return jsonResponse(
        {
          ok: false,
          error: 'Invalid body',
          details: 'El webhook no envio un JSON valido.',
        },
        400
      )
    }

    const record =
      body.record && typeof body.record === 'object'
        ? body.record
        : body.new && typeof body.new === 'object'
          ? body.new
          : body
    console.log('RECORD PROCESADO', JSON.stringify(record, null, 2))

    const to = firstString(
      record.email_destino,
      record.email,
      record.to,
      record.destinatario_email,
      record.usuario_email
    )

    const subject =
      firstString(record.asunto, record.titulo, record.subject) ?? 'Nueva notificacion'

    const message =
      firstString(record.mensaje, record.message, record.descripcion, record.contenido) ??
      'Tienes una nueva notificacion.'

    console.log('EMAIL TO', to)
    console.log('EMAIL SUBJECT', subject)
    console.log('EMAIL MESSAGE', message)

    if (!to) {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing recipient',
          details:
            'No se encontro email_destino, email, to, destinatario_email ni usuario_email en el record del webhook.',
        },
        400
      )
    }

    const enlace = firstString(record.enlace, record.link, record.url)
    const attachmentBase64 = firstString(
      record.email_adjunto_base64,
      record.adjunto_base64,
      record.attachment_base64
    )
    const attachmentName =
      firstString(record.email_adjunto_nombre, record.adjunto_nombre, record.attachment_name) ??
      'convocatoria.pdf'
    console.log('EMAIL ATTACHMENT NAME', attachmentName)
    console.log('EMAIL ATTACHMENT BASE64', attachmentBase64 ? 'PRESENTE' : 'NO PRESENTE')

    const fullLink =
      enlace && /^https?:\/\//i.test(enlace)
        ? enlace
        : enlace && appUrl
          ? `${appUrl.replace(/\/+$/, '')}/${enlace.replace(/^\/+/, '')}`
          : null

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${escapeHtml(subject)}</h2>
        <p style="margin: 0 0 16px;">${escapeHtml(message)}</p>
        ${
          fullLink
            ? `<a href="${escapeHtml(fullLink)}" style="display: inline-block; background: #005db6; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 700;">Abrir BeProfessional</a>`
            : ''
        }
      </div>
    `

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject,
        html,
        attachments: attachmentBase64
          ? [
              {
                filename: attachmentName,
                content: attachmentBase64,
              },
            ]
          : undefined,
      }),
    })

    const resendText = await resendResponse.text()
    console.log('RESEND STATUS', resendResponse.status)
    console.log('RESEND RESPONSE', resendText)

    if (!resendResponse.ok) {
      return jsonResponse(
        {
          ok: false,
          error: 'Resend error',
          details: resendText,
        },
        502
      )
    }

    return jsonResponse({
      ok: true,
      details: resendText,
    })
  } catch (error) {
    console.error('ERROR EN EDGE FUNCTION enviar-notificacion', error)

    return jsonResponse(
      {
        ok: false,
        error: 'Unhandled error',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
