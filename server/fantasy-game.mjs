import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ProviderError } from "./errors.mjs";
import { createDynamoFantasyStorage } from "./fantasy/dynamodb-storage.mjs";
import { createMemoryFantasyStorage } from "./fantasy/storage.mjs";
import { worldCup2026SquadPlayers, worldCup2026Teams } from "./fantasy/world-cup-2026-squads.mjs";
import { getLiveCompetitionData } from "./football-data.mjs";

const now = "2026-06-17T12:00:00+05:30";
const defaultAdminEmail = "sanoopvellangar@gmail.com";
const defaultGroupId = "group-main";

const tournament = {
  id: "world-cup-friends-2026",
  name: "Friend Prediction Leaague",
  competitionId: "world-cup",
  editionId: "2026",
  startDate: "2026-06-11",
  endDate: "2026-07-19",
  status: "LIVE",
  pollCloseMinutesBeforeKickoff: 15,
  scoringRulesVersion: "prediction-v1",
};

const teams = worldCup2026Teams.map((team) => ({ ...team, tournamentId: tournament.id }));

const squadPlayers = worldCup2026SquadPlayers.map((player) => ({ ...player, tournamentId: tournament.id }));

const matches = [
  {
    id: "bra-arg",
    tournamentId: tournament.id,
    homeTeamId: "bra",
    awayTeamId: "arg",
    kickoff: "2026-06-18T20:30:00+05:30",
    stage: "Group D",
    importance: "BIG_MATCH",
    status: "SCHEDULED",
    pollCloseAt: "2026-06-18T20:15:00+05:30",
  },
  {
    id: "eng-esp",
    tournamentId: tournament.id,
    homeTeamId: "eng",
    awayTeamId: "esp",
    kickoff: "2026-06-16T23:30:00+05:30",
    stage: "Group F",
    importance: "BIG_MATCH",
    status: "COMPLETED",
    pollCloseAt: "2026-06-16T23:15:00+05:30",
  },
];

const questions = [
  { id: "q-bra-arg-winner", tournamentId: tournament.id, matchId: "bra-arg", category: "MATCH_WINNER", type: "SINGLE_CHOICE", text: "Who will win the match?", options: ["Brazil", "Argentina", "Draw"], points: 5, status: "OPEN", closeAt: "2026-06-18T20:15:00+05:30" },
  { id: "q-bra-arg-exact-score", tournamentId: tournament.id, matchId: "bra-arg", category: "EXACT_SCORE", type: "EXACT_SCORE", text: "What will the final score be?", options: [], points: 8, status: "OPEN", closeAt: "2026-06-18T20:15:00+05:30" },
  { id: "q-bra-arg-first-goal-time", tournamentId: tournament.id, matchId: "bra-arg", category: "FIRST_GOAL_TIME", type: "TIME_WINDOW", text: "When will the first goal be scored?", options: ["Before 10", "11-45", "46-60", "60-90", "90+"], points: 5, status: "OPEN", closeAt: "2026-06-18T20:15:00+05:30" },
  { id: "q-bra-arg-penalty-goal", tournamentId: tournament.id, matchId: "bra-arg", category: "PENALTY_GOAL", type: "SINGLE_CHOICE", text: "Will there be a penalty goal today?", options: ["Yes", "No"], points: 4, status: "OPEN", closeAt: "2026-06-18T20:15:00+05:30" },
  { id: "q-bra-arg-first-goal", tournamentId: tournament.id, matchId: "bra-arg", category: "FIRST_GOAL_SCORER", type: "PLAYER", text: "Who scores the first goal?", options: ["Vinicius Jr", "Rodrygo", "Lionel Messi", "Julian Alvarez", "Own Goal", "No goal", "Other"], points: 8, status: "OPEN", closeAt: "2026-06-18T20:15:00+05:30" },
  { id: "q-eng-esp-winner", tournamentId: tournament.id, matchId: "eng-esp", category: "MATCH_WINNER", type: "SINGLE_CHOICE", text: "Who won the match?", options: ["England", "Spain", "Draw"], points: 5, status: "SCORED", closeAt: "2026-06-16T23:15:00+05:30" },
  { id: "q-eng-esp-exact-score", tournamentId: tournament.id, matchId: "eng-esp", category: "EXACT_SCORE", type: "EXACT_SCORE", text: "What was the final score?", options: [], points: 8, status: "SCORED", closeAt: "2026-06-16T23:15:00+05:30" },
];

const questionTemplates = [
  { id: "tpl-match-result", tournamentId: tournament.id, name: "Match result", category: "MATCH_WINNER", type: "SINGLE_CHOICE", text: "Who will win the match?", optionMode: "MATCH_RESULT", points: 5, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 10 },
  { id: "tpl-total-goals", tournamentId: tournament.id, name: "Exact score", category: "EXACT_SCORE", type: "EXACT_SCORE", text: "What will the final score be?", optionMode: "EXACT_SCORE", points: 8, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 20 },
  { id: "tpl-first-goal-time", tournamentId: tournament.id, name: "First goal time", category: "FIRST_GOAL_TIME", type: "TIME_WINDOW", text: "When will the first goal be scored?", optionMode: "FIRST_GOAL_TIME", points: 5, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 30 },
  { id: "tpl-penalty-goal", tournamentId: tournament.id, name: "Penalty goal", category: "PENALTY_GOAL", type: "SINGLE_CHOICE", text: "Will there be a penalty goal today?", optionMode: "YES_NO", points: 4, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 40 },
  { id: "tpl-first-scorer", tournamentId: tournament.id, name: "First goal scorer", category: "FIRST_GOAL_SCORER", type: "PLAYER", text: "Who scores the first goal?", optionMode: "FIRST_GOAL_SCORER", points: 8, maxOptions: 8, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 50 },
  { id: "tpl-first-scoring-team", tournamentId: tournament.id, name: "First scoring team", category: "FIRST_SCORING_TEAM", type: "SINGLE_CHOICE", text: "Which team scores first?", optionMode: "FIRST_SCORING_TEAM", points: 4, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 60 },
  { id: "tpl-both-score", tournamentId: tournament.id, name: "Both teams score", category: "BOTH_TEAMS_SCORE", type: "SINGLE_CHOICE", text: "Will both teams score?", optionMode: "YES_NO", points: 3, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 70 },
  { id: "tpl-star-score", tournamentId: tournament.id, name: "Star player score", category: "STAR_PLAYER_SCORE", type: "SINGLE_CHOICE", text: "Will {player} score?", optionMode: "STAR_PLAYER_SCORE", points: 3, maxOptions: 1, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 80 },
  { id: "tpl-motm", tournamentId: tournament.id, name: "Man of the Match", category: "MAN_OF_THE_MATCH", type: "PLAYER", text: "Who will be Man of the Match?", optionMode: "MAN_OF_THE_MATCH", points: 7, maxOptions: 8, enabled: true, importanceLevels: ["BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 90 },
];

const aiSettings = {
  tournamentId: tournament.id,
  mode: "TEMPLATE_ONLY",
  externalProviderEnabled: false,
  fallbackToTemplates: true,
  banterLevel: "LIGHT",
  dailyBudgetCents: 0,
  maxQuestions: {
    NORMAL: 5,
    BIG_MATCH: 8,
    KNOCKOUT: 8,
    FINAL: 10,
  },
  enabledCategories: questionTemplates.map((template) => template.category),
};

const activeParticipantId = "p-sanoop";
const participants = [
  { id: activeParticipantId, name: "Sanoop", nickname: "Brazil Boss", favoriteTeamId: "bra", avatar: "SB", email: defaultAdminEmail, role: "ADMIN", authProvider: "INVITE" },
  { id: "p-anoop", name: "Anoop", nickname: "Messi Monk", favoriteTeamId: "arg", avatar: "AM", role: "PLAYER", authProvider: "INVITE" },
];

const groups = [
  { id: defaultGroupId, tournamentId: tournament.id, name: "Main friends league", description: "Default group for the original friends circle.", createdAt: now, createdByParticipantId: activeParticipantId, status: "ACTIVE" },
];

const groupMemberships = participants.map((participant) => ({
  id: `${defaultGroupId}-${participant.id}`,
  tournamentId: tournament.id,
  groupId: defaultGroupId,
  participantId: participant.id,
  role: participant.id === activeParticipantId ? "OWNER" : "MEMBER",
  status: "ACTIVE",
  createdAt: now,
}));

const participantInvites = [
  { id: "invite-sanoop", participantId: activeParticipantId, inviteCode: "SANOOP2026", status: "ACTIVE", createdAt: now },
  { id: "invite-anoop", participantId: "p-anoop", inviteCode: "ANOOP2026", status: "ACTIVE", createdAt: now },
];

const predictions = [
  { id: "pred-1", questionId: "q-bra-arg-winner", participantId: activeParticipantId, answer: "Brazil", submittedAt: "2026-06-17T18:20:00+05:30" },
  { id: "pred-2", questionId: "q-bra-arg-first-goal", participantId: activeParticipantId, answer: "Vinicius Jr", submittedAt: "2026-06-17T18:22:00+05:30" },
  { id: "pred-3", questionId: "q-eng-esp-winner", participantId: activeParticipantId, answer: "Draw", submittedAt: "2026-06-16T19:10:00+05:30", pointsAwarded: 0 },
  { id: "pred-4", questionId: "q-eng-esp-exact-score", participantId: activeParticipantId, answer: "1-2", submittedAt: "2026-06-16T19:11:00+05:30", pointsAwarded: 8 },
  { id: "pred-5", questionId: "q-eng-esp-winner", participantId: "p-anoop", answer: "Spain", submittedAt: "2026-06-16T20:01:00+05:30", pointsAwarded: 5 },
  { id: "pred-6", questionId: "q-eng-esp-exact-score", participantId: "p-anoop", answer: "1-2", submittedAt: "2026-06-16T20:02:00+05:30", pointsAwarded: 8 },
];

const results = [
  {
    matchId: "eng-esp",
    homeScore: 1,
    awayScore: 2,
    winnerTeamId: "esp",
    firstScoringTeamId: "eng",
    firstGoalMinute: 18,
    firstGoalScorer: "Harry Kane",
    anytimeScorers: ["Harry Kane", "Lamine Yamal"],
    playersWithTwoPlusGoals: [],
    manOfTheMatch: "Lamine Yamal",
    penaltyAwarded: false,
    penaltyGoal: false,
    redCard: false,
    bothTeamsScored: true,
    totalGoalsRange: "2-3",
    publishedAt: "2026-06-17T01:42:00+05:30",
  },
];

const initialGame = {
  tournament,
  teams,
  squadPlayers,
  participants,
  participantInvites,
  groups,
  groupMemberships,
  matches,
  questions,
  questionTemplates,
  aiSettings,
  predictions,
  results,
  leaderboard: [
    { rank: 1, previousRank: 1, participantId: activeParticipantId, nickname: "Brazil Boss", favoriteTeam: "Brazil", totalPoints: 52, todayPoints: 12, correctWinners: 6, streak: 2, badges: ["Risk Taker"] },
    { rank: 2, previousRank: 2, participantId: "p-anoop", nickname: "Messi Monk", favoriteTeam: "Argentina", totalPoints: 49, todayPoints: 9, correctWinners: 6, streak: 1, badges: ["Goal Guru"] },
  ],
  badges: [
    { id: "badge-1", participantId: activeParticipantId, label: "Risk Taker", reason: "Backed a narrow total goals call.", date: "2026-06-17" },
  ],
  activeParticipantId,
  recaps: [
    { id: "recap-eng-esp", matchId: "eng-esp", title: "Spain nicked it late", body: "England 1 - 2 Spain. The structured result facts are ready for score review.", createdAt: "2026-06-17T01:45:00+05:30" },
  ],
  aiMessages: [],
  auditRecords: [],
  updatedAt: now,
};

const createFantasyStorage = () => {
  if (process.env.FANTASY_DYNAMODB_TABLE) {
    return createDynamoFantasyStorage({
      tableName: process.env.FANTASY_DYNAMODB_TABLE,
      region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1",
      seedGame: initialGame,
    });
  }
  return createMemoryFantasyStorage(initialGame);
};

const storage = createFantasyStorage();

const publicParticipant = (participant) => {
  const { passwordHash: _passwordHash, ...safeParticipant } = participant;
  return safeParticipant;
};

const normalizeContact = (value) => String(value ?? "").trim().toLowerCase();

const normalizePhone = (value) => String(value ?? "").replaceAll(/[^\d+]/g, "");

const contactFor = (input = {}) => {
  const raw = input.emailOrPhone ?? input.identifier ?? input.email ?? input.phone;
  const value = String(raw ?? "").trim();
  if (!value) return {};
  if (value.includes("@")) return { email: normalizeContact(value) };
  return { phone: normalizePhone(value) };
};

const contactMatches = (participant, identifier) => {
  const contact = contactFor({ identifier });
  return Boolean(
    (contact.email && normalizeContact(participant.email) === contact.email) ||
    (contact.phone && normalizePhone(participant.phone) === contact.phone),
  );
};

const passwordDigest = (password, salt) =>
  createHash("sha256").update(`${salt}:${password}`).digest("hex");

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `sha256$${salt}$${passwordDigest(password, salt)}`;
};

const verifyPassword = (password, storedHash) => {
  const [, salt, digest] = String(storedHash ?? "").split("$");
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = Buffer.from(passwordDigest(password, salt), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    throw new ProviderError("Password must be at least 8 characters.", 400, "INVALID_PASSWORD");
  }
};

const roleFor = (participant) => {
  if (participant.role === "ADMIN" || participant.role === "PLAYER") return participant.role;
  if (participant.id === activeParticipantId || normalizeContact(participant.email) === defaultAdminEmail) return "ADMIN";
  return "PLAYER";
};

const normalizeParticipantRecord = (participant) => ({
  ...participant,
  email: participant.email ?? (participant.id === activeParticipantId ? defaultAdminEmail : undefined),
  role: roleFor(participant),
  authProvider: participant.authProvider ?? (participant.passwordHash ? "PASSWORD" : "INVITE"),
});

const normalizeGroupRecord = (group) => ({
  ...group,
  tournamentId: group.tournamentId ?? tournament.id,
  status: group.status ?? "ACTIVE",
  createdAt: group.createdAt ?? now,
});

const normalizeGroupMembershipRecord = (membership) => ({
  ...membership,
  id: membership.id ?? `${membership.groupId}-${membership.participantId}`,
  tournamentId: membership.tournamentId ?? tournament.id,
  role: membership.role ?? "MEMBER",
  status: membership.status ?? "ACTIVE",
  createdAt: membership.createdAt ?? now,
});

const canonicalTemplateById = new Map(questionTemplates.map((template) => [template.id, template]));

const normalizeGame = (game) => {
  const existingTemplates = new Map((game.questionTemplates ?? []).map((template) => [template.id, template]));
  const normalizedTemplates = [
    ...questionTemplates.map((template) => ({
      ...(existingTemplates.get(template.id) ?? template),
      ...canonicalTemplateById.get(template.id),
    })),
    ...(game.questionTemplates ?? []).filter((template) => !canonicalTemplateById.has(template.id)),
  ].sort((left, right) => left.sortOrder - right.sortOrder);
  return {
    ...game,
    participants: game.participants.map(normalizeParticipantRecord),
    groups: ((game.groups?.length ? game.groups : groups).map(normalizeGroupRecord)),
    groupMemberships: (game.groupMemberships?.length ? game.groupMemberships : game.participants.map((participant) => ({
      groupId: defaultGroupId,
      participantId: participant.id,
      role: participant.id === activeParticipantId ? "OWNER" : "MEMBER",
      status: "ACTIVE",
    }))).map(normalizeGroupMembershipRecord),
    questions: game.questions.map((question) => ({ groupId: defaultGroupId, ...question })),
    questionTemplates: normalizedTemplates,
    aiMessages: game.aiMessages ?? [],
    aiSettings: {
      ...game.aiSettings,
      enabledCategories: normalizedTemplates.map((template) => template.category),
    },
  };
};

const activeGroupIdsForParticipant = (game, participantId) =>
  new Set(game.groupMemberships
    .filter((membership) => membership.participantId === participantId && membership.status === "ACTIVE")
    .map((membership) => membership.groupId));

const participantCanAccessQuestion = (game, participantId, question) => {
  const participant = game.participants.find((item) => item.id === participantId);
  if (participant?.role === "ADMIN") return true;
  return activeGroupIdsForParticipant(game, participantId).has(question.groupId ?? defaultGroupId);
};

const participantIdsForGroup = (game, groupId) =>
  new Set(game.groupMemberships
    .filter((membership) => membership.groupId === groupId && membership.status === "ACTIVE")
    .map((membership) => membership.participantId));

const gameState = async () => normalizeGame(await storage.getGame());

const audit = async ({ action, actorId, entityId, entityType, metadata = {} }) => {
  const game = await gameState();
  const createdAt = new Date().toISOString();
  return {
    id: `audit-${createdAt}-${action.toLowerCase().replaceAll("_", "-")}`,
    tournamentId: game.tournament.id,
    actorId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt,
  };
};

const saveGame = async (nextGame, auditRecord) => {
  const auditRecords = auditRecord ? [...(nextGame.auditRecords ?? []), auditRecord] : (nextGame.auditRecords ?? []);
  return storage.setGame({ ...nextGame, auditRecords, updatedAt: new Date().toISOString() });
};

const normalize = (value) => String(value).trim().toLowerCase();

const inviteKey = (value) => String(value).trim().toUpperCase().replaceAll(/\s+/g, "");

const publicGame = (game) => {
  const { participantInvites: _participantInvites, ...safeGame } = game;
  return {
    ...safeGame,
    participants: safeGame.participants.map(publicParticipant),
    aiMessages: (safeGame.aiMessages ?? []).filter((message) => message.status === "PUBLISHED"),
  };
};

const withActiveParticipant = (game, participantId) => {
  const activeId = participantId ?? game.activeParticipantId;
  const participant = game.participants.find((item) => item.id === activeId);
  const publicPayload = publicGame(game);
  if (participant?.role === "ADMIN") {
    return { ...publicPayload, activeParticipantId: activeId };
  }
  const groupIds = activeGroupIdsForParticipant(game, activeId);
  const visibleQuestions = game.questions.filter((question) => groupIds.has(question.groupId ?? defaultGroupId));
  const visibleQuestionIds = new Set(visibleQuestions.map((question) => question.id));
  const visibleMemberships = game.groupMemberships.filter((membership) => groupIds.has(membership.groupId));
  const visibleParticipantIds = new Set(visibleMemberships.map((membership) => membership.participantId));
  return {
    ...publicPayload,
    activeParticipantId: activeId,
    groups: game.groups.filter((group) => groupIds.has(group.id)),
    groupMemberships: visibleMemberships,
    participants: publicPayload.participants.filter((item) => item.id === activeId || visibleParticipantIds.has(item.id)),
    questions: visibleQuestions,
    predictions: game.predictions.filter((prediction) => visibleQuestionIds.has(prediction.questionId)),
  };
};

const slug = (value) =>
  normalize(value)
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 24);

