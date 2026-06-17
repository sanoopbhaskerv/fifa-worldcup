import { beforeEach, describe, expect, it } from "vitest";
import { getFantasyGame, resetFantasyGame } from "../fantasy-game.mjs";
import { createDynamoFantasyStorage } from "./dynamodb-storage.mjs";

const createFakeClient = ({ queryItems = [] } = {}) => {
  const calls = [];
  return {
    calls,
    async send(command) {
      calls.push({ command: command.constructor.name, input: command.input });
      if (command.constructor.name === "QueryCommand") return { Items: queryItems };
      if (command.constructor.name === "BatchWriteCommand") return {};
      throw new Error(`Unexpected command ${command.constructor.name}`);
    },
  };
};

describe("DynamoDB fantasy storage", () => {
  beforeEach(async () => {
    await resetFantasyGame();
  });

  it("falls back to the seed game when the table is empty", async () => {
    const seedGame = await getFantasyGame();
    const client = createFakeClient();
    const storage = createDynamoFantasyStorage({
      tableName: "PredictionGame",
      seedGame,
      client,
    });

    const game = await storage.getGame();

    expect(game.tournament.id).toBe("world-cup-friends-2026");
    expect(client.calls[0]).toMatchObject({
      command: "QueryCommand",
      input: {
        TableName: "PredictionGame",
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": "TOURNAMENT#world-cup-friends-2026",
        },
      },
    });
  });

  it("writes aggregate records in DynamoDB batch chunks", async () => {
    const seedGame = await getFantasyGame();
    const client = createFakeClient();
    const storage = createDynamoFantasyStorage({
      tableName: "PredictionGame",
      seedGame,
      client,
    });

    await storage.reset();

    const writeCalls = client.calls.filter((call) => call.command === "BatchWriteCommand");
    const writeRequests = writeCalls.flatMap((call) => call.input.RequestItems.PredictionGame);
    expect(writeCalls.length).toBeGreaterThan(0);
    expect(writeRequests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        PutRequest: {
          Item: expect.objectContaining({
            PK: "TOURNAMENT#world-cup-friends-2026",
            SK: "PROFILE",
            type: "TOURNAMENT",
          }),
        },
      }),
      expect.objectContaining({
        PutRequest: {
          Item: expect.objectContaining({
            PK: "TOURNAMENT#world-cup-friends-2026",
            SK: "AI_SETTINGS",
            type: "AI_SETTINGS",
          }),
        },
      }),
      expect.objectContaining({
        PutRequest: {
          Item: expect.objectContaining({
            PK: "QUESTION#q-bra-arg-winner",
            SK: "PREDICTION#p-sanoop",
            type: "PREDICTION",
          }),
        },
      }),
    ]));
  });
});
