export type FantasyQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "SCORE_RANGE"
  | "EXACT_SCORE"
  | "PLAYER"
  | "TIME_WINDOW";

export type FantasyQuestionCategory =
  | "MATCH_WINNER"
  | "QUALIFIER"
  | "RESULT_90"
  | "FINAL_SCORE_RANGE"
  | "EXACT_SCORE"
  | "FIRST_SCORING_TEAM"
  | "FIRST_GOAL_TIME"
  | "FIRST_GOAL_SCORER"
  | "ANYTIME_GOAL_SCORER"
  | "STAR_PLAYER_SCORE"
  | "PLAYER_SCORES_2_PLUS"
  | "TOTAL_GOALS"
  | "BOTH_TEAMS_SCORE"
  | "PENALTY_GOAL"
  | "MAN_OF_THE_MATCH"
  | "TOURNAMENT_WINNER"
  | "TOURNAMENT_FINALISTS"
  | "GOLDEN_BOOT"
  | "GOLDEN_BALL"
  | "GOLDEN_GLOVE"
  | "TOURNAMENT_MVP";

export type FantasyMatchImportance = "NORMAL" | "BIG_MATCH" | "KNOCKOUT" | "FINAL";
export type FantasyQuestionStatus = "DRAFT" | "OPEN" | "LOCKED" | "SCORED" | "VOID";
export type FantasyAiMode = "DISABLED" | "TEMPLATE_ONLY" | "ASSISTED";
export type FantasyAiBanterLevel = "NONE" | "LIGHT" | "PLAYFUL";
export type FantasyAiMessageType = "REMINDER" | "RECAP" | "LEADERBOARD_SUMMARY";
export type FantasyAiMessageStatus = "DRAFT" | "PUBLISHED" | "DISCARDED";
export type FantasyAiMessageSource = "TEMPLATE" | "EXTERNAL_AI" | "MANUAL";
export type FantasyUserPollKind =
  | "MATCH_WINNER"
  | "FIRST_SCORING_TEAM"
  | "TOTAL_GOALS"
  | "FIRST_GOAL_TIME"
  | "PENALTY_GOAL"
  | "BOTH_TEAMS_SCORE"
  | "FIRST_GOAL_SCORER"
  | "MAN_OF_THE_MATCH";
export type FantasyQuestionOptionMode =
  | "MATCH_RESULT"
  | "FIRST_SCORING_TEAM"
  | "TOTAL_GOALS"
  | "EXACT_SCORE"
  | "FIRST_GOAL_TIME"
  | "YES_NO"
  | "FIRST_GOAL_SCORER"
  | "STAR_PLAYER_SCORE"
  | "MAN_OF_THE_MATCH";
export type FantasyPosition = "GK" | "DEF" | "MID" | "FWD";

export interface FantasyTournament {
  id: string;
  name: string;
  competitionId: string;
  editionId: string;
  startDate: string;
  endDate: string;
  status: "UPCOMING" | "LIVE" | "COMPLETE";
  pollCloseMinutesBeforeKickoff: number;
  scoringRulesVersion: string;
}

export interface FantasyTeam {
  id: string;
  tournamentId: string;
  name: string;
  fifaCode: string;
  group: string;
  rankingSeed?: number;
}

export interface FantasySquadPlayer {
  id: string;
  tournamentId: string;
  teamId: string;
  name: string;
  position: FantasyPosition;
  shirtNumber?: number;
  isScorerCandidate: boolean;
  isStarCandidate: boolean;
  isMotmCandidate: boolean;
  isGoldenBootCandidate: boolean;
  isGoldenGloveCandidate: boolean;
}

export interface FantasyParticipant {
  id: string;
  name: string;
  nickname: string;
  favoriteTeamId: string;
  avatar?: string;
  email?: string;
  phone?: string;
  role?: "ADMIN" | "PLAYER";
  authProvider?: "INVITE" | "PASSWORD" | "GUEST";
  passwordChangedAt?: string;
  temporaryPasswordSetAt?: string;
}

export interface FantasyParticipantInvite {
  id: string;
  participantId: string;
  inviteCode: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  lastUsedAt?: string;
}

export interface FantasyAdminParticipant extends FantasyParticipant {
  invite?: FantasyParticipantInvite;
}

export interface FantasyGroup {
  id: string;
  tournamentId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdByParticipantId: string;
  status: "ACTIVE" | "ARCHIVED";
}

export interface FantasyGroupMembership {
  id: string;
  tournamentId: string;
  groupId: string;
  participantId: string;
  role: "OWNER" | "MEMBER";
  status: "ACTIVE" | "REMOVED";
  createdAt: string;
}

export interface FantasyMatch {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoff: string;
  stage: string;
  importance: FantasyMatchImportance;
  status: "SCHEDULED" | "LOCKED" | "COMPLETED";
  pollCloseAt: string;
}

export interface FantasyQuestion {
  id: string;
  tournamentId: string;
  groupId?: string;
  matchId?: string;
  createdByParticipantId?: string;
  createdAt?: string;
  source?: "ADMIN" | "USER" | "SYSTEM";
  category: FantasyQuestionCategory;
  type: FantasyQuestionType;
  text: string;
  options: string[];
  points: number;
  selectionCount?: number;
  status: FantasyQuestionStatus;
  closeAt: string;
}