const avatar = (value) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "P";

const inviteCodeFor = (nickname, seed) => `${slug(nickname).replaceAll("-", "").slice(0, 8).toUpperCase() || "PLAYER"}${seed}`;

const uniqueInviteCodeFor = (game, participant) => {
  const existing = new Set(game.participantInvites.map((invite) => invite.inviteCode));
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const seed = randomBytes(3).toString("hex").toUpperCase();
    const code = inviteCodeFor(participant.nickname ?? participant.name, seed);
    if (!existing.has(code)) return code;
  }
  return `${inviteCodeFor(participant.nickname ?? participant.name, Date.now())}${randomBytes(2).toString("hex").toUpperCase()}`;
};

const participantsWithInvites = (game) => game.participants.map((participant) => ({
  ...publicParticipant(participant),
  invite: game.participantInvites.find((invite) => invite.participantId === participant.id),
}));

const csvLine = (line) => {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

const boolValue = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "y"].includes(String(value).trim().toLowerCase());
};

const rowValue = (row, keys) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const csvRows = (source) => {
  const lines = String(source).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = csvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => Object.fromEntries(csvLine(line).map((value, index) => [headers[index], value])));
};

const importRowsFrom = (input) => {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.rows)) return input.rows;
  if (Array.isArray(input?.squadPlayers)) return input.squadPlayers;
  if (!input?.source) return [];
  const source = String(input.source).trim();
  if (!source) return [];
  if (source.startsWith("{") || source.startsWith("[")) {
    const parsed = JSON.parse(source);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    if (Array.isArray(parsed.squadPlayers)) return parsed.squadPlayers;
  }
  return csvRows(source);
};

const normalizeImportedSquads = (game, input) => {
  const rawTeams = Array.isArray(input?.teams) ? input.teams : [];
  const rows = importRowsFrom(input);
  const teamById = new Map(game.teams.map((team) => [team.id, team]));
  const teamByCodeOrName = new Map(game.teams.flatMap((team) => [
    [normalize(team.fifaCode), team],
    [normalize(team.name), team],
  ]));
  const teamsById = new Map();
  const players = [];
  const usedPlayerIds = new Set();

  const teamFrom = (row, teamRecord = false) => {
    const teamId = rowValue(row, ["teamId"]);
    const teamName = rowValue(row, teamRecord ? ["teamName", "team", "country", "name"] : ["teamName", "team", "country"]);
    const fifaCode = rowValue(row, ["fifaCode", "code", "teamCode"]);
    if (!teamId && !teamName && !fifaCode) {
      throw new ProviderError("Each squad row needs a team name or FIFA code.", 400, "INVALID_SQUAD_IMPORT");
    }
    const existing = teamsById.get(teamId) ?? teamById.get(teamId) ?? teamByCodeOrName.get(normalize(fifaCode ?? "")) ?? teamByCodeOrName.get(normalize(teamName ?? ""));
    const id = existing?.id ?? slug(teamId ?? fifaCode ?? teamName);
    const rankingSeed = Number(rowValue(row, ["rankingSeed", "seed"]) ?? existing?.rankingSeed ?? "");
    const team = {
      id,
      tournamentId: game.tournament.id,
      name: String(teamName ?? existing?.name ?? fifaCode).trim(),
      fifaCode: String(fifaCode ?? existing?.fifaCode ?? teamName).trim().toUpperCase().slice(0, 3),
      group: String(rowValue(row, ["group", "groupName"]) ?? existing?.group ?? "Unassigned").trim(),
      rankingSeed: Number.isFinite(rankingSeed) && rankingSeed > 0 ? rankingSeed : undefined,
    };
    teamsById.set(id, team);
    return team;
  };

  rawTeams.forEach((team) => teamFrom(team, true));
  rows.forEach((row) => {
    const playerName = rowValue(row, ["playerName", "player", "name"]);
    if (!playerName) return;
    const team = teamFrom(row);
    const position = String(rowValue(row, ["position", "pos"]) ?? "").trim().toUpperCase();
    if (!validPlayerPosition.has(position)) {
      throw new ProviderError(`Invalid player position for ${playerName}.`, 400, "INVALID_SQUAD_IMPORT");
    }
    const baseId = rowValue(row, ["id", "playerId"]) ?? `${team.id}-${slug(playerName)}`;
    let playerId = baseId;
    let duplicateCount = 2;
    while (usedPlayerIds.has(playerId)) {
      playerId = `${baseId}-${duplicateCount}`;
      duplicateCount += 1;
    }
    usedPlayerIds.add(playerId);
    players.push({
      id: playerId,
      tournamentId: game.tournament.id,
      teamId: team.id,
      name: String(playerName).trim(),
      position,
      shirtNumber: Number(rowValue(row, ["shirtNumber", "number", "shirt"]) ?? "") || undefined,
      isScorerCandidate: boolValue(rowValue(row, ["isScorerCandidate", "scorer", "goalScorer"]), position === "FWD"),
      isStarCandidate: boolValue(rowValue(row, ["isStarCandidate", "star"]), position === "FWD" || position === "MID"),
      isMotmCandidate: boolValue(rowValue(row, ["isMotmCandidate", "motm"]), position !== "GK"),
      isGoldenBootCandidate: boolValue(rowValue(row, ["isGoldenBootCandidate", "goldenBoot", "boot"]), position === "FWD"),
      isGoldenGloveCandidate: boolValue(rowValue(row, ["isGoldenGloveCandidate", "goldenGlove", "glove"]), position === "GK"),
    });
  });

  if (teamsById.size === 0 || players.length === 0) {
    throw new ProviderError("Import needs at least one team and one player.", 400, "INVALID_SQUAD_IMPORT");
  }
  return { teams: [...teamsById.values()], squadPlayers: players };
};

const validMatchImportance = new Set(["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"]);
const validMatchStatus = new Set(["SCHEDULED", "LOCKED", "COMPLETED"]);
const validQuestionStatus = new Set(["DRAFT", "OPEN"]);
const validTournamentStatus = new Set(["UPCOMING", "LIVE", "COMPLETE"]);
const validPlayerPosition = new Set(["GK", "DEF", "MID", "FWD"]);
const validQuestionOptionMode = new Set(["MATCH_RESULT", "FIRST_SCORING_TEAM", "TOTAL_GOALS", "EXACT_SCORE", "YES_NO", "FIRST_GOAL_TIME", "FIRST_GOAL_SCORER", "STAR_PLAYER_SCORE", "MAN_OF_THE_MATCH"]);
const validQuestionCategory = new Set(["MATCH_WINNER", "QUALIFIER", "RESULT_90", "FINAL_SCORE_RANGE", "EXACT_SCORE", "FIRST_SCORING_TEAM", "FIRST_GOAL_TIME", "FIRST_GOAL_SCORER", "ANYTIME_GOAL_SCORER", "STAR_PLAYER_SCORE", "PLAYER_SCORES_2_PLUS", "TOTAL_GOALS", "BOTH_TEAMS_SCORE", "PENALTY_GOAL", "MAN_OF_THE_MATCH", "TOURNAMENT_WINNER", "TOURNAMENT_FINALISTS", "GOLDEN_BOOT", "GOLDEN_BALL", "GOLDEN_GLOVE", "TOURNAMENT_MVP"]);
const validAiMode = new Set(["DISABLED", "TEMPLATE_ONLY", "ASSISTED"]);
const validAiBanterLevel = new Set(["NONE", "LIGHT", "PLAYFUL"]);
const validAiMessageType = new Set(["REMINDER", "RECAP", "LEADERBOARD_SUMMARY"]);
const playerFallbackOptions = new Set(["Other", "Own Goal", "No goal"]);
const userPollTemplates = {
  MATCH_WINNER: { category: "MATCH_WINNER", type: "SINGLE_CHOICE", text: "Who will win the match?", optionMode: "MATCH_RESULT", points: 5 },
  FIRST_SCORING_TEAM: { category: "FIRST_SCORING_TEAM", type: "SINGLE_CHOICE", text: "Which team scores first?", optionMode: "FIRST_SCORING_TEAM", points: 4 },
  TOTAL_GOALS: { category: "EXACT_SCORE", type: "EXACT_SCORE", text: "What will the final score be?", optionMode: "EXACT_SCORE", points: 8 },
  FIRST_GOAL_TIME: { category: "FIRST_GOAL_TIME", type: "TIME_WINDOW", text: "When will the first goal be scored?", optionMode: "FIRST_GOAL_TIME", points: 5 },
  PENALTY_GOAL: { category: "PENALTY_GOAL", type: "SINGLE_CHOICE", text: "Will there be a penalty goal today?", optionMode: "YES_NO", points: 4 },
  BOTH_TEAMS_SCORE: { category: "BOTH_TEAMS_SCORE", type: "SINGLE_CHOICE", text: "Will both teams score?", optionMode: "YES_NO", points: 3 },
  FIRST_GOAL_SCORER: { category: "FIRST_GOAL_SCORER", type: "PLAYER", text: "Who scores the first goal?", optionMode: "FIRST_GOAL_SCORER", points: 8, maxOptions: 8 },
  MAN_OF_THE_MATCH: { category: "MAN_OF_THE_MATCH", type: "PLAYER", text: "Who will be Man of the Match?", optionMode: "MAN_OF_THE_MATCH", points: 7, maxOptions: 8 },
};

const teamName = (game, teamId) => game.teams.find((team) => team.id === teamId)?.name ?? "Unknown";

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const contextHashFor = (value) => createHash("sha256").update(stableJson(value)).digest("hex");

const shortDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
};

const matchLabel = (game, match) => `${teamName(game, match.homeTeamId)} vs ${teamName(game, match.awayTeamId)}`;

const scoreLabel = (game, match, result) =>
  `${teamName(game, match.homeTeamId)} ${result.homeScore}-${result.awayScore} ${teamName(game, match.awayTeamId)}`;

const pollCloseAtFor = (kickoff, closeMinutes) => {
  const timestamp = Date.parse(kickoff);
  if (!Number.isFinite(timestamp)) return kickoff;
  return new Date(timestamp - closeMinutes * 60_000).toISOString();
};

const fantasyStatusForProviderMatch = (status) => {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "LIVE") return "LOCKED";
  return "SCHEDULED";
};

const importanceForProviderMatch = (match, homeTeam, awayTeam) => {
  const stage = normalize(match.stage);
  if (stage.includes("final") && !stage.includes("semi") && !stage.includes("quarter")) return "FINAL";
  if (["round of 16", "quarter", "semi", "third place", "knockout"].some((value) => stage.includes(value))) return "KNOCKOUT";
  if ((homeTeam.rankingSeed ?? 99) <= 10 && (awayTeam.rankingSeed ?? 99) <= 10) return "BIG_MATCH";
  return "NORMAL";
};

const teamLookupFor = (teamsSource) => {
  const entries = teamsSource.flatMap((team) => [
    [normalize(team.id), team],
    [normalize(team.fifaCode), team],
    [normalize(team.name), team],
  ]);
  return new Map(entries);
};

const providerTeamToFantasyTeam = (providerTeam, game) => {
  const lookup = teamLookupFor(game.teams);
  return lookup.get(normalize(providerTeam?.code ?? "")) ??
    lookup.get(normalize(providerTeam?.shortName ?? "")) ??
    lookup.get(normalize(providerTeam?.name ?? ""));
};

