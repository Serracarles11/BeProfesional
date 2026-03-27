import { createClient } from "@supabase/supabase-js";

const DEFAULT_TABLE_NAME = "players";
const DEFAULT_EXTERNAL_PLAYERS_TABLE = "jugadores_externos";
const DEFAULT_BATCH_SIZE = 200;

function cleanText(value) {
  const text = String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return text || "";
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function toNullableText(value) {
  const text = cleanText(value);
  return text ? text : null;
}

function toNullableInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

function toSafeInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }
  return 0;
}

function toIsoString(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials. Expected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return { url, key };
}

function createNodeSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizePlayer(player) {
  return {
    external_id: toNullableText(player?.external_id),
    name: cleanText(player?.name),
    team: cleanText(player?.team),
    dorsal: toNullableInteger(player?.dorsal),
    position: toNullableText(player?.position),
    nationality: toNullableText(player?.nationality),
    age: toNullableInteger(player?.age),
    market_value: toNullableInteger(player?.market_value),
    source_url: cleanText(player?.source_url),
    scraped_at: toIsoString(player?.scraped_at),
    minutes_total: toSafeInteger(player?.minutes_total),
    goals_total: toSafeInteger(player?.goals_total),
    yellows_total: toSafeInteger(player?.yellows_total),
    starts_total: toSafeInteger(player?.starts_total),
    updated_at: new Date().toISOString(),
  };
}

function validatePlayer(player) {
  const errors = [];
  if (!player.name) {
    errors.push("name is required");
  }
  if (!player.team) {
    errors.push("team is required");
  }
  if (!player.source_url) {
    errors.push("source_url is required");
  }
  return errors;
}

function dedupePlayers(players) {
  const deduped = [];
  const seen = new Set();

  for (const player of players) {
    const dedupeKey = player.external_id
      ? `external:${normalizeKey(player.external_id)}`
      : `fallback:${normalizeKey(player.name)}::${normalizeKey(player.team)}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    deduped.push(player);
  }

  return deduped;
}

async function upsertBatch({ supabase, tableName, rows, onConflict }) {
  const response = await supabase
    .from(tableName)
    .upsert(rows, {
      onConflict,
      ignoreDuplicates: false,
    })
    .select("id");

  if (response.error) {
    throw response.error;
  }

  return Array.isArray(response.data) ? response.data.length : rows.length;
}

function normalizeTeamName(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function loadEquiposIndex(supabase) {
  const response = await supabase.from("equipos").select("id, nombre");

  if (response.error) {
    throw response.error;
  }

  const equiposByName = new Map();
  for (const row of response.data ?? []) {
    const id = typeof row?.id === "string" ? row.id : "";
    const nombre = cleanText(row?.nombre);
    const key = normalizeTeamName(nombre);

    if (!id || !key || equiposByName.has(key)) {
      continue;
    }

    equiposByName.set(key, {
      id,
      nombre,
    });
  }

  return equiposByName;
}

function buildJugadoresExternosRows(players, equiposByName) {
  const rows = [];
  const errors = [];
  const now = new Date().toISOString();
  const seen = new Set();

  for (const player of players) {
    const teamKey = normalizeTeamName(player.team);
    const equipo = equiposByName.get(teamKey);

    if (!equipo) {
      errors.push({
        type: "team_lookup",
        player,
        message: `No se encontro equipo para team="${player.team}" al sincronizar jugadores_externos.`,
      });
      continue;
    }

    const dedupeKey = `${equipo.id}::${normalizeKey(player.name)}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    rows.push({
      equipo_id: equipo.id,
      external_id: player.external_id,
      nombre: player.name,
      dorsal: player.dorsal,
      posicion: player.position,
      fuente: "scraper",
      created_at: now,
      updated_at: now,
      minutes_total: toSafeInteger(player.minutes_total),
      goals_total: toSafeInteger(player.goals_total),
      yellows_total: toSafeInteger(player.yellows_total),
      starts_total: toSafeInteger(player.starts_total),
    });
  }

  return { rows, errors };
}

async function upsertJugadoresExternos({ supabase, players }) {
  const tableName =
    process.env.SUPABASE_JUGADORES_EXTERNOS_TABLE?.trim() || DEFAULT_EXTERNAL_PLAYERS_TABLE;

  const equiposByName = await loadEquiposIndex(supabase);
  const { rows, errors } = buildJugadoresExternosRows(players, equiposByName);

  let persistedCount = 0;

  for (const batch of chunk(rows, DEFAULT_BATCH_SIZE)) {
    try {
      persistedCount += await upsertBatch({
        supabase,
        tableName,
        rows: batch,
        onConflict: "equipo_id,nombre",
      });
    } catch (error) {
      errors.push({
        type: "database_external",
        rows: batch.length,
        message: error?.message || "Unknown jugadores_externos upsert error",
      });
    }
  }

  return {
    tableName,
    receivedCount: players.length,
    matchedTeamCount: rows.length,
    persistedCount,
    errors,
    errorCount: errors.length,
  };
}

export async function savePlayersToSupabase(players) {
  const tableName = process.env.SUPABASE_PLAYERS_TABLE?.trim() || DEFAULT_TABLE_NAME;
  const supabase = createNodeSupabaseClient();
  const normalized = Array.isArray(players) ? players.map(normalizePlayer) : [];

  const errors = [];
  const validRows = [];

  for (const player of normalized) {
    const validationErrors = validatePlayer(player);
    if (validationErrors.length > 0) {
      errors.push({
        type: "validation",
        player,
        message: validationErrors.join(", "),
      });
      continue;
    }
    validRows.push(player);
  }

  const dedupedRows = dedupePlayers(validRows);
  const rowsWithExternalId = dedupedRows.filter((player) => player.external_id);
  const rowsWithoutExternalId = dedupedRows.filter((player) => !player.external_id);

  let persistedCount = 0;

  for (const batch of chunk(rowsWithExternalId, DEFAULT_BATCH_SIZE)) {
    try {
      persistedCount += await upsertBatch({
        supabase,
        tableName,
        rows: batch,
        onConflict: "external_id",
      });
    } catch (error) {
      errors.push({
        type: "database",
        rows: batch.length,
        message: error?.message || "Unknown Supabase upsert error",
      });
    }
  }

  for (const batch of chunk(rowsWithoutExternalId, DEFAULT_BATCH_SIZE)) {
    try {
      persistedCount += await upsertBatch({
        supabase,
        tableName,
        rows: batch,
        onConflict: "name,team",
      });
    } catch (error) {
      errors.push({
        type: "database",
        rows: batch.length,
        message: error?.message || "Unknown Supabase upsert error",
      });
    }
  }

  const externalSync = await upsertJugadoresExternos({
    supabase,
    players: dedupedRows,
  });

  errors.push(...externalSync.errors);

  return {
    tableName,
    externalTableName: externalSync.tableName,
    receivedCount: normalized.length,
    validCount: validRows.length,
    dedupedCount: dedupedRows.length,
    persistedCount,
    externalPersistedCount: externalSync.persistedCount,
    externalMatchedTeamCount: externalSync.matchedTeamCount,
    errors,
    errorCount: errors.length,
  };
}
