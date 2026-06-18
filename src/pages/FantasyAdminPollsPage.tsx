import { useEffect, useMemo, useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { LabeledInput, LabeledSelect } from "../components/FormFields";
import { ErrorMessage, SuccessMessage } from "../components/FeedbackMessages";
import { useGenerateFantasyPolls, useResetFantasyPolls, useSaveFantasyQuestionDrafts } from "../services/fantasy-queries";
import { generateFantasyQuestionDraft, unknownFantasyPlayerOptions } from "../utils/fantasy-ai";
import { fantasyDeadlineLabel, fantasyMatchTitle } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";

/**
 * Displays local AI-host-style poll drafts generated from templates and squad data.
 *
 * @returns Admin poll management page.
 */
export default function FantasyAdminPollsPage() {
  const { data } = useFantasy();
  const [activeMatchId, setActiveMatchId] = useState(data.matches[0]?.id ?? "");
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "group-main");
  const [matchDate, setMatchDate] = useState("");
  const saveDrafts = useSaveFantasyQuestionDrafts(data.activeParticipantId);
  const generatePolls = useGenerateFantasyPolls(data.activeParticipantId);
  const resetPolls = useResetFantasyPolls(data.activeParticipantId);
  const filteredMatches = useMemo(() => (
    matchDate ? data.matches.filter((match) => match.kickoff.slice(0, 10) === matchDate) : data.matches
  ), [data.matches, matchDate]);
  const matchNumbers = useMemo(() => new Map(
    [...data.matches]
      .sort((left, right) => left.kickoff.localeCompare(right.kickoff))
      .map((match, index) => [match.id, index + 1]),
  ), [data.matches]);
  const matchPollSummaries = useMemo(() => new Map(data.matches.map((match) => {
    const questions = data.questions.filter((question) => question.matchId === match.id && (question.groupId ?? "group-main") === groupId);
    const questionIds = new Set(questions.map((question) => question.id));
    return [match.id, {
      drafted: questions.filter((question) => question.status === "DRAFT").length,
      published: questions.filter((question) => question.status === "OPEN").length,
      submitted: data.predictions.filter((prediction) => questionIds.has(prediction.questionId)).length,
    }];
  })), [data.matches, data.predictions, data.questions, groupId]);
  const upcomingFilteredMatches = filteredMatches.filter((match) => match.status === "SCHEDULED");
  const activeMatch = filteredMatches.find((match) => match.id === activeMatchId);
  const draft = useMemo(() => activeMatch ? generateFantasyQuestionDraft(activeMatch, data) : undefined, [activeMatch, data]);
  const hasUnknownOptions = draft?.questions.some((question) => unknownFantasyPlayerOptions(question, data).length > 0) ?? false;
  const groupOptions = data.groups.map((group) => ({ value: group.id, label: group.name }));
  const canCreatePollsForActiveMatch = activeMatch?.status === "SCHEDULED";
  const bulkMatchIds = upcomingFilteredMatches.map((match) => match.id);
  const bulkPayload = { groupId, limit: bulkMatchIds.length || 1, matchIds: bulkMatchIds, replaceExisting: true, status: "DRAFT" as const };

  useEffect(() => {
    if (filteredMatches.length === 0) {
      setActiveMatchId("");
      return;
    }
    if (!filteredMatches.some((match) => match.id === activeMatchId)) {
      setActiveMatchId(filteredMatches[0].id);
    }
  }, [activeMatchId, filteredMatches]);

  const saveQuestions = (status: "DRAFT" | "OPEN") => {
    if (!activeMatch || !draft || !canCreatePollsForActiveMatch) return;
    saveDrafts.mutate({ groupId, matchId: activeMatch.id, questions: draft.questions, status });
  };

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Poll management" description="Preview structured AI-host drafts before publishing. Player options are validated against stored World Cup squads." />
      <div className="fantasy-admin-polls">
        <aside className="content-section fantasy-match-list" aria-label="Matches">
          <div className="fantasy-squad-import">
            <strong>Bulk generation</strong>
            <p>Create template-grounded polls for the next synced fixtures using stored squads.</p>
            <LabeledSelect label="Group" onChange={setGroupId} options={groupOptions} value={groupId} />
            <LabeledInput label="Match date" onChange={setMatchDate} type="date" value={matchDate} />
            {matchDate && <button onClick={() => setMatchDate("")} type="button">Clear date</button>}
            <button disabled={generatePolls.isPending || bulkMatchIds.length === 0} onClick={() => generatePolls.mutate(bulkPayload)} type="button">
              {generatePolls.isPending ? "Generating..." : "Draft next 8"}
            </button>
            <button disabled={generatePolls.isPending || bulkMatchIds.length === 0} onClick={() => generatePolls.mutate({ ...bulkPayload, status: "OPEN" })} type="button">
              {generatePolls.isPending ? "Publishing..." : "Publish filtered upcoming"}
            </button>
            <button disabled={resetPolls.isPending || bulkMatchIds.length === 0} onClick={() => resetPolls.mutate({ groupId, keepTournamentQuestions: true, limit: bulkMatchIds.length || 1, matchIds: bulkMatchIds, replaceExisting: true, status: "OPEN" })} type="button">
              {resetPolls.isPending ? "Resetting..." : "Clear and publish new"}
            </button>
            {bulkMatchIds.length === 0 && <ErrorMessage>No upcoming matches found for this date.</ErrorMessage>}
            {generatePolls.isSuccess && <SuccessMessage>Saved {generatePolls.data.questions.length} polls for {generatePolls.data.fixtures.length} fixtures.</SuccessMessage>}
            {generatePolls.isError && <ErrorMessage>{generatePolls.error.message}</ErrorMessage>}
            {resetPolls.isSuccess && <SuccessMessage>Reset complete: {resetPolls.data.questions.length} fresh polls published.</SuccessMessage>}
            {resetPolls.isError && <ErrorMessage>{resetPolls.error.message}</ErrorMessage>}
          </div>
          {filteredMatches.map((match) => (
            <button className={match.id === activeMatch?.id ? "fantasy-match-button fantasy-match-button--active" : "fantasy-match-button"} key={match.id} onClick={() => setActiveMatchId(match.id)} type="button">
              <strong><span>Match {matchNumbers.get(match.id) ?? "-"}</span>{fantasyMatchTitle(match, data.teams)}</strong>
              <span>{match.status.toLowerCase()} · {match.importance.replace("_", " ")} · {formatDate(match.kickoff, true)} · {formatKickoff(match.kickoff)}</span>
              <span className="fantasy-match-button__indicators">
                <em>{matchPollSummaries.get(match.id)?.drafted ?? 0} drafted</em>
                <em>{matchPollSummaries.get(match.id)?.published ?? 0} published</em>
                <em>{matchPollSummaries.get(match.id)?.submitted ?? 0} submitted</em>
              </span>
            </button>
          ))}
        </aside>
        {activeMatch && draft && (
          <section className="content-section fantasy-draft-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{activeMatch.importance.replace("_", " ")}</span>
                <h2>{fantasyMatchTitle(activeMatch, data.teams)}</h2>
                <p>{formatDate(activeMatch.kickoff, true)} · {fantasyDeadlineLabel(activeMatch.pollCloseAt)}</p>
              </div>
              <strong>{draft.questions.length} questions</strong>
            </div>
            <div className="fantasy-ai-message">{draft.introMessage}</div>
            {!canCreatePollsForActiveMatch && <ErrorMessage>Polls can only be published for upcoming matches.</ErrorMessage>}
            <div className="fantasy-draft-actions">
              <button disabled={saveDrafts.isPending || !canCreatePollsForActiveMatch || hasUnknownOptions || draft.questions.length === 0} onClick={() => saveQuestions("DRAFT")} type="button">Save draft</button>
              <button disabled={saveDrafts.isPending || !canCreatePollsForActiveMatch || hasUnknownOptions || draft.questions.length === 0} onClick={() => saveQuestions("OPEN")} type="button">Publish open</button>
              {saveDrafts.isSuccess && <SuccessMessage>{saveDrafts.data.questions.length} questions saved as {saveDrafts.data.questions[0]?.status.toLowerCase()}.</SuccessMessage>}
              {saveDrafts.isError && <ErrorMessage>{saveDrafts.error.message}</ErrorMessage>}
            </div>
            <div className="fantasy-draft-list">
              {draft.questions.map((question) => {
                const unknownOptions = unknownFantasyPlayerOptions(question, data);
                return (
                  <article className="fantasy-draft-card" key={question.id}>
                    <header>
                      <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
                      <strong>{question.points} pts</strong>
                    </header>
                    <h3>{question.text}</h3>
                    <div className="fantasy-draft-options">
                      {question.options.map((option) => <span key={option}>{option}</span>)}
                    </div>
                    <footer className={unknownOptions.length > 0 ? "fantasy-validation fantasy-validation--error" : "fantasy-validation"}>
                      {unknownOptions.length > 0 ? `Unknown: ${unknownOptions.join(", ")}` : "Validated against templates and squad data"}
                    </footer>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {filteredMatches.length === 0 && (
          <section className="content-section fantasy-draft-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">No fixtures</span>
                <h2>No matches found</h2>
                <p>Clear the date filter or choose another match date.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
