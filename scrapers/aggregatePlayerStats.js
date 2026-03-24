function cleanText(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePlayerNameKey(value) {
  return cleanText(value);
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

export function aggregatePlayerStatsFromMatches(matches) {
  const totalsByPlayer = new Map();

  for (const match of Array.isArray(matches) ? matches : []) {
    const lineup = Array.isArray(match?.lineup) ? match.lineup : [];

    for (const player of lineup) {
      const normalizedKey = normalizePlayerNameKey(player?.name);
      if (!normalizedKey) {
        continue;
      }

      const current = totalsByPlayer.get(normalizedKey) ?? {
        name: normalizedKey,
        minutes_total: 0,
        goals_total: 0,
        yellows_total: 0,
        starts_total: 0,
      };

      current.minutes_total += toSafeInteger(player?.minutesPlayed);
      current.goals_total += toSafeInteger(player?.goals);
      current.yellows_total += toSafeInteger(player?.yellows);
      current.starts_total += player?.role === "starter" ? 1 : 0;

      totalsByPlayer.set(normalizedKey, current);
    }
  }

  return totalsByPlayer;
}
