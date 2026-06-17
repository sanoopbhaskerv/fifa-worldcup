import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fantasyGameData } from "../mocks/fantasy";
import type { FantasyAdminParticipant, FantasyAiSettings, FantasyGameData, FantasyMatch, FantasyMatchResult, FantasyParticipant, FantasyParticipantInvite, FantasyPrediction, FantasyQuestion, FantasyQuestionTemplate, FantasySquadPlayer, FantasyTeam, FantasyTournament } from "../types/fantasy";

const fantasyGameQueryKey = (participantId?: string) => ["fantasy-game", fantasyGameData.tournament.id, participantId ?? "guest"] as const;
const fantasyApiBaseUrl = (import.meta.env.VITE_FANTASY_API_BASE_URL ?? "").replace(/\/$/, "");
const fantasyApiUrl = (path: string) => `${fantasyApiBaseUrl}${path}`;

interface JoinFantasyGameInput {
  inviteCode: string;
}

interface JoinFantasyGameResponse {
  participant: FantasyGameData["participants"][number];
  game: FantasyGameData;
}

interface CreateFantasyParticipantInput {
  name: string;
  nickname: string;
  favoriteTeamId: string;
}

interface FantasyParticipantsResponse {
  participants: FantasyAdminParticipant[];
  game: FantasyGameData;
}

interface CreateFantasyParticipantResponse {
  participant: FantasyParticipant;
  invite: FantasyParticipantInvite;
  game: FantasyGameData;
}

interface FantasyFixturesResponse {
  fixtures: FantasyMatch[];
  game: FantasyGameData;
}

interface FantasySquadsResponse {
  teams: FantasyTeam[];
  squadPlayers: FantasySquadPlayer[];
  game: FantasyGameData;
}

interface FantasyQuestionTemplatesResponse {
  questionTemplates: FantasyQuestionTemplate[];
  game: FantasyGameData;
}

interface FantasyAiSettingsResponse {
  aiSettings: FantasyAiSettings;
  game: FantasyGameData;
}

interface ImportFantasySquadsInput {
  source: string;
}

interface ImportFantasySquadsResponse {
  teams: FantasyTeam[];
  squadPlayers: FantasySquadPlayer[];
  game: FantasyGameData;
}

interface UpdateFantasyTournamentInput {
  name: string;
  startDate: string;
  endDate: string;
  status: FantasyTournament["status"];
  pollCloseMinutesBeforeKickoff: number;
  scoringRulesVersion: string;
}

interface UpdateFantasyTournamentResponse {
  tournament: FantasyTournament;
  game: FantasyGameData;
}

interface UpdateFantasyFixtureInput {
  matchId: string;
  importance: FantasyMatch["importance"];
  kickoff: string;
  pollCloseAt: string;
  stage: string;
  status: FantasyMatch["status"];
}

interface UpdateFantasyFixtureResponse {
  fixture: FantasyMatch;
  game: FantasyGameData;
}

interface UpdateFantasyTeamInput {
  teamId: string;
  name: string;
  fifaCode: string;
  group: string;
  rankingSeed?: number;
}

interface UpdateFantasyTeamResponse {
  team: FantasyTeam;
  game: FantasyGameData;
}

interface UpdateFantasySquadPlayerInput {
  playerId: string;
  teamId: string;
  name: string;
  position: FantasySquadPlayer["position"];
  shirtNumber?: number;
  isScorerCandidate: boolean;
  isStarCandidate: boolean;
  isMotmCandidate: boolean;
  isGoldenBootCandidate: boolean;
  isGoldenGloveCandidate: boolean;
}

interface UpdateFantasySquadPlayerResponse {
  squadPlayer: FantasySquadPlayer;
  game: FantasyGameData;
}

interface UpdateFantasyQuestionTemplateInput {
  templateId: string;
  name: string;
  text: string;
  optionMode: FantasyQuestionTemplate["optionMode"];
  points: number;
  maxOptions?: number;
  enabled: boolean;
  importanceLevels: FantasyQuestionTemplate["importanceLevels"];
  sortOrder: number;
}

interface UpdateFantasyQuestionTemplateResponse {
  questionTemplate: FantasyQuestionTemplate;
  game: FantasyGameData;
}

