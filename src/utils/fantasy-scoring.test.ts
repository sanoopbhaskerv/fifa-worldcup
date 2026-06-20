import { describe, expect, it } from "vitest";
import { fantasyGameData } from "../mocks/fantasy";
import {
  buildFantasyScoreReview,
  findScorerMismatches,
  resolveFantasyCorrectAnswer,
  scorerNameMatch,
  scoreFantasyPrediction,
} from "./fantasy-scoring";
import type { FantasyMatchResult, FantasyPrediction, FantasyQuestion } from "../types/fantasy";

// ─── helpers ──────────────────────────────────────────────────────────────────

const match = fantasyGameData.matches.find((item) => item.id === "eng-esp")!;
const result = fantasyGameData.results.find((item) => item.matchId === match.id)!;

/** Builds a minimal PLAYER question for scorer tests. */
const playerQuestion = (id: string, category: "FIRST_GOAL_SCORER" | "MAN_OF_THE_MATCH", matchId = match.id): FantasyQuestion => ({
  id,
  tournamentId: fantasyGameData.tournament.id,
  matchId,
  category,
  type: "PLAYER",
  text: category === "FIRST_GOAL_SCORER" ? "Who scores the first goal?" : "Who will be Man of the Match?",
  options: ["Harry Kane", "Lamine Yamal", "H. Kane", "L. Yamal", "Other", "No goal"],
  points: 8,
  status: "SCORED",
  closeAt: "2026-06-16T23:15:00+05:30",
});

/** Builds a minimal prediction. */
const pred = (questionId: string, answer: string, participantId = "p-sanoop"): FantasyPrediction => ({
  id: `pred-${questionId}-${participantId}`,
  questionId,
  participantId,
  answer,
  submittedAt: "2026-06-16T19:10:00+05:30",
});

// ─── scorerNameMatch ───────────────────────────────────────────────────────────

