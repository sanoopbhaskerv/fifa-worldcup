import type {
  Competition,
  CompetitionCapabilities,
  CompetitionEdition,
} from "../types/domain";

/** Capability preset for international tournaments with groups, brackets, and scorers. */
const fullTournament: CompetitionCapabilities = {
  hasStandings: true,
  hasGroups: true,
  hasBracket: true,
  hasScorers: true,
  hasLineups: true,
  hasLiveEvents: true,
  hasMatchStats: true,
  hasTwoLeggedTies: false,
};

/** Capability preset for domestic leagues with standings but no bracket. */
const league: CompetitionCapabilities = {
  hasStandings: true,
  hasGroups: false,
  hasBracket: false,
  hasScorers: true,
  hasLineups: true,
  hasLiveEvents: true,
  hasMatchStats: true,
  hasTwoLeggedTies: false,
};

/** Capability preset for continental club tournaments with knockout ties. */
const clubTournament: CompetitionCapabilities = {
  ...fullTournament,
  hasGroups: false,
  hasTwoLeggedTies: true,
};

/**
 * Builds edition metadata from compact season identifiers.
 *
 * @param values - Edition ids such as `2026` or season ids such as `2025-26`.
 * @returns Edition objects with deterministic start and end dates.
 */
const editions = (...values: string[]): CompetitionEdition[] =>
  values.map((value) => {
    const startYear = Number(value.slice(0, 4));
    const endYear = value.includes("-") ? startYear + 1 : startYear;
    return {
      id: value,
      name: value,
      startDate: `${startYear}-06-01T00:00:00Z`,
      endDate: `${endYear}-07-31T23:59:59Z`,
    };
  });

/**
 * Creates a catalog entry and marks the newest supplied edition as active.
 *
 * @param input - Competition metadata plus the compact edition id list.
 * @returns Complete competition catalog entry.
 */
const competition = (
  input: Omit<Competition, "editions" | "activeEditionId"> & {
    editionIds: string[];
  },
): Competition => ({
  ...input,
  editions: editions(...input.editionIds),
  activeEditionId: input.editionIds[0],
});

