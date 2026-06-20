import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { LabeledSelect } from "../components/FormFields";
import { MatchFilterControls, type MatchFilterValue, useMatchFilters } from "../components/MatchFilterControls";
import { pastMatchesRange } from "../components/MatchDateRangeFilter";
import { fantasyGroupName, fantasyMatchTitle, fantasyParticipant, fantasyParticipantIdsForGroup, fantasyQuestionsForGroup } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";
import type { FantasyMatch, FantasyQuestion } from "../types/fantasy";

const answerLabel = (answer: string | string[]) => Array.isArray(answer) ? answer.join(", ") : answer;

type SubmittedPollMatchGroup = {
  match: FantasyMatch;
  questions: FantasyQuestion[];
};

const allMatchesFilter = (): MatchFilterValue => ({
  matchId: "",
  dateRange: pastMatchesRange(),
});

/**
 * Displays poll response coverage for admin follow-up.
 *
 * @returns Admin poll response page.
 */
export default function FantasyAdminSubmittedPollsPage() {
  const { data } = useFantasy();
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "group-main");
  const [matchFilter, setMatchFilter] = useState<MatchFilterValue>(() => allMatchesFilter());
  const groupParticipantIds = fantasyParticipantIdsForGroup(groupId, data);
  const groupParticipants = data.participants.filter((participant) => groupParticipantIds.has(participant.id));
  const visibleQuestions = fantasyQuestionsForGroup(groupId, data.questions)
    .filter((question) => question.status !== "DRAFT")
    .sort((left, right) => (left.closeAt || "").localeCompare(right.closeAt || ""));
  const matchGroups = data.matches
    .map((match) => ({
      match,
      questions: visibleQuestions.filter((question) => question.matchId === match.id),
    }))
    .filter((group) => group.questions.length > 0);
  const tournamentQuestions = visibleQuestions.filter((question) => !question.matchId);
  const { dateFilteredItems, filteredItems, resolvedMatchId } = useMatchFilters<SubmittedPollMatchGroup>({
    items: matchGroups,
    value: matchFilter,
    getMatch: (group) => group.match,
  });
  const filteredQuestionCount = filteredItems.reduce((total, group) => total + group.questions.length, 0) + (!resolvedMatchId ? tournamentQuestions.length : 0);
  const groupOptions = data.groups.map((group) => ({ value: group.id, label: group.name }));
  const renderSubmittedPoll = (question: FantasyQuestion, match?: FantasyMatch) => {
    const responses = data.predictions
      .filter((prediction) => question.id === prediction.questionId && groupParticipantIds.has(prediction.participantId))
      .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
    const answeredIds = new Set(responses.map((prediction) => prediction.participantId));
    const pending = groupParticipants.filter((participant) => !answeredIds.has(participant.id));
    return (
      <article className="fantasy-submitted-poll" key={question.id}>
        <header>
          <div>
            <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
            <h3>{question.text}</h3>
            <p>{match ? fantasyMatchTitle(match, data.teams) : "Tournament poll"} · locks {formatKickoff(question.closeAt)}</p>
          </div>
          <strong>{responses.length}/{groupParticipants.length}</strong>
        </header>
        <div className="fantasy-response-columns">
          <section>
            <h4>Answered</h4>
            {responses.map((prediction) => {
              const participant = fantasyParticipant(prediction.participantId, data.participants);
              return (
                <div className="fantasy-response-row" key={prediction.id}>
                  <span>{participant?.avatar ?? participant?.nickname.slice(0, 2).toUpperCase() ?? "P"}</span>
                  <div>
                    <strong>{participant?.nickname ?? prediction.participantId}</strong>
                    <small>{answerLabel(prediction.answer)} · {formatKickoff(prediction.submittedAt)}</small>
                  </div>
                </div>
              );
            })}
            {responses.length === 0 && <p>No answers yet.</p>}
          </section>
          <section>
            <h4>Pending</h4>
            {pending.map((participant) => (
              <div className="fantasy-response-row fantasy-response-row--pending" key={participant.id}>
                <span>{participant.avatar ?? participant.nickname.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{participant.nickname}</strong>
                  <small>{participant.email ?? participant.phone ?? participant.id}</small>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p>Everyone has answered.</p>}
          </section>
        </div>
      </article>
    );
  };

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Poll responses" description="See who answered each poll and who is still pending so you can follow up." />
      <section className="content-section fantasy-submitted-polls">
        <div className="section-heading">
          <div><span className="eyebrow">Coverage</span><h2>{filteredQuestionCount} polls</h2><p>{fantasyGroupName(groupId, data)}</p></div>
          <LabeledSelect ariaLabel="Group" label="Group" onChange={setGroupId} options={groupOptions} value={groupId} />
        </div>
        <div className="fantasy-page-actions fantasy-page-actions--filters-only">
          <div className="fantasy-page-actions__inline-filters fantasy-page-actions__inline-filters--always">
            <MatchFilterControls
              allMatchesLabel="All response matches"
              dateFilterVariant="history"
              matches={dateFilteredItems.map((group) => group.match)}
              onChange={setMatchFilter}
              teams={data.teams}
              value={{ ...matchFilter, matchId: resolvedMatchId }}
            />
          </div>
        </div>
        <div className="fantasy-submitted-poll-list">
          {filteredItems.map(({ match, questions }) => (
            <section className="fantasy-submitted-match-group" key={match.id}>
              <header className="fantasy-match-group-header">
                <div>
                  <span className="eyebrow">{match.stage}</span>
                  <h2>{fantasyMatchTitle(match, data.teams)}</h2>
                  <p>{formatDate(match.kickoff, true)} · {formatKickoff(match.kickoff)}</p>
                </div>
              </header>
              {questions.map((question) => renderSubmittedPoll(question, match))}
            </section>
          ))}
          {!resolvedMatchId && tournamentQuestions.length > 0 && (
            <section className="fantasy-submitted-match-group">
              <header className="fantasy-match-group-header">
                <div>
                  <span className="eyebrow">Tournament</span>
                  <h2>Tournament polls</h2>
                  <p>Season-long predictions</p>
                </div>
              </header>
              {tournamentQuestions.map((question) => renderSubmittedPoll(question))}
            </section>
          )}
          {filteredQuestionCount === 0 && <p>No published polls match this filter.</p>}
        </div>
      </section>
    </div>
  );
}
