import { useMemo, useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { useGenerateFantasyPolls, useSaveFantasyQuestionDrafts } from "../services/fantasy-queries";
import { generateFantasyQuestionDraft, unknownFantasyPlayerOptions } from "../utils/fantasy-ai";
import { fantasyDeadlineLabel, fantasyMatchTitle } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "./FixturesPage";

/**
 * Displays local AI-host-style poll drafts generated from templates and squad data.
 *
 * @returns Admin poll management page.
 */
export default function FantasyAdminPollsPage() {
  const { data } = useFantasy();
  const [activeMatchId, setActiveMatchId] = useState(data.matches[0]?.id ?? "");
  const saveDrafts = useSaveFantasyQuestionDrafts(data.activeParticipantId);
  const generatePolls = useGenerateFantasyPolls(data.activeParticipantId);
  const activeMatch = data.matches.find((match) => match.id === activeMatchId) ?? data.matches[0];
  const draft = useMemo(() => activeMatch ? generateFantasyQuestionDraft(activeMatch, data) : undefined, [activeMatch, data]);
  const hasUnknownOptions = draft?.questions.some((question) => unknownFantasyPlayerOptions(question, data).length > 0) ?? false;
  const saveQuestions = (status: "DRAFT" | "OPEN") => {
    if (!activeMatch || !draft) return;
    saveDrafts.mutate({ matchId: activeMatch.id, questions: draft.questions, status });
  };

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Poll management" description="Preview structured AI-host drafts before publishing. Player options are validated against stored World Cup squads." />
      <div className="fantasy-admin-polls">
        <aside className="content-section fantasy-match-list" aria-label="Matches">
          <div className="fantasy-squad-import">
            <strong>Bulk generation</strong>
            <p>Create template-grounded polls for the next synced fixtures using stored squads.</p>
            <button disabled={generatePolls.isPending} onClick={() => generatePolls.mutate({ limit: 8, replaceExisting: true, status: "DRAFT" })} type="button">
              {generatePolls.isPending ? "Generating..." : "Draft next 8"}
            </button>
            <button disabled={generatePolls.isPending} onClick={() => generatePolls.mutate({ limit: 8, replaceExisting: true, status: "OPEN" })} type="button">
              {generatePolls.isPending ? "Publishing..." : "Publish next 8"}
            </button>
            {generatePolls.isSuccess && <p className="fantasy-success-note">Saved {generatePolls.data.questions.length} polls for {generatePolls.data.fixtures.length} fixtures.</p>}
            {generatePolls.isError && <p role="alert">{generatePolls.error.message}</p>}
          </div>
          {data.matches.map((match) => (
            <button className={match.id === activeMatch?.id ? "fantasy-match-button fantasy-match-button--active" : "fantasy-match-button"} key={match.id} onClick={() => setActiveMatchId(match.id)} type="button">
              <strong>{fantasyMatchTitle(match, data.teams)}</strong>
              <span>{match.importance.replace("_", " ")} · {formatKickoff(match.kickoff)}</span>
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
            <div className="fantasy-draft-actions">
              <button disabled={saveDrafts.isPending || hasUnknownOptions || draft.questions.length === 0} onClick={() => saveQuestions("DRAFT")} type="button">Save draft</button>
              <button disabled={saveDrafts.isPending || hasUnknownOptions || draft.questions.length === 0} onClick={() => saveQuestions("OPEN")} type="button">Publish open</button>
              {saveDrafts.isSuccess && <span>{saveDrafts.data.questions.length} questions saved as {saveDrafts.data.questions[0]?.status.toLowerCase()}.</span>}
              {saveDrafts.isError && <span role="alert">{saveDrafts.error.message}</span>}
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
      </div>
    </div>
  );
}
