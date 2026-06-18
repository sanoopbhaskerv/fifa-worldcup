import type { FantasyGameData, FantasyMatch, FantasyQuestion, FantasyQuestionTemplate, FantasySquadPlayer } from "../types/fantasy";
import { fantasyMatchTitle, fantasyTeamName } from "./fantasy";

const fallbackOptions = ["Other", "Own Goal", "No goal"];

const playerNames = (players: FantasySquadPlayer[]) => players.map((player) => player.name);

const scorerCandidates = (match: FantasyMatch, data: FantasyGameData) =>
  data.squadPlayers
    .filter((player) => [match.homeTeamId, match.awayTeamId].includes(player.teamId))
    .filter((player) => player.isScorerCandidate)
    .slice(0, 4);

const motmCandidates = (match: FantasyMatch, data: FantasyGameData) =>
  data.squadPlayers
    .filter((player) => [match.homeTeamId, match.awayTeamId].includes(player.teamId))
    .filter((player) => player.isMotmCandidate)
    .slice(0, 4);

const starCandidate = (match: FantasyMatch, data: FantasyGameData) =>
  data.squadPlayers.find((player) => player.teamId === match.homeTeamId && player.isStarCandidate) ??
  data.squadPlayers.find((player) => player.teamId === match.awayTeamId && player.isStarCandidate);

const fallbackTemplates: FantasyQuestionTemplate[] = [
  { id: "tpl-match-result", tournamentId: "", name: "Match result", category: "MATCH_WINNER", type: "SINGLE_CHOICE", text: "Who will win the match?", optionMode: "MATCH_RESULT", points: 5, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 10 },
  { id: "tpl-total-goals", tournamentId: "", name: "Exact score", category: "EXACT_SCORE", type: "EXACT_SCORE", text: "What will the final score be?", optionMode: "EXACT_SCORE", points: 8, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 20 },
  { id: "tpl-first-goal-time", tournamentId: "", name: "First goal time", category: "FIRST_GOAL_TIME", type: "TIME_WINDOW", text: "When will the first goal be scored?", optionMode: "FIRST_GOAL_TIME", points: 5, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 30 },
  { id: "tpl-penalty-goal", tournamentId: "", name: "Penalty goal", category: "PENALTY_GOAL", type: "SINGLE_CHOICE", text: "Will there be a penalty goal today?", optionMode: "YES_NO", points: 4, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 40 },
  { id: "tpl-first-scorer", tournamentId: "", name: "First goal scorer", category: "FIRST_GOAL_SCORER", type: "PLAYER", text: "Who scores the first goal?", optionMode: "FIRST_GOAL_SCORER", points: 8, maxOptions: 8, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 50 },
  { id: "tpl-first-scoring-team", tournamentId: "", name: "First scoring team", category: "FIRST_SCORING_TEAM", type: "SINGLE_CHOICE", text: "Which team scores first?", optionMode: "FIRST_SCORING_TEAM", points: 4, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 60 },
  { id: "tpl-both-score", tournamentId: "", name: "Both teams score", category: "BOTH_TEAMS_SCORE", type: "SINGLE_CHOICE", text: "Will both teams score?", optionMode: "YES_NO", points: 3, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 70 },
  { id: "tpl-star-score", tournamentId: "", name: "Star player score", category: "STAR_PLAYER_SCORE", type: "SINGLE_CHOICE", text: "Will {player} score?", optionMode: "STAR_PLAYER_SCORE", points: 3, maxOptions: 1, enabled: true, importanceLevels: ["NORMAL", "BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 80 },
  { id: "tpl-motm", tournamentId: "", name: "Man of the Match", category: "MAN_OF_THE_MATCH", type: "PLAYER", text: "Who will be Man of the Match?", optionMode: "MAN_OF_THE_MATCH", points: 7, maxOptions: 8, enabled: true, importanceLevels: ["BIG_MATCH", "KNOCKOUT", "FINAL"], sortOrder: 90 },
];

const optionsForTemplate = (template: FantasyQuestionTemplate, match: FantasyMatch, data: FantasyGameData) => {
  const home = fantasyTeamName(match.homeTeamId, data.teams);
  const away = fantasyTeamName(match.awayTeamId, data.teams);
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
      const scorers = scorerCandidates(match, data).slice(0, template.maxOptions ?? 4);
      return scorers.length > 0 ? [...playerNames(scorers), "Own Goal", "No goal", "Other"] : [];
    }
    case "MAN_OF_THE_MATCH": {
      const motm = motmCandidates(match, data).slice(0, template.maxOptions ?? 4);
      return motm.length > 0 ? [...playerNames(motm), "Other"] : [];
    }
    default:
      return [];
  }
};

