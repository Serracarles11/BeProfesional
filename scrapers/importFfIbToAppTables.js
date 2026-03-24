import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MATCH_SCRAPER_ENTRY = path.join(__dirname, 'ffib_santjordi.js')
const MATCH_SCRAPER_OUTPUT = path.join(__dirname, 'ffib_pe_sant_jordi_j1_11_clean.json')
const ACTA_CACHE_DIR = path.join(__dirname, 'cache', 'ffib')
const SOURCE_LABEL = 'ffib'
const IMPORT_COOLDOWN_MS = 6 * 60 * 60 * 1000

const EVENT_TYPE_GOAL = process.env.FFIB_EVENT_TYPE_GOAL?.trim() || 'GOL'
const EVENT_TYPE_YELLOW = process.env.FFIB_EVENT_TYPE_YELLOW?.trim() || 'AMARILLA'
const EVENT_TYPE_SUB_IN = 'CAMBIO_ENTRA'
const EVENT_TYPE_SUB_OUT = 'CAMBIO_SALE'

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeText(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function toSafeInteger(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }

  return 0
}

function normalizeCategory(value) {
  return cleanText(value).toLowerCase()
}

function normalizePlayerName(value) {
  return cleanText(value)
}

function unique(values) {
  return [...new Set(values)]
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim() || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Expected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  return { url, key }
}

function createServiceSupabaseClient() {
  const { url, key } = getSupabaseConfig()
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function runExistingFfibScraper() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [MATCH_SCRAPER_ENTRY], {
      cwd: __dirname,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          `FFIB scraper failed with exit code ${code}.${stderr ? `\n${stderr.trim()}` : ''}`,
        ),
      )
    })
  })
}

async function resolveLatestFfibJsonPath() {
  if (await exists(MATCH_SCRAPER_OUTPUT)) {
    return MATCH_SCRAPER_OUTPUT
  }

  const entries = await fs.readdir(__dirname, { withFileTypes: true })
  const jsonCandidates = []

  for (const entry of entries) {
    if (!entry.isFile() || !/^ffib_.*\.json$/i.test(entry.name)) {
      continue
    }

    const fullPath = path.join(__dirname, entry.name)
    const stat = await fs.stat(fullPath)
    jsonCandidates.push({ fullPath, mtimeMs: stat.mtimeMs })
  }

  jsonCandidates.sort((left, right) => right.mtimeMs - left.mtimeMs)

  if (jsonCandidates.length === 0) {
    throw new Error('No FFIB JSON output file was found in scrapers/.')
  }

  return jsonCandidates[0].fullPath
}

async function loadLatestFfibPayload({ forceScrape = false } = {}) {
  const hasKnownOutput = await exists(MATCH_SCRAPER_OUTPUT)

  if (forceScrape || !hasKnownOutput) {
    await runExistingFfibScraper()
  }

  const jsonPath = await resolveLatestFfibJsonPath()
  const raw = await fs.readFile(jsonPath, 'utf8')

  return {
    jsonPath,
    payload: JSON.parse(raw),
  }
}

function getLastSundayOfMonth(year, monthIndex) {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0))
  const dayOfWeek = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - dayOfWeek)
  return date.getUTCDate()
}

function getMadridOffset(dateParts) {
  const { year, month, day } = dateParts
  const monthIndex = month - 1

  const dstStartDay = getLastSundayOfMonth(year, 2)
  const dstEndDay = getLastSundayOfMonth(year, 9)

  const afterDstStart = monthIndex > 2 || (monthIndex === 2 && day >= dstStartDay)
  const beforeDstEnd = monthIndex < 9 || (monthIndex === 9 && day < dstEndDay)

  return afterDstStart && beforeDstEnd ? '+02:00' : '+01:00'
}

async function extractFechaHoraFromActaCache(acta) {
  const actaId = cleanText(acta)
  if (!actaId) return null

  const cachePath = path.join(ACTA_CACHE_DIR, `acta-${actaId}.html`)
  if (!(await exists(cachePath))) {
    return null
  }

  const html = await fs.readFile(cachePath, 'utf8')
  const match = html.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})\s*h/i)

  if (!match) {
    return null
  }

  const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const offset = getMadridOffset({ year, month, day })

  return `${yearRaw}-${monthRaw}-${dayRaw}T${hourRaw}:${minuteRaw}:00${offset}`
}

function buildCompetitionLabel(match, categoria) {
  const jornada = toSafeInteger(match?.jornada)
  const acta = cleanText(match?.acta)
  return `FFIB ${categoria} - Jornada ${jornada}${acta ? ` - Acta ${acta}` : ''}`
}