describe("scorerNameMatch", () => {
  describe("strategy 1 — exact match", () => {
    it("matches identical strings", () => {
      expect(scorerNameMatch("Harry Kane", "Harry Kane")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(scorerNameMatch("harry kane", "Harry Kane")).toBe(true);
      expect(scorerNameMatch("HARRY KANE", "Harry Kane")).toBe(true);
    });

    it("ignores leading/trailing whitespace", () => {
      expect(scorerNameMatch("  Harry Kane  ", "Harry Kane")).toBe(true);
    });

    it("does not match different players", () => {
      expect(scorerNameMatch("Harry Kane", "Lamine Yamal")).toBe(false);
    });
  });

  describe("strategy 2 — first initial + full last name", () => {
    it("matches abbreviated first name (H. Kane ↔ Harry Kane)", () => {
      expect(scorerNameMatch("H. Kane", "Harry Kane")).toBe(true);
    });

    it("matches in reverse order (Harry Kane ↔ H. Kane)", () => {
      expect(scorerNameMatch("Harry Kane", "H. Kane")).toBe(true);
    });

    it("matches without dot on initial (H Kane ↔ Harry Kane)", () => {
      expect(scorerNameMatch("H Kane", "Harry Kane")).toBe(true);
    });

    it("matches the real-world API mismatch (M. Cunha ↔ Matheus Cunha)", () => {
      expect(scorerNameMatch("M. Cunha", "Matheus Cunha")).toBe(true);
      expect(scorerNameMatch("Matheus Cunha", "M. Cunha")).toBe(true);
    });

    it("does not match wrong initial (J. Kane ↔ Harry Kane)", () => {
      expect(scorerNameMatch("J. Kane", "Harry Kane")).toBe(false);
    });

    it("does not match wrong last name (H. Smith ↔ Harry Kane)", () => {
      expect(scorerNameMatch("H. Smith", "Harry Kane")).toBe(false);
    });
  });

  describe("strategy 3 — full first name + last initial", () => {
    it("matches abbreviated last name (Harry K. ↔ Harry Kane)", () => {
      expect(scorerNameMatch("Harry K.", "Harry Kane")).toBe(true);
    });

    it("matches in reverse order (Harry Kane ↔ Harry K.)", () => {
      expect(scorerNameMatch("Harry Kane", "Harry K.")).toBe(true);
    });

    it("matches without dot on last initial (Harry K ↔ Harry Kane)", () => {
      expect(scorerNameMatch("Harry K", "Harry Kane")).toBe(true);
    });

    it("does not match wrong first name (Gary K. ↔ Harry Kane)", () => {
      expect(scorerNameMatch("Gary K.", "Harry Kane")).toBe(false);
    });

    it("does not match wrong last initial (Harry S. ↔ Harry Kane)", () => {
      expect(scorerNameMatch("Harry S.", "Harry Kane")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("does not match single-word names against full names", () => {
      expect(scorerNameMatch("Kane", "Harry Kane")).toBe(false);
    });

    it("does not match empty strings", () => {
      expect(scorerNameMatch("", "Harry Kane")).toBe(false);
    });

    it("does not confuse strategy 2 and 3 (H. K. ↔ Harry Kane — both abbreviated)", () => {
      // H. K. → first="h", last="k"; Harry Kane → first="harry", last="kane"
      // Strategy 2: last "k" !== "kane" ✗; Strategy 3: first "h" !== "harry" ✗ → no match
      expect(scorerNameMatch("H. K.", "Harry Kane")).toBe(false);
    });

    it("handles three-part names by comparing first and last parts only", () => {
      // "João Pedro" vs "J. Pedro" — common in Brazilian football
      expect(scorerNameMatch("J. Pedro", "João Pedro")).toBe(true);
    });
  });
});

// ─── resolveFantasyCorrectAnswer ──────────────────────────────────────────────

describe("resolveFantasyCorrectAnswer", () => {
  it("resolves FIRST_GOAL_SCORER from result", () => {
    const question = playerQuestion("q-scorer", "FIRST_GOAL_SCORER");
    expect(resolveFantasyCorrectAnswer(question, result, fantasyGameData)).toBe("Harry Kane");
  });

  it("resolves FIRST_GOAL_SCORER as 'No goal' when no scorer stored", () => {
    const question = playerQuestion("q-scorer", "FIRST_GOAL_SCORER");
    expect(resolveFantasyCorrectAnswer(question, { ...result, firstGoalScorer: undefined }, fantasyGameData)).toBe("No goal");
  });

  it("resolves MAN_OF_THE_MATCH from result", () => {
    const question = playerQuestion("q-motm", "MAN_OF_THE_MATCH");
    expect(resolveFantasyCorrectAnswer(question, result, fantasyGameData)).toBe("Lamine Yamal");
  });

  it("resolves winner correctly", () => {
    const winner = fantasyGameData.questions.find((item) => item.id === "q-eng-esp-winner")!;
    expect(resolveFantasyCorrectAnswer(winner, result, fantasyGameData)).toBe("Spain");
  });

  it("resolves exact score correctly", () => {
    const exactScore = fantasyGameData.questions.find((item) => item.id === "q-eng-esp-exact-score")!;
    expect(resolveFantasyCorrectAnswer(exactScore, result, fantasyGameData)).toBe("1-2");
  });
});

// ─── scoreFantasyPrediction — PLAYER type ─────────────────────────────────────

describe("scoreFantasyPrediction — PLAYER type", () => {
  const scorerQ = playerQuestion("q-scorer", "FIRST_GOAL_SCORER");
  const motmQ = playerQuestion("q-motm", "MAN_OF_THE_MATCH");

  it("awards full points for an exact name match", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "Harry Kane"), result, fantasyGameData);
    expect(scored.points).toBe(8);
    expect(scored.correctAnswer).toBe("Harry Kane");
  });

  it("awards full points for a first-initial match (H. Kane ↔ Harry Kane)", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "H. Kane"), result, fantasyGameData);
    expect(scored.points).toBe(8);
  });

  it("awards full points for a last-initial match (Harry K. ↔ Harry Kane)", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "Harry K."), result, fantasyGameData);
    expect(scored.points).toBe(8);
  });

  it("awards full points for fuzzy MoTM match (L. Yamal ↔ Lamine Yamal)", () => {
    const scored = scoreFantasyPrediction(motmQ, pred("q-motm", "L. Yamal"), result, fantasyGameData);
    expect(scored.points).toBe(8);
    expect(scored.correctAnswer).toBe("Lamine Yamal");
  });

  it("awards 0 points when player did not score first goal", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "Lamine Yamal"), result, fantasyGameData);
    expect(scored.points).toBe(0);
  });

  it("awards 0 points for a completely wrong player", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "Lionel Messi"), result, fantasyGameData);
    expect(scored.points).toBe(0);
  });

  it("awards 0 points when player picked 'No goal' but there was a scorer", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "No goal"), result, fantasyGameData);
    expect(scored.points).toBe(0);
  });

  it("awards full points when player picked 'No goal' and there was no scorer", () => {
    const scored = scoreFantasyPrediction(
      scorerQ,
      pred("q-scorer", "No goal"),
      { ...result, firstGoalScorer: undefined },
      fantasyGameData,
    );
    expect(scored.points).toBe(8);
  });

  it("is case-insensitive for exact player names", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "harry kane"), result, fantasyGameData);
    expect(scored.points).toBe(8);
  });

  it("does not fuzzy-match a wrong initial (J. Kane ↔ Harry Kane)", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "J. Kane"), result, fantasyGameData);
    expect(scored.points).toBe(0);
  });

  it("includes answer and correctAnswer in breakdown", () => {
    const scored = scoreFantasyPrediction(scorerQ, pred("q-scorer", "H. Kane"), result, fantasyGameData);
    expect(scored.answer).toBe("H. Kane");
    expect(scored.correctAnswer).toBe("Harry Kane");
    expect(scored.maxPoints).toBe(8);
  });
});

