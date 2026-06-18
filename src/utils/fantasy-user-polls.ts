import type { FantasyGameData, FantasyMatch, FantasyQuestionType, FantasyUserPollKind } from "../types/fantasy";
import { fantasyTeamName } from "./fantasy";

export interface FantasyUserPollDefinition {
  kind: FantasyUserPollKind;
  label: string;
  text: string;
  type: FantasyQuestionType;
  points: number;
}

export const fantasyUserPollDefinitions: FantasyUserPollDefinition[] = [
  { kind: "MATCH_WINNER", label: "Match winner", text: "Who will win the match?", type: "SINGLE_CHOICE", points: 5 },
  { kind: "FIRST_SCORING_TEAM", label: "First scoring team", text: "Which team scores first?", type: "SINGLE_CHOICE", points: 4 },
  { kind: "TOTAL_GOALS", label: "Exact score", text: "What will the final score be?", type: "EXACT_SCORE", points: 8 },
  { kind: "FIRST_GOAL_TIME", label: "First goal time", text: "When will the first goal be scored?", type: "TIME_WINDOW", points: 5 },
  { kind: "PENALTY_GOAL", label: "Penalty goal", text: "Will there be a penalty goal today?", type: "SINGLE_CHOICE", points: 4 },
  { kind: "BOTH_TEAMS_SCORE", label: "Both teams score", text: "Will both teams score?", type: "SINGLE_CHOICE", points: 3 },
  { kind: "FIRST_GOAL_SCORER", label: "First goal scorer", text: "Who scores the first goal?", type: "PLAYER", points: 8 },
  { kind: "MAN_OF_THE_MATCH", label: "Player of the match", text: "Who will be Man of the Match?", type: "PLAYER", points: 7 },
];

const matchPlayers = (match: FantasyMatch, data: FantasyGameData) =>
  data.squadPlayers.filter((player) => [match.homeTeamId, match.awayTeamId].includes(player.teamId));

const playerNames = (names: string[]) => [...new Set(names)];

export const fantasyUserPollOptions = (match: FantasyMatch, kind: FantasyUserPollKind, data: FantasyGameData) => {
  const home = fantasyTeamName(match.homeTeamId, data.teams);
  const away = fantasyTeamName(match.awayTeamId, data.teams);
  switch (kind) {
    case "MATCH_WINNER":
      return match.importance === "KNOCKOUT" || match.importance === "FINAL" ? [home, away] : [home, away, "Draw"];
    case "FIRST_SCORING_TEAM":
      return [home, away, "No goal"];
    case "TOTAL_GOALS":
      return [];
    case "FIRST_GOAL_TIME":
      return ["Before 10", "11-45", "46-60", "60-90", "90+"];
    case "PENALTY_GOAL":
      return ["Yes", "No"];
    case "BOTH_TEAMS_SCORE":
      return ["Yes", "No"];
    case "FIRST_GOAL_SCORER": {
      const scorers = matchPlayers(match, data)
        .filter((player) => player.isScorerCandidate)
        .slice(0, 8)
        .map((player) => player.name);
      return scorers.length > 0 ? [...playerNames(scorers), "Own Goal", "No goal", "Other"] : [];
    }
    case "MAN_OF_THE_MATCH": {
      const players = matchPlayers(match, data)
        .filter((player) => player.isMotmCandidate)
        .slice(0, 8)
        .map((player) => player.name);
      return players.length > 0 ? [...playerNames(players), "Other"] : [];
    }
    default:
      return [];
  }
};