function buildMatchImportRows(payload, categoria) {
  const matches = Array.isArray(payload?.matches) ? payload.matches : []

  return matches.map((match) => {
    const side = cleanText(match?.match?.santJordiSide).toLowerCase() === 'home' ? 'CASA' : 'FUERA'
    const score = match?.match?.score ?? {}
    const goalsFavor = side === 'CASA' ? toSafeInteger(score.home) : toSafeInteger(score.away)
    const goalsContra = side === 'CASA' ? toSafeInteger(score.away) : toSafeInteger(score.home)

    return {
      sourceActa: cleanText(match?.acta),
      jornada: toSafeInteger(match?.jornada),
      rival_nombre: cleanText(match?.match?.opponent),
      casa_fuera: side,
      competicion: buildCompetitionLabel(match, categoria),
      goles_favor: goalsFavor,
      goles_contra: goalsContra,
      estado: 'FINALIZADO',
      url_fuente: cleanText(match?.url),
      raw: match,
    }
  })
}

function collectExternalPlayers(matches) {
  const playersByName = new Map()

  for (const match of matches) {
    const lineup = Array.isArray(match?.lineup) ? match.lineup : []

    for (const player of lineup) {
      const nombre = cleanText(player?.name)
      if (!nombre) continue

      const current = playersByName.get(nombre) ?? {
        nombre,
        external_id: null,
        dorsal: null,
        posicion: null,
        fuente: SOURCE_LABEL,
      }

      const dorsal = toSafeInteger(player?.number)
      if (current.dorsal === null && dorsal > 0) {
        current.dorsal = dorsal
      }

      playersByName.set(nombre, current)
    }
  }

  return Array.from(playersByName.values())
}

async function ensureImportRunAllowed({ supabase, equipoId, categoria, force = false }) {
  const normalizedCategoria = normalizeCategory(categoria)
  const nowIso = new Date().toISOString()

  const existingRun = await supabase
    .from('import_runs')
    .select('id, last_run_at, status, details')
    .eq('equipo_id', equipoId)
    .eq('categoria', normalizedCategoria)
    .maybeSingle()

  if (existingRun.error) {
    throw existingRun.error
  }

  if (existingRun.data?.last_run_at && !force) {
    const lastRun = new Date(existingRun.data.last_run_at)
    if (!Number.isNaN(lastRun.getTime()) && Date.now() - lastRun.getTime() < IMPORT_COOLDOWN_MS) {
      return {
        skipped: true,
        importRunId: existingRun.data.id,
        lastRunAt: existingRun.data.last_run_at,
        details: existingRun.data.details ?? {},
      }
    }
  }

  const runningUpsert = await supabase
    .from('import_runs')
    .upsert(
      {
        equipo_id: equipoId,
        categoria: normalizedCategoria,
        last_run_at: nowIso,
        status: 'running',
        details: {
          started_at: nowIso,
        },
      },
      {
        onConflict: 'equipo_id,categoria',
        ignoreDuplicates: false,
      },
    )
    .select('id')
    .single()

  if (runningUpsert.error) {
    throw runningUpsert.error
  }

  return {
    skipped: false,
    importRunId: runningUpsert.data.id,
    lastRunAt: nowIso,
  }
}

async function finalizeImportRun({ supabase, equipoId, categoria, status, details }) {
  const normalizedCategoria = normalizeCategory(categoria)
  const response = await supabase
    .from('import_runs')
    .upsert(
      {
        equipo_id: equipoId,
        categoria: normalizedCategoria,
        last_run_at: new Date().toISOString(),
        status,
        details,
      },
      {
        onConflict: 'equipo_id,categoria',
        ignoreDuplicates: false,
      },
    )

  if (response.error) {
    throw response.error
  }
}

async function upsertExternalPlayers({ supabase, equipoId, players }) {
  if (players.length === 0) {
    return { count: 0, playersByName: new Map() }
  }

  const payload = players.map((player) => ({
    equipo_id: equipoId,
    external_id: player.external_id,
    nombre: player.nombre,
    dorsal: player.dorsal,
    posicion: player.posicion,
    fuente: player.fuente,
    updated_at: new Date().toISOString(),
  }))

  const upsertResponse = await supabase
    .from('jugadores_externos')
    .upsert(payload, {
      onConflict: 'equipo_id,nombre',
      ignoreDuplicates: false,
    })
    .select('id, nombre')

  if (upsertResponse.error) {
    throw upsertResponse.error
  }

  const playersByName = new Map(
    (upsertResponse.data ?? []).map((row) => [normalizePlayerName(row.nombre), row.id]),
  )

  if (playersByName.size !== payload.length) {
    const fallbackSelect = await supabase
      .from('jugadores_externos')
      .select('id, nombre')
      .eq('equipo_id', equipoId)
      .in('nombre', payload.map((player) => player.nombre))

    if (fallbackSelect.error) {
      throw fallbackSelect.error
    }

    for (const row of fallbackSelect.data ?? []) {
      playersByName.set(normalizePlayerName(row.nombre), row.id)
    }
  }

  return {
    count: upsertResponse.data?.length ?? payload.length,
    playersByName,
  }
}