const providerMatchToFantasyMatch = (providerMatch, game, existingMatch) => {
  const homeTeam = providerTeamToFantasyTeam(providerMatch.home, game);
  const awayTeam = providerTeamToFantasyTeam(providerMatch.away, game);
  if (!homeTeam || !awayTeam) return undefined;

  return {
    id: providerMatch.id,
    tournamentId: game.tournament.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    kickoff: providerMatch.kickoff,
    stage: providerMatch.round ?? providerMatch.stage,
    importance: existingMatch?.importance ?? importanceForProviderMatch(providerMatch, homeTeam, awayTeam),
    status: fantasyStatusForProviderMatch(providerMatch.status),
    pollCloseAt: existingMatch?.pollCloseAt ?? pollCloseAtFor(providerMatch.kickoff, game.tournament.pollCloseMinutesBeforeKickoff),
  };
};

const playerNames = (players) => players.map((player) => player.name);

const parseExactScore = (value) => {
  const numbers = String(value ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length < 2 || numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 30)) return undefined;
  return `${numbers[0]}-${numbers[1]}`;
};

const matchPlayers = (match, game) =>
  game.squadPlayers.filter((player) => [match.homeTeamId, match.awayTeamId].includes(player.teamId));

const scorerCandidates = (match, game) =>
  matchPlayers(match, game).filter((player) => player.isScorerCandidate);

const motmCandidates = (match, game) =>
  matchPlayers(match, game).filter((player) => player.isMotmCandidate);

const starCandidate = (match, game) =>
  game.squadPlayers.find((player) => player.teamId === match.homeTeamId && player.isStarCandidate) ??
  game.squadPlayers.find((player) => player.teamId === match.awayTeamId && player.isStarCandidate);

const optionsForTemplate = (template, match, game) => {
  const home = teamName(game, match.homeTeamId);
  const away = teamName(game, match.awayTeamId);
  switch (template.optionMode) {
    case "MATCH_RESULT":
      return match.importance === "KNOCKOUT" || match.importance === "FINAL" ? [home, away] : [home, away, "Draw"];
    case "FIRST_SCORING_TEAM":
      return [home, away, "No goal"];
    case "TOTAL_GOALS":
      return ["0-1", "2-3", "4+"];
    case "EXACT_SCORE":
      return [];
    case "FIRST_GOAL_TIME":
      return ["Before 10", "11-45", "46-60", "60-90", "90+"];
    case "YES_NO":
    case "STAR_PLAYER_SCORE":
      return ["Yes", "No"];
    case "FIRST_GOAL_SCORER": {
      const scorers = scorerCandidates(match, game).slice(0, template.maxOptions ?? 4);
      return scorers.length > 0 ? [...playerNames(scorers), "Own Goal", "No goal", "Other"] : [];
    }
    case "MAN_OF_THE_MATCH": {
      const motm = motmCandidates(match, game).slice(0, template.maxOptions ?? 4);
      return motm.length > 0 ? [...playerNames(motm), "Other"] : [];
    }
    default:
      return [];
  }
};

const resolveGroupId = (game, groupId = defaultGroupId) => {
  const resolved = groupId || defaultGroupId;
  if (!game.groups.some((group) => group.id === resolved && group.status !== "ARCHIVED")) {
    throw new ProviderError("Poll group is invalid.", 400, "INVALID_GROUP");
  }
  return resolved;
};

const questionFromTemplate = (template, match, game, groupId = defaultGroupId) => {
  if (!template.enabled || !template.importanceLevels.includes(match.importance)) return undefined;
  const star = starCandidate(match, game);
  if (template.optionMode === "STAR_PLAYER_SCORE" && !star) return undefined;
  const options = optionsForTemplate(template, match, game);
  if (template.type !== "EXACT_SCORE" && options.length < 2) return undefined;
  const isQualifier = template.optionMode === "MATCH_RESULT" && (match.importance === "KNOCKOUT" || match.importance === "FINAL");
  return {
    id: `draft-${groupId}-${match.id}-${template.id.replace(/^tpl-/, "")}`,
    tournamentId: game.tournament.id,
    groupId,
    matchId: match.id,
    category: isQualifier ? "QUALIFIER" : template.category,
    type: template.type,
    text: isQualifier ? "Who qualifies?" : template.text.replace("{player}", star?.name ?? "the star player"),
    options,
    points: isQualifier ? template.points + 1 : template.points,
    status: "DRAFT",
    closeAt: match.pollCloseAt,
    source: "SYSTEM",
  };
};

const generatedQuestionsForMatch = (game, match, groupId = defaultGroupId) => {
  const templates = [...(game.questionTemplates ?? [])]
    .filter((template) => !game.aiSettings?.enabledCategories || game.aiSettings.enabledCategories.includes(template.category))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const maxQuestions = game.aiSettings?.maxQuestions?.[match.importance] ?? 5;
  return templates
    .map((template) => questionFromTemplate(template, match, game, groupId))
    .filter(Boolean)
    .slice(0, maxQuestions);
};

const seededTeamOptions = (game, count = 16) =>
  [...game.teams]
    .sort((left, right) => (left.rankingSeed ?? 99) - (right.rankingSeed ?? 99))
    .slice(0, count)
    .map((team) => team.name);

const tournamentFinalistOptions = (game) => {
  const contenders = seededTeamOptions(game, 8);
  const pairings = [];
  for (let index = 0; index < contenders.length; index += 1) {
    for (let next = index + 1; next < contenders.length; next += 1) {
      pairings.push(`${contenders[index]} + ${contenders[next]}`);
    }
  }
  return [...pairings.slice(0, 18), "Other"];
};

const tournamentPlayerOptions = (game, flag, count = 18) => [
  ...game.squadPlayers
    .filter((player) => player[flag])
    .sort((left, right) => (
      (game.teams.find((team) => team.id === left.teamId)?.rankingSeed ?? 99) -
      (game.teams.find((team) => team.id === right.teamId)?.rankingSeed ?? 99) ||
      left.name.localeCompare(right.name)
    ))
    .slice(0, count)
    .map((player) => player.name),
  "Other",
];

const tournamentQuestionsForGame = (game, groupId = defaultGroupId) => {
  const closeAt = `${game.tournament.startDate}T00:00:00.000Z`;
  return [
    {
      id: `${groupId}-tournament-winner`,
      tournamentId: game.tournament.id,
      groupId,
      category: "TOURNAMENT_WINNER",
      type: "SINGLE_CHOICE",
      text: "Who will win the World Cup?",
      options: [...seededTeamOptions(game, 20), "Other"],
      points: 20,
      status: "OPEN",
      closeAt,
      source: "SYSTEM",
    },
    {
      id: `${groupId}-tournament-finalists`,
      tournamentId: game.tournament.id,
      groupId,
      category: "TOURNAMENT_FINALISTS",
      type: "SINGLE_CHOICE",
      text: "Which two teams will reach the final?",
      options: tournamentFinalistOptions(game),
      points: 18,
      status: "OPEN",
      closeAt,
      source: "SYSTEM",
    },
    {
      id: `${groupId}-tournament-golden-boot`,
      tournamentId: game.tournament.id,
      groupId,
      category: "GOLDEN_BOOT",
      type: "PLAYER",
      text: "Who will win the Golden Boot?",
      options: tournamentPlayerOptions(game, "isGoldenBootCandidate"),
      points: 18,
      status: "OPEN",
      closeAt,
      source: "SYSTEM",
    },
    {
      id: `${groupId}-tournament-golden-ball`,
      tournamentId: game.tournament.id,
      groupId,
      category: "GOLDEN_BALL",
      type: "PLAYER",
      text: "Who will win the Golden Ball?",
      options: tournamentPlayerOptions(game, "isStarCandidate"),
      points: 18,
      status: "OPEN",
      closeAt,
      source: "SYSTEM",
    },
    {
      id: `${groupId}-tournament-mvp`,
      tournamentId: game.tournament.id,
      groupId,
      category: "TOURNAMENT_MVP",
      type: "PLAYER",
      text: "Who will be your tournament MVP?",
      options: tournamentPlayerOptions(game, "isMotmCandidate"),
      points: 15,
      status: "OPEN",
      closeAt,
      source: "SYSTEM",
    },
  ];
};

const tournamentResetCategories = new Set(["TOURNAMENT_WINNER", "TOURNAMENT_FINALISTS", "GOLDEN_BOOT", "GOLDEN_BALL", "TOURNAMENT_MVP"]);

const firstGoalWindow = (minute) => {
  if (minute === undefined || minute === null) return "No goal";
  if (minute <= 10) return "Before 10";
  if (minute <= 45) return "11-45";
  if (minute <= 60) return "46-60";
  if (minute <= 90) return "60-90";
  return "90+";
};

const correctAnswer = (question, result, game) => {
  switch (question.category) {
    case "MATCH_WINNER":
    case "RESULT_90":
      return result.winnerTeamId ? teamName(game, result.winnerTeamId) : "Draw";
    case "FIRST_SCORING_TEAM":
      return result.firstScoringTeamId ? teamName(game, result.firstScoringTeamId) : "No goal";
    case "FIRST_GOAL_TIME":
      return firstGoalWindow(result.firstGoalMinute);
    case "FIRST_GOAL_SCORER":
      return result.firstGoalScorer ?? "No goal";
    case "EXACT_SCORE":
      return `${result.homeScore}-${result.awayScore}`;
    case "TOTAL_GOALS":
      return result.totalGoalsRange;
    case "BOTH_TEAMS_SCORE":
      return result.bothTeamsScored ? "Yes" : "No";
    case "PENALTY_GOAL":
      return result.penaltyGoal ? "Yes" : "No";
    case "STAR_PLAYER_SCORE": {
      const player = question.text.match(/Will (.+) score\?/i)?.[1];
      if (!player) return undefined;
      return result.anytimeScorers?.some((scorer) => normalize(scorer) === normalize(player)) ? "Yes" : "No";
    }
    case "PLAYER_SCORES_2_PLUS":
      return result.playersWithTwoPlusGoals?.length > 0 ? "Yes" : "No";
    case "MAN_OF_THE_MATCH":
      return result.manOfTheMatch;
    default:
      return undefined;
  }
};

const scorePrediction = (question, prediction, result, game) => {
  const correct = correctAnswer(question, result, game);
  if (correct === undefined) return undefined;
  const answer = prediction.answer;
  const isCorrect = question.type === "EXACT_SCORE"
    ? parseExactScore(Array.isArray(answer) ? answer[0] : answer) === correct
    : Array.isArray(answer)
      ? answer.some((item) => normalize(item) === normalize(correct))
      : normalize(answer) === normalize(correct);
  return {
    ...prediction,
    pointsAwarded: isCorrect ? question.points : 0,
  };
};

const isWinnerQuestion = (question) => ["MATCH_WINNER", "RESULT_90", "QUALIFIER"].includes(question.category);

const publishedDate = (result) => result?.publishedAt?.slice(0, 10);

const calculateCurrentWinnerStreak = (participantId, game) => {
  const winnerQuestions = game.questions
    .filter((question) => question.status === "SCORED" && isWinnerQuestion(question))
    .map((question) => {
      const match = game.matches.find((item) => item.id === question.matchId);
      return { match, question };
    })
    .filter((item) => item.match)
    .sort((left, right) => right.match.kickoff.localeCompare(left.match.kickoff));

  let streak = 0;
  for (const { question } of winnerQuestions) {
    const prediction = game.predictions.find((item) => item.participantId === participantId && item.questionId === question.id);
    if (!prediction || prediction.pointsAwarded !== question.points) break;
    streak += 1;
  }
  return streak;
};

const calculateLeaderboard = (game) => {
  const previousRanks = new Map(game.leaderboard.map((row) => [row.participantId, row.rank]));
  const questionById = new Map(game.questions.map((question) => [question.id, question]));
  const resultByMatchId = new Map(game.results.map((result) => [result.matchId, result]));
  const latestResultDate = game.results
    .map(publishedDate)
    .filter(Boolean)
    .sort()
    .at(-1);

  return game.participants
    .map((participant) => {
      const favoriteTeam = game.teams.find((team) => team.id === participant.favoriteTeamId)?.name ?? "Unknown";
      const participantPredictions = game.predictions.filter((prediction) => prediction.participantId === participant.id);
      const totalPoints = participantPredictions.reduce((sum, prediction) => sum + (prediction.pointsAwarded ?? 0), 0);
      const todayPoints = participantPredictions.reduce((sum, prediction) => {
        const question = questionById.get(prediction.questionId);
        const result = question?.matchId ? resultByMatchId.get(question.matchId) : undefined;
        return latestResultDate && publishedDate(result) === latestResultDate ? sum + (prediction.pointsAwarded ?? 0) : sum;
      }, 0);
      const correctWinners = participantPredictions.filter((prediction) => {
        const question = questionById.get(prediction.questionId);
        return question && isWinnerQuestion(question) && prediction.pointsAwarded === question.points;
      }).length;
      const existingRow = game.leaderboard.find((row) => row.participantId === participant.id);
      return {
        rank: 0,
        previousRank: previousRanks.get(participant.id),
        participantId: participant.id,
        nickname: participant.nickname,
        favoriteTeam,
        totalPoints,
        todayPoints,
        correctWinners,
        streak: calculateCurrentWinnerStreak(participant.id, game),
        badges: existingRow?.badges ?? [],
      };
    })
    .sort((left, right) => (
      right.totalPoints - left.totalPoints ||
      right.todayPoints - left.todayPoints ||
      left.nickname.localeCompare(right.nickname)
    ))
    .map((row, index) => ({ ...row, rank: index + 1 }));
};

const validateAnswer = (question, answer) => {
  const values = Array.isArray(answer) ? answer : [answer];
  if (values.length === 0 || values.some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new ProviderError("Prediction answer is required.", 400, "INVALID_PREDICTION");
  }
  if (question.type === "EXACT_SCORE") {
    if (values.length !== 1 || !parseExactScore(values[0])) {
      throw new ProviderError("Enter a score like 0-0 or Brazil 3 Germany 4.", 400, "INVALID_PREDICTION");
    }
    return;
  }
  const invalid = values.filter((value) => !question.options.includes(value));
  if (invalid.length > 0) {
    throw new ProviderError(`Invalid prediction option: ${invalid.join(", ")}`, 400, "INVALID_PREDICTION");
  }
};

const validateQuestionDraft = (game, matchId, question, status) => {
  if (!question?.id || !question.text?.trim()) {
    throw new ProviderError("Question draft is missing required fields.", 400, "INVALID_QUESTION_DRAFT");
  }
  if (question.matchId !== matchId) {
    throw new ProviderError("Question draft match does not match the request.", 400, "INVALID_QUESTION_DRAFT");
  }
  if (question.tournamentId !== game.tournament.id) {
    throw new ProviderError("Question draft tournament is invalid.", 400, "INVALID_QUESTION_DRAFT");
  }
  if (!validQuestionCategory.has(question.category)) {
    throw new ProviderError("Question draft category is invalid.", 400, "INVALID_QUESTION_DRAFT");
  }
  if (question.groupId && !game.groups.some((group) => group.id === question.groupId && group.status !== "ARCHIVED")) {
    throw new ProviderError("Question draft group is invalid.", 400, "INVALID_QUESTION_DRAFT");
  }
  if (question.type === "EXACT_SCORE") {
    if (question.options !== undefined && !Array.isArray(question.options)) {
      throw new ProviderError("Question draft options are invalid.", 400, "INVALID_QUESTION_DRAFT");
    }
  } else if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new ProviderError("Question draft needs at least two options.", 400, "INVALID_QUESTION_DRAFT");
  }
  if (!validQuestionStatus.has(status)) {
    throw new ProviderError("Question status is invalid.", 400, "INVALID_QUESTION_DRAFT");
  }
  if (question.type === "PLAYER") {
    const squadNames = new Set(game.squadPlayers.map((player) => player.name));
    const unknown = question.options.filter((option) => !squadNames.has(option) && !playerFallbackOptions.has(option));
    if (unknown.length > 0) {
      throw new ProviderError(`Unknown player options: ${unknown.join(", ")}`, 400, "INVALID_QUESTION_DRAFT");
    }
  }
};

