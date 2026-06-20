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

/** Describes a player-name mismatch for admin correction. */
export interface ScorerMismatch {
  questionId: string;
  questionText: string;
  /** Category that produced the mismatch: FIRST_GOAL_SCORER | MAN_OF_THE_MATCH */
  category: string;
  /** The name currently stored in the result (from API-Football). */
  storedName: string;
  /** Unique predicted names with counts and whether they fuzzy-match. */
  predictedNames: Array<{ name: string; count: number; fuzzyMatch: boolean }>;
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

/**
 * Parses a player name into first/last parts, stripping trailing dots.
 */
const parsePlayerName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return null;
  return {
    first: normalize(parts[0].replace(/\.$/, "")),
    last: normalize(parts[parts.length - 1].replace(/\.$/, "")),
  };
};

/**
 * Fuzzy-matches two player name strings across three conventions:
 *  1. Exact match (case-insensitive)
 *  2. First initial + full last name  — "M. Cunha" ↔ "Matheus Cunha"
 *  3. Full first name + last initial  — "Matheus C." ↔ "Matheus Cunha"
 */
export const scorerNameMatch = (a: string, b: string): boolean => {
  if (normalize(a) === normalize(b)) return true;
  const pa = parsePlayerName(a);
  const pb = parsePlayerName(b);
  if (!pa || !pb) return false;
  // Strategy 2: first initial + full last
  if (pa.last === pb.last && (pa.first === pb.first[0] || pb.first === pa.first[0])) return true;
  // Strategy 3: full first + last initial
  if (pa.first === pb.first && (pa.last === pb.last[0] || pb.last === pa.last[0])) return true;
  return false;
};

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
      return result.anytimeScorers.some((scorer) => scorerNameMatch(scorer, player)) ? "Yes" : "No";
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
 * Uses fuzzy name matching for PLAYER-type questions.
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
  const isPlayer = question.type === "PLAYER";
  const isCorrect = question.type === "EXACT_SCORE"
    ? parseExactScore(answer) === correctAnswer
    : Array.isArray(answer)
      ? answer.some((item) => isPlayer ? scorerNameMatch(item, correctAnswer) : normalize(item) === normalize(correctAnswer))
      : isPlayer ? scorerNameMatch(String(answer), correctAnswer) : normalize(String(answer)) === normalize(correctAnswer);

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
 * Finds PLAYER-type questions where stored scorer names don't exactly match
 * any participant prediction. Used by the admin score review page to surface
 * name mismatches that may need correction.
 *
 * @param match - Match being reviewed.
 * @param result - Result facts stored for the match.
 * @param data - Fantasy game data.
 * @returns Mismatch entries for each scorer question with a name gap.
 */
export const findScorerMismatches = (
  match: FantasyMatch,
  result: FantasyMatchResult,
  data: FantasyGameData,
): ScorerMismatch[] => {
  const playerQuestions = data.questions.filter(
    (q) => q.matchId === match.id && q.type === "PLAYER",
  );

  const mismatches: ScorerMismatch[] = [];

  for (const question of playerQuestions) {
    const storedName = resolveFantasyCorrectAnswer(question, result, data);
    // Only surfaces mismatches when there's a real name (not "No goal" / undefined)
    if (!storedName || storedName === "No goal") continue;

    // Collect all unique non-fallback predictions for this question
    const fallback = new Set(["Other", "Own Goal", "No goal"]);
    const predictionsByName = new Map<string, number>();
    for (const pred of data.predictions) {
      if (pred.questionId !== question.id) continue;
      const names = Array.isArray(pred.answer) ? pred.answer : [pred.answer];
      for (const name of names) {
        if (fallback.has(name)) continue;
        predictionsByName.set(name, (predictionsByName.get(name) ?? 0) + 1);
      }
    }

    if (predictionsByName.size === 0) continue;

    // Collect names that don't exact-match the stored name (even if they fuzzy-match)
    const nonExactNames = [...predictionsByName.entries()].filter(
      ([name]) => normalize(name) !== normalize(storedName),
    );

    if (nonExactNames.length === 0) continue;

    mismatches.push({
      questionId: question.id,
      questionText: question.text,
      category: question.category,
      storedName,
      predictedNames: nonExactNames.map(([name, count]) => ({
        name,
        count,
        fuzzyMatch: scorerNameMatch(name, storedName),
      })),
    });
  }

  return mismatches;
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
