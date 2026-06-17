import { describe, expect, it } from "vitest";
import { fantasyGameData } from "../mocks/fantasy";
import { buildFantasyScoreReview, resolveFantasyCorrectAnswer, scoreFantasyPrediction } from "./fantasy-scoring";
import type { FantasyPrediction } from "../types/fantasy";

describe("fantasy scoring", () => {
  const match = fantasyGameData.matches.find((item) => item.id === "eng-esp")!;
  const result = fantasyGameData.results.find((item) => item.matchId === match.id)!;

  it("builds score review rows from result facts", () => {
    const rows = buildFantasyScoreReview(match, result, fantasyGameData);

    expect(rows[0]).toMatchObject({ nickname: "VAR Villain", totalPoints: 8 });
    expect(rows.find((row) => row.nickname === "Brazil Boss")?.totalPoints).toBe(3);
  });

  it("resolves total goals and winner answers", () => {
    const winner = fantasyGameData.questions.find((item) => item.id === "q-eng-esp-winner")!;
    const totalGoals = fantasyGameData.questions.find((item) => item.id === "q-eng-esp-total")!;

    expect(resolveFantasyCorrectAnswer(winner, result, fantasyGameData)).toBe("Spain");
    expect(resolveFantasyCorrectAnswer(totalGoals, result, fantasyGameData)).toBe("2-3");
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
});
