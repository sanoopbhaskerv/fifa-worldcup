import type {
  Competition,
  CompetitionData,
  KnockoutTie,
  Match,
  MatchEvent,
  Scorer,
  Standing,
  Team,
} from "../types/domain";

const badgeColors = ["#3f8cff", "#f45b69", "#ffb33f", "#48c78e", "#a77bff", "#25b7d3", "#ec6aca", "#79ad43"];

const team = (id: string, name: string, code: string, index: number): Team => ({
  id,
  name,
  shortName: name.split(" ").slice(-1)[0] ?? name,
  code,
  badge: badgeColors[index % badgeColors.length],
});

const nationalTeams = [
  team("arg", "Argentina", "ARG", 0),
  team("fra", "France", "FRA", 1),
  team("bra", "Brazil", "BRA", 2),
  team("eng", "England", "ENG", 3),
  team("esp", "Spain", "ESP", 4),
  team("ger", "Germany", "GER", 5),
  team("por", "Portugal", "POR", 6),
  team("ned", "Netherlands", "NED", 7),
];

const clubTeams = [
  team("north-london", "North London FC", "NLF", 0),
  team("manchester-blue", "Manchester Blue", "MCB", 1),
  team("mersey-red", "Mersey Red", "MSR", 2),
  team("west-london", "West London", "WLD", 3),
  team("madrid-white", "Madrid White", "MDW", 4),
  team("catalonia", "Catalonia FC", "CAT", 5),
  team("munich-red", "Munich Red", "MUN", 6),
  team("milan-blue", "Milan Blue", "MIL", 7),
];

const at = (day: number, hour: number) => `2026-06-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`;

const makeMatches = (
  competition: Competition,
  editionId: string,
  teams: Team[],
): Match[] => {
  const isLeague = competition.format === "league";
  const stages = isLeague ? ["League"] : ["Group stage", "Group stage", "Quarter-finals", "Semi-finals"];
  const statuses: Match["status"][] = ["COMPLETED", "COMPLETED", "LIVE", "UPCOMING", "POSTPONED", "UPCOMING", "CANCELLED", "UPCOMING"];
  return Array.from({ length: 12 }, (_, index) => {
    const home = teams[index % teams.length];
    const away = teams[(index + 3) % teams.length];
    const status = statuses[index % statuses.length];
    const completed = status === "COMPLETED" || status === "LIVE";
    return {
      id: `${competition.id}-${editionId}-m${index + 1}`,
      competitionId: competition.id,
      editionId,
      stage: stages[index % stages.length],
      round: isLeague ? `Matchweek ${index + 1}` : index < 6 ? "Round 1" : stages[index % stages.length],
      group: !isLeague && index < 6 ? `Group ${String.fromCharCode(65 + (index % 2))}` : undefined,
      kickoff: at(11 + index, 16 + (index % 4)),
      status,
      minute: status === "LIVE" ? 67 : undefined,
      home,
      away,
      homeScore: completed ? (index + 2) % 4 : undefined,
      awayScore: completed ? (index + 1) % 3 : undefined,
      venue: ["Atlas Stadium", "Riverside Arena", "Metropolitan Ground", "Unity Park"][index % 4],
      city: ["Toronto", "New York", "Mexico City", "Vancouver"][index % 4],
      attendance: completed ? 48200 + index * 733 : undefined,
    };
  });
};

const makeStandings = (teams: Team[], grouped: boolean): Standing[] =>
  teams.map((entry, index) => {
    const played = 3 + (index % 3);
    const won = Math.max(0, 3 - Math.floor(index / 2));
    const drawn = index % 2;
    const lost = played - won - drawn;
    return {
      position: (index % 4) + 1,
      group: grouped ? `Group ${index < 4 ? "A" : "B"}` : undefined,
      team: entry,
      played,
      won,
      drawn,
      lost,
      goalsFor: 10 - index,
      goalsAgainst: 2 + index,
      points: won * 3 + drawn,
      form: index < 2 ? ["W", "W", "D", "W", "W"] : index < 5 ? ["W", "L", "D", "W", "L"] : ["L", "D", "L", "W", "L"],
      zone: index === 0 && !grouped ? "champion" : index % 4 < 2 ? "qualified" : index >= 6 && !grouped ? "relegated" : "eliminated",
    };
  });

const makeTies = (teams: Team[], twoLegged: boolean): KnockoutTie[] => {
  const rounds = ["Quarter-finals", "Quarter-finals", "Semi-finals", "Semi-finals", "Final", "Third place"];
  return rounds.map((round, index) => {
    const home = teams[index % teams.length];
    const away = teams[(index + 4) % teams.length];
    const homeScore = index % 3;
    const awayScore = (index + 1) % 3;
    const draw = homeScore === awayScore;
    return {
      id: `tie-${index + 1}`,
      round,
      order: index,
      home,
      away,
      homeScore,
      awayScore,
      homePenalties: draw ? 4 : undefined,
      awayPenalties: draw ? 3 : undefined,
      aggregate: twoLegged ? `${homeScore + 2}–${awayScore + 1} agg.` : undefined,
      winnerId: draw || homeScore > awayScore ? home.id : away.id,
      date: at(20 + index, 19),
    };
  });
};

const playerNames = ["Mateo Silva", "Noah Laurent", "Leo Costa", "Jude Carter", "Dani Ruiz", "Kai Weber", "Rafael Santos", "Milan de Boer"];

const makeScorers = (teams: Team[]): Scorer[] =>
  playerNames.map((name, index) => ({
    rank: index + 1,
    id: `p-${index + 1}`,
    name,
    team: teams[index % teams.length],
    goals: 8 - index,
    assists: index % 4,
    matches: 7 + (index % 3),
    minutes: 610 + index * 34,
    penalties: index % 3 === 0 ? 1 : 0,
  }));

const makeEvents = (matches: Match[]): Record<string, MatchEvent[]> =>
  Object.fromEntries(
    matches.slice(0, 4).map((match, index) => [
      match.id,
      [
        { id: `${match.id}-e1`, minute: 18 + index, type: "goal", teamId: match.home.id, player: playerNames[index], detail: "Right-footed finish" },
        { id: `${match.id}-e2`, minute: 42, type: "yellow-card", teamId: match.away.id, player: playerNames[index + 1], detail: "Late challenge" },
        { id: `${match.id}-e3`, minute: 71, type: "substitution", teamId: match.home.id, player: playerNames[index + 2], detail: "Replaced by Alex Morgan" },
      ] satisfies MatchEvent[],
    ]),
  );

export const buildCompetitionData = (
  competition: Competition,
  editionId: string,
): CompetitionData => {
  const teams = competition.category === "International" ? nationalTeams : clubTeams;
  const matches = makeMatches(competition, editionId, teams);
  return {
    competition,
    matches,
    standings: competition.capabilities.hasStandings
      ? makeStandings(teams, competition.capabilities.hasGroups)
      : [],
    ties: competition.capabilities.hasBracket
      ? makeTies(teams, competition.capabilities.hasTwoLeggedTies)
      : [],
    scorers: competition.capabilities.hasScorers ? makeScorers(teams) : [],
    events: makeEvents(matches),
    updatedAt: "2026-06-15T14:30:00Z",
    source: "mock",
    provider: "Built-in demo data",
  };
};