async function upsertMatches({ supabase, equipoId, categoria, payload }) {
  const matchRows = buildMatchImportRows(payload, categoria)

  if (matchRows.length === 0) {
    return { count: 0, matchIdByActa: new Map() }
  }

  const competitionLabels = unique(matchRows.map((row) => row.competicion))
  const existingMatchesResponse = await supabase
    .from('partidos')
    .select('id, competicion, rival_nombre, casa_fuera')
    .eq('equipo_id', equipoId)
    .in('competicion', competitionLabels)

  if (existingMatchesResponse.error) {
    throw existingMatchesResponse.error
  }

  const existingByKey = new Map(
    (existingMatchesResponse.data ?? []).map((row) => [
      `${cleanText(row.competicion)}|${cleanText(row.rival_nombre)}|${cleanText(row.casa_fuera)}`,
      row.id,
    ]),
  )

  const matchIdByActa = new Map()
  let upsertedCount = 0

  for (const row of matchRows) {
    const fechaHora = await extractFechaHoraFromActaCache(row.sourceActa)
    const key = `${row.competicion}|${row.rival_nombre}|${row.casa_fuera}`
    const existingId = existingByKey.get(key)

    const basePayload = {
      equipo_id: equipoId,
      fecha_hora: fechaHora,
      competicion: row.competicion,
      casa_fuera: row.casa_fuera,
      rival_nombre: row.rival_nombre,
      goles_favor: row.goles_favor,
      goles_contra: row.goles_contra,
      estado: row.estado,
    }

    if (existingId) {
      const updateResponse = await supabase
        .from('partidos')
        .update(basePayload)
        .eq('id', existingId)
        .select('id')
        .single()

      if (updateResponse.error) {
        throw updateResponse.error
      }

      matchIdByActa.set(row.sourceActa, updateResponse.data.id)
      upsertedCount += 1
      continue
    }

    const insertResponse = await supabase
      .from('partidos')
      .insert(basePayload)
      .select('id')
      .single()

    if (insertResponse.error) {
      throw insertResponse.error
    }

    matchIdByActa.set(row.sourceActa, insertResponse.data.id)
    upsertedCount += 1
  }

  return {
    count: upsertedCount,
    matchIdByActa,
  }
}

function buildParticipantRows({ matches, matchIdByActa, externalPlayerIdByName }) {
  const rows = []

  for (const match of matches) {
    const partidoId = matchIdByActa.get(cleanText(match.acta))
    if (!partidoId) continue

    for (const player of Array.isArray(match.lineup) ? match.lineup : []) {
      const jugadorExternoId = externalPlayerIdByName.get(cleanText(player?.name))
      if (!jugadorExternoId) continue

      rows.push({
        partido_id: partidoId,
        jugador_externo_id: jugadorExternoId,
        titular: cleanText(player?.role) === 'starter',
        minutos_jugados: toSafeInteger(player?.minutesPlayed),
        convocado: true,
      })
    }
  }

  return rows
}

async function upsertParticipants({ supabase, rows }) {
  if (rows.length === 0) {
    return 0
  }

  const response = await supabase
    .from('participantes_partido')
    .upsert(rows, {
      onConflict: 'partido_id,jugador_externo_id',
      ignoreDuplicates: false,
    })
    .select('id')

  if (response.error) {
    throw response.error
  }

  return response.data?.length ?? rows.length
}

