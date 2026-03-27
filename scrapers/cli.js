import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

async function main() {
  const [, , command] = process.argv;
  const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());

  if (missingEnv.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas para Supabase: ${missingEnv.join(", ")}. Revisa el archivo .env en la raiz del proyecto y asegúrate de definir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.`,
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
