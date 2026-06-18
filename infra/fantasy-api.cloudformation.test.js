import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const templatePath = path.join(process.cwd(), "infra/fantasy-api.cloudformation.yml");

describe("fantasy AWS staging template", () => {
  it("keeps the staging backend cost-controlled", async () => {
    const template = await readFile(templatePath, "utf8");

    expect(template).toContain("BillingMode: PAY_PER_REQUEST");
    expect(template).toContain("DeletionPolicy: Retain");
    expect(template).toContain("UpdateReplacePolicy: Retain");
    expect(template).toContain("RetentionInDays: 7");
    expect(template).toContain("ReservedConcurrentExecutions: !Ref LambdaReservedConcurrency");
    expect(template).toContain("Timeout: 30");
    expect(template).toContain("Type: AWS::Lambda::Url");
    expect(template).toContain("FANTASY_DYNAMODB_TABLE: !Ref PredictionGameTable");
    expect(template).toContain("FOOTBALL_DATA_API_KEY: !Ref FootballDataApiKey");
    expect(template).toContain("API_FOOTBALL_API_KEY: !Ref ApiFootballApiKey");
    expect(template).toContain("FANTASY_AI_DAILY_CALL_LIMIT: !Ref FantasyAiDailyCallLimit");
    expect(template).toContain("Type: AWS::Events::Rule");
    expect(template).toContain("Condition: IsFantasyAiScheduleEnabled");
  });

  it("does not put browser-exposed or AI secrets into Lambda environment variables", async () => {
    const template = await readFile(templatePath, "utf8");

    expect(template).not.toContain("VITE_");
    expect(template).not.toContain("OPENAI_API_KEY");
    expect(template).toContain("FantasyAiApiKey:");
    expect(template).toContain("FANTASY_AI_API_KEY: !Ref FantasyAiApiKey");
    expect(template).toContain("NoEcho: true");
  });
});
