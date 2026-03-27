import { scrapePlayers } from "./scrapePlayers.js";
import { savePlayersToSupabase } from "./savePlayersToSupabase.js";

function hasInvalidTotals(player) {
  const totals = [
    player?.minutes_total,
    player?.goals_total,
    player?.yellows_total,
    player?.starts_total,
  ];

  return totals.some((value) => typeof value !== "number" || Number.isNaN(value));
}

export async function runPlayersScraper() {
  const players = await scrapePlayers();
  const invalidPlayers = players.filter(hasInvalidTotals);

  if (invalidPlayers.length > 0) {
    throw new Error(
      `Invalid aggregated totals detected for players: ${invalidPlayers
        .map((player) => player.name)
        .join(", ")}`,
    );
  }

  const topMinutes = [...players]
    .sort((left, right) => right.minutes_total - left.minutes_total)
    .slice(0, 3);

  for (const player of topMinutes) {
    console.log(`[players] top_minutes ${player.name}: ${player.minutes_total}`);
  }

  const persistence = await savePlayersToSupabase(players);

  const summary = {
    scrapedCount: players.length,
    insertedOrUpdatedCount: persistence.persistedCount,
    syncedJugadoresExternosCount: persistence.externalPersistedCount,
    errorsCount: persistence.errorCount,
  };

  console.log(
    `[players] scraped=${summary.scrapedCount} inserted_or_updated=${summary.insertedOrUpdatedCount} synced_jugadores_externos=${summary.syncedJugadoresExternosCount} errors=${summary.errorsCount}`,
  );

  console.log(
    `[players] players_table=${persistence.tableName} jugadores_externos_table=${persistence.externalTableName} matched_teams=${persistence.externalMatchedTeamCount}`,
  );

  if (persistence.errors.length > 0) {
    for (const error of persistence.errors) {
      console.error(`[players] ${error.type}: ${error.message}`);
    }
  }

  return {
    players,
    persistence,
    summary,
  };
}
