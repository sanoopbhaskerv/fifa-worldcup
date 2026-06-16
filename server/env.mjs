import { readFile } from "node:fs/promises";
import path from "node:path";

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

export const providerEnv = (source = process.env) => ({
  footballDataKey: source.FOOTBALL_DATA_API_KEY ?? "",
  apiFootballKey: source.API_FOOTBALL_API_KEY ?? "",
  footballDataBaseUrl:
    source.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4",
  apiFootballBaseUrl:
    source.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
  apiFootballDailyBudget: source.API_FOOTBALL_DAILY_BUDGET ?? "90",
});