type UpdateFantasyAiSettingsInput = FantasyAiSettings;

interface UpdateFantasyAiSettingsResponse {
  aiSettings: FantasyAiSettings;
  game: FantasyGameData;
}

interface SaveFantasyQuestionDraftsInput {
  matchId: string;
  questions: FantasyQuestion[];
  status: "DRAFT" | "OPEN";
}

interface SaveFantasyQuestionDraftsResponse {
  questions: FantasyQuestion[];
  game: FantasyGameData;
}

interface SubmitFantasyPredictionInput {
  questionId: string;
  answer: string | string[];
  participantId?: string;
}

interface SubmitFantasyPredictionResponse {
  prediction: FantasyPrediction;
  game: FantasyGameData;
}

interface SaveFantasyResultInput {
  matchId: string;
  result: Partial<FantasyMatchResult>;
}

interface SaveFantasyResultResponse {
  result: FantasyMatchResult;
  game: FantasyGameData;
}

interface PublishFantasyScoresResponse {
  predictions: FantasyPrediction[];
  game: FantasyGameData;
}

const fetchFantasyGame = async (participantId?: string): Promise<FantasyGameData> => {
  try {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    const response = await fetch(fantasyApiUrl(`/api/fantasy/game${query}`));
    if (!response.ok) throw new Error("Fantasy API unavailable");
    return (await response.json()) as FantasyGameData;
  } catch {
    return participantId ? { ...fantasyGameData, activeParticipantId: participantId } : fantasyGameData;
  }
};

const joinFantasyGame = async ({ inviteCode }: JoinFantasyGameInput): Promise<JoinFantasyGameResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/join"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not join fantasy league.");
  }
  return (await response.json()) as JoinFantasyGameResponse;
};

const fetchFantasyParticipants = async (): Promise<FantasyParticipantsResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/participants"));
  if (!response.ok) throw new Error("Could not load participants.");
  return (await response.json()) as FantasyParticipantsResponse;
};

const createFantasyParticipant = async (input: CreateFantasyParticipantInput): Promise<CreateFantasyParticipantResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/participants"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not create participant.");
  }
  return (await response.json()) as CreateFantasyParticipantResponse;
};

const fetchFantasyFixtures = async (): Promise<FantasyFixturesResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/fixtures"));
  if (!response.ok) throw new Error("Could not load fixtures.");
  return (await response.json()) as FantasyFixturesResponse;
};

const fetchFantasySquads = async (): Promise<FantasySquadsResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/squads"));
  if (!response.ok) throw new Error("Could not load squads.");
  return (await response.json()) as FantasySquadsResponse;
};

const fetchFantasyQuestionTemplates = async (): Promise<FantasyQuestionTemplatesResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/question-templates"));
  if (!response.ok) throw new Error("Could not load question templates.");
  return (await response.json()) as FantasyQuestionTemplatesResponse;
};

const fetchFantasyAiSettings = async (): Promise<FantasyAiSettingsResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/ai-settings"));
  if (!response.ok) throw new Error("Could not load AI settings.");
  return (await response.json()) as FantasyAiSettingsResponse;
};

const importFantasySquads = async (input: ImportFantasySquadsInput): Promise<ImportFantasySquadsResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/squads/import"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not import squads.");
  }
  return (await response.json()) as ImportFantasySquadsResponse;
};

const updateFantasyTournament = async (input: UpdateFantasyTournamentInput): Promise<UpdateFantasyTournamentResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/tournament"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not update tournament.");
  }
  return (await response.json()) as UpdateFantasyTournamentResponse;
};

const updateFantasyFixture = async ({ matchId, ...input }: UpdateFantasyFixtureInput): Promise<UpdateFantasyFixtureResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/admin/fixtures/${encodeURIComponent(matchId)}`), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not update fixture.");
  }
  return (await response.json()) as UpdateFantasyFixtureResponse;
};

const updateFantasyTeam = async ({ teamId, ...input }: UpdateFantasyTeamInput): Promise<UpdateFantasyTeamResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/admin/teams/${encodeURIComponent(teamId)}`), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not update team.");
  }
  return (await response.json()) as UpdateFantasyTeamResponse;
};