const participantInput = (game, input) => {
  if (!input?.name?.trim() || !input?.nickname?.trim()) {
    throw new ProviderError("Name and display name are required.", 400, "INVALID_PARTICIPANT");
  }
  const favoriteTeamId = input.favoriteTeamId || game.teams[0]?.id;
  if (!game.teams.some((team) => team.id === favoriteTeamId)) {
    throw new ProviderError("Favorite team is invalid.", 400, "INVALID_PARTICIPANT");
  }
  return {
    name: input.name.trim(),
    nickname: input.nickname.trim(),
    favoriteTeamId,
  };
};

/**
 * Returns the in-memory fantasy prediction game state.
 *
 * @returns Fantasy game payload.
 */
export const getFantasyGame = async (participantId) => withActiveParticipant(await gameState(), participantId);

/**
 * Resolves an admin-created invite code to a participant identity.
 *
 * @param input - Join input.
 * @param input.inviteCode - Private friends-league invite code.
 * @returns Participant identity and active game payload.
 */
export const joinFantasyGame = async ({ inviteCode }) => {
  const game = await gameState();
  const invite = game.participantInvites.find((item) => item.inviteCode === inviteKey(inviteCode) && item.status === "ACTIVE");
  if (!invite) throw new ProviderError("Invite code is invalid.", 401, "INVALID_INVITE");
  const participant = game.participants.find((item) => item.id === invite.participantId);
  if (!participant) throw new ProviderError("Participant not found.", 404, "NOT_FOUND");
  const nextGame = {
    ...game,
    participantInvites: game.participantInvites.map((item) => (
      item.id === invite.id ? { ...item, lastUsedAt: new Date().toISOString() } : item
    )),
  };

  const updatedGame = await saveGame(nextGame, await audit({
    action: "PARTICIPANT_JOINED",
    actorId: participant.id,
    entityId: participant.id,
    entityType: "PARTICIPANT",
    metadata: { method: "invite-code" },
  }));
  return { participant: publicParticipant(participant), game: withActiveParticipant(updatedGame, participant.id) };
};

/**
 * Authenticates a participant using email/phone and password.
 *
 * @param input - Login credentials.
 * @returns Participant identity and active game payload.
 */
export const loginFantasyParticipant = async (input = {}) => {
  const game = await gameState();
  const identifier = String(input.emailOrPhone ?? input.identifier ?? "").trim();
  const participant = game.participants.find((item) => contactMatches(item, identifier));
  if (!participant || !participant.passwordHash || !verifyPassword(input.password, participant.passwordHash)) {
    throw new ProviderError("Email/phone or password is invalid.", 401, "INVALID_LOGIN");
  }
  const updatedGame = await saveGame(game, await audit({
    action: "PARTICIPANT_JOINED",
    actorId: participant.id,
    entityId: participant.id,
    entityType: "PARTICIPANT",
    metadata: { method: "password" },
  }));
  return { participant: publicParticipant(participant), game: withActiveParticipant(updatedGame, participant.id) };
};

/**
 * Returns admin participant rows including invite metadata.
 *
 * @returns Participant rows and game payload.
 */
export const listFantasyParticipants = async () => {
  const game = await gameState();
  return { participants: participantsWithInvites(game), game: publicGame(game) };
};

const groupInput = (game, input = {}, existingGroup) => {
  const name = String(input.name ?? existingGroup?.name ?? "").trim();
  if (!name) throw new ProviderError("Group name is required.", 400, "INVALID_GROUP");
  const participantIds = Array.isArray(input.participantIds) ? input.participantIds.map(String) : undefined;
  if (participantIds?.some((participantId) => !game.participants.some((participant) => participant.id === participantId))) {
    throw new ProviderError("Group contains an unknown participant.", 400, "INVALID_GROUP");
  }
  return {
    name,
    description: String(input.description ?? existingGroup?.description ?? "").trim(),
    participantIds,
  };
};

const membershipRowsForGroup = (game, groupId, participantIds, actorId) => {
  const nowIso = new Date().toISOString();
  const uniqueIds = [...new Set(participantIds)];
  return uniqueIds.map((participantId) => {
    const existing = game.groupMemberships.find((membership) => membership.groupId === groupId && membership.participantId === participantId);
    return {
      id: existing?.id ?? `${groupId}-${participantId}`,
      tournamentId: game.tournament.id,
      groupId,
      participantId,
      role: participantId === actorId ? "OWNER" : existing?.role ?? "MEMBER",
      status: "ACTIVE",
      createdAt: existing?.createdAt ?? nowIso,
    };
  });
};

/**
 * Lists fantasy groups and many-to-many membership rows for admin screens.
 *
 * @returns Groups, memberships, and game payload.
 */
export const listFantasyGroups = async () => {
  const game = await gameState();
  return { groups: game.groups, groupMemberships: game.groupMemberships, game: publicGame(game) };
};

/**
 * Creates one fantasy poll group.
 *
 * @param input - Group fields and participant ids.
 * @returns Created group and memberships.
 */
export const createFantasyGroup = async (input = {}) => {
  const game = await gameState();
  const actorId = input.actorId ?? activeParticipantId;
  const parsed = groupInput(game, input);
  const createdAt = new Date().toISOString();
  const baseId = `group-${slug(parsed.name) || "polls"}`;
  const duplicateCount = game.groups.filter((group) => group.id === baseId || group.id.startsWith(`${baseId}-`)).length;
  const group = {
    id: duplicateCount > 0 ? `${baseId}-${duplicateCount + 1}` : baseId,
    tournamentId: game.tournament.id,
    name: parsed.name,
    description: parsed.description,
    createdAt,
    createdByParticipantId: actorId,
    status: "ACTIVE",
  };
  const participantIds = parsed.participantIds?.length ? parsed.participantIds : [actorId];
  const memberships = membershipRowsForGroup(game, group.id, participantIds, actorId);
  const nextGame = {
    ...game,
    groups: [...game.groups, group],
    groupMemberships: [...game.groupMemberships, ...memberships],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "GROUP_CREATED",
    actorId,
    entityId: group.id,
    entityType: "GROUP",
    metadata: { participantCount: memberships.length },
  }));
  return { group, groupMemberships: memberships, game: publicGame(updatedGame) };
};

/**
 * Updates one fantasy poll group and replaces its active member set.
 *
 * @param groupId - Group being updated.
 * @param input - Group fields and participant ids.
 * @returns Updated group and memberships.
 */
export const updateFantasyGroup = async (groupId, input = {}) => {
  const game = await gameState();
  const group = game.groups.find((item) => item.id === groupId);
  if (!group) throw new ProviderError("Group not found.", 404, "NOT_FOUND");
  const actorId = input.actorId ?? activeParticipantId;
  const parsed = groupInput(game, input, group);
  const participantIds = parsed.participantIds ?? game.groupMemberships
    .filter((membership) => membership.groupId === groupId && membership.status === "ACTIVE")
    .map((membership) => membership.participantId);
  const updatedGroup = {
    ...group,
    name: parsed.name,
    description: parsed.description,
  };
  const memberships = membershipRowsForGroup(game, groupId, participantIds, actorId);
  const nextGame = {
    ...game,
    groups: game.groups.map((item) => item.id === groupId ? updatedGroup : item),
    groupMemberships: [
      ...game.groupMemberships.filter((membership) => membership.groupId !== groupId),
      ...memberships,
    ],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "GROUP_UPDATED",
    actorId,
    entityId: groupId,
    entityType: "GROUP",
    metadata: { participantCount: memberships.length },
  }));
  return { group: updatedGroup, groupMemberships: memberships, game: publicGame(updatedGame) };
};

/**
 * Creates a participant and active invite code for the friends league.
 *
 * @param input - Participant creation fields.
 * @param input.name - Display name.
 * @param input.nickname - Leaderboard nickname.
 * @param input.favoriteTeamId - Favorite team id.
 * @returns Created participant, invite, and game payload.
 */
export const createFantasyParticipant = async (input) => {
  const game = await gameState();
  const { name, nickname, favoriteTeamId } = participantInput(game, input);
  const contact = contactFor(input);
  if ((contact.email || contact.phone) && game.participants.some((participant) => (
    (contact.email && normalizeContact(participant.email) === contact.email) ||
    (contact.phone && normalizePhone(participant.phone) === contact.phone)
  ))) {
    throw new ProviderError("That email or phone number is already registered.", 409, "PARTICIPANT_EXISTS");
  }
  if (input.password) validatePassword(input.password);
  const createdAt = new Date().toISOString();
  const baseId = `p-${slug(nickname) || slug(name) || "participant"}`;
  const duplicateCount = game.participants.filter((participant) => participant.id === baseId || participant.id.startsWith(`${baseId}-`)).length;
  const participant = {
    id: duplicateCount > 0 ? `${baseId}-${duplicateCount + 1}` : baseId,
    name: name.trim(),
    nickname: nickname.trim(),
    favoriteTeamId,
    avatar: avatar(nickname),
    ...contact,
    role: input.role === "ADMIN" ? "ADMIN" : "PLAYER",
    authProvider: input.password ? "PASSWORD" : "INVITE",
    passwordHash: input.password ? hashPassword(input.password) : undefined,
  };
  const invite = {
    id: `invite-${participant.id}`,
    participantId: participant.id,
    inviteCode: inviteCodeFor(nickname, game.participants.length + 1),
    status: "ACTIVE",
    createdAt,
  };
  const defaultMembership = {
    id: `${defaultGroupId}-${participant.id}`,
    tournamentId: game.tournament.id,
    groupId: defaultGroupId,
    participantId: participant.id,
    role: "MEMBER",
    status: "ACTIVE",
    createdAt,
  };
  const team = game.teams.find((item) => item.id === favoriteTeamId);
  const nextGame = {
    ...game,
    participants: [...game.participants, participant],
    participantInvites: [...game.participantInvites, invite],
    groupMemberships: [...game.groupMemberships, defaultMembership],
    leaderboard: [
      ...game.leaderboard,
      {
        rank: game.leaderboard.length + 1,
        previousRank: game.leaderboard.length + 1,
        participantId: participant.id,
        nickname: participant.nickname,
        favoriteTeam: team?.name ?? "Unknown",
        totalPoints: 0,
        todayPoints: 0,
        correctWinners: 0,
        streak: 0,
        badges: [],
      },
    ],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "PARTICIPANT_CREATED",
    actorId: input.actorId ?? "admin",
    entityId: participant.id,
    entityType: "PARTICIPANT",
    metadata: { favoriteTeamId },
  }));
  return { participant: publicParticipant(participant), invite, game: publicGame(updatedGame) };
};

/**
 * Creates a participant from the public signup/guest flow and returns it as active.
 *
 * @param input - Participant creation fields.
 * @returns Created participant, invite, and active game payload.
 */
export const createFantasySignup = async (input) => {
  if (input.password) {
    const contact = contactFor(input);
    if (!contact.email && !contact.phone) {
      throw new ProviderError("Email or phone number is required for password signup.", 400, "INVALID_PARTICIPANT");
    }
  }
  const created = await createFantasyParticipant({ ...input, actorId: "self-signup" });
  return {
    ...created,
    game: withActiveParticipant(await gameState(), created.participant.id),
  };
};

/**
 * Updates the active user's display profile.
 *
 * @param participantId - Participant being updated.
 * @param input - Editable profile fields.
 * @returns Updated participant and active game payload.
 */
export const updateFantasyParticipant = async (participantId, input) => {
  const game = await gameState();
  const participant = game.participants.find((item) => item.id === participantId);
  if (!participant) throw new ProviderError("Participant not found.", 404, "NOT_FOUND");
  const { name, nickname, favoriteTeamId } = participantInput(game, {
    name: input.name ?? participant.name,
    nickname: input.nickname ?? participant.nickname,
    favoriteTeamId: input.favoriteTeamId ?? participant.favoriteTeamId,
  });
  const updatedParticipant = {
    ...participant,
    name,
    nickname,
    favoriteTeamId,
    avatar: avatar(nickname),
    ...contactFor(input),
  };
  const favoriteTeam = game.teams.find((team) => team.id === favoriteTeamId)?.name ?? "Unknown";
  const nextGame = {
    ...game,
    participants: game.participants.map((item) => item.id === participantId ? updatedParticipant : item),
    leaderboard: game.leaderboard.map((row) => row.participantId === participantId ? {
      ...row,
      nickname,
      favoriteTeam,
    } : row),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "PARTICIPANT_UPDATED",
    actorId: participantId,
    entityId: participantId,
    entityType: "PARTICIPANT",
    metadata: { favoriteTeamId },
  }));
  return { participant: publicParticipant(updatedParticipant), game: withActiveParticipant(updatedGame, participantId) };
};

/**
 * Changes or sets a participant password.
 *
 * @param participantId - Participant being updated.
 * @param input - Password fields.
 * @returns Updated participant and game payload.
 */
export const changeFantasyParticipantPassword = async (participantId, input = {}) => {
  const game = await gameState();
  const participant = game.participants.find((item) => item.id === participantId);
  if (!participant) throw new ProviderError("Participant not found.", 404, "NOT_FOUND");
  validatePassword(input.newPassword);
  if (participant.passwordHash && !verifyPassword(input.currentPassword, participant.passwordHash)) {
    throw new ProviderError("Current password is incorrect.", 401, "INVALID_PASSWORD");
  }
  const updatedParticipant = {
    ...participant,
    passwordHash: hashPassword(input.newPassword),
    authProvider: "PASSWORD",
    passwordChangedAt: new Date().toISOString(),
  };
  const nextGame = {
    ...game,
    participants: game.participants.map((item) => item.id === participantId ? updatedParticipant : item),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "PARTICIPANT_PASSWORD_CHANGED",
    actorId: participantId,
    entityId: participantId,
    entityType: "PARTICIPANT",
  }));
  return { participant: publicParticipant(updatedParticipant), game: withActiveParticipant(updatedGame, participantId) };
};

/**
 * Grants or removes admin role for a participant.
 *
 * @param participantId - Participant being changed.
 * @param input - Role update payload.
 * @returns Updated participant and game payload.
 */
export const updateFantasyParticipantRole = async (participantId, input = {}) => {
  const game = await gameState();
  const participant = game.participants.find((item) => item.id === participantId);
  if (!participant) throw new ProviderError("Participant not found.", 404, "NOT_FOUND");
  const role = input.role === "ADMIN" ? "ADMIN" : "PLAYER";
  const updatedParticipant = { ...participant, role };
  const nextGame = {
    ...game,
    participants: game.participants.map((item) => item.id === participantId ? updatedParticipant : item),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "PARTICIPANT_ROLE_UPDATED",
    actorId: input.actorId ?? "admin",
    entityId: participantId,
    entityType: "PARTICIPANT",
    metadata: { role },
  }));
  return { participant: publicParticipant(updatedParticipant), game: publicGame(updatedGame) };
};

