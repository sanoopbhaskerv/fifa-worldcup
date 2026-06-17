import { describe, expect, it } from "vitest";
import { fantasyGameData } from "../mocks/fantasy";
import { generateFantasyQuestionDraft, unknownFantasyPlayerOptions } from "./fantasy-ai";

describe("fantasy AI draft helper", () => {
  it("generates player options from stored squad data", () => {
    const match = fantasyGameData.matches.find((item) => item.id === "bra-arg")!;
    const draft = generateFantasyQuestionDraft(match, fantasyGameData);
    const playerQuestion = draft.questions.find((question) => question.category === "FIRST_GOAL_SCORER")!;

    expect(playerQuestion.options).toContain("Vinicius Jr");
    expect(playerQuestion.options).toContain("Lionel Messi");
    expect(unknownFantasyPlayerOptions(playerQuestion, fantasyGameData)).toEqual([]);
  });

  it("flags unknown player options for validation", () => {
    const match = fantasyGameData.matches.find((item) => item.id === "bra-arg")!;
    const draft = generateFantasyQuestionDraft(match, fantasyGameData);
    const playerQuestion = draft.questions.find((question) => question.category === "FIRST_GOAL_SCORER")!;

    expect(unknownFantasyPlayerOptions({ ...playerQuestion, options: [...playerQuestion.options, "Fake Striker"] }, fantasyGameData)).toEqual(["Fake Striker"]);
  });

  it("filters drafts by enabled AI setting categories", () => {
    const match = fantasyGameData.matches.find((item) => item.id === "bra-arg")!;
    const draft = generateFantasyQuestionDraft(match, {
      ...fantasyGameData,
      aiSettings: {
        ...fantasyGameData.aiSettings,
        enabledCategories: ["MATCH_WINNER"],
        maxQuestions: { ...fantasyGameData.aiSettings.maxQuestions, BIG_MATCH: 1 },
      },
    });

    expect(draft.questions).toHaveLength(1);
    expect(draft.questions[0].category).toBe("MATCH_WINNER");
  });

  it("returns no draft questions when AI generation is disabled", () => {
    const match = fantasyGameData.matches.find((item) => item.id === "bra-arg")!;
    const draft = generateFantasyQuestionDraft(match, {
      ...fantasyGameData,
      aiSettings: { ...fantasyGameData.aiSettings, mode: "DISABLED" },
    });

    expect(draft.questions).toEqual([]);
  });
});
