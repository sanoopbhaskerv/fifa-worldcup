import type {
  FantasyGameData,
  FantasyMatch,
  FantasyMatchResult,
  FantasyPrediction,
  FantasyQuestion,
  FantasyScoreBreakdown,
} from "../types/fantasy";
import { fantasyTeamName } from "./fantasy";

export interface FantasyParticipantScoreReview {
  participantId: string;
  nickname: string;
  totalPoints: number;
  breakdown: FantasyScoreBreakdown[];
}

const firstGoalWindow = (minute?: number) => {
  if (minute === undefined) return "No goal";
  if (minute <= 10) return "Before 10";
  if (minute <= 45) return "11-45";
  if (minute <= 60) return "46-60";
  if (minute <= 90) return "60-90";
  return "90+";
};

const normalize = (value: string) => value.trim().toLowerCase();

const parseExactScore = (value: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const numbers = String(raw ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length < 2) return undefined;
  return `${numbers[0]}-${numbers[1]}`;
};

/**
 * Resolves a structured correct answer for one question and result.
 *
 * @param question - Question being scored.
 * @param result - Published match result facts.
 * @param data - Fantasy game data used for team-name lookup.
 * @returns Correct answer label, or `undefined` when the category is not scoreable from the result.
 */
export const resolveFantasyCorrectAnswer = (
  question: FantasyQuestion,
  result: FantasyMatchResult,
  data: FantasyGameData,
) => {
  switch (question.category) {
    case "MATCH_WINNER":
    case "RESULT_90":
      return result.winnerTeamId ? fantasyTeamName(result.winnerTeamId, data.teams) : "Draw";
    case "FIRST_SCORING_TEAM":
      return result.firstScoringTeamId ? fantasyTeamName(result.firstScoringTeamId, data.teams) : "No goal";
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
      return result.anytimeScorers.some((scorer) => normalize(scorer) === normalize(player)) ? "Yes" : "No";
    }
    case "PLAYER_SCORES_2_PLUS":
      return result.playersWithTwoPlusGoals.length > 0 ? "Yes" : "No";
    case "MAN_OF_THE_MATCH":
      return result.manOfTheMatch;
    default:
      return undefined;
  }
};

/**
 * Scores one prediction against one question/result pair.
 *
 * @param question - Question containing category and max points.
 * @param prediction - Participant prediction.
 * @param result - Published match result facts.
 * @param data - Fantasy game data used for lookup.
 * @returns Score breakdown for display and persistence.
 */
export const scoreFantasyPrediction = (
  question: FantasyQuestion,
  prediction: FantasyPrediction,
  result: FantasyMatchResult,
  data: FantasyGameData,
): FantasyScoreBreakdown => {
  const correctAnswer = resolveFantasyCorrectAnswer(question, result, data) ?? "";
  const answer = prediction.answer;
  const isCorrect = question.type === "EXACT_SCORE"
    ? parseExactScore(answer) === correctAnswer
    : Array.isArray(answer)
      ? answer.some((item) => normalize(item) === normalize(correctAnswer))
      : normalize(answer) === normalize(correctAnswer);

  return {
    questionId: question.id,
    questionText: question.text,
    answer,
    correctAnswer,
    points: isCorrect ? question.points : 0,
    maxPoints: question.points,
  };
};

/**
 * Builds score-review rows for every participant with predictions for a match.
 *
 * @param match - Match being reviewed.
 * @param result - Result facts to score against.
 * @param data - Fantasy game data.
 * @returns Participant score-review rows sorted by points descending.
 */
export const buildFantasyScoreReview = (
  match: FantasyMatch,
  result: FantasyMatchResult,
  data: FantasyGameData,
): FantasyParticipantScoreReview[] => {
  const questions = data.questions.filter((question) => question.matchId === match.id);
  return data.participants
    .map((participant) => {
      const breakdown = questions
        .map((question) => {
          const prediction = data.predictions.find((item) => item.participantId === participant.id && item.questionId === question.id);
          if (!prediction) return undefined;
          return scoreFantasyPrediction(question, prediction, result, data);
        })
        .filter((item): item is FantasyScoreBreakdown => Boolean(item));

      return {
        participantId: participant.id,
        nickname: participant.nickname,
        totalPoints: breakdown.reduce((sum, item) => sum + item.points, 0),
        breakdown,
      };
    })
    .filter((row) => row.breakdown.length > 0)
    .sort((left, right) => right.totalPoints - left.totalPoints);
};
