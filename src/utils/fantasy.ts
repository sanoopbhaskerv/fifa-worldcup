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

export const fantasyQuestionsForMatch = (matchId: string, questions: FantasyQuestion[]) =>
  questions.filter((question) => question.matchId === matchId);

export const fantasyOpenQuestions = (data: FantasyGameData) =>
  data.questions.filter((question) => question.status === "OPEN");

export const fantasyPredictionForQuestion = (questionId: string, participantId: string, data: FantasyGameData) =>
  data.predictions.find((prediction) => prediction.questionId === questionId && prediction.participantId === participantId);

export const fantasySquadCandidates = (teamId: string, players: FantasySquadPlayer[]) =>
  players.filter((player) => player.teamId === teamId && (player.isScorerCandidate || player.isStarCandidate || player.isMotmCandidate));

export const fantasyDeadlineLabel = (iso: string) => `${formatKickoff(iso)} lock`;