/** Static competition catalog used by demo data and provider coverage mapping. */
export const competitionCatalog: Competition[] = [
  competition({
    id: "world-cup",
    slug: "world-cup",
    name: "FIFA World Cup",
    shortName: "World Cup",
    category: "International",
    confederation: "Global",
    region: "World",
    format: "group-knockout",
    summary: "The world's defining international football tournament, bringing 48 nations together across North America.",
    accent: "#c9ff47",
    emblem: "WC",
    editionIds: ["2026", "2022", "2018"],
    capabilities: fullTournament,
  }),
  competition({
    id: "womens-world-cup",
    slug: "womens-world-cup",
    name: "FIFA Women's World Cup",
    shortName: "Women's World Cup",
    category: "International",
    confederation: "Global",
    region: "World",
    format: "group-knockout",
    summary: "The premier global competition in women's international football.",
    accent: "#ff8bd7",
    emblem: "WW",
    editionIds: ["2023", "2019"],
    capabilities: fullTournament,
  }),
  competition({
    id: "euros",
    slug: "euros",
    name: "UEFA European Championship",
    shortName: "EURO",
    category: "International",
    confederation: "UEFA",
    region: "Europe",
    format: "group-knockout",
    summary: "Europe's leading national teams compete for continental supremacy.",
    accent: "#71b7ff",
    emblem: "EU",
    editionIds: ["2024", "2020"],
    capabilities: fullTournament,
  }),
  competition({
    id: "copa-america",
    slug: "copa-america",
    name: "Copa América",
    shortName: "Copa América",
    category: "International",
    confederation: "CONMEBOL",
    region: "South America",
    format: "group-knockout",
    summary: "South America's historic championship of national teams.",
    accent: "#62d8ff",
    emblem: "CA",
    editionIds: ["2024", "2021"],
    capabilities: fullTournament,
  }),
  competition({
    id: "afcon",
    slug: "afcon",
    name: "Africa Cup of Nations",
    shortName: "AFCON",
    category: "International",
    confederation: "CAF",
    region: "Africa",
    format: "group-knockout",
    summary: "Africa's finest national teams meet for the continent's greatest prize.",
    accent: "#ffb34f",
    emblem: "AF",
    editionIds: ["2025", "2023"],
    capabilities: fullTournament,
  }),
  competition({
    id: "asian-cup",
    slug: "asian-cup",
    name: "AFC Asian Cup",
    shortName: "Asian Cup",
    category: "International",
    confederation: "AFC",
    region: "Asia",
    format: "group-knockout",
    summary: "The flagship championship for Asia's national teams.",
    accent: "#ff6b62",
    emblem: "AC",
    editionIds: ["2023", "2019"],
    capabilities: fullTournament,
  }),
  competition({
    id: "gold-cup",
    slug: "gold-cup",
    name: "CONCACAF Gold Cup",
    shortName: "Gold Cup",
    category: "International",
    confederation: "CONCACAF",
    region: "North America",
    format: "group-knockout",
    summary: "The championship of North America, Central America and the Caribbean.",
    accent: "#ffd95a",
    emblem: "GC",
    editionIds: ["2025", "2023"],
    capabilities: fullTournament,
  }),
  competition({
    id: "nations-league",
    slug: "nations-league",
    name: "UEFA Nations League",
    shortName: "Nations League",
    category: "International",
    confederation: "UEFA",
    region: "Europe",
    format: "group-knockout",
    summary: "A competitive league structure for Europe's national teams.",
    accent: "#be8cff",
    emblem: "NL",
    editionIds: ["2024-25", "2022-23"],
    capabilities: fullTournament,
  }),
  competition({
    id: "champions-league",
    slug: "champions-league",
    name: "UEFA Champions League",
    shortName: "Champions League",
    category: "Club",
    confederation: "UEFA",
    region: "Europe",
    format: "league-knockout",
    summary: "Europe's elite clubs compete through a league phase and knockout rounds.",
    accent: "#8ea9ff",
    emblem: "CL",
    editionIds: ["2025-26", "2024-25"],
    capabilities: clubTournament,
  }),
  competition({
    id: "europa-league",
    slug: "europa-league",
    name: "UEFA Europa League",
    shortName: "Europa League",
    category: "Club",
    confederation: "UEFA",
    region: "Europe",
    format: "league-knockout",
    summary: "A wide-open continental competition for leading European clubs.",
    accent: "#ff8a3d",
    emblem: "EL",
    editionIds: ["2025-26", "2024-25"],
    capabilities: clubTournament,
  }),
  competition({
    id: "conference-league",
    slug: "conference-league",
    name: "UEFA Conference League",
    shortName: "Conference League",
    category: "Club",
    confederation: "UEFA",
    region: "Europe",
    format: "league-knockout",
    summary: "European clubs from across the continent chase continental silverware.",
    accent: "#45d7a1",
    emblem: "CO",
    editionIds: ["2025-26", "2024-25"],
    capabilities: clubTournament,
  }),
  competition({
    id: "premier-league",
    slug: "premier-league",
    name: "English Premier League",
    shortName: "Premier League",
    category: "Club",
    confederation: "UEFA",
    region: "Europe",
    country: "England",
    format: "league",
    summary: "Twenty clubs compete across 38 matchweeks in England's top flight.",
    accent: "#e876ff",
    emblem: "PL",
    editionIds: ["2025-26", "2024-25"],
    capabilities: league,
  }),
  ...[
    ["la-liga", "La Liga", "Spain", "#ff6a5e", "LL"],
    ["serie-a", "Serie A", "Italy", "#6aa6ff", "SA"],
    ["bundesliga", "Bundesliga", "Germany", "#ff5b5b", "BL"],
    ["ligue-1", "Ligue 1", "France", "#d9f84b", "L1"],
    ["mls", "Major League Soccer", "United States", "#79c8ff", "MS"],
  ].map(([id, name, country, accent, emblem]) =>
    competition({
      id,
      slug: id,
      name,
      shortName: name,
      category: "Club",
      confederation: country === "United States" ? "CONCACAF" : "UEFA",
      region: country === "United States" ? "North America" : "Europe",
      country,
      format: "league",
      summary: `${name} brings together the leading clubs in ${country}.`,
      accent,
      emblem,
      editionIds: ["2025-26", "2024-25"],
      capabilities: league,
    }),
  ),
  competition({
    id: "libertadores",
    slug: "libertadores",
    name: "Copa Libertadores",
    shortName: "Libertadores",
    category: "Club",
    confederation: "CONMEBOL",
    region: "South America",
    format: "group-knockout",
    summary: "South America's greatest clubs meet in its defining continental competition.",
    accent: "#d3b15f",
    emblem: "LI",
    editionIds: ["2026", "2025"],
    capabilities: { ...clubTournament, hasGroups: true },
  }),
];
