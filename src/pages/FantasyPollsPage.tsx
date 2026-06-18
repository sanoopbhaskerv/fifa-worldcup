import { Link } from "react-router-dom";
import { useState } from "react";
import { FantasyQuestionCard } from "../features/fantasy/FantasyQuestionCard";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { LabeledSelect } from "../components/FormFields";
import { useSubmitFantasyPrediction, useSubmitFantasyPredictions } from "../services/fantasy-queries";
import { fantasyDeadlineLabel, fantasyMatchTitle, fantasyPredictionForQuestion, fantasyPublishedQuestions, fantasyQuestionsForGroup, fantasyQuestionsForMatch } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";
import type { FantasyQuestion } from "../types/fantasy";
import { MatchDateRangeFilter, matchPassesDateRange, nextSevenDaysMatchRange } from "../components/MatchDateRangeFilter";

/**
 * Displays match and tournament prediction polls.
 *
 * @returns Polls page.
 */
export default function FantasyPollsPage() {
  const { data } = useFantasy();
  const submitPrediction = useSubmitFantasyPrediction(data.activeParticipantId);
  const submitPredictions = useSubmitFantasyPredictions(data.activeParticipantId);
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "group-main");
  const [matchId, setMatchId] = useState<string>("");
  const [dateRange, setDateRange] = useState(() => nextSevenDaysMatchRange());
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
    .filter((question) => question.status === "OPEN")
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

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Prediction polls" title="Published polls" description="Answer open match polls before lock time. Drafts stay hidden until an admin publishes them." />
      <div className="fantasy-page-actions">
        {data.groups.length > 1 && (
          <LabeledSelect
            label="Group"
            onChange={(value) => {
              setGroupId(value);
              setMatchId("");
            }}
            options={groupOptions}
            value={groupId}
          />
        )}
        {pollMatches.length > 1 && (
          <LabeledSelect
            label="Match"
            onChange={setMatchId}
            options={[{ value: "", label: "All matches" }, ...matchOptions]}
            value={resolvedMatchId}
          />
        )}
        <MatchDateRangeFilter onChange={setDateRange} value={dateRange} />
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
    </div>
  );
}
