import { Link } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { FantasyQuestionCard } from "../features/fantasy/FantasyQuestionCard";
import { ArrowIcon, CloseIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { LabeledSelect } from "../components/FormFields";
import { useSubmitFantasyPrediction, useSubmitFantasyPredictions } from "../services/fantasy-queries";
import { fantasyDeadlineLabel, fantasyMatchTitle, fantasyPredictionForQuestion, fantasyPublishedQuestions, fantasyQuestionIsLocked, fantasyQuestionsForGroup, fantasyQuestionsForMatch } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";
import type { FantasyQuestion } from "../types/fantasy";
import { MatchDateRangeFilter, matchPassesDateRange, nextSevenDaysMatchRange } from "../components/MatchDateRangeFilter";

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
  const [matchId, setMatchId] = useState<string>("");
  const [dateRange, setDateRange] = useState(() => nextSevenDaysMatchRange());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const groupQuestions = fantasyQuestionsForGroup(groupId, data.questions);
  const tournamentQuestions = fantasyPublishedQuestions(groupQuestions).filter((question) => !question.matchId);
  const pollMatches = data.matches
    .map((match) => ({ match, questions: fantasyQuestionsForMatch(match.id, groupQuestions) }))
    .filter(({ questions }) => questions.length > 0);
  const dateFilteredPollMatches = pollMatches.filter(({ match }) => matchPassesDateRange(match, dateRange));
  const resolvedMatchId = matchId && dateFilteredPollMatches.some(({ match }) => match.id === matchId)
    ? matchId
    : "";
  const filteredPollMatches = resolvedMatchId
    ? dateFilteredPollMatches.filter(({ match }) => match.id === resolvedMatchId)
    : dateFilteredPollMatches;
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
  const groupOptions = data.groups.map((group) => ({ value: group.id, label: group.name }));
  const matchOptions = dateFilteredPollMatches.map(({ match }) => ({
    value: match.id,
    label: `${fantasyMatchTitle(match, data.teams)} – ${formatDate(match.kickoff, true)}`,
  }));

  const activeFilterCount = (resolvedMatchId ? 1 : 0) +
    (dateRange.fromDate || dateRange.toDate || dateRange.groupStageOnly ? 1 : 0) +
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
                setMatchId("");
              }}
              options={groupOptions}
              value={groupId}
            />
          </div>
        )}

        <div className="fantasy-page-actions__inline-filters">
          {pollMatches.length > 1 && (
            <LabeledSelect
              label="Match"
              onChange={setMatchId}
              options={[{ value: "", label: "All matches" }, ...matchOptions]}
              value={resolvedMatchId}
            />
          )}
          <MatchDateRangeFilter onChange={setDateRange} value={dateRange} />
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
                    onClick={() => submitPredictions.mutate({
                      participantId: data.activeParticipantId,
                      predictions: changed.map(({ answer, questionId }) => ({ answer, questionId })),
                    }, {
                      onSuccess: () => clearDrafts(changed.map(({ questionId }) => questionId)),
                    })}
                    type="button"
                  >
                    {submitPredictions.isPending ? "Saving..." : changed.length > 0 ? `Save ${changed.length} changed` : "All saved"}
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
            </section>
          );
        })}
        {tournamentQuestions.length > 0 && !resolvedMatchId && dateRange.fromDate === "" && dateRange.toDate === "" && !dateRange.groupStageOnly && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div><span className="eyebrow">Tournament-long</span><h2>Big calls</h2><p>These lock before the tournament starts and carry higher points.</p></div>
              <div className="fantasy-poll-actions">
                <strong>{tournamentQuestions.reduce((sum, question) => sum + question.points, 0)} pts</strong>
                <button
                  disabled={submitPredictions.isPending || changedAnswers(tournamentQuestions).length === 0}
                  onClick={() => {
                    const changed = changedAnswers(tournamentQuestions);
                    submitPredictions.mutate({
                      participantId: data.activeParticipantId,
                      predictions: changed.map(({ answer, questionId }) => ({ answer, questionId })),
                    }, {
                      onSuccess: () => clearDrafts(changed.map(({ questionId }) => questionId)),
                    });
                  }}
                  type="button"
                >
                  {submitPredictions.isPending ? "Saving..." : changedAnswers(tournamentQuestions).length > 0 ? `Save ${changedAnswers(tournamentQuestions).length} changed` : "All saved"}
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
          </section>
        )}
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
                {pollMatches.length > 1 && (
                  <LabeledSelect
                    label="Match"
                    onChange={setMatchId}
                    options={[{ value: "", label: "All matches" }, ...matchOptions]}
                    value={resolvedMatchId}
                  />
                )}
                <MatchDateRangeFilter onChange={setDateRange} value={dateRange} />
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
