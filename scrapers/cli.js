async function main() {
  const [, , command] = process.argv;
  const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnv.join(", ")}. Run the scraper with Node's env loader, for example: node --env-file=.env scrapers/cli.js players`,
    );
  }

  if (command === "players") {
    const { runPlayersScraper } = await import("./runPlayersScraper.js");
    await runPlayersScraper();
    return;
  }

  console.error("Usage: node scrapers/cli.js players");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[scrapers] fatal ${error?.stack || error?.message || error}`);
  process.exitCode = 1;
});