const questionFromTemplate = (template: FantasyQuestionTemplate, match: FantasyMatch, data: FantasyGameData): FantasyQuestion | undefined => {
  if (!template.enabled || !template.importanceLevels.includes(match.importance)) return undefined;
  const star = starCandidate(match, data);
  if (template.optionMode === "STAR_PLAYER_SCORE" && !star) return undefined;
  const options = optionsForTemplate(template, match, data);
  if (template.type !== "EXACT_SCORE" && options.length < 2) return undefined;
  const isQualifier = template.optionMode === "MATCH_RESULT" && (match.importance === "KNOCKOUT" || match.importance === "FINAL");
  const text = isQualifier ? "Who qualifies?" : template.text.replace("{player}", star?.name ?? "the star player");
  return {
    id: `draft-${match.id}-${template.id.replace(/^tpl-/, "")}`,
    tournamentId: data.tournament.id,
    matchId: match.id,
    category: isQualifier ? "QUALIFIER" : template.category,
    type: template.type,
    text,
    options,
    points: isQualifier ? template.points + 1 : template.points,
    status: "DRAFT",
    closeAt: match.pollCloseAt,
  };
};

/**
 * Generates a local AI-host-style question draft from templates and squad data.
 *
 * @param match - Match for which draft questions should be generated.
 * @param data - Fantasy game state with teams and squad-player reference data.
 * @returns Structured draft questions plus an intro message.
 */
export const generateFantasyQuestionDraft = (match: FantasyMatch, data: FantasyGameData) => {
  const settings = data.aiSettings;
  if (settings?.mode === "DISABLED") {
    return {
      introMessage: `${fantasyMatchTitle(match, data.teams)} draft generation is disabled.`,
      questions: [],
    };
  }
  const templates = (data.questionTemplates?.length ? data.questionTemplates : fallbackTemplates)
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const questions = templates
    .filter((template) => !settings?.enabledCategories || settings.enabledCategories.includes(template.category))
    .map((template) => questionFromTemplate(template, match, data))
    .filter((question): question is FantasyQuestion => Boolean(question));
  const maxQuestions = settings?.maxQuestions?.[match.importance] ?? (match.importance === "FINAL" ? 10 : match.importance === "NORMAL" ? 5 : 8);
  const modeLabel = settings?.mode === "ASSISTED" ? "AI-assisted" : "Template-only";

  return {
    introMessage: `${modeLabel} ${fantasyMatchTitle(match, data.teams)} predictions are ready. Polls close ${data.tournament.pollCloseMinutesBeforeKickoff} minutes before kickoff.`,
    questions: questions.slice(0, maxQuestions),
  };
};

/**
 * Checks whether player options are grounded in stored squad data or approved fallbacks.
 *
 * @param question - Draft question to validate.
 * @param data - Fantasy game state with squad-player reference data.
 * @returns Unknown option labels that should be rejected.
 */
export const unknownFantasyPlayerOptions = (question: FantasyQuestion, data: FantasyGameData) => {
  if (question.type !== "PLAYER") return [];
  const known = new Set(data.squadPlayers.map((player) => player.name));
  return question.options.filter((option) => !known.has(option) && !fallbackOptions.includes(option));
};
