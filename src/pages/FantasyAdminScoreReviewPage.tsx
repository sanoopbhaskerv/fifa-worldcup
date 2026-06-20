import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { useSaveFantasyResult, usePublishFantasyScores } from "../services/fantasy-queries";
import { buildFantasyScoreReview, findScorerMismatches } from "../utils/fantasy-scoring";
import { fantasyMatchTitle } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";

/**
 * Displays deterministic score-review rows for one match result.
 * Includes a scorer name correction panel for admin to fix API name mismatches.
 *
 * @returns Admin score review page.
 */
export default function FantasyAdminScoreReviewPage() {
  const { matchId = "" } = useParams();
  const { data } = useFantasy();
  const participantId = data.activeParticipantId;
  const saveResult = useSaveFantasyResult(participantId);
  const publishScores = usePublishFantasyScores(participantId);
  const match = data.matches.find((item) => item.id === matchId);
  const result = data.results.find((item) => item.matchId === matchId);

  if (!match || !result) return <Navigate replace to="/fantasy/admin/results" />;

  const rows = buildFantasyScoreReview(match, result, data);
  const mismatches = findScorerMismatches(match, result, data);
  const maxPoints = rows[0]?.breakdown.reduce((sum, item) => sum + item.maxPoints, 0) ?? 0;

  const applyCorrection = (category: string, correctedName: string) => {
    const patch =
      category === "FIRST_GOAL_SCORER"
        ? { firstGoalScorer: correctedName }
        : category === "MAN_OF_THE_MATCH"
          ? { manOfTheMatch: correctedName }
          : {};
    saveResult.mutate({ matchId, result: patch });
  };

  return (
    <div className="page fantasy-page">
      <PageHeading
        eyebrow="Admin review"
        title="Score review"
        description="Calculated from structured result facts and scoring rules. Fix any scorer name mismatches below, then publish."
      />

      {/* Scorer name correction panel */}
      {mismatches.length > 0 && (
        <section className="content-section fantasy-scorer-corrections">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Name mismatch</span>
              <h2>Scorer name corrections</h2>
            </div>
          </div>
          <p className="fantasy-scorer-corrections__hint">
            Players picked names that differ from the API source. Fuzzy-matched names already score
            correctly. Use "Mark as correct" for any remaining gaps, then re-publish.
          </p>
          {mismatches.map((mismatch) => (
            <div className="fantasy-scorer-mismatch" key={mismatch.questionId}>
              <div className="fantasy-scorer-mismatch__header">
                <span className="eyebrow">{mismatch.category.replaceAll("_", " ")}</span>
                <h3>{mismatch.questionText}</h3>
                <p>
                  Stored correct answer: <strong>{mismatch.storedName}</strong>
                </p>
              </div>
              <div className="fantasy-scorer-mismatch__names">
                {mismatch.predictedNames.map(({ name, count, fuzzyMatch }) => (
                  <div
                    className={`fantasy-scorer-candidate ${fuzzyMatch ? "fantasy-scorer-candidate--fuzzy" : "fantasy-scorer-candidate--no-match"}`}
                    key={name}
                  >
                    <div>
                      <strong>{name}</strong>
                      <span>{count} prediction{count !== 1 ? "s" : ""}</span>
                      {fuzzyMatch && (
                        <span className="fantasy-scorer-badge fantasy-scorer-badge--fuzzy">
                          Auto-matched ✓
                        </span>
                      )}
                    </div>
                    {!fuzzyMatch && (
                      <button
                        className="btn btn--secondary btn--sm"
                        disabled={saveResult.isPending}
                        onClick={() => applyCorrection(mismatch.category, name)}
                        type="button"
                      >
                        {saveResult.isPending ? "Saving…" : `Mark "${name}" as correct`}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {saveResult.isSuccess && (
                <p className="fantasy-admin-success">
                  ✓ Scorer name updated. Re-publish scores to apply the change.
                </p>
              )}
              {saveResult.isError && (
                <p className="fantasy-admin-error">
                  {saveResult.error instanceof Error
                    ? saveResult.error.message
                    : "Could not save correction."}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Score review table */}
      <section className="content-section fantasy-score-review">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{data.tournament.scoringRulesVersion}</span>
            <h2>{fantasyMatchTitle(match, data.teams)}</h2>
          </div>
          <Link to="/fantasy/admin/results">Back <ArrowIcon /></Link>
        </div>
        <div className="fantasy-review-summary">
          <article><span>Participants</span><strong>{rows.length}</strong></article>
          <article><span>Max points</span><strong>{maxPoints}</strong></article>
          <article><span>Top score</span><strong>{rows[0]?.totalPoints ?? 0}</strong></article>
        </div>
        <div className="fantasy-review-list">
          {rows.map((row) => (
            <article className="fantasy-review-row" key={row.participantId}>
              <header>
                <h3>{row.nickname}</h3>
                <strong>{row.totalPoints} pts</strong>
              </header>
              <div className="fantasy-review-breakdown">
                {row.breakdown.map((item) => (
                  <div key={item.questionId}>
                    <span>{item.questionText}</span>
                    <small>
                      Picked {Array.isArray(item.answer) ? item.answer.join(", ") : item.answer}
                      {" · "}
                      Correct {Array.isArray(item.correctAnswer) ? item.correctAnswer.join(", ") : item.correctAnswer}
                    </small>
                    <strong>{item.points}/{item.maxPoints}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="fantasy-admin-actions">
        <button
          className="button button--primary"
          disabled={publishScores.isPending}
          onClick={() => publishScores.mutate(match.id)}
          type="button"
        >
          {publishScores.isPending ? "Publishing..." : "Publish scores"}
        </button>
        <span>
          {publishScores.isSuccess
            ? "Scores published."
            : "Publishes calculated points to all participants."}
        </span>
      </div>
    </div>
  );
}