/**
 * Lets an admin rotate an invite or set a temporary password for a participant.
 *
 * @param participantId - Participant whose credentials are being reset.
 * @param input - Credential reset payload.
 * @returns Updated participant, invite, and game payload.
 */
export const updateFantasyParticipantCredentials = async (participantId, input = {}) => {
  const game = await gameState();
  const participant = game.participants.find((item) => item.id === participantId);
  if (!participant) throw new ProviderError("Participant not found.", 404, "NOT_FOUND");
  const shouldResetInvite = Boolean(input.resetInvite);
  const temporaryPassword = typeof input.temporaryPassword === "string" ? input.temporaryPassword : "";
  if (!shouldResetInvite && !temporaryPassword) {
    throw new ProviderError("Choose an invite reset or temporary password.", 400, "INVALID_CREDENTIAL_RESET");
  }
  if (temporaryPassword) validatePassword(temporaryPassword);
  const updatedAt = new Date().toISOString();
  const updatedParticipant = temporaryPassword ? {
    ...participant,
    passwordHash: hashPassword(temporaryPassword),
    authProvider: "PASSWORD",
    passwordChangedAt: updatedAt,
    temporaryPasswordSetAt: updatedAt,
  } : participant;
  const existingInvite = game.participantInvites.find((invite) => invite.participantId === participantId);
  const updatedInvite = shouldResetInvite ? {
    id: existingInvite?.id ?? `invite-${participantId}`,
    participantId,
    inviteCode: uniqueInviteCodeFor(game, participant),
    status: "ACTIVE",
    createdAt: existingInvite?.createdAt ?? updatedAt,
    updatedAt,
  } : existingInvite;
  const nextGame = {
    ...game,
    participants: game.participants.map((item) => item.id === participantId ? updatedParticipant : item),
    participantInvites: shouldResetInvite
      ? [
        ...game.participantInvites.filter((invite) => invite.participantId !== participantId),
        updatedInvite,
      ]
      : game.participantInvites,
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "PARTICIPANT_CREDENTIALS_RESET",
    actorId: input.actorId ?? "admin",
    entityId: participantId,
    entityType: "PARTICIPANT",
    metadata: {
      resetInvite: shouldResetInvite,
      temporaryPassword: Boolean(temporaryPassword),
    },
  }));
  return {
    participant: publicParticipant(updatedParticipant),
    invite: updatedInvite,
    game: publicGame(updatedGame),
  };
};

/**
 * Updates tournament-level setup values used by the friends league.
 *
 * @param input - Tournament fields to update.
 * @returns Updated tournament and game payload.
 */
export const updateFantasyTournament = async (input) => {
  const game = await gameState();
  if (input.name !== undefined && !input.name?.trim()) {
    throw new ProviderError("Tournament name is required.", 400, "INVALID_TOURNAMENT");
  }
  if (input.status !== undefined && !validTournamentStatus.has(input.status)) {
    throw new ProviderError("Tournament status is invalid.", 400, "INVALID_TOURNAMENT");
  }
  if (input.pollCloseMinutesBeforeKickoff !== undefined) {
    const minutes = Number(input.pollCloseMinutesBeforeKickoff);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180) {
      throw new ProviderError("Poll close minutes must be between 0 and 180.", 400, "INVALID_TOURNAMENT");
    }
  }
  if (input.scoringRulesVersion !== undefined && !input.scoringRulesVersion?.trim()) {
    throw new ProviderError("Scoring rules version is required.", 400, "INVALID_TOURNAMENT");
  }

  const tournament = {
    ...game.tournament,
    name: input.name?.trim() ?? game.tournament.name,
    startDate: input.startDate?.trim() || game.tournament.startDate,
    endDate: input.endDate?.trim() || game.tournament.endDate,
    status: input.status ?? game.tournament.status,
    pollCloseMinutesBeforeKickoff: input.pollCloseMinutesBeforeKickoff !== undefined
      ? Number(input.pollCloseMinutesBeforeKickoff)
      : game.tournament.pollCloseMinutesBeforeKickoff,
    scoringRulesVersion: input.scoringRulesVersion?.trim() ?? game.tournament.scoringRulesVersion,
  };
  const nextGame = { ...game, tournament };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "TOURNAMENT_UPDATED",
    actorId: input.actorId ?? "admin",
    entityId: tournament.id,
    entityType: "TOURNAMENT",
    metadata: {
      status: tournament.status,
      pollCloseMinutesBeforeKickoff: tournament.pollCloseMinutesBeforeKickoff,
      scoringRulesVersion: tournament.scoringRulesVersion,
    },
  }));
  return { tournament, game: publicGame(updatedGame) };
};

/**
 * Returns admin team and squad-player reference data.
 *
 * @returns Teams, squad players, and game payload.
 */
export const listFantasySquads = async () => {
  const game = await gameState();
  return { teams: game.teams, squadPlayers: game.squadPlayers, game: publicGame(game) };
};

/**
 * Imports World Cup team and squad-player reference data from JSON or CSV rows.
 *
 * @param input - Import payload with `source`, `rows`, or structured arrays.
 * @returns Imported teams, players, and game payload.
 */
export const importFantasySquads = async (input) => {
  const game = await gameState();
  let imported;
  try {
    imported = normalizeImportedSquads(game, input);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("Squad import source could not be parsed.", 400, "INVALID_SQUAD_IMPORT");
  }
  const importedTeamIds = new Set(imported.teams.map((team) => team.id));
  const nextGame = {
    ...game,
    teams: [
      ...game.teams.filter((team) => !importedTeamIds.has(team.id)),
      ...imported.teams,
    ].sort((left, right) => left.name.localeCompare(right.name)),
    squadPlayers: [
      ...game.squadPlayers.filter((player) => !importedTeamIds.has(player.teamId)),
      ...imported.squadPlayers,
    ].sort((left, right) => left.teamId.localeCompare(right.teamId) || left.name.localeCompare(right.name)),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "SQUADS_IMPORTED",
    actorId: input.actorId ?? "admin",
    entityId: game.tournament.id,
    entityType: "SQUAD",
    metadata: { teamCount: imported.teams.length, playerCount: imported.squadPlayers.length },
  }));
  return { teams: imported.teams, squadPlayers: imported.squadPlayers, game: publicGame(updatedGame) };
};

/**
 * Seeds the bundled World Cup 2026 team and squad-player reference dataset into storage.
 *
 * @param input - Optional actor metadata.
 * @returns Seeded teams, squad players, and game payload.
 */
export const seedFantasyWorldCupSquads = async (input = {}) => {
  const game = await gameState();
  const seededTeams = worldCup2026Teams.map((team) => ({ ...team, tournamentId: game.tournament.id }));
  const seededPlayers = worldCup2026SquadPlayers.map((player) => ({ ...player, tournamentId: game.tournament.id }));
  const nextGame = {
    ...game,
    teams: seededTeams,
    squadPlayers: seededPlayers,
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "WORLD_CUP_SQUADS_SEEDED",
    actorId: input.actorId ?? "admin",
    entityId: game.tournament.id,
    entityType: "SQUAD",
    metadata: { teamCount: seededTeams.length, playerCount: seededPlayers.length },
  }));
  return { teams: seededTeams, squadPlayers: seededPlayers, game: publicGame(updatedGame) };
};

/**
 * Syncs fantasy fixtures from the live competition provider payload.
 *
 * @param env - Provider env with server-side football API keys.
 * @param input - Sync options.
 * @returns Synced fixture rows and game payload.
 */
export const syncFantasyFixturesFromProvider = async (env, input = {}) => {
  const game = await gameState();
  const competition = await getLiveCompetitionData(
    game.tournament.competitionId,
    game.tournament.editionId,
    env,
  );
  const existingById = new Map(game.matches.map((match) => [match.id, match]));
  const syncedFixtures = competition.matches
    .map((match) => providerMatchToFantasyMatch(match, game, existingById.get(match.id)))
    .filter(Boolean)
    .sort((left, right) => left.kickoff.localeCompare(right.kickoff));

  if (syncedFixtures.length === 0) {
    throw new ProviderError("No provider fixtures matched the stored World Cup teams.", 404, "NO_FIXTURE_MATCHES");
  }

  const syncedIds = new Set(syncedFixtures.map((fixture) => fixture.id));
  const replaceExisting = input.replaceExisting ?? true;
  const nextMatches = replaceExisting
    ? syncedFixtures
    : [
      ...game.matches.filter((match) => !syncedIds.has(match.id)),
      ...syncedFixtures,
    ].sort((left, right) => left.kickoff.localeCompare(right.kickoff));
  const matchIds = new Set(nextMatches.map((match) => match.id));
  const nextGame = {
    ...game,
    matches: nextMatches,
    questions: game.questions.filter((question) => !question.matchId || matchIds.has(question.matchId)),
    results: game.results.filter((result) => matchIds.has(result.matchId)),
  };
  const questionIds = new Set(nextGame.questions.map((question) => question.id));
  nextGame.predictions = game.predictions.filter((prediction) => questionIds.has(prediction.questionId));

  const updatedGame = await saveGame(nextGame, await audit({
    action: "FIXTURES_SYNCED",
    actorId: input.actorId ?? "admin",
    entityId: game.tournament.id,
    entityType: "MATCH",
    metadata: {
      fixtureCount: syncedFixtures.length,
      source: competition.source,
      provider: competition.provider,
      replaceExisting,
    },
  }));
  return { fixtures: syncedFixtures, game: publicGame(updatedGame) };
};

/**
 * Updates one World Cup team reference record.
 *
 * @param teamId - Team being updated.
 * @param input - Team fields.
 * @returns Updated team and game payload.
 */
export const updateFantasyTeam = async (teamId, input) => {
  const game = await gameState();
  const team = game.teams.find((item) => item.id === teamId);
  if (!team) throw new ProviderError("Team not found.", 404, "NOT_FOUND");
  if (input.name !== undefined && !input.name?.trim()) {
    throw new ProviderError("Team name is required.", 400, "INVALID_TEAM");
  }
  if (input.fifaCode !== undefined && !input.fifaCode?.trim()) {
    throw new ProviderError("FIFA code is required.", 400, "INVALID_TEAM");
  }
  const rankingSeed = input.rankingSeed === undefined || input.rankingSeed === "" ? team.rankingSeed : Number(input.rankingSeed);
  const updatedTeam = {
    ...team,
    name: input.name?.trim() ?? team.name,
    fifaCode: input.fifaCode?.trim().toUpperCase().slice(0, 3) ?? team.fifaCode,
    group: input.group?.trim() || team.group,
    rankingSeed: Number.isFinite(rankingSeed) && rankingSeed > 0 ? rankingSeed : undefined,
  };
  const nextGame = {
    ...game,
    teams: game.teams.map((item) => item.id === teamId ? updatedTeam : item),
    leaderboard: game.leaderboard.map((row) => {
      const participant = game.participants.find((item) => item.id === row.participantId);
      return participant?.favoriteTeamId === teamId ? { ...row, favoriteTeam: updatedTeam.name } : row;
    }),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "TEAM_UPDATED",
    actorId: input.actorId ?? "admin",
    entityId: teamId,
    entityType: "TEAM",
    metadata: { fifaCode: updatedTeam.fifaCode, group: updatedTeam.group },
  }));
  return { team: updatedTeam, game: publicGame(updatedGame) };
};

/**
 * Updates one squad-player reference record.
 *
 * @param playerId - Squad player being updated.
 * @param input - Player fields.
 * @returns Updated player and game payload.
 */
export const updateFantasySquadPlayer = async (playerId, input) => {
  const game = await gameState();
  const player = game.squadPlayers.find((item) => item.id === playerId);
  if (!player) throw new ProviderError("Squad player not found.", 404, "NOT_FOUND");
  if (input.teamId !== undefined && !game.teams.some((team) => team.id === input.teamId)) {
    throw new ProviderError("Player team is invalid.", 400, "INVALID_SQUAD_PLAYER");
  }
  if (input.name !== undefined && !input.name?.trim()) {
    throw new ProviderError("Player name is required.", 400, "INVALID_SQUAD_PLAYER");
  }
  if (input.position !== undefined && !validPlayerPosition.has(input.position)) {
    throw new ProviderError("Player position is invalid.", 400, "INVALID_SQUAD_PLAYER");
  }
  const shirtNumber = input.shirtNumber === undefined || input.shirtNumber === "" ? player.shirtNumber : Number(input.shirtNumber);
  const updatedPlayer = {
    ...player,
    teamId: input.teamId ?? player.teamId,
    name: input.name?.trim() ?? player.name,
    position: input.position ?? player.position,
    shirtNumber: Number.isFinite(shirtNumber) && shirtNumber > 0 ? shirtNumber : undefined,
    isScorerCandidate: input.isScorerCandidate ?? player.isScorerCandidate,
    isStarCandidate: input.isStarCandidate ?? player.isStarCandidate,
    isMotmCandidate: input.isMotmCandidate ?? player.isMotmCandidate,
    isGoldenBootCandidate: input.isGoldenBootCandidate ?? player.isGoldenBootCandidate,
    isGoldenGloveCandidate: input.isGoldenGloveCandidate ?? player.isGoldenGloveCandidate,
  };
  const nextGame = {
    ...game,
    squadPlayers: game.squadPlayers.map((item) => item.id === playerId ? updatedPlayer : item),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "SQUAD_PLAYER_UPDATED",
    actorId: input.actorId ?? "admin",
    entityId: playerId,
    entityType: "SQUAD_PLAYER",
    metadata: { teamId: updatedPlayer.teamId, position: updatedPlayer.position },
  }));
  return { squadPlayer: updatedPlayer, game: publicGame(updatedGame) };
};

/**
 * Returns admin question templates used by draft generation.
 *
 * @returns Question templates and game payload.
 */
export const listFantasyQuestionTemplates = async () => {
  const game = await gameState();
  return { questionTemplates: game.questionTemplates ?? [], game: publicGame(game) };
};

/**
 * Updates one question template used by poll draft generation.
 *
 * @param templateId - Template being updated.
 * @param input - Template fields.
 * @returns Updated template and game payload.
 */