// ─── scoreFantasyPrediction — non-PLAYER types unchanged ──────────────────────

describe("scoreFantasyPrediction — non-PLAYER types", () => {
  it("scores exact score questions using number parsing", () => {
    const exactQuestion = {
      ...fantasyGameData.questions.find((item) => item.id === "q-eng-esp-winner")!,
      id: "q-exact",
      category: "EXACT_SCORE" as const,
      type: "EXACT_SCORE" as const,
      text: "What will the final score be?",
      options: [],
      points: 8,
    };
    const prediction = pred("q-exact", "England 1 Spain 2");
    expect(scoreFantasyPrediction(exactQuestion, prediction, result, fantasyGameData)).toMatchObject({
      correctAnswer: "1-2",
      points: 8,
    });
  });

  it("scores star-player questions from anytime scorers using fuzzy matching", () => {
    const question = fantasyGameData.questions.find((item) => item.id === "q-bra-arg-vini")!;
    const prediction = pred(question.id, "Yes");
    // Vinicius Jr exact match in anytimeScorers
    const scored = scoreFantasyPrediction(
      question,
      prediction,
      { ...result, anytimeScorers: ["Vinicius Jr"] },
      fantasyGameData,
    );
    expect(scored.points).toBe(3);
  });

  it("scores penalty goal questions", () => {
    const penaltyQ = {
      ...fantasyGameData.questions.find((item) => item.id === "q-eng-esp-winner")!,
      id: "q-penalty",
      category: "PENALTY_GOAL" as const,
      type: "SINGLE_CHOICE" as const,
      text: "Will there be a penalty goal today?",
      options: ["Yes", "No"],
      points: 4,
    };
    expect(
      scoreFantasyPrediction(penaltyQ, pred("q-penalty", "Yes"), { ...result, penaltyGoal: true }, fantasyGameData),
    ).toMatchObject({ correctAnswer: "Yes", points: 4 });
    expect(
      scoreFantasyPrediction(penaltyQ, pred("q-penalty", "Yes"), { ...result, penaltyGoal: false }, fantasyGameData),
    ).toMatchObject({ correctAnswer: "No", points: 0 });
  });
});

// ─── findScorerMismatches ──────────────────────────────────────────────────────

