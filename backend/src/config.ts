import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: "../.env" });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? undefined,
  openaiSecondaryApiKey: process.env.OPENAI_SECONDARY_API_KEY ?? undefined,
  openaiSecondaryBaseUrl: process.env.OPENAI_SECONDARY_BASE_URL ?? undefined,
  openaiFallbackMode: process.env.OPENAI_FALLBACK_MODE === "true",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  batchSize: parseInt(process.env.BATCH_SIZE ?? "15", 10),
  maxRetries: parseInt(process.env.MAX_RETRIES ?? "3", 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? "25", 10),
  databasePath:
    process.env.DATABASE_PATH ?? path.resolve(__dirname, "../database.db"),
} as const;

export function validateConfig(): void {
  if (!config.openaiApiKey && !config.openaiSecondaryApiKey) {
    console.warn(
      "⚠️  No AI provider key is configured. The backend will use free heuristic fallback parsing."
    );
  }

  if (!config.openaiApiKey && config.openaiSecondaryApiKey) {
    console.warn(
      "⚠️  Primary OPENAI_API_KEY is not set. The secondary API key will be used."
    );
  }

  if (config.openaiFallbackMode) {
    console.warn(
      "⚠️  OPENAI_FALLBACK_MODE=true set. The backend will use free heuristic fallback if AI calls fail."
    );
  }
}
