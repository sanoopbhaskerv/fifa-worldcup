const clone = (value) => structuredClone(value);

/**
 * Builds DynamoDB-style primary keys for the single-table fantasy model.
 */
export const fantasyRecordKeys = {
  aiSettings: (tournamentId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: "AI_SETTINGS",
  }),
  audit: (tournamentId, timestamp, id) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `AUDIT#${timestamp}#${id}`,
  }),
  badge: (tournamentId, date, badgeId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `BADGE#${date}#${badgeId}`,
  }),
  leaderboard: (tournamentId, rank, participantId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `LEADERBOARD#${String(rank).padStart(4, "0")}#${participantId}`,
  }),
  match: (tournamentId, matchId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `MATCH#${matchId}`,
  }),
  participant: (tournamentId, participantId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `PARTICIPANT#${participantId}`,
  }),
  participantInvite: (tournamentId, participantId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `INVITE#${participantId}`,
  }),
  player: (teamId, playerId) => ({
    PK: `TEAM#${teamId}`,
    SK: `PLAYER#${playerId}`,
  }),
  prediction: (questionId, participantId) => ({
    PK: `QUESTION#${questionId}`,
    SK: `PREDICTION#${participantId}`,
  }),
  question: (tournamentId, questionId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `QUESTION#${questionId}`,
  }),
  questionTemplate: (tournamentId, templateId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `QUESTION_TEMPLATE#${templateId}`,
  }),
  result: (matchId, resultVersion = "latest") => ({
    PK: `MATCH#${matchId}`,
    SK: `RESULT#${resultVersion}`,
  }),
  team: (tournamentId, teamId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: `TEAM#${teamId}`,
  }),
  tournament: (tournamentId) => ({
    PK: `TOURNAMENT#${tournamentId}`,
    SK: "PROFILE",
  }),
};

const record = (keys, type, data) => ({
  ...keys,
  type,
  data: clone(data),
});

/**
 * Converts the aggregate local game payload into the DynamoDB single-table item
 * shape planned for AWS.
 *
 * @param game - Fantasy game aggregate.
 * @returns Storage records with PK/SK keys and typed payloads.
 */
export const toFantasyStorageRecords = (game) => {
  const tournamentId = game.tournament.id;
  return [
    record(fantasyRecordKeys.tournament(tournamentId), "TOURNAMENT", game.tournament),
    record(fantasyRecordKeys.aiSettings(tournamentId), "AI_SETTINGS", game.aiSettings),
    ...game.teams.map((team) => record(fantasyRecordKeys.team(tournamentId, team.id), "TEAM", team)),
    ...game.squadPlayers.map((player) => record(fantasyRecordKeys.player(player.teamId, player.id), "SQUAD_PLAYER", player)),
    ...game.participants.map((participant) => record(fantasyRecordKeys.participant(tournamentId, participant.id), "PARTICIPANT", participant)),
    ...(game.participantInvites ?? []).map((invite) => record(fantasyRecordKeys.participantInvite(tournamentId, invite.participantId), "PARTICIPANT_INVITE", invite)),
    ...game.matches.map((match) => record(fantasyRecordKeys.match(tournamentId, match.id), "MATCH", match)),
    ...game.questions.map((question) => record(fantasyRecordKeys.question(tournamentId, question.id), "QUESTION", question)),
    ...(game.questionTemplates ?? []).map((template) => record(fantasyRecordKeys.questionTemplate(tournamentId, template.id), "QUESTION_TEMPLATE", template)),
    ...game.predictions.map((prediction) => record(fantasyRecordKeys.prediction(prediction.questionId, prediction.participantId), "PREDICTION", prediction)),
    ...game.results.map((result) => record(fantasyRecordKeys.result(result.matchId), "RESULT", result)),
    ...game.leaderboard.map((row) => record(fantasyRecordKeys.leaderboard(tournamentId, row.rank, row.participantId), "LEADERBOARD", row)),
    ...game.badges.map((badge) => record(fantasyRecordKeys.badge(tournamentId, badge.date, badge.id), "BADGE", badge)),
    ...(game.auditRecords ?? []).map((audit) => record(fantasyRecordKeys.audit(tournamentId, audit.createdAt, audit.id), "AUDIT", audit)),
  ];
};

/**
 * Creates the local storage adapter used by tests and development.
 *
 * @param seedGame - Initial fantasy game aggregate.
 * @returns Storage adapter compatible with the planned DynamoDB repository.
 */
export const createMemoryFantasyStorage = (seedGame) => {
  let state = clone(seedGame);

  return {
    getGame() {
      return state;
    },
    reset() {
      state = clone(seedGame);
      return state;
    },
    setGame(nextGame) {
      state = clone(nextGame);
      return state;
    },
    toRecords() {
      return toFantasyStorageRecords(state);
    },
    updateGame(updater) {
      state = clone(updater(state));
      return state;
    },
  };
};