describe("findScorerMismatches", () => {
  const scorerQ = playerQuestion("q-scorer-mm", "FIRST_GOAL_SCORER");
  const motmQ = playerQuestion("q-motm-mm", "MAN_OF_THE_MATCH");

  /** Builds a game data snapshot with given questions and predictions. */
  const gameWith = (
    questions: FantasyQuestion[],
    predictions: FantasyPrediction[],
  ) => ({
    ...fantasyGameData,
    questions: [...fantasyGameData.questions, ...questions],
    predictions: [...fantasyGameData.predictions, ...predictions],
  });

  it("returns empty array when all predictions exactly match stored name", () => {
    const data = gameWith([scorerQ], [pred("q-scorer-mm", "Harry Kane")]);
    expect(findScorerMismatches(match, result, data)).toHaveLength(0);
  });

  it("flags a fuzzy-matching mismatch (H. Kane ↔ Harry Kane)", () => {
    const data = gameWith([scorerQ], [pred("q-scorer-mm", "H. Kane")]);
    const mismatches = findScorerMismatches(match, result, data);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].storedName).toBe("Harry Kane");
    expect(mismatches[0].predictedNames).toHaveLength(1);
    expect(mismatches[0].predictedNames[0]).toMatchObject({
      name: "H. Kane",
      count: 1,
      fuzzyMatch: true,
    });
  });

  it("flags a non-fuzzy mismatch as fuzzyMatch: false", () => {
    const data = gameWith([scorerQ], [pred("q-scorer-mm", "Kano Harry")]);
    const mismatches = findScorerMismatches(match, result, data);
    expect(mismatches[0].predictedNames[0].fuzzyMatch).toBe(false);
  });

  it("counts multiple predictions of the same mismatching name", () => {
    const data = gameWith(
      [scorerQ],
      [
        pred("q-scorer-mm", "H. Kane", "p-sanoop"),
        pred("q-scorer-mm", "H. Kane", "p-anoop"),
        pred("q-scorer-mm", "H. Kane", "p-maya"),
      ],
    );
    const mismatches = findScorerMismatches(match, result, data);
    expect(mismatches[0].predictedNames[0]).toMatchObject({ name: "H. Kane", count: 3 });
  });

  it("excludes fallback options (Other, No goal, Own Goal)", () => {
    const data = gameWith(
      [scorerQ],
      [
        pred("q-scorer-mm", "Other", "p-sanoop"),
        pred("q-scorer-mm", "No goal", "p-anoop"),
        pred("q-scorer-mm", "Own Goal", "p-maya"),
      ],
    );
    expect(findScorerMismatches(match, result, data)).toHaveLength(0);
  });

  it("skips PLAYER questions with no predictions", () => {
    const data = gameWith([scorerQ], []);
    expect(findScorerMismatches(match, result, data)).toHaveLength(0);
  });

  it("skips PLAYER questions where stored name is 'No goal'", () => {
    const data = gameWith([scorerQ], [pred("q-scorer-mm", "Harry Kane")]);
    const noScorerResult: FantasyMatchResult = { ...result, firstGoalScorer: undefined };
    expect(findScorerMismatches(match, noScorerResult, data)).toHaveLength(0);
  });

  it("handles both FIRST_GOAL_SCORER and MAN_OF_THE_MATCH questions in one match", () => {
    const data = gameWith(
      [scorerQ, motmQ],
      [
        pred("q-scorer-mm", "H. Kane"),
        pred("q-motm-mm", "L. Yamal"),
      ],
    );
    const mismatches = findScorerMismatches(match, result, data);
    expect(mismatches).toHaveLength(2);
    const categories = mismatches.map((m) => m.category);
    expect(categories).toContain("FIRST_GOAL_SCORER");
    expect(categories).toContain("MAN_OF_THE_MATCH");
  });

  it("only includes questions belonging to the given match", () => {
    const otherMatchQ = playerQuestion("q-scorer-other", "FIRST_GOAL_SCORER", "bra-arg");
    const data = gameWith([otherMatchQ], [pred("q-scorer-other", "H. Kane")]);
    expect(findScorerMismatches(match, result, data)).toHaveLength(0);
  });

  it("mismatch entry includes questionId and questionText", () => {
    const data = gameWith([scorerQ], [pred("q-scorer-mm", "H. Kane")]);
    const [mismatch] = findScorerMismatches(match, result, data);
    expect(mismatch.questionId).toBe("q-scorer-mm");
    expect(mismatch.questionText).toBe("Who scores the first goal?");
  });
});

// ─── buildFantasyScoreReview ───────────────────────────────────────────────────

describe("buildFantasyScoreReview", () => {
  it("builds score review rows from result facts", () => {
    const rows = buildFantasyScoreReview(match, result, fantasyGameData);
    expect(rows[0]).toMatchObject({ nickname: "Messi Monk", totalPoints: 13 });
    expect(rows.find((row) => row.nickname === "Brazil Boss")?.totalPoints).toBe(8);
  });

  it("sorts rows by total points descending", () => {
    const rows = buildFantasyScoreReview(match, result, fantasyGameData);
    const points = rows.map((r) => r.totalPoints);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it("excludes participants with no predictions for the match", () => {
    const rows = buildFantasyScoreReview(match, result, fantasyGameData);
    const ids = rows.map((r) => r.participantId);
    // Only participants with predictions for eng-esp should appear
    expect(ids.every((id) =>
      fantasyGameData.predictions.some(
        (p) => p.participantId === id && fantasyGameData.questions.some((q) => q.id === p.questionId && q.matchId === match.id),
      ),
    )).toBe(true);
  });

  it("awards fuzzy-matched scorer predictions full points in the review", () => {
    const scorerQ = playerQuestion("q-scorer-review", "FIRST_GOAL_SCORER");
    const data = {
      ...fantasyGameData,
      questions: [...fantasyGameData.questions, scorerQ],
      predictions: [
        ...fantasyGameData.predictions,
        pred("q-scorer-review", "H. Kane", "p-anoop"),
        pred("q-scorer-review", "Harry Kane", "p-rajesh"),
      ],
    };
    const rows = buildFantasyScoreReview(match, result, data);
    const anoop = rows.find((r) => r.participantId === "p-anoop");
    const rajesh = rows.find((r) => r.participantId === "p-rajesh");
    const anoopScorer = anoop?.breakdown.find((b) => b.questionId === "q-scorer-review");
    const rajeshScorer = rajesh?.breakdown.find((b) => b.questionId === "q-scorer-review");
    expect(anoopScorer?.points).toBe(8); // fuzzy match
    expect(rajeshScorer?.points).toBe(8); // exact match
  });
});
