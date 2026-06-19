import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Parses one `.env` assignment line into a key/value pair.
 *
 * @param line - Raw `.env` line.
 * @returns `[key, value]` tuple, or `null` for comments/invalid lines.
 */
const parseLine = (line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (!match) return null;
  const key = match[1];
  let value = match[2] ?? "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
};

/**
 * Loads local `.env` values into `process.env` without overwriting existing variables.
 *
 * @param cwd - Directory where the `.env` file should be read.
 * @returns Promise that resolves after environment values are loaded.
 */
export const loadLocalEnv = async (cwd = process.cwd()) => {
  try {
    const contents = await readFile(path.join(cwd, ".env"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const parsed = parseLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
};

/**
 * Normalizes raw environment variables into provider configuration.
 *
 * @param source - Environment-like object containing raw provider settings.
 * @returns Provider configuration consumed by football-data.org and API-Football adapters.
 */
export const providerEnv = (source = process.env) => ({
  footballDataKey:
    source.FOOTBALL_DATA_API_KEY ?? source.VITE_FOOTBALL_DATA_API_KEY ?? "",
  apiFootballKey:
    source.API_FOOTBALL_API_KEY ??
    source.VITE_API_FOOTBALL_API_KEY ??
    source.VITE_API_FOOTBALL_KEY ??
    "",
  footballDataBaseUrl:
    source.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4",
  apiFootballBaseUrl:
    source.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
  apiFootballDailyBudget: source.API_FOOTBALL_DAILY_BUDGET ?? "90",
  fantasyAiProviderUrl: source.FANTASY_AI_PROVIDER_URL ?? "",
  fantasyAiApiKey: source.FANTASY_AI_API_KEY ?? "",
  fantasyAiModel: source.FANTASY_AI_MODEL ?? "",
  fantasyAiDailyCallLimit: source.FANTASY_AI_DAILY_CALL_LIMIT ?? "0",
  fantasyAiMaxOutputTokens: source.FANTASY_AI_MAX_OUTPUT_TOKENS ?? "180",
  fantasyAiEstimatedCostCents: source.FANTASY_AI_ESTIMATED_COST_CENTS ?? "1",
  fantasyAiScheduleAutoPublish: source.FANTASY_AI_SCHEDULE_AUTO_PUBLISH === "true",
  // Set to "gemini" to use the Google AI Studio adapter.
  // Leave empty to use the default OpenAI-compatible adapter.
  fantasyAiProvider: source.FANTASY_AI_PROVIDER ?? "",
  // Groq fallback — used when the primary provider fails.
  fantasyAiFallbackApiKey: source.FANTASY_AI_FALLBACK_API_KEY ?? "",
  fantasyAiFallbackModel: source.FANTASY_AI_FALLBACK_MODEL ?? "llama-3.3-70b-versatile",
});
