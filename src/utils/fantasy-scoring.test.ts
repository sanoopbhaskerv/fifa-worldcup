import { describe, expect, it } from "vitest";
import { fantasyGameData } from "../mocks/fantasy";
import { buildFantasyScoreReview, resolveFantasyCorrectAnswer, scoreFantasyPrediction } from "./fantasy-scoring";
import type { FantasyPrediction } from "../types/fantasy";

describe("fantasy scoring", () => {
  const match = fantasyGameData.matches.find((item) => item.id === "eng-esp")!;
  const result = fantasyGameData.results.find((item) => item.matchId === match.id)!;

  it("builds score review rows from result facts", () => {
    const rows = buildFantasyScoreReview(match, result, fantasyGameData);

    expect(rows[0]).toMatchObject({ nickname: "Messi Monk", totalPoints: 13 });
    expect(rows.find((row) => row.nickname === "Brazil Boss")?.totalPoints).toBe(8);
  });

  it("resolves exact score and winner answers", () => {
    const winner = fantasyGameData.questions.find((item) => item.id === "q-eng-esp-winner")!;
    const exactScore = fantasyGameData.questions.find((item) => item.id === "q-eng-esp-exact-score")!;

    expect(resolveFantasyCorrectAnswer(winner, result, fantasyGameData)).toBe("Spain");
    expect(resolveFantasyCorrectAnswer(exactScore, result, fantasyGameData)).toBe("1-2");
  });

  it("scores star-player questions from anytime scorers", () => {
    const question = fantasyGameData.questions.find((item) => item.id === "q-bra-arg-vini")!;
    const prediction: FantasyPrediction = {
      id: "test-prediction",
      participantId: "p-sanoop",
      questionId: question.id,
      answer: "Yes",
      submittedAt: "2026-06-17T18:23:00+05:30",
    };
    const scored = scoreFantasyPrediction(question, prediction, { ...result, anytimeScorers: ["Vinicius Jr"] }, fantasyGameData);

    expect(scored.points).toBe(3);
    expect(scored.correctAnswer).toBe("Yes");
  });

  it("scores exact score and penalty goal questions", () => {
    const exactQuestion = {
      ...fantasyGameData.questions.find((item) => item.id === "q-eng-esp-winner")!,
      id: "q-exact",
      category: "EXACT_SCORE" as const,
      type: "EXACT_SCORE" as const,
      text: "What will the final score be?",
      options: [],
      points: 8,
    };
    const penaltyQuestion = {
      ...exactQuestion,
      id: "q-penalty",
      category: "PENALTY_GOAL" as const,
      type: "SINGLE_CHOICE" as const,
      text: "Will there be a penalty goal today?",
      options: ["Yes", "No"],
      points: 4,
    };
    const exactPrediction: FantasyPrediction = {
      id: "exact-prediction",
      participantId: "p-sanoop",
      questionId: exactQuestion.id,
      answer: "England 1 Spain 2",
      submittedAt: "2026-06-16T19:10:00+05:30",
    };
    const penaltyPrediction: FantasyPrediction = {
      id: "penalty-prediction",
      participantId: "p-sanoop",
      questionId: penaltyQuestion.id,
      answer: "Yes",
      submittedAt: "2026-06-16T19:10:00+05:30",
    };

    expect(scoreFantasyPrediction(exactQuestion, exactPrediction, result, fantasyGameData)).toMatchObject({
      correctAnswer: "1-2",
      points: 8,
    });
    expect(scoreFantasyPrediction(penaltyQuestion, penaltyPrediction, { ...result, penaltyGoal: true }, fantasyGameData)).toMatchObject({
      correctAnswer: "Yes",
      points: 4,
    });
  });
});