export const updateFantasyQuestionTemplate = async (templateId, input) => {
  const game = await gameState();
  const template = (game.questionTemplates ?? []).find((item) => item.id === templateId);
  if (!template) throw new ProviderError("Question template not found.", 404, "NOT_FOUND");
  if (input.name !== undefined && !input.name?.trim()) {
    throw new ProviderError("Template name is required.", 400, "INVALID_QUESTION_TEMPLATE");
  }
  if (input.text !== undefined && !input.text?.trim()) {
    throw new ProviderError("Template text is required.", 400, "INVALID_QUESTION_TEMPLATE");
  }
  if (input.points !== undefined) {
    const points = Number(input.points);
    if (!Number.isInteger(points) || points < 1 || points > 25) {
      throw new ProviderError("Template points must be between 1 and 25.", 400, "INVALID_QUESTION_TEMPLATE");
    }
  }
  if (input.maxOptions !== undefined && input.maxOptions !== "") {
    const maxOptions = Number(input.maxOptions);
    if (!Number.isInteger(maxOptions) || maxOptions < 1 || maxOptions > 12) {
      throw new ProviderError("Template max options must be between 1 and 12.", 400, "INVALID_QUESTION_TEMPLATE");
    }
  }
  if (input.optionMode !== undefined && !validQuestionOptionMode.has(input.optionMode)) {
    throw new ProviderError("Template option mode is invalid.", 400, "INVALID_QUESTION_TEMPLATE");
  }
  if (input.importanceLevels !== undefined) {
    const levels = Array.isArray(input.importanceLevels) ? input.importanceLevels : [];
    if (levels.length === 0 || levels.some((level) => !validMatchImportance.has(level))) {
      throw new ProviderError("Template importance levels are invalid.", 400, "INVALID_QUESTION_TEMPLATE");
    }
  }
  const sortOrder = input.sortOrder === undefined || input.sortOrder === "" ? template.sortOrder : Number(input.sortOrder);
  const updatedTemplate = {
    ...template,
    name: input.name?.trim() ?? template.name,
    text: input.text?.trim() ?? template.text,
    optionMode: input.optionMode ?? template.optionMode,
    points: input.points !== undefined ? Number(input.points) : template.points,
    maxOptions: input.maxOptions === "" ? undefined : input.maxOptions !== undefined ? Number(input.maxOptions) : template.maxOptions,
    enabled: input.enabled ?? template.enabled,
    importanceLevels: input.importanceLevels ?? template.importanceLevels,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : template.sortOrder,
  };
  const nextGame = {
    ...game,
    questionTemplates: game.questionTemplates.map((item) => item.id === templateId ? updatedTemplate : item),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "QUESTION_TEMPLATE_UPDATED",
    actorId: input.actorId ?? "admin",
    entityId: templateId,
    entityType: "QUESTION_TEMPLATE",
    metadata: { enabled: updatedTemplate.enabled, points: updatedTemplate.points, optionMode: updatedTemplate.optionMode },
  }));
  return { questionTemplate: updatedTemplate, game: publicGame(updatedGame) };
};

/**
 * Returns AI generation settings for fantasy poll drafts.
 *
 * @returns AI settings and game payload.
 */
export const listFantasyAiSettings = async () => {
  const game = await gameState();
  return { aiSettings: game.aiSettings, game: publicGame(game) };
};

/**
 * Updates AI generation settings used by the local draft helper.
 *
 * @param input - AI setting fields.
 * @returns Updated AI settings and game payload.
 */
export const updateFantasyAiSettings = async (input) => {
  const game = await gameState();
  const current = game.aiSettings;
  if (!current) throw new ProviderError("AI settings are not initialized.", 500, "AI_SETTINGS_MISSING");
  if (input.mode !== undefined && !validAiMode.has(input.mode)) {
    throw new ProviderError("AI mode is invalid.", 400, "INVALID_AI_SETTINGS");
  }
  if (input.banterLevel !== undefined && !validAiBanterLevel.has(input.banterLevel)) {
    throw new ProviderError("Banter level is invalid.", 400, "INVALID_AI_SETTINGS");
  }
  if (input.dailyBudgetCents !== undefined) {
    const dailyBudgetCents = Number(input.dailyBudgetCents);
    if (!Number.isInteger(dailyBudgetCents) || dailyBudgetCents < 0 || dailyBudgetCents > 5000) {
      throw new ProviderError("Daily AI budget must be between 0 and 5000 cents.", 400, "INVALID_AI_SETTINGS");
    }
  }
  if (input.maxQuestions !== undefined) {
    const values = Object.entries(input.maxQuestions ?? {});
    if (values.length !== validMatchImportance.size || values.some(([importance, value]) => {
      const count = Number(value);
      return !validMatchImportance.has(importance) || !Number.isInteger(count) || count < 1 || count > 12;
    })) {
      throw new ProviderError("Max questions must be set from 1 to 12 for every match importance.", 400, "INVALID_AI_SETTINGS");
    }
  }
  if (input.enabledCategories !== undefined) {
    const categories = Array.isArray(input.enabledCategories) ? input.enabledCategories : [];
    if (categories.length === 0 || categories.some((category) => !validQuestionCategory.has(category))) {
      throw new ProviderError("Enabled question categories are invalid.", 400, "INVALID_AI_SETTINGS");
    }
  }
  const updatedSettings = {
    ...current,
    mode: input.mode ?? current.mode,
    externalProviderEnabled: Boolean(input.externalProviderEnabled ?? current.externalProviderEnabled),
    fallbackToTemplates: Boolean(input.fallbackToTemplates ?? current.fallbackToTemplates),
    banterLevel: input.banterLevel ?? current.banterLevel,
    dailyBudgetCents: input.dailyBudgetCents !== undefined ? Number(input.dailyBudgetCents) : current.dailyBudgetCents,
    maxQuestions: input.maxQuestions ? Object.fromEntries(
      Object.entries(input.maxQuestions).map(([importance, value]) => [importance, Number(value)]),
    ) : current.maxQuestions,
    enabledCategories: input.enabledCategories ?? current.enabledCategories,
  };
  const nextGame = { ...game, aiSettings: updatedSettings };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "AI_SETTINGS_UPDATED",
    actorId: input.actorId ?? "admin",
    entityId: game.tournament.id,
    entityType: "AI_SETTINGS",
    metadata: {
      mode: updatedSettings.mode,
      externalProviderEnabled: updatedSettings.externalProviderEnabled,
      dailyBudgetCents: updatedSettings.dailyBudgetCents,
    },
  }));
  return { aiSettings: updatedSettings, game: publicGame(updatedGame) };
};

const aiMessageBaseContext = (game, input = {}) => ({
  tournamentId: game.tournament.id,
  groupId: input.groupId ?? defaultGroupId,
});

const matchForAiMessage = (game, matchId) => {
  const match = game.matches.find((item) => item.id === matchId);
  if (!match) throw new ProviderError("Match not found.", 404, "NOT_FOUND");
  return match;
};

const openPollReminderContext = (game, input = {}) => {
  const groupId = resolveGroupId(game, input.groupId);
  const match = matchForAiMessage(game, input.matchId);
  const questions = game.questions.filter((question) =>
    question.matchId === match.id &&
    (question.groupId ?? defaultGroupId) === groupId &&
    question.status === "OPEN"
  );
  if (questions.length === 0) {
    throw new ProviderError("No open polls found for this match and group.", 404, "NO_OPEN_POLLS");
  }
  const participantIds = participantIdsForGroup(game, groupId);
  const predictionKeys = new Set(game.predictions.map((prediction) => `${prediction.participantId}:${prediction.questionId}`));
  const unansweredPollCount = [...participantIds].reduce((sum, participantId) => (
    sum + questions.filter((question) => !predictionKeys.has(`${participantId}:${question.id}`)).length
  ), 0);
  return {
    ...aiMessageBaseContext(game, { groupId }),
    matchId: match.id,
    matchLabel: matchLabel(game, match),
    kickoff: match.kickoff,
    pollCloseAt: match.pollCloseAt,
    openQuestionCount: questions.length,
    participantCount: participantIds.size,
    unansweredPollCount,
  };
};

const recapContext = (game, input = {}) => {
  const match = matchForAiMessage(game, input.matchId);
  const result = game.results.find((item) => item.matchId === match.id);
  if (!result) throw new ProviderError("Result not found.", 404, "NOT_FOUND");
  const questionIds = new Set(game.questions.filter((question) => question.matchId === match.id).map((question) => question.id));
  const pointsByParticipant = new Map();
  game.predictions
    .filter((prediction) => questionIds.has(prediction.questionId))
    .forEach((prediction) => {
      pointsByParticipant.set(prediction.participantId, (pointsByParticipant.get(prediction.participantId) ?? 0) + (prediction.pointsAwarded ?? 0));
    });
  const topPointWinners = [...pointsByParticipant.entries()]
    .map(([participantId, points]) => ({
      nickname: game.participants.find((participant) => participant.id === participantId)?.nickname ?? participantId,
      points,
    }))
    .filter((row) => row.points > 0)
    .sort((left, right) => right.points - left.points || left.nickname.localeCompare(right.nickname))
    .slice(0, 3);
  return {
    ...aiMessageBaseContext(game, input),
    matchId: match.id,
    matchLabel: matchLabel(game, match),
    score: scoreLabel(game, match, result),
    firstGoalScorer: result.firstGoalScorer,
    firstGoalMinute: result.firstGoalMinute,
    manOfTheMatch: result.manOfTheMatch,
    penaltyGoal: Boolean(result.penaltyGoal),
    bothTeamsScored: result.bothTeamsScored,
    topPointWinners,
  };
};

const leaderboardContext = (game, input = {}) => {
  const rows = [...game.leaderboard].sort((left, right) => left.rank - right.rank);
  const leader = rows[0];
  const rankChanges = rows
    .filter((row) => row.previousRank && row.previousRank !== row.rank)
    .map((row) => ({
      nickname: row.nickname,
      from: row.previousRank,
      to: row.rank,
    }))
    .slice(0, 3);
  const todayTopScorer = [...rows].sort((left, right) => right.todayPoints - left.todayPoints || left.rank - right.rank)[0];
  return {
    ...aiMessageBaseContext(game, input),
    leader: leader ? { nickname: leader.nickname, points: leader.totalPoints } : undefined,
    rankChanges,
    todayTopScorer: todayTopScorer ? { nickname: todayTopScorer.nickname, points: todayTopScorer.todayPoints } : undefined,
    rowCount: rows.length,
  };
};

const templateDraftFromContext = (type, context) => {
  switch (type) {
    case "REMINDER":
      return {
        title: `${context.matchLabel} polls close soon`,
        body: `${context.openQuestionCount} polls lock at ${shortDateTime(context.pollCloseAt)}. ${context.unansweredPollCount} answers are still pending across ${context.participantCount} players.`,
      };
    case "RECAP": {
      const topWinners = context.topPointWinners.length > 0
        ? context.topPointWinners.map((row) => `${row.nickname} +${row.points}`).join(", ")
        : "No points swings yet";
      const insight = context.firstGoalScorer
        ? `${context.firstGoalScorer} opened the scoring${context.firstGoalMinute ? ` in minute ${context.firstGoalMinute}` : ""}.`
        : context.bothTeamsScored ? "Both teams found a way onto the sheet." : "The clean-sheet calls mattered here.";
      return {
        title: `${context.matchLabel} recap`,
        body: `${context.score}. Top points: ${topWinners}. ${insight}`,
      };
    }
    case "LEADERBOARD_SUMMARY": {
      const leaderText = context.leader ? `${context.leader.nickname} leads on ${context.leader.points} points` : "Leaderboard is waiting for points";
      const moverText = context.rankChanges.length > 0
        ? `Movers: ${context.rankChanges.map((row) => `${row.nickname} ${row.from}->${row.to}`).join(", ")}.`
        : "No rank changes after the latest scoring.";
      const todayText = context.todayTopScorer?.points > 0
        ? `${context.todayTopScorer.nickname} is today's top scorer with ${context.todayTopScorer.points}.`
        : "Today's top scorer is still open.";
      return {
        title: "Leaderboard pulse",
        body: `${leaderText}. ${moverText} ${todayText}`,
      };
    }
    default:
      throw new ProviderError("AI message type is invalid.", 400, "INVALID_AI_MESSAGE");
  }
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const aiUsageForToday = (game) => {
  const today = todayKey();
  const records = (game.auditRecords ?? []).filter((record) =>
    record.action === "AI_MESSAGE_DRAFTED" &&
    record.createdAt?.slice(0, 10) === today &&
    record.metadata?.source === "EXTERNAL_AI"
  );
  return {
    calls: records.length,
    estimatedCostCents: records.reduce((sum, record) => sum + Number(record.metadata?.estimatedCostCents ?? 0), 0),
  };
};

const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const aiProviderConfig = (env = {}) => ({
  apiKey: env.fantasyAiApiKey ?? env.FANTASY_AI_API_KEY ?? "",
  providerUrl: env.fantasyAiProviderUrl ?? env.FANTASY_AI_PROVIDER_URL ?? "",
  model: env.fantasyAiModel ?? env.FANTASY_AI_MODEL ?? "",
  dailyCallLimit: Math.max(0, Math.floor(numberFromEnv(env.fantasyAiDailyCallLimit ?? env.FANTASY_AI_DAILY_CALL_LIMIT, 0))),
  estimatedCostCents: Math.max(0, Math.floor(numberFromEnv(env.fantasyAiEstimatedCostCents ?? env.FANTASY_AI_ESTIMATED_COST_CENTS, 1))),
  maxOutputTokens: Math.max(60, Math.floor(numberFromEnv(env.fantasyAiMaxOutputTokens ?? env.FANTASY_AI_MAX_OUTPUT_TOKENS, 180))),
});

const canUseExternalAi = (game, env = {}) => {
  const settings = game.aiSettings ?? {};
  const config = aiProviderConfig(env);
  if (settings.mode !== "ASSISTED" || !settings.externalProviderEnabled) {
    return { ok: false, reason: "AI assisted mode is disabled.", config };
  }
  if (!config.apiKey || !config.providerUrl || !config.model) {
    return { ok: false, reason: "AI provider is not configured.", config };
  }
  if (config.dailyCallLimit < 1) {
    return { ok: false, reason: "AI daily call limit is zero.", config };
  }
  const usage = aiUsageForToday(game);
  if (usage.calls >= config.dailyCallLimit) {
    return { ok: false, reason: "AI daily call limit reached.", config, usage };
  }
  const dailyBudgetCents = Number(settings.dailyBudgetCents ?? 0);
  if (dailyBudgetCents < 1 || usage.estimatedCostCents + config.estimatedCostCents > dailyBudgetCents) {
    return { ok: false, reason: "AI daily budget reached.", config, usage };
  }
  return { ok: true, config, usage };
};

const aiSystemPrompt = (settings = {}) => [
  "You write short fantasy football host messages for a private friends league.",
  "Return only compact JSON with string fields title and body.",
  "Keep the message factual, playful only when requested, and under 45 body words.",
  "Do not invent scores, players, injuries, or events outside the provided JSON context.",
  `Banter level: ${settings.banterLevel ?? "LIGHT"}.`,
].join(" ");

const parseAiDraftPayload = (payload) => {
  const content = payload?.choices?.[0]?.message?.content ?? payload?.content ?? "";
  const jsonText = String(content).match(/\{[\s\S]*\}/)?.[0] ?? content;
  const parsed = JSON.parse(jsonText);
  const title = String(parsed.title ?? "").trim();
  const body = String(parsed.body ?? "").trim();
  if (!title || !body) throw new Error("AI response missing title/body.");
  return { title: title.slice(0, 120), body: body.slice(0, 500) };
};

const externalDraftFromContext = async (type, context, game, env = {}) => {
  const guard = canUseExternalAi(game, env);
  if (!guard.ok) {
    throw new ProviderError(guard.reason, 429, "AI_GUARDRAIL_BLOCKED");
  }
  const response = await fetch(guard.config.providerUrl, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${guard.config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: guard.config.model,
      messages: [
        { role: "system", content: aiSystemPrompt(game.aiSettings) },
        { role: "user", content: JSON.stringify({ type, context }) },
      ],
      max_tokens: guard.config.maxOutputTokens,
      temperature: game.aiSettings?.banterLevel === "NONE" ? 0.2 : 0.7,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ProviderError(payload?.error?.message ?? "AI provider request failed.", 502, "AI_PROVIDER_FAILED");
  }
  return {
    ...parseAiDraftPayload(await response.json()),
    estimatedCostCents: guard.config.estimatedCostCents,
    source: "EXTERNAL_AI",
  };
};

const assistedDraftFromContext = async (type, context, game, env = {}) => {
  try {
    return await externalDraftFromContext(type, context, game, env);
  } catch (error) {
    if (!game.aiSettings?.fallbackToTemplates) throw error;
    return {
      ...templateDraftFromContext(type, context),
      fallbackReason: error.code ?? "AI_PROVIDER_FAILED",
      source: "TEMPLATE",
    };
  }
};

const aiMessageContextFor = (game, type, input = {}) => {
  if (type === "REMINDER") return openPollReminderContext(game, input);
  if (type === "RECAP") return recapContext(game, input);
  if (type === "LEADERBOARD_SUMMARY") return leaderboardContext(game, input);
  throw new ProviderError("AI message type is invalid.", 400, "INVALID_AI_MESSAGE");
};

const createAiMessageDraft = async (type, input = {}, env = {}) => {
  if (!validAiMessageType.has(type)) {
    throw new ProviderError("AI message type is invalid.", 400, "INVALID_AI_MESSAGE");
  }
  const game = await gameState();
  const context = aiMessageContextFor(game, type, input);
  const contextHash = contextHashFor({ type, context });
  const existingDraft = (game.aiMessages ?? []).find((message) => message.contextHash === contextHash && message.status === "DRAFT");
  if (existingDraft) {
    return { message: existingDraft, game: publicGame(game) };
  }
  const generated = game.aiSettings?.mode === "ASSISTED"
    ? await assistedDraftFromContext(type, context, game, env)
    : templateDraftFromContext(type, context);
  const createdAt = new Date().toISOString();
  const message = {
    id: `ai-${type.toLowerCase().replaceAll("_", "-")}-${context.matchId ?? context.groupId ?? game.tournament.id}-${contextHash.slice(0, 10)}`,
    tournamentId: game.tournament.id,
    matchId: context.matchId,
    groupId: context.groupId,
    type,
    status: "DRAFT",
    source: generated.source ?? "TEMPLATE",
    title: generated.title,
    body: generated.body,
    contextHash,
    createdAt,
    createdByParticipantId: input.actorId ?? "admin",
  };
  const nextGame = {
    ...game,
    aiMessages: [
      ...(game.aiMessages ?? []).filter((item) => item.id !== message.id),
      message,
    ],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "AI_MESSAGE_DRAFTED",
    actorId: input.actorId ?? "admin",
    entityId: message.id,
    entityType: "AI_MESSAGE",
    metadata: {
      type,
      source: message.source,
      matchId: message.matchId,
      groupId: message.groupId,
      contextHash,
      estimatedCostCents: generated.estimatedCostCents ?? 0,
      fallbackReason: generated.fallbackReason,
    },
  }));
  return { message, game: publicGame(updatedGame) };
};