const updateFantasySquadPlayer = async ({ playerId, ...input }: UpdateFantasySquadPlayerInput): Promise<UpdateFantasySquadPlayerResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/admin/squad-players/${encodeURIComponent(playerId)}`), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not update squad player.");
  }
  return (await response.json()) as UpdateFantasySquadPlayerResponse;
};

const updateFantasyQuestionTemplate = async ({ templateId, ...input }: UpdateFantasyQuestionTemplateInput): Promise<UpdateFantasyQuestionTemplateResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/admin/question-templates/${encodeURIComponent(templateId)}`), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not update question template.");
  }
  return (await response.json()) as UpdateFantasyQuestionTemplateResponse;
};

const updateFantasyAiSettings = async (input: UpdateFantasyAiSettingsInput): Promise<UpdateFantasyAiSettingsResponse> => {
  const response = await fetch(fantasyApiUrl("/api/fantasy/admin/ai-settings"), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not update AI settings.");
  }
  return (await response.json()) as UpdateFantasyAiSettingsResponse;
};

const saveFantasyQuestionDrafts = async ({ matchId, questions, status }: SaveFantasyQuestionDraftsInput): Promise<SaveFantasyQuestionDraftsResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/admin/questions/${encodeURIComponent(matchId)}/drafts`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ questions, status }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not save question drafts.");
  }
  return (await response.json()) as SaveFantasyQuestionDraftsResponse;
};

const submitFantasyPrediction = async ({
  questionId,
  participantId = fantasyGameData.activeParticipantId,
  answer,
}: SubmitFantasyPredictionInput): Promise<SubmitFantasyPredictionResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/predictions/${encodeURIComponent(questionId)}`), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ participantId, answer }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not save fantasy prediction.");
  }
  return (await response.json()) as SubmitFantasyPredictionResponse;
};

