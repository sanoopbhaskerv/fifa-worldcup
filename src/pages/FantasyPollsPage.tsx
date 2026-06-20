import { Link } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { FantasyQuestionCard } from "../features/fantasy/FantasyQuestionCard";
import { ArrowIcon, CloseIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { LabeledSelect } from "../components/FormFields";
import { MatchFilterControls, type MatchFilterValue, useMatchFilters } from "../components/MatchFilterControls";
import { useSubmitFantasyPrediction, useSubmitFantasyPredictions } from "../services/fantasy-queries";
import { fantasyDeadlineLabel, fantasyMatchTitle, fantasyPredictionForQuestion, fantasyPublishedQuestions, fantasyQuestionIsLocked, fantasyQuestionsForGroup, fantasyQuestionsForMatch } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";
import type { FantasyQuestion } from "../types/fantasy";
import { nextSevenDaysMatchRange } from "../components/MatchDateRangeFilter";

/**
 * Displays match and tournament prediction polls.
 *
 * @returns Polls page.
 */
const FilterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, pointerEvents: "none" }}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export default function FantasyPollsPage() {
  const { data } = useFantasy();
  const submitPrediction = useSubmitFantasyPrediction(data.activeParticipantId);
  const submitPredictions = useSubmitFantasyPredictions(data.activeParticipantId);
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "group-main");
  const [matchFilter, setMatchFilter] = useState<MatchFilterValue>(() => ({ matchId: "", dateRange: nextSevenDaysMatchRange() }));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const groupQuestions = fantasyQuestionsForGroup(groupId, data.questions);
  const tournamentQuestions = fantasyPublishedQuestions(groupQuestions).filter((question) => !question.matchId);
  const pollMatches = data.matches
    .map((match) => ({ match, questions: fantasyQuestionsForMatch(match.id, groupQuestions) }))
    .filter(({ questions }) => questions.length > 0);
  const { dateFilteredItems: dateFilteredPollMatches, filteredItems: filteredPollMatches, resolvedMatchId } = useMatchFilters({
    items: pollMatches,
    value: matchFilter,
    getMatch: ({ match }) => match,
  });
  const initialAnswer = (question: FantasyQuestion) => {
    const prediction = fantasyPredictionForQuestion(question.id, data.activeParticipantId, data);
    return Array.isArray(prediction?.answer) ? prediction.answer[0] : prediction?.answer ?? "";
  };
  const selectedAnswer = (question: FantasyQuestion) => draftAnswers[question.id] ?? initialAnswer(question);
  const changedAnswers = (questions: FantasyQuestion[]) => questions
    .filter((question) => !fantasyQuestionIsLocked(question, data))
    .map((question) => ({
      answer: selectedAnswer(question).trim(),
      initial: initialAnswer(question),
      questionId: question.id,
    }))
    .filter((row) => row.answer.length > 0 && row.answer !== row.initial);
  const clearDrafts = (questionIds: string[]) => {
    setDraftAnswers((current) => Object.fromEntries(Object.entries(current).filter(([questionId]) => !questionIds.includes(questionId))));
  };
  const saveChangedAnswers = (questions: FantasyQuestion[]) => {
    const changed = changedAnswers(questions);
    if (changed.length === 0) return;
    submitPredictions.mutate({
      participantId: data.activeParticipantId,
      predictions: changed.map(({ answer, questionId }) => ({ answer, questionId })),
    }, {
      onSuccess: () => clearDrafts(changed.map(({ questionId }) => questionId)),
    });
  };
  const bulkSaveLabel = (changedCount: number) => (
    submitPredictions.isPending ? "Saving..." : changedCount > 0 ? `Save ${changedCount} changed` : "All saved"
  );
  const groupOptions = data.groups.map((group) => ({ value: group.id, label: group.name }));

  const activeFilterCount = (resolvedMatchId ? 1 : 0) +
    (matchFilter.dateRange.fromDate || matchFilter.dateRange.toDate || matchFilter.dateRange.groupStageOnly ? 1 : 0) +
    (groupId !== (data.groups[0]?.id ?? "group-main") ? 1 : 0);

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Prediction polls" title="Published polls" description="Answer open match polls before lock time. Drafts stay hidden until an admin publishes them." />
      <div className="fantasy-page-actions">
        {data.groups.length > 1 && (
          <div className="fantasy-page-actions__group-select">
            <LabeledSelect
              label="League"
              onChange={(value) => {
                setGroupId(value);
                setMatchFilter((current) => ({ ...current, matchId: "" }));
              }}
              options={groupOptions}
              value={groupId}
            />
          </div>
        )}

        <div className="fantasy-page-actions__inline-filters">
          <MatchFilterControls
            matches={dateFilteredPollMatches.map(({ match }) => match)}
            onChange={setMatchFilter}
            showMatchSelect={pollMatches.length > 1}
            teams={data.teams}
            value={{ ...matchFilter, matchId: resolvedMatchId }}
          />
        </div>

        <button
          className="fantasy-page-actions__filter-trigger"
          onClick={() => setIsFilterOpen(true)}
          type="button"
        >
          <FilterIcon />
          <span>Filters</span>
          {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
        </button>

        <Link to="/fantasy/create-poll">Create poll <ArrowIcon /></Link>
      </div>
      <div className="fantasy-poll-groups">
        {pollMatches.length === 0 && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div><span className="eyebrow">Setup pending</span><h2>No published polls yet</h2><p>Sync fixtures, generate drafts, then publish the polls from admin.</p></div>
            </div>
          </section>
        )}
        {filteredPollMatches.length === 0 && pollMatches.length > 0 && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div><span className="eyebrow">No matches</span><h2>No polls in this range</h2><p>Choose a wider date range or use All matches.</p></div>
            </div>
          </section>
        )}
        {filteredPollMatches.map(({ match, questions }) => {
          const changed = changedAnswers(questions);
          return (
            <section className="content-section fantasy-poll-group" key={match.id}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{match.status}</span>
                  <h2>{fantasyMatchTitle(match, data.teams)}</h2>
                  <p>{formatDate(match.kickoff, true)} · kickoff {formatKickoff(match.kickoff)} · {fantasyDeadlineLabel(match.pollCloseAt)}</p>
                </div>
                <div className="fantasy-poll-actions">
                  <strong>{questions.reduce((sum, question) => sum + question.points, 0)} pts</strong>
                  <button
                    disabled={submitPredictions.isPending || changed.length === 0}
                    onClick={() => saveChangedAnswers(questions)}
                    type="button"
                  >
                    {bulkSaveLabel(changed.length)}
                  </button>
                </div>
              </div>
              <div className="fantasy-poll-list">
                {questions.map((question) => (
                  <FantasyQuestionCard
                    isSubmitting={submitPrediction.isPending && submitPrediction.variables?.questionId === question.id}
                    isLocked={fantasyQuestionIsLocked(question, data)}
                    key={question.id}
                    onAnswerChange={(answer) => setDraftAnswers((current) => ({ ...current, [question.id]: answer }))}
                    onSubmit={(answer) => submitPrediction.mutate({
                      answer,
                      participantId: data.activeParticipantId,
                      questionId: question.id,
                    }, {
                      onSuccess: () => clearDrafts([question.id]),
                    })}
                    prediction={fantasyPredictionForQuestion(question.id, data.activeParticipantId, data)}
                    question={question}
                    selectedAnswer={selectedAnswer(question)}
                  />
                ))}
              </div>
              <div className="fantasy-poll-actions fantasy-poll-actions--bottom">
                <strong>{changed.length > 0 ? `${changed.length} changed` : "All saved"}</strong>
                <button
                  disabled={submitPredictions.isPending || changed.length === 0}
                  onClick={() => saveChangedAnswers(questions)}
                  type="button"
                >
                  {bulkSaveLabel(changed.length)}
                </button>
              </div>
            </section>
          );
        })}
        {tournamentQuestions.length > 0 && !resolvedMatchId && matchFilter.dateRange.fromDate === "" && matchFilter.dateRange.toDate === "" && !matchFilter.dateRange.groupStageOnly && (() => {
          const changed = changedAnswers(tournamentQuestions);
          return (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div><span className="eyebrow">Tournament-long</span><h2>Big calls</h2><p>These lock before the tournament starts and carry higher points.</p></div>
              <div className="fantasy-poll-actions">
                <strong>{tournamentQuestions.reduce((sum, question) => sum + question.points, 0)} pts</strong>
                <button
                  disabled={submitPredictions.isPending || changed.length === 0}
                  onClick={() => saveChangedAnswers(tournamentQuestions)}
                  type="button"
                >
                  {bulkSaveLabel(changed.length)}
                </button>
              </div>
            </div>
            <div className="fantasy-poll-list">
              {tournamentQuestions.map((question) => (
                <FantasyQuestionCard
                  isSubmitting={submitPrediction.isPending && submitPrediction.variables?.questionId === question.id}
                  isLocked={fantasyQuestionIsLocked(question, data)}
                  key={question.id}
                  onAnswerChange={(answer) => setDraftAnswers((current) => ({ ...current, [question.id]: answer }))}
                  onSubmit={(answer) => submitPrediction.mutate({
                    answer,
                    participantId: data.activeParticipantId,
                    questionId: question.id,
                  }, {
                    onSuccess: () => clearDrafts([question.id]),
                  })}
                  prediction={fantasyPredictionForQuestion(question.id, data.activeParticipantId, data)}
                  question={question}
                  selectedAnswer={selectedAnswer(question)}
                />
              ))}
            </div>
            <div className="fantasy-poll-actions fantasy-poll-actions--bottom">
              <strong>{changed.length > 0 ? `${changed.length} changed` : "All saved"}</strong>
              <button
                disabled={submitPredictions.isPending || changed.length === 0}
                onClick={() => saveChangedAnswers(tournamentQuestions)}
                type="button"
              >
                {bulkSaveLabel(changed.length)}
              </button>
            </div>
          </section>
          );
        })()}
      </div>
      {isFilterOpen && createPortal(
          <motion.div
            className="dialog-backdrop fantasy-filter-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onMouseDown={() => setIsFilterOpen(false)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="fantasy-poll-filter-title"
              className="fantasy-filter-dialog"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="picker-header">
                <div>
                  <span className="eyebrow">Prediction polls</span>
                  <h2 id="fantasy-poll-filter-title">Filter polls</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setIsFilterOpen(false)}
                  aria-label="Close filters"
                  type="button"
                >
                  <CloseIcon />
                </button>
              </header>
              <div className="fantasy-filter-dialog-body">
                <MatchFilterControls
                  matches={dateFilteredPollMatches.map(({ match }) => match)}
                  onChange={setMatchFilter}
                  showMatchSelect={pollMatches.length > 1}
                  teams={data.teams}
                  value={{ ...matchFilter, matchId: resolvedMatchId }}
                />
              </div>
              <footer className="fantasy-filter-dialog-footer">
                <button
                  className="button button--primary"
                  onClick={() => setIsFilterOpen(false)}
                  type="button"
                >
                  Apply Filters
                </button>
              </footer>
            </motion.section>
          </motion.div>,
          document.body
        )}
    </div>
  );
}
