import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { aggregatePlayerStatsFromMatches } from "./aggregatePlayerStats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATCH_SCRAPER_ENTRY = path.join(__dirname, "ffib_santjordi.js");
const MATCH_SCRAPER_OUTPUT = path.join(__dirname, "ffib_pe_sant_jordi_j1_11_clean.json");

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

function toTitleCase(value) {
  const text = cleanText(value);
  if (!text) {
    return "";
  }

  return text
    .toLowerCase()
    .split(/(\s+|,|-|\/)/)
    .map((part) => {
      if (!part || /^(\s+|,|-|\/)$/.test(part)) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("")
    .trim();
}

function toNullableText(value, formatter = (item) => cleanText(item)) {
  const formatted = formatter(value);
  return formatted ? formatted : null;
}

function toIsoString(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toSafeInteger(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }

  return 0;
}

function normalizePlayerRecord(record) {
  return {
    external_id: null,
    name: toTitleCase(record.name),
    team: toTitleCase(record.team),
    dorsal: Number.isInteger(record.dorsal) ? record.dorsal : null,
    position: toNullableText(record.position, toTitleCase),
    nationality: toNullableText(record.nationality, toTitleCase),
    age: Number.isInteger(record.age) ? record.age : null,
    market_value: typeof record.market_value === "number" && Number.isFinite(record.market_value)
      ? record.market_value
      : null,
    source_url: cleanText(record.source_url),
    scraped_at: toIsoString(record.scraped_at),
    minutes_total: toSafeInteger(record.minutes_total),
    goals_total: toSafeInteger(record.goals_total),
    yellows_total: toSafeInteger(record.yellows_total),
    starts_total: toSafeInteger(record.starts_total),
  };
}

async function runExistingMatchScraper() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [MATCH_SCRAPER_ENTRY], {
      cwd: __dirname,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Existing scraper failed with exit code ${code}.${stderr ? `\n${stderr.trim()}` : ""}`,
        ),
      );
    });
  });
}

async function resolveMatchesJsonPath() {
  try {
    await fs.access(MATCH_SCRAPER_OUTPUT);
    return MATCH_SCRAPER_OUTPUT;
  } catch {}

  const entries = await fs.readdir(__dirname, { withFileTypes: true });
  const jsonCandidates = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!/^ffib_.*\.json$/i.test(entry.name)) {
      continue;
    }

    const fullPath = path.join(__dirname, entry.name);
    const stat = await fs.stat(fullPath);
    jsonCandidates.push({ fullPath, mtimeMs: stat.mtimeMs });
  }

  jsonCandidates.sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (jsonCandidates.length === 0) {
    throw new Error("No FFIB JSON output file was found in scrapers/.");
  }

  return jsonCandidates[0].fullPath;
}

function extractPlayersFromMatches(payload) {
  const teamName = cleanText(payload?.meta?.team || "");
  const scrapedAt = toIsoString(payload?.meta?.generatedAt);
  const aggregatedStats = aggregatePlayerStatsFromMatches(payload?.matches || []);
  const playersByKey = new Map();

  for (const match of payload?.matches || []) {
    const sourceUrl = cleanText(match?.url || "");
    const lineup = Array.isArray(match?.lineup) ? match.lineup : [];

    for (const player of lineup) {
      const name = cleanText(player?.name);
      if (!name || !teamName || !sourceUrl) {
        continue;
      }

      const dedupeKey = `${normalizeKey(name)}::${normalizeKey(teamName)}`;
      if (!playersByKey.has(dedupeKey)) {
        const aggregated = aggregatedStats.get(cleanText(name));
        playersByKey.set(
          dedupeKey,
          normalizePlayerRecord({
            external_id: null,
            name,
            team: teamName,
            dorsal: Number.isInteger(player?.number) ? player.number : null,
            position: null,
            nationality: null,
            age: null,
            market_value: null,
            source_url: sourceUrl,
            scraped_at: scrapedAt,
            minutes_total: aggregated?.minutes_total ?? 0,
            goals_total: aggregated?.goals_total ?? 0,
            yellows_total: aggregated?.yellows_total ?? 0,
            starts_total: aggregated?.starts_total ?? 0,
          }),
        );
      }
    }
  }

  return Array.from(playersByKey.values()).sort((left, right) => {
    const teamCompare = left.team.localeCompare(right.team, "es");
    if (teamCompare !== 0) {
      return teamCompare;
    }
    return left.name.localeCompare(right.name, "es");
  });
}

export async function scrapePlayers() {
  await runExistingMatchScraper();

  const matchesJsonPath = await resolveMatchesJsonPath();
  const raw = await fs.readFile(matchesJsonPath, "utf8");
  const parsed = JSON.parse(raw);
  return extractPlayersFromMatches(parsed);
}
