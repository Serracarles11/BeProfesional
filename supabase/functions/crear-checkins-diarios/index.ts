import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SummaryError = {
  usuario_id: string | null
  step: string
  message: string
}

type TargetUser = {
  usuario_id: string
  email: string
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

function getMadridDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function maskUserId(value: string | null | undefined) {
  if (!value) return null
  return `${value.slice(0, 8)}...`
}

function errorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return String(error ?? 'Error desconocido')
  const payload = error as { message?: string; details?: string; code?: string }
  return [payload.message, payload.details, payload.code].filter(Boolean).join(' | ') || 'Error desconocido'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const errors: SummaryError[] = []

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          ok: false,
          error: 'Missing Supabase secrets',
          details: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.',
        },
        500
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const today = getMadridDateKey()
    let usersFound = 0
    let checkinsCreated = 0
    let notificationsCreated = 0

    console.log('DAILY CHECKINS START', { fecha: today })

    const { data: users, error: usersError } = await supabase.rpc('get_daily_checkin_target_users')

    if (usersError) {
      errors.push({ usuario_id: null, step: 'getTargetUsers', message: errorMessage(usersError) })
    } else {
      const targetUsers = (users ?? []) as TargetUser[]
      usersFound = targetUsers.length
      console.log('USERS FOUND', { usersWithEmail: usersFound })

      for (const user of targetUsers) {
        const userId = user.usuario_id
        const email = user.email

        const checkinInsert = await supabase
          .from('daily_wellness_checkins')
          .insert({
            usuario_id: userId,
            fecha: today,
          })
          .select('id')
          .single()

        if (checkinInsert.error) {
          if (checkinInsert.error.code === '23505') {
            console.log('CHECKIN ALREADY EXISTS', { usuario_id: maskUserId(userId), fecha: today })
            continue
          }

          errors.push({
            usuario_id: maskUserId(userId),
            step: 'insertCheckin',
            message: errorMessage(checkinInsert.error),
          })
          continue
        }

        checkinsCreated += 1

        const notificationInsert = await supabase.from('notificaciones').insert({
          usuario_id: userId,
          tipo: 'OTRA',
          titulo: 'Check-in diario',
          asunto: 'Check-in diario: \u00bfc\u00f3mo est\u00e1s hoy?',
          mensaje: 'Dedica 20 segundos a registrar tu fatiga f\u00edsica y tu estado mental de hoy.',
          enlace: '/checkin-diario',
          email_destino: email,
        })

        if (notificationInsert.error) {
          errors.push({
            usuario_id: maskUserId(userId),
            step: 'insertNotification',
            message: errorMessage(notificationInsert.error),
          })
          continue
        }

        notificationsCreated += 1
      }
    }

    console.log('DAILY CHECKINS END', {
      fecha: today,
      usersFound,
      checkinsCreated,
      notificationsCreated,
      errors: errors.length,
    })

    return jsonResponse({
      ok: errors.length === 0,
      fecha: today,
      usuarios_encontrados: usersFound,
      checkins_creados: checkinsCreated,
      notificaciones_creadas: notificationsCreated,
      errores: errors,
    })
  } catch (error) {
    console.error('DAILY CHECKINS FUNCTION ERROR', error)
    return jsonResponse(
      {
        ok: false,
        error: 'Unhandled error',
        details: error instanceof Error ? error.message : String(error),
        errores: errors,
      },
      500
    )
  }
})