const aiMessageById = (game, messageId) => {
  const message = (game.aiMessages ?? []).find((item) => item.id === messageId);
  if (!message) throw new ProviderError("AI message not found.", 404, "NOT_FOUND");
  return message;
};

const saveAiMessageMutation = async ({ game, message, action, actorId = "admin", metadata = {} }) => {
  const nextGame = {
    ...game,
    aiMessages: (game.aiMessages ?? []).map((item) => item.id === message.id ? message : item),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action,
    actorId,
    entityId: message.id,
    entityType: "AI_MESSAGE",
    metadata: {
      type: message.type,
      source: message.source,
      matchId: message.matchId,
      groupId: message.groupId,
      contextHash: message.contextHash,
      ...metadata,
    },
  }));
  return { message, game: publicGame(updatedGame) };
};

/**
 * Returns admin-visible AI host messages, including drafts.
 *
 * @returns AI messages and game payload.
 */
export const listFantasyAiMessages = async () => {
  const game = await gameState();
  return { aiMessages: game.aiMessages ?? [], game: publicGame(game) };
};

/**
 * Generates a template reminder draft for one upcoming match and group.
 *
 * @param input - Draft context fields.
 * @returns Draft AI message and game payload.
 */
export const createFantasyReminderDraft = async (input = {}, env = {}) => createAiMessageDraft("REMINDER", input, env);

/**
 * Generates a template match recap draft from stored result facts and scoring.
 *
 * @param input - Draft context fields.
 * @returns Draft AI message and game payload.
 */
export const createFantasyRecapDraft = async (input = {}, env = {}) => createAiMessageDraft("RECAP", input, env);

/**
 * Generates a template leaderboard summary draft.
 *
 * @param input - Draft context fields.
 * @returns Draft AI message and game payload.
 */
export const createFantasyLeaderboardDraft = async (input = {}, env = {}) => createAiMessageDraft("LEADERBOARD_SUMMARY", input, env);

/**
 * Updates admin-editable AI host copy without changing visibility.
 *
 * @param messageId - Message being edited.
 * @param input - Editable copy fields.
 * @returns Updated AI message and game payload.
 */
export const updateFantasyAiMessage = async (messageId, input = {}) => {
  const game = await gameState();
  const current = aiMessageById(game, messageId);
  const title = input.title !== undefined ? String(input.title).trim() : current.title;
  const body = input.body !== undefined ? String(input.body).trim() : current.body;
  if (!title || !body) {
    throw new ProviderError("AI message title and body are required.", 400, "INVALID_AI_MESSAGE");
  }
  if (current.status === "DISCARDED") {
    throw new ProviderError("Discarded AI messages cannot be edited.", 409, "AI_MESSAGE_DISCARDED");
  }
  const message = {
    ...current,
    title,
    body,
    source: title !== current.title || body !== current.body ? "MANUAL" : current.source,
  };
  return saveAiMessageMutation({
    game,
    message,
    action: "AI_MESSAGE_REGENERATED",
    actorId: input.actorId ?? "admin",
    metadata: { manualEdit: message.source === "MANUAL" },
  });
};

/**
 * Regenerates a draft AI host message from current stored context.
 *
 * @param messageId - Message being regenerated.
 * @param input - Optional actor metadata.
 * @returns Regenerated AI message and game payload.
 */
export const regenerateFantasyAiMessage = async (messageId, input = {}, env = {}) => {
  const game = await gameState();
  const current = aiMessageById(game, messageId);
  if (current.status === "DISCARDED") {
    throw new ProviderError("Discarded AI messages cannot be regenerated.", 409, "AI_MESSAGE_DISCARDED");
  }
  const context = aiMessageContextFor(game, current.type, {
    matchId: current.matchId,
    groupId: current.groupId,
  });
  const contextHash = contextHashFor({ type: current.type, context });
  const generated = game.aiSettings?.mode === "ASSISTED"
    ? await assistedDraftFromContext(current.type, context, game, env)
    : templateDraftFromContext(current.type, context);
  const message = {
    ...current,
    status: "DRAFT",
    source: generated.source ?? "TEMPLATE",
    title: generated.title,
    body: generated.body,
    contextHash,
    publishedAt: undefined,
    discardedAt: undefined,
  };
  return saveAiMessageMutation({
    game,
    message,
    action: "AI_MESSAGE_REGENERATED",
    actorId: input.actorId ?? "admin",
    metadata: {
      estimatedCostCents: generated.estimatedCostCents ?? 0,
      fallbackReason: generated.fallbackReason,
    },
  });
};

/**
 * Publishes an AI host message to player payloads.
 *
 * @param messageId - Message being published.
 * @param input - Optional actor metadata.
 * @returns Published AI message and game payload.
 */
export const publishFantasyAiMessage = async (messageId, input = {}) => {
  const game = await gameState();
  const current = aiMessageById(game, messageId);
  if (current.status === "DISCARDED") {
    throw new ProviderError("Discarded AI messages cannot be published.", 409, "AI_MESSAGE_DISCARDED");
  }
  const publishedAt = new Date().toISOString();
  const message = {
    ...current,
    status: "PUBLISHED",
    publishedAt,
    discardedAt: undefined,
  };
  return saveAiMessageMutation({
    game,
    message,
    action: "AI_MESSAGE_PUBLISHED",
    actorId: input.actorId ?? "admin",
  });
};

/**
 * Discards an AI host message so it stays hidden from players.
 *
 * @param messageId - Message being discarded.
 * @param input - Optional actor metadata.
 * @returns Discarded AI message and game payload.
 */
export const discardFantasyAiMessage = async (messageId, input = {}) => {
  const game = await gameState();
  const current = aiMessageById(game, messageId);
  const message = {
    ...current,
    status: "DISCARDED",
    discardedAt: new Date().toISOString(),
    publishedAt: undefined,
  };
  return saveAiMessageMutation({
    game,
    message,
    action: "AI_MESSAGE_DISCARDED",
    actorId: input.actorId ?? "admin",
  });
};

const publishIfRequested = async (result, shouldPublish, actorId) => {
  if (!shouldPublish || result.message.status === "PUBLISHED") return result;
  return publishFantasyAiMessage(result.message.id, { actorId });
};

/**
 * Generates scheduled AI host message drafts for current fantasy activity.
 *
 * @param input - Scheduling options.
 * @param env - Provider and schedule environment settings.
 * @returns Generated message summary and public game payload.
 */
export const runScheduledFantasyAiGeneration = async (input = {}, env = {}) => {
  const initialGame = await gameState();
  const actorId = input.actorId ?? "scheduler";
  const autoPublish = Boolean(input.autoPublish ?? env.fantasyAiScheduleAutoPublish ?? env.FANTASY_AI_SCHEDULE_AUTO_PUBLISH === "true");
  const nowMs = Number.isFinite(Date.parse(input.now)) ? Date.parse(input.now) : Date.now();
  const lookaheadHours = Math.max(1, Number(input.lookaheadHours ?? 36));
  const lookaheadMs = lookaheadHours * 60 * 60 * 1000;
  const activeGroups = (initialGame.groups ?? []).filter((group) => group.status === "ACTIVE");
  const generated = [];
  const skipped = [];

  for (const match of initialGame.matches) {
    const kickoffMs = Date.parse(match.kickoff);
    if (match.status === "SCHEDULED" && kickoffMs >= nowMs && kickoffMs - nowMs <= lookaheadMs) {
      for (const group of activeGroups) {
        try {
          const result = await createFantasyReminderDraft({ actorId, groupId: group.id, matchId: match.id }, env);
          generated.push((await publishIfRequested(result, autoPublish, actorId)).message);
        } catch (error) {
          skipped.push({ matchId: match.id, groupId: group.id, type: "REMINDER", reason: error.code ?? error.message });
        }
      }
    }
    if (match.status === "COMPLETED" && initialGame.results.some((result) => result.matchId === match.id)) {
      try {
        const result = await createFantasyRecapDraft({ actorId, matchId: match.id }, env);
        generated.push((await publishIfRequested(result, autoPublish, actorId)).message);
      } catch (error) {
        skipped.push({ matchId: match.id, type: "RECAP", reason: error.code ?? error.message });
      }
    }
  }

  try {
    const result = await createFantasyLeaderboardDraft({ actorId }, env);
    generated.push((await publishIfRequested(result, autoPublish, actorId)).message);
  } catch (error) {
    skipped.push({ type: "LEADERBOARD_SUMMARY", reason: error.code ?? error.message });
  }

  const game = await gameState();
  return {
    generated,
    skipped,
    autoPublish,
    game: publicGame(game),
  };
};

/**
 * Returns admin fixture rows.
 *
 * @returns Fixtures and game payload.
 */
export const listFantasyFixtures = async () => {
  const game = await gameState();
  return { fixtures: game.matches, game: publicGame(game) };
};

/**
 * Updates match scheduling metadata used by poll generation and locking.
 *
 * @param matchId - Match being updated.
 * @param input - Fixture fields to update.
 * @returns Updated fixture and game payload.
 */
export const updateFantasyFixture = async (matchId, input) => {
  const game = await gameState();
  const match = game.matches.find((item) => item.id === matchId);
  if (!match) throw new ProviderError("Match not found.", 404, "NOT_FOUND");
  if (input.importance !== undefined && !validMatchImportance.has(input.importance)) {
    throw new ProviderError("Match importance is invalid.", 400, "INVALID_FIXTURE");
  }
  if (input.status !== undefined && !validMatchStatus.has(input.status)) {
    throw new ProviderError("Match status is invalid.", 400, "INVALID_FIXTURE");
  }

  const fixture = {
    ...match,
    importance: input.importance ?? match.importance,
    kickoff: input.kickoff?.trim() || match.kickoff,
    pollCloseAt: input.pollCloseAt?.trim() || match.pollCloseAt,
    stage: input.stage?.trim() || match.stage,
    status: input.status ?? match.status,
  };
  const nextGame = {
    ...game,
    matches: game.matches.map((item) => item.id === matchId ? fixture : item),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "FIXTURE_UPDATED",
    actorId: input.actorId ?? "admin",
    entityId: matchId,
    entityType: "MATCH",
    metadata: {
      importance: fixture.importance,
      pollCloseAt: fixture.pollCloseAt,
      status: fixture.status,
    },
  }));
  return { fixture, game: publicGame(updatedGame) };
};

/**
 * Saves generated question drafts for a match.
 *
 * @param matchId - Match receiving the questions.
 * @param input - Question draft payload.
 * @returns Saved questions and game payload.
 */
export const saveFantasyQuestionDrafts = async (matchId, input) => {
  const game = await gameState();
  const match = game.matches.find((item) => item.id === matchId);
  if (!match) throw new ProviderError("Match not found.", 404, "NOT_FOUND");
  const groupId = resolveGroupId(game, input.groupId);
  const status = input.status ?? "DRAFT";
  const questions = Array.isArray(input.questions) ? input.questions : [];
  if (questions.length === 0) {
    throw new ProviderError("At least one question draft is required.", 400, "INVALID_QUESTION_DRAFT");
  }
  questions.forEach((question) => validateQuestionDraft(game, matchId, question, status));
  const savedQuestions = questions.map((question) => ({
    ...question,
    id: question.id.startsWith(`draft-${groupId}-`) || question.id.startsWith(`user-${groupId}-`)
      ? question.id
      : `draft-${groupId}-${question.id.replace(/^draft-/, "")}`,
    groupId,
    closeAt: question.closeAt || match.pollCloseAt,
    status,
  }));
  const savedIds = new Set(savedQuestions.map((question) => question.id));
  const nextGame = {
    ...game,
    questions: [
      ...game.questions.filter((question) => !savedIds.has(question.id)),
      ...savedQuestions,
    ],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: status === "OPEN" ? "QUESTIONS_PUBLISHED" : "QUESTION_DRAFTS_SAVED",
    actorId: input.actorId ?? "admin",
    entityId: matchId,
    entityType: "MATCH",
    metadata: { questionCount: savedQuestions.length, status, groupId },
  }));
  return { questions: savedQuestions, game: publicGame(updatedGame) };
};

/**
 * Generates and saves template-grounded polls for upcoming synced fixtures.
 *
 * @param input - Generation options.
 * @returns Generated questions, affected fixtures, and game payload.
 */