export interface FantasyQuestionTemplate {
  id: string;
  tournamentId: string;
  name: string;
  category: FantasyQuestionCategory;
  type: FantasyQuestionType;
  text: string;
  optionMode: FantasyQuestionOptionMode;
  points: number;
  maxOptions?: number;
  enabled: boolean;
  importanceLevels: FantasyMatchImportance[];
  sortOrder: number;
}

export interface FantasyAiSettings {
  tournamentId: string;
  mode: FantasyAiMode;
  externalProviderEnabled: boolean;
  fallbackToTemplates: boolean;
  banterLevel: FantasyAiBanterLevel;
  dailyBudgetCents: number;
  maxQuestions: Record<FantasyMatchImportance, number>;
  enabledCategories: FantasyQuestionCategory[];
}

export interface FantasyAiMessage {
  id: string;
  tournamentId: string;
  matchId?: string;
  groupId?: string;
  type: FantasyAiMessageType;
  status: FantasyAiMessageStatus;
  source: FantasyAiMessageSource;
  title: string;
  body: string;
  contextHash: string;
  createdAt: string;
  createdByParticipantId: string;
  publishedAt?: string;
  discardedAt?: string;
}

export interface FantasyPrediction {
  id: string;
  questionId: string;
  participantId: string;
  answer: string | string[];
  submittedAt: string;
  pointsAwarded?: number;
}

export interface FantasyMatchResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId?: string;
  firstScoringTeamId?: string;
  firstGoalMinute?: number;
  firstGoalScorer?: string;
  anytimeScorers: string[];
  playersWithTwoPlusGoals: string[];
  manOfTheMatch?: string;
  penaltyAwarded: boolean;
  penaltyGoal?: boolean;
  redCard: boolean;
  bothTeamsScored: boolean;
  totalGoalsRange: "0-1" | "2-3" | "4+";
  publishedAt: string;
}

export interface FantasyScoreBreakdown {
  questionId: string;
  questionText: string;
  answer: string | string[];
  correctAnswer: string | string[];
  points: number;
  maxPoints: number;
}

export interface FantasyLeaderboardRow {
  rank: number;
  previousRank?: number;
  participantId: string;
  nickname: string;
  favoriteTeam: string;
  totalPoints: number;
  todayPoints: number;
  correctWinners: number;
  streak: number;
  badges: string[];
}

export interface FantasyBadge {
  id: string;
  participantId: string;
  label: string;
  reason: string;
  date: string;
}

export interface FantasyRecap {
  id: string;
  matchId?: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface FantasyAuditRecord {
  id: string;
  tournamentId: string;
  actorId: string;
  action: "AI_MESSAGE_DRAFTED" | "AI_MESSAGE_DISCARDED" | "AI_MESSAGE_PUBLISHED" | "AI_MESSAGE_REGENERATED" | "AI_PROVIDER_TESTED" | "AI_SETTINGS_UPDATED" | "FIXTURE_UPDATED" | "FIXTURES_SYNCED" | "GROUP_CREATED" | "GROUP_UPDATED" | "PARTICIPANT_CREATED" | "PARTICIPANT_CREDENTIALS_RESET" | "PARTICIPANT_JOINED" | "PARTICIPANT_PASSWORD_CHANGED" | "PARTICIPANT_ROLE_UPDATED" | "PARTICIPANT_UPDATED" | "POLLS_GENERATED" | "POLLS_GENERATED_AND_PUBLISHED" | "POLLS_RESET" | "PREDICTION_SUBMITTED" | "QUESTION_DRAFTS_SAVED" | "QUESTIONS_PUBLISHED" | "QUESTION_TEMPLATE_UPDATED" | "RESULT_SAVED" | "SCORES_PUBLISHED" | "SQUADS_IMPORTED" | "SQUAD_PLAYER_UPDATED" | "TEAM_UPDATED" | "TOURNAMENT_UPDATED" | "USER_POLL_CREATED" | "WORLD_CUP_SQUADS_SEEDED";
  entityType: "AI_MESSAGE" | "AI_SETTINGS" | "GROUP" | "PARTICIPANT" | "PREDICTION" | "QUESTION_TEMPLATE" | "RESULT" | "MATCH" | "SQUAD" | "SQUAD_PLAYER" | "TEAM" | "TOURNAMENT";
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FantasyGameData {
  tournament: FantasyTournament;
  teams: FantasyTeam[];
  squadPlayers: FantasySquadPlayer[];
  participants: FantasyParticipant[];
  groups: FantasyGroup[];
  groupMemberships: FantasyGroupMembership[];
  matches: FantasyMatch[];
  questions: FantasyQuestion[];
  questionTemplates: FantasyQuestionTemplate[];
  aiSettings: FantasyAiSettings;
  aiMessages: FantasyAiMessage[];
  predictions: FantasyPrediction[];
  results: FantasyMatchResult[];
  leaderboard: FantasyLeaderboardRow[];
  badges: FantasyBadge[];
  auditRecords: FantasyAuditRecord[];
  recaps: FantasyRecap[];
  activeParticipantId: string;
  updatedAt: string;
}
