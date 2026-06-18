import type { FantasyGameData, FantasyMatch, FantasyParticipant, FantasyQuestion, FantasySquadPlayer, FantasyTeam } from "../types/fantasy";
import { formatKickoff } from "./football";

export const fantasyMatchTitle = (match: FantasyMatch, teams: FantasyTeam[]) => {
  const home = teams.find((team) => team.id === match.homeTeamId)?.name ?? "TBD";
  const away = teams.find((team) => team.id === match.awayTeamId)?.name ?? "TBD";
  return `${home} vs ${away}`;
};

export const fantasyTeamName = (teamId: string, teams: FantasyTeam[]) =>
  teams.find((team) => team.id === teamId)?.name ?? "Unknown";

export const fantasyParticipant = (participantId: string, participants: FantasyParticipant[]) =>
  participants.find((participant) => participant.id === participantId);

export const fantasyGroupName = (groupId: string | undefined, data: FantasyGameData) =>
  data.groups.find((group) => group.id === groupId)?.name ?? "Main friends league";

export const fantasyParticipantIdsForGroup = (groupId: string | undefined, data: FantasyGameData) => {
  const resolvedGroupId = groupId ?? data.groups[0]?.id;
  return new Set(data.groupMemberships
    .filter((membership) => membership.groupId === resolvedGroupId && membership.status === "ACTIVE")
    .map((membership) => membership.participantId));
};

export const fantasyQuestionsForGroup = (groupId: string | undefined, questions: FantasyQuestion[]) =>
  questions.filter((question) => (question.groupId ?? "group-main") === (groupId ?? "group-main"));

export const fantasyQuestionsForMatch = (matchId: string, questions: FantasyQuestion[]) =>
  questions.filter((question) => question.matchId === matchId && question.status !== "DRAFT");

export const fantasyPublishedQuestions = (questions: FantasyQuestion[]) =>
  questions.filter((question) => question.status !== "DRAFT");

export const fantasyOpenQuestions = (data: FantasyGameData) =>
  data.questions.filter((question) => question.status === "OPEN" && !fantasyQuestionIsLocked(question, data));

const validTime = (value: string | undefined) => {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? time : undefined;
};

export const fantasyQuestionLockTime = (question: FantasyQuestion, data?: FantasyGameData) => {
  const closeAt = validTime(question.closeAt);
  const matchKickoff = question.matchId && data
    ? validTime(data.matches.find((match) => match.id === question.matchId)?.kickoff)
    : undefined;
  const times = [closeAt, matchKickoff].filter((time): time is number => time !== undefined);
  return times.length > 0 ? Math.min(...times) : undefined;
};

export const fantasyQuestionIsLocked = (question: FantasyQuestion, data?: FantasyGameData, now = new Date()) => {
  if (question.status !== "OPEN") return true;
  const lockTime = fantasyQuestionLockTime(question, data);
  return lockTime !== undefined && now.getTime() >= lockTime;
};

export const fantasyPredictionForQuestion = (questionId: string, participantId: string, data: FantasyGameData) =>
  data.predictions.find((prediction) => prediction.questionId === questionId && prediction.participantId === participantId);

export const fantasySquadCandidates = (teamId: string, players: FantasySquadPlayer[]) =>
  players.filter((player) => player.teamId === teamId && (player.isScorerCandidate || player.isStarCandidate || player.isMotmCandidate));

export const fantasyDeadlineLabel = (iso: string) => `${formatKickoff(iso)} lock`;