function buildEventRows({ matches, matchIdByActa, externalPlayerIdByName }) {
  const rows = []

  for (const match of matches) {
    const partidoId = matchIdByActa.get(cleanText(match.acta))
    if (!partidoId) continue

    for (const goal of Array.isArray(match?.events?.goals) ? match.events.goals : []) {
      const jugadorExternoId = externalPlayerIdByName.get(normalizePlayerName(goal?.player))
      if (!jugadorExternoId) continue

      rows.push({
        partido_id: partidoId,
        minuto: toSafeInteger(goal?.minute),
        tipo: EVENT_TYPE_GOAL,
        jugador_externo_id: jugadorExternoId,
        jugador_externo_relacionado_id: null,
      })
    }

    for (const yellow of Array.isArray(match?.events?.yellows) ? match.events.yellows : []) {
      const jugadorExternoId = externalPlayerIdByName.get(normalizePlayerName(yellow?.player))
      if (!jugadorExternoId) continue

      rows.push({
        partido_id: partidoId,
        minuto: toSafeInteger(yellow?.minute),
        tipo: EVENT_TYPE_YELLOW,
        jugador_externo_id: jugadorExternoId,
        jugador_externo_relacionado_id: null,
      })
    }

    for (const substitution of Array.isArray(match?.events?.substitutions)
      ? match.events.substitutions
      : []) {
      const minute = toSafeInteger(substitution?.minute)
      const inPlayerId = externalPlayerIdByName.get(normalizePlayerName(substitution?.in?.name))
      const outPlayerId = externalPlayerIdByName.get(normalizePlayerName(substitution?.out?.name))

      if (outPlayerId) {
        rows.push({
          partido_id: partidoId,
          minuto: minute,
          tipo: EVENT_TYPE_SUB_OUT,
          jugador_externo_id: outPlayerId,
          jugador_externo_relacionado_id: inPlayerId ?? null,
        })
      }

      if (inPlayerId) {
        rows.push({
          partido_id: partidoId,
          minuto: minute,
          tipo: EVENT_TYPE_SUB_IN,
          jugador_externo_id: inPlayerId,
          jugador_externo_relacionado_id: outPlayerId ?? null,
        })
      }
    }
  }

  return rows
}

function dedupeEventRows(rows) {
  const dedupedRows = new Map()

  for (const row of rows) {
    if (!row.jugador_externo_id) {
      continue
    }

    const key = [
      row.partido_id,
      row.minuto,
      row.tipo,
      row.jugador_externo_id,
    ].join('|')

    dedupedRows.set(key, row)
  }

  return [...dedupedRows.values()]
}

async function upsertExternalEvents({ supabase, rows }) {
  const dedupedRows = dedupeEventRows(rows)
  if (dedupedRows.length === 0) {
    return 0
  }

  const insertResponse = await supabase
    .from('eventos_partido')
    .upsert(dedupedRows, {
      onConflict: 'partido_id,minuto,tipo,jugador_externo_id',
      ignoreDuplicates: false,
    })
    .select('id')

  if (insertResponse.error) {
    throw insertResponse.error
  }

  return insertResponse.data?.length ?? dedupedRows.length
}

export async function importFfIbToAppTables({
  equipoId,
  categoria,
  force = false,
  forceScrape = false,
} = {}) {
  const normalizedCategoria = normalizeCategory(categoria)
  if (!equipoId) {
    throw new Error('equipoId is required.')
  }
  if (!normalizedCategoria) {
    throw new Error('categoria is required.')
  }

  const supabase = createServiceSupabaseClient()
  const runState = await ensureImportRunAllowed({
    supabase,
    equipoId,
    categoria: normalizedCategoria,
    force,
  })

  if (runState.skipped) {
    return {
      skipped: true,
      reason: 'cooldown_active',
      lastRunAt: runState.lastRunAt,
      matchesUpserted: 0,
      participantsUpserted: 0,
      eventsInserted: 0,
      externalPlayersUpserted: 0,
    }
  }

  try {
    const { jsonPath, payload } = await loadLatestFfibPayload({
      forceScrape: forceScrape || !runState.lastRunAt,
    })

    const matches = Array.isArray(payload?.matches) ? payload.matches : []
    const externalPlayers = collectExternalPlayers(matches)
    const externalPlayersResult = await upsertExternalPlayers({
      supabase,
      equipoId,
      players: externalPlayers,
    })

    const matchResult = await upsertMatches({
      supabase,
      equipoId,
      categoria: normalizedCategoria,
      payload,
    })

    const participantRows = buildParticipantRows({
      matches,
      matchIdByActa: matchResult.matchIdByActa,
      externalPlayerIdByName: externalPlayersResult.playersByName,
    })

    const participantsUpserted = await upsertParticipants({
      supabase,
      rows: participantRows,
    })

    const eventRows = buildEventRows({
      matches,
      matchIdByActa: matchResult.matchIdByActa,
      externalPlayerIdByName: externalPlayersResult.playersByName,
    })

    const eventsInserted = await upsertExternalEvents({
      supabase,
      rows: eventRows,
    })

    const summary = {
      skipped: false,
      jsonPath,
      matchesUpserted: matchResult.count,
      participantsUpserted,
      eventsInserted,
      externalPlayersUpserted: externalPlayersResult.count,
    }

    await finalizeImportRun({
      supabase,
      equipoId,
      categoria: normalizedCategoria,
      status: 'completed',
      details: summary,
    })

    return summary
  } catch (error) {
    await finalizeImportRun({
      supabase,
      equipoId,
      categoria: normalizedCategoria,
      status: 'failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}