export const generateFantasyPolls = async (input = {}) => {
  const game = await gameState();
  const groupId = resolveGroupId(game, input.groupId);
  const status = input.status ?? "DRAFT";
  if (!validQuestionStatus.has(status)) {
    throw new ProviderError("Question status is invalid.", 400, "INVALID_QUESTION_DRAFT");
  }
  const requestedIds = Array.isArray(input.matchIds) ? new Set(input.matchIds) : undefined;
  const limit = Number(input.limit ?? 8);
  if (!Number.isInteger(limit) || limit < 1 || limit > 32) {
    throw new ProviderError("Poll generation limit must be between 1 and 32.", 400, "INVALID_QUESTION_DRAFT");
  }

  const matchesToGenerate = game.matches
    .filter((match) => match.status === "SCHEDULED")
    .filter((match) => !requestedIds || requestedIds.has(match.id))
    .sort((left, right) => left.kickoff.localeCompare(right.kickoff))
    .slice(0, requestedIds ? game.matches.length : limit);

  if (matchesToGenerate.length === 0) {
    throw new ProviderError("No eligible fixtures found for poll generation.", 404, "NO_FIXTURES_FOR_POLLS");
  }

  const savedQuestions = matchesToGenerate.flatMap((match) =>
    generatedQuestionsForMatch(game, match, groupId).map((question) => ({
      ...question,
      groupId,
      status,
      closeAt: question.closeAt || match.pollCloseAt,
    })),
  );
  if (savedQuestions.length === 0) {
    throw new ProviderError("No polls could be generated from the current templates and squad data.", 400, "NO_POLLS_GENERATED");
  }

  savedQuestions.forEach((question) => validateQuestionDraft(game, question.matchId, question, status));
  const touchedMatchIds = new Set(matchesToGenerate.map((match) => match.id));
  const savedIds = new Set(savedQuestions.map((question) => question.id));
  const replaceExisting = input.replaceExisting ?? true;
  const nextQuestions = replaceExisting
    ? [
      ...game.questions.filter((question) => (question.groupId ?? defaultGroupId) !== groupId || (!touchedMatchIds.has(question.matchId) && !savedIds.has(question.id))),
      ...savedQuestions,
    ]
    : [
      ...game.questions.filter((question) => !savedIds.has(question.id)),
      ...savedQuestions,
    ];

  const nextGame = {
    ...game,
    questions: nextQuestions,
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: status === "OPEN" ? "POLLS_GENERATED_AND_PUBLISHED" : "POLLS_GENERATED",
    actorId: input.actorId ?? "admin",
    entityId: game.tournament.id,
    entityType: "MATCH",
    metadata: {
      matchCount: matchesToGenerate.length,
      questionCount: savedQuestions.length,
      status,
      replaceExisting,
      groupId,
    },
  }));
  return { fixtures: matchesToGenerate, questions: savedQuestions, game: publicGame(updatedGame) };
};

/**
 * Clears existing match polls and user answers, then publishes fresh polls.
 *
 * @param input - Reset and generation options.
 * @returns Freshly generated questions and game payload.
 */
export const resetAndGenerateFantasyPolls = async (input = {}) => {
  const game = await gameState();
  const groupId = resolveGroupId(game, input.groupId);
  const keepTournamentQuestions = input.keepTournamentQuestions ?? true;
  const includeTournamentQuestions = input.includeTournamentQuestions ?? true;
  const defaultTournamentQuestions = includeTournamentQuestions ? tournamentQuestionsForGame(game, groupId) : [];
  const preservedTournamentQuestions = keepTournamentQuestions
    ? game.questions.filter((question) => (
      (question.groupId ?? defaultGroupId) !== groupId ||
      (!question.matchId && !tournamentResetCategories.has(question.category))
    ))
    : [];
  const baseGame = {
    ...game,
    questions: [...preservedTournamentQuestions, ...defaultTournamentQuestions],
    predictions: game.predictions.filter((prediction) => {
      const question = game.questions.find((item) => item.id === prediction.questionId);
      return question && (question.groupId ?? defaultGroupId) !== groupId;
    }),
  };
  const savedBaseGame = await saveGame(baseGame, await audit({
    action: "POLLS_RESET",
    actorId: input.actorId ?? "admin",
    entityId: game.tournament.id,
    entityType: "MATCH",
    metadata: { keepTournamentQuestions, groupId },
  }));
  await storage.setGame(savedBaseGame);
  return generateFantasyPolls({
    status: input.status ?? "OPEN",
    limit: input.limit ?? 16,
    replaceExisting: true,
    matchIds: input.matchIds,
    groupId,
    actorId: input.actorId ?? "admin",
  });
};

/**
 * Creates one published user poll for an upcoming fixture from constrained templates.
 *
 * @param input - User poll creation fields.
 * @returns Saved question and active game payload.
 */
export const createFantasyUserPoll = async (input = {}) => {
  const game = await gameState();
  const participantId = input.participantId;
  const participant = game.participants.find((item) => item.id === participantId);
  if (!participant) {
    throw new ProviderError("Participant not found.", 404, "NOT_FOUND");
  }
  const groupId = resolveGroupId(game, input.groupId);
  if (!participantCanAccessQuestion(game, participantId, { groupId })) {
    throw new ProviderError("You are not a member of this poll group.", 403, "GROUP_ACCESS_DENIED");
  }
  const match = game.matches.find((item) => item.id === input.matchId);
  if (!match) throw new ProviderError("Match not found.", 404, "NOT_FOUND");
  if (match.status !== "SCHEDULED") {
    throw new ProviderError("Polls can only be created for upcoming matches.", 409, "MATCH_NOT_UPCOMING");
  }
  const template = userPollTemplates[input.kind];
  if (!template) {
    throw new ProviderError("Poll type is invalid.", 400, "INVALID_QUESTION_DRAFT");
  }
  const generatedOptions = optionsForTemplate(template, match, game);
  const requestedOptions = Array.isArray(input.options)
    ? input.options.map((option) => String(option).trim()).filter(Boolean)
    : [];
  const allowedOptions = new Set(generatedOptions);
  const selectedPlayerNames = template.type === "PLAYER" && requestedOptions.length > 0
    ? [...new Set(requestedOptions.filter((option) => allowedOptions.has(option) && !playerFallbackOptions.has(option)))]
    : [];
  const playerSelectedOptions = selectedPlayerNames.length > 0
    ? [
      ...selectedPlayerNames,
      ...(input.kind === "FIRST_GOAL_SCORER" ? ["Own Goal", "No goal", "Other"] : ["Other"]),
    ].filter((option, index, values) => values.indexOf(option) === index && allowedOptions.has(option))
    : undefined;
  const options = playerSelectedOptions ?? generatedOptions;
  const requiresOptions = template.type !== "EXACT_SCORE";
  if (requiresOptions && options.length < 2) {
    throw new ProviderError("This poll type has no valid options for the selected match.", 400, "NO_POLLS_GENERATED");
  }
  const nowId = new Date().toISOString().replaceAll(/[^0-9]/g, "");
  const question = {
    id: `user-${groupId}-${match.id}-${slug(input.kind)}-${slug(participantId)}-${nowId}`,
    tournamentId: game.tournament.id,
    groupId,
    matchId: match.id,
    createdByParticipantId: participantId,
    createdAt: new Date().toISOString(),
    source: "USER",
    category: template.category,
    type: template.type,
    text: input.text?.trim() || template.text,
    options,
    points: template.points,
    status: "OPEN",
    closeAt: match.pollCloseAt,
  };
  validateQuestionDraft(game, match.id, question, "OPEN");
  const nextGame = {
    ...game,
    questions: [
      ...game.questions.filter((item) => item.id !== question.id),
      question,
    ],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "USER_POLL_CREATED",
    actorId: participantId,
    entityId: question.id,
    entityType: "MATCH",
    metadata: { matchId: match.id, kind: input.kind, groupId },
  }));
  return { question, game: withActiveParticipant(updatedGame, participantId) };
};

/**
 * Saves or replaces one participant prediction for an open question.
 *
 * @param input - Prediction mutation input.
 * @param input.questionId - Question being answered.
 * @param input.participantId - Participant submitting the answer.
 * @param input.answer - Selected answer value or values.
 * @returns Updated prediction and game payload.
 */
export const submitFantasyPrediction = async ({ questionId, participantId, answer }) => {
  const game = await gameState();
  const { prediction, resolvedParticipantId } = buildPrediction(game, { questionId, participantId, answer });
  const nextGame = {
    ...game,
    predictions: [
      ...game.predictions.filter((item) => !(item.questionId === questionId && item.participantId === resolvedParticipantId)),
      prediction,
    ],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "PREDICTION_SUBMITTED",
    actorId: resolvedParticipantId,
    entityId: questionId,
    entityType: "PREDICTION",
    metadata: { answer },
  }));
  return { prediction, game: withActiveParticipant(updatedGame, resolvedParticipantId) };
};

const buildPrediction = (game, { questionId, participantId, answer }) => {
  const resolvedParticipantId = participantId ?? game.activeParticipantId;
  const question = game.questions.find((item) => item.id === questionId);
  if (!question) throw new ProviderError("Question not found.", 404, "NOT_FOUND");
  if (!game.participants.some((participant) => participant.id === resolvedParticipantId)) {
    throw new ProviderError("Participant not found.", 404, "NOT_FOUND");
  }
  if (!participantCanAccessQuestion(game, resolvedParticipantId, question)) {
    throw new ProviderError("This poll is not available in your groups.", 403, "GROUP_ACCESS_DENIED");
  }
  if (question.status !== "OPEN") {
    throw new ProviderError("Prediction poll is locked.", 409, "POLL_LOCKED");
  }
  validateAnswer(question, answer);
  return {
    question,
    resolvedParticipantId,
    prediction: {
      id: `pred-${questionId}-${resolvedParticipantId}`,
      questionId,
      participantId: resolvedParticipantId,
      answer,
      submittedAt: new Date().toISOString(),
    },
  };
};

/**
 * Saves multiple changed participant predictions in one write.
 *
 * @param input - Bulk prediction mutation input.
 * @param input.participantId - Participant submitting the answers.
 * @param input.predictions - Changed question answers to save.
 * @returns Updated predictions and game payload.
 */
export const submitFantasyPredictions = async (input = {}) => {
  const game = await gameState();
  const rows = Array.isArray(input.predictions) ? input.predictions : [];
  if (rows.length === 0) {
    throw new ProviderError("At least one changed prediction is required.", 400, "INVALID_PREDICTION");
  }
  const seenQuestionIds = new Set();
  const predictions = rows.map((row) => {
    if (!row?.questionId || seenQuestionIds.has(row.questionId)) {
      throw new ProviderError("Each changed prediction must reference one unique question.", 400, "INVALID_PREDICTION");
    }
    seenQuestionIds.add(row.questionId);
    return buildPrediction(game, {
      answer: row.answer,
      participantId: input.participantId,
      questionId: row.questionId,
    }).prediction;
  });
  const resolvedParticipantId = predictions[0].participantId;
  const nextQuestionIds = new Set(predictions.map((prediction) => prediction.questionId));
  const nextGame = {
    ...game,
    predictions: [
      ...game.predictions.filter((item) => !(item.participantId === resolvedParticipantId && nextQuestionIds.has(item.questionId))),
      ...predictions,
    ],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "PREDICTION_SUBMITTED",
    actorId: resolvedParticipantId,
    entityId: `bulk-${resolvedParticipantId}`,
    entityType: "PREDICTION",
    metadata: { count: predictions.length },
  }));
  return { predictions, game: withActiveParticipant(updatedGame, resolvedParticipantId) };
};

/**
 * Saves structured result facts for a match.
 *
 * @param matchId - Match whose result should be saved.
 * @param result - Structured result facts.
 * @returns Updated result and game payload.
 */
export const saveFantasyResult = async (matchId, result) => {
  const game = await gameState();
  const match = game.matches.find((item) => item.id === matchId);
  if (!match) throw new ProviderError("Match not found.", 404, "NOT_FOUND");
  const { actorId = "admin", ...resultFacts } = result;
  const nextResult = {
    matchId,
    anytimeScorers: [],
    playersWithTwoPlusGoals: [],
    penaltyAwarded: false,
    penaltyGoal: false,
    redCard: false,
    bothTeamsScored: Boolean((resultFacts.homeScore ?? 0) > 0 && (resultFacts.awayScore ?? 0) > 0),
    totalGoalsRange: (resultFacts.homeScore ?? 0) + (resultFacts.awayScore ?? 0) >= 4 ? "4+" : (resultFacts.homeScore ?? 0) + (resultFacts.awayScore ?? 0) >= 2 ? "2-3" : "0-1",
    ...resultFacts,
    publishedAt: resultFacts.publishedAt ?? new Date().toISOString(),
  };
  const nextGame = {
    ...game,
    matches: game.matches.map((item) => item.id === matchId ? { ...item, status: "COMPLETED" } : item),
    results: [...game.results.filter((item) => item.matchId !== matchId), nextResult],
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "RESULT_SAVED",
    actorId,
    entityId: matchId,
    entityType: "RESULT",
    metadata: { homeScore: nextResult.homeScore, awayScore: nextResult.awayScore },
  }));
  return { result: nextResult, game: publicGame(updatedGame) };
};

/**
 * Calculates points for every prediction attached to a match.
 *
 * @param matchId - Match whose predictions should be scored.
 * @returns Updated predictions and game payload.
 */
export const publishFantasyScores = async (matchId) => {
  const game = await gameState();
  const result = game.results.find((item) => item.matchId === matchId);
  if (!result) throw new ProviderError("Result not found.", 404, "NOT_FOUND");
  const questionIds = new Set(game.questions.filter((question) => question.matchId === matchId).map((question) => question.id));
  const scoredGame = {
    ...game,
    questions: game.questions.map((question) => question.matchId === matchId ? { ...question, status: "SCORED" } : question),
    predictions: game.predictions.map((prediction) => {
      if (!questionIds.has(prediction.questionId)) return prediction;
      const question = game.questions.find((item) => item.id === prediction.questionId);
      return question ? scorePrediction(question, prediction, result, game) ?? prediction : prediction;
    }),
  };
  const nextGame = {
    ...scoredGame,
    leaderboard: calculateLeaderboard(scoredGame),
  };
  const updatedGame = await saveGame(nextGame, await audit({
    action: "SCORES_PUBLISHED",
    actorId: "admin",
    entityId: matchId,
    entityType: "MATCH",
    metadata: { questionCount: questionIds.size },
  }));
  return { predictions: updatedGame.predictions.filter((prediction) => questionIds.has(prediction.questionId)), game: publicGame(updatedGame) };
};

/**
 * Replaces the in-memory fantasy game state for tests or local development.
 *
 * @param nextGame - Complete game payload to store.
 * @returns The stored game payload.
 */
export const setFantasyGame = async (nextGame) => {
  return saveGame(nextGame);
};

/**
 * Restores the original in-memory game data.
 *
 * @returns Reset game payload.
 */
export const resetFantasyGame = async () => {
  return storage.reset();
};

/**
 * Returns DynamoDB-style records for the current local fantasy game state.
 *
 * @returns Storage records used to verify the AWS table mapping.
 */
export const getFantasyStorageRecords = async () => storage.toRecords();
