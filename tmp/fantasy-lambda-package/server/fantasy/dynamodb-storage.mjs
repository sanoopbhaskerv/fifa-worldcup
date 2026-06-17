import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { fantasyRecordKeys, toFantasyStorageRecords } from "./storage.mjs";

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const clone = (value) => structuredClone(value);

const bySortKey = (records) => [...records].sort((left, right) => left.SK.localeCompare(right.SK));

const dataForType = (records, type) => records.filter((record) => record.type === type).map((record) => record.data);

const hydrateGame = (records, fallbackGame) => {
  const tournament = dataForType(records, "TOURNAMENT")[0] ?? fallbackGame.tournament;
  const aiSettings = dataForType(records, "AI_SETTINGS")[0] ?? fallbackGame.aiSettings;
  const questionTemplates = dataForType(records, "QUESTION_TEMPLATE");
  return {
    tournament,
    aiSettings,
    teams: bySortKey(dataForType(records, "TEAM").map((data) => ({ SK: fantasyRecordKeys.team(tournament.id, data.id).SK, data }))).map((record) => record.data),
    squadPlayers: dataForType(records, "SQUAD_PLAYER"),
    participants: dataForType(records, "PARTICIPANT"),
    participantInvites: dataForType(records, "PARTICIPANT_INVITE"),
    matches: dataForType(records, "MATCH"),
    questions: dataForType(records, "QUESTION"),
    questionTemplates: questionTemplates.length > 0 ? questionTemplates : fallbackGame.questionTemplates,
    predictions: dataForType(records, "PREDICTION"),
    results: dataForType(records, "RESULT"),
    leaderboard: dataForType(records, "LEADERBOARD"),
    badges: dataForType(records, "BADGE"),
    auditRecords: dataForType(records, "AUDIT"),
    activeParticipantId: fallbackGame.activeParticipantId,
    recaps: fallbackGame.recaps,
    updatedAt: records.reduce((latest, record) => (
      record.updatedAt && record.updatedAt > latest ? record.updatedAt : latest
    ), fallbackGame.updatedAt),
  };
};

const createDocumentClient = ({ client, region }) => {
  if (client) return client;
  const dynamodb = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(dynamodb, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
};

/**
 * Creates a DynamoDB-backed fantasy storage adapter.
 *
 * @param options - Adapter configuration.
 * @param options.tableName - DynamoDB table name.
 * @param options.seedGame - Fallback game used when the table has not been seeded.
 * @param options.region - AWS region.
 * @param options.client - Optional document client for tests.
 * @returns Storage adapter matching the local memory adapter surface.
 */
export const createDynamoFantasyStorage = ({
  tableName,
  seedGame,
  region = "us-east-1",
  client,
}) => {
  if (!tableName) throw new Error("DynamoDB fantasy storage requires FANTASY_DYNAMODB_TABLE.");
  const documentClient = createDocumentClient({ client, region });
  let cachedGame;

  const queryByPk = async (PK) => {
    const result = await documentClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": PK },
    }));
    return result.Items ?? [];
  };

  const loadGame = async () => {
    const tournamentRecords = await queryByPk(fantasyRecordKeys.tournament(seedGame.tournament.id).PK);
    if (tournamentRecords.length === 0) {
      cachedGame = clone(seedGame);
      return cachedGame;
    }

    const teamIds = tournamentRecords
      .filter((record) => record.type === "TEAM")
      .map((record) => record.data.id);
    const questionIds = tournamentRecords
      .filter((record) => record.type === "QUESTION")
      .map((record) => record.data.id);
    const matchIds = tournamentRecords
      .filter((record) => record.type === "MATCH")
      .map((record) => record.data.id);

    const relatedRecords = await Promise.all([
      ...teamIds.map((teamId) => queryByPk(`TEAM#${teamId}`)),
      ...questionIds.map((questionId) => queryByPk(`QUESTION#${questionId}`)),
      ...matchIds.map((matchId) => queryByPk(`MATCH#${matchId}`)),
    ]);

    cachedGame = hydrateGame([...tournamentRecords, ...relatedRecords.flat()], seedGame);
    return cachedGame;
  };

  const writeRecords = async (records) => {
    for (const recordsChunk of chunk(records, 25)) {
      await documentClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: recordsChunk.map((item) => ({
            PutRequest: {
              Item: {
                ...item,
                updatedAt: new Date().toISOString(),
              },
            },
          })),
        },
      }));
    }
  };

  return {
    async getGame() {
      if (cachedGame) return cachedGame;
      return loadGame();
    },
    async reset() {
      cachedGame = clone(seedGame);
      await writeRecords(toFantasyStorageRecords(cachedGame));
      return cachedGame;
    },
    async setGame(nextGame) {
      cachedGame = clone(nextGame);
      await writeRecords(toFantasyStorageRecords(cachedGame));
      return cachedGame;
    },
    async toRecords() {
      const game = await this.getGame();
      return toFantasyStorageRecords(game);
    },
    async updateGame(updater) {
      const game = await this.getGame();
      const nextGame = await updater(game);
      return this.setGame(nextGame);
    },
  };
};
