import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type MatchRow = {
  id: string
  equipo_id: string
  fecha_hora: string
  rival_nombre: string | null
  recordatorio_estadisticas_enviado_en: string | null
}

type ParticipantRow = {
  partido_id: string
  jugador_id?: string | null
  usuario_id?: string | null
  convocado: boolean | null
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

function toDbNotificationType(type: string) {
  if (type.includes('partido')) return 'RECORDATORIO'
  return 'OTRA'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

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

    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    console.log('REMINDER WINDOW START', twentyFourHoursAgo.toISOString())
    console.log('REMINDER WINDOW END', twoHoursAgo.toISOString())

    const { data: matchesData, error: matchesError } = await supabase
      .from('partidos')
      .select('id, equipo_id, fecha_hora, rival_nombre, recordatorio_estadisticas_enviado_en')
      .gte('fecha_hora', twentyFourHoursAgo.toISOString())
      .lte('fecha_hora', twoHoursAgo.toISOString())
      .is('recordatorio_estadisticas_enviado_en', null)

    if (matchesError) {
      console.error('MATCH QUERY ERROR', matchesError)
      return jsonResponse({ ok: false, error: 'Match query failed', details: matchesError }, 500)
    }

    const matches = (matchesData ?? []) as MatchRow[]
    console.log('MATCHES FOUND', matches.length)

    let createdNotifications = 0
    let matchesWithoutCalledUpPlayers = 0

    for (const match of matches) {
      console.log('PROCESSING MATCH', JSON.stringify(match))

      const { data: participantsData, error: participantsError } = await supabase
        .from('participantes_partido')
        .select('*')
        .eq('partido_id', match.id)
        .eq('convocado', true)

      if (participantsError) {
        console.error('PARTICIPANTS QUERY ERROR', participantsError)
        continue
      }

      const participants = (participantsData ?? []) as ParticipantRow[]
      const playerIds = Array.from(
        new Set(
          participants
            .map((participant) => participant.usuario_id ?? participant.jugador_id ?? null)
            .filter((playerId): playerId is string => typeof playerId === 'string' && playerId.length > 0)
        )
      )

      console.log('CALLED UP PLAYERS', playerIds.length)

      if (playerIds.length === 0) {
        matchesWithoutCalledUpPlayers += 1
        console.log('MATCH SKIPPED WITHOUT CALLED UP PLAYERS', match.id)
        continue
      }

      const emailEntries = await Promise.all(
        playerIds.map(async (playerId) => {
          const { data, error } = await supabase.auth.admin.getUserById(playerId)
          if (error || !data.user?.email) {
            console.error('USER EMAIL LOOKUP ERROR', playerId, error)
            return [playerId, null] as const
          }
          return [playerId, data.user.email] as const
        })
      )
      const emailByPlayerId = new Map(emailEntries)
      const rivalLabel = match.rival_nombre?.trim() || 'el partido'
      const rows = playerIds.map((playerId) => ({
        usuario_id: playerId,
        tipo: toDbNotificationType('recordatorio_estadisticas_partido'),
        titulo: 'Registra tus estadisticas del partido',
        mensaje: `Han pasado 2 horas desde el inicio del partido contra ${rivalLabel}. Entra y registra tus estadisticas.`,
        enlace: `/partidos?equipo=${encodeURIComponent(match.equipo_id)}&matchId=${encodeURIComponent(match.id)}&submit=1`,
        email_destino: emailByPlayerId.get(playerId),
      }))

      const { error: insertError } = await supabase.from('notificaciones').insert(rows)
      if (insertError) {
        console.error('NOTIFICATION INSERT ERROR', insertError)
        continue
      }

      createdNotifications += rows.length

      const { error: markError } = await supabase
        .from('partidos')
        .update({ recordatorio_estadisticas_enviado_en: now.toISOString() })
        .eq('id', match.id)

      if (markError) {
        console.error('MATCH MARK ERROR', markError)
      }
    }

    return jsonResponse({
      ok: true,
      matchesProcessed: matches.length,
      notificationsCreated: createdNotifications,
      matchesWithoutCalledUpPlayers,
    })
  } catch (error) {
    console.error('REMINDER FUNCTION ERROR', error)
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