const saveFantasyResult = async ({
  matchId,
  result,
}: SaveFantasyResultInput): Promise<SaveFantasyResultResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/admin/results/${encodeURIComponent(matchId)}`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(result),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not save fantasy result.");
  }
  return (await response.json()) as SaveFantasyResultResponse;
};

const publishFantasyScores = async (matchId: string): Promise<PublishFantasyScoresResponse> => {
  const response = await fetch(fantasyApiUrl(`/api/fantasy/admin/results/${encodeURIComponent(matchId)}/publish-scores`), {
    method: "POST",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    throw new Error(payload?.error?.message ?? "Could not publish fantasy scores.");
  }
  return (await response.json()) as PublishFantasyScoresResponse;
};

/**
 * Loads the local fantasy prediction game payload.
 *
 * @returns TanStack Query result containing the mock prediction game state.
 */
export const useFantasyGame = (participantId?: string, enabled = true) =>
  useQuery({
    enabled,
    queryKey: fantasyGameQueryKey(participantId),
    queryFn: () => fetchFantasyGame(participantId),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24,
  });

/**
 * Resolves a friends-league invite code to a participant identity.
 *
 * @returns TanStack mutation for invite-code join.
 */
export const useJoinFantasyGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinFantasyGame,
    onSuccess: ({ game, participant }) => {
      queryClient.setQueryData(fantasyGameQueryKey(participant.id), game);
    },
  });
};

/**
 * Loads admin participant rows with invite metadata.
 *
 * @returns TanStack query result for participant administration.
 */
export const useFantasyParticipants = () =>
  useQuery({
    queryKey: ["fantasy-participants", fantasyGameData.tournament.id],
    queryFn: fetchFantasyParticipants,
    staleTime: 1000 * 30,
  });

/**
 * Creates a participant and refreshes local fantasy caches.
 *
 * @returns TanStack mutation for admin participant creation.
 */
export const useCreateFantasyParticipant = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFantasyParticipant,
    onSuccess: ({ game }) => {
      queryClient.invalidateQueries({ queryKey: ["fantasy-participants", fantasyGameData.tournament.id] });
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Loads admin fixtures for scheduling and poll-generation setup.
 *
 * @returns TanStack query result for fixture administration.
 */
export const useFantasyFixtures = () =>
  useQuery({
    queryKey: ["fantasy-fixtures", fantasyGameData.tournament.id],
    queryFn: fetchFantasyFixtures,
    staleTime: 1000 * 30,
  });

/**
 * Loads admin team and squad-player reference data.
 *
 * @returns TanStack query result for squad administration.
 */
export const useFantasySquads = () =>
  useQuery({
    queryKey: ["fantasy-squads", fantasyGameData.tournament.id],
    queryFn: fetchFantasySquads,
    staleTime: 1000 * 30,
  });

/**
 * Loads admin question templates used by AI draft generation.
 *
 * @returns TanStack query result for template administration.
 */
export const useFantasyQuestionTemplates = () =>
  useQuery({
    queryKey: ["fantasy-question-templates", fantasyGameData.tournament.id],
    queryFn: fetchFantasyQuestionTemplates,
    staleTime: 1000 * 30,
  });

/**
 * Loads AI settings for draft generation.
 *
 * @returns TanStack query result for AI setting administration.
 */
export const useFantasyAiSettings = () =>
  useQuery({
    queryKey: ["fantasy-ai-settings", fantasyGameData.tournament.id],
    queryFn: fetchFantasyAiSettings,
    staleTime: 1000 * 30,
  });

/**
 * Imports team and squad-player data and refreshes fantasy caches.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for squad imports.
 */
export const useImportFantasySquads = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importFantasySquads,
    onSuccess: ({ game }) => {
      queryClient.invalidateQueries({ queryKey: ["fantasy-squads", fantasyGameData.tournament.id] });
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Updates tournament setup and refreshes the active game cache.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for tournament setup changes.
 */
export const useUpdateFantasyTournament = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFantasyTournament,
    onSuccess: ({ game }) => {
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Updates one fixture and refreshes local fantasy caches.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for fixture updates.
 */
export const useUpdateFantasyFixture = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFantasyFixture,
    onSuccess: ({ game }) => {
      queryClient.invalidateQueries({ queryKey: ["fantasy-fixtures", fantasyGameData.tournament.id] });
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Updates one World Cup team and refreshes squad caches.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for team edits.
 */
export const useUpdateFantasyTeam = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFantasyTeam,
    onSuccess: ({ game }) => {
      queryClient.invalidateQueries({ queryKey: ["fantasy-squads", fantasyGameData.tournament.id] });
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Updates one squad-player reference record and refreshes squad caches.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for squad player edits.
 */
export const useUpdateFantasySquadPlayer = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFantasySquadPlayer,
    onSuccess: ({ game }) => {
      queryClient.invalidateQueries({ queryKey: ["fantasy-squads", fantasyGameData.tournament.id] });
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Updates one question template and refreshes fantasy caches.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for question template edits.
 */
export const useUpdateFantasyQuestionTemplate = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFantasyQuestionTemplate,
    onSuccess: ({ game }) => {
      queryClient.invalidateQueries({ queryKey: ["fantasy-question-templates", fantasyGameData.tournament.id] });
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Updates AI draft generation settings and refreshes fantasy caches.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for AI settings edits.
 */
export const useUpdateFantasyAiSettings = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFantasyAiSettings,
    onSuccess: ({ game }) => {
      queryClient.invalidateQueries({ queryKey: ["fantasy-ai-settings", fantasyGameData.tournament.id] });
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Saves generated poll drafts or publishes them as open questions.
 *
 * @param participantId - Active participant cache key.
 * @returns TanStack mutation for generated question drafts.
 */
export const useSaveFantasyQuestionDrafts = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveFantasyQuestionDrafts,
    onSuccess: ({ game }) => {
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Saves one prediction and refreshes the local game cache from the API payload.
 *
 * @returns TanStack mutation for prediction submission.
 */
export const useSubmitFantasyPrediction = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitFantasyPrediction,
    onSuccess: ({ game }) => {
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Saves structured match result facts and refreshes the local game cache.
 *
 * @returns TanStack mutation for admin result entry.
 */
export const useSaveFantasyResult = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveFantasyResult,
    onSuccess: ({ game }) => {
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};

/**
 * Publishes score calculations for one match and refreshes the local game cache.
 *
 * @returns TanStack mutation for admin score publishing.
 */
export const usePublishFantasyScores = (participantId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishFantasyScores,
    onSuccess: ({ game }) => {
      queryClient.setQueryData(fantasyGameQueryKey(participantId ?? game.activeParticipantId), game);
    },
  });
};
