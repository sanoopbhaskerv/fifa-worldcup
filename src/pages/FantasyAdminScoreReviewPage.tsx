import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { usePublishFantasyScores } from "../services/fantasy-queries";
import { buildFantasyScoreReview } from "../utils/fantasy-scoring";
import { fantasyMatchTitle } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";

/**
 * Displays deterministic score-review rows for one match result.
 *
 * @returns Admin score review page.
 */
export default function FantasyAdminScoreReviewPage() {
  const { matchId = "" } = useParams();
  const { data } = useFantasy();
  const publishScores = usePublishFantasyScores(data.activeParticipantId);
  const match = data.matches.find((item) => item.id === matchId);
  const result = data.results.find((item) => item.matchId === matchId);

  if (!match || !result) return <Navigate replace to="/fantasy/admin/results" />;

  const rows = buildFantasyScoreReview(match, result, data);
  const maxPoints = rows[0]?.breakdown.reduce((sum, item) => sum + item.maxPoints, 0) ?? 0;

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin review" title="Score review" description="Calculated from structured result facts and scoring rules. Publish only after checking the rows." />
      <section className="content-section fantasy-score-review">
        <div className="section-heading">
          <div><span className="eyebrow">{data.tournament.scoringRulesVersion}</span><h2>{fantasyMatchTitle(match, data.teams)}</h2></div>
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
              <header><h3>{row.nickname}</h3><strong>{row.totalPoints} pts</strong></header>
              <div className="fantasy-review-breakdown">
                {row.breakdown.map((item) => (
                  <div key={item.questionId}>
                    <span>{item.questionText}</span>
                    <small>Picked {Array.isArray(item.answer) ? item.answer.join(", ") : item.answer} · Correct {Array.isArray(item.correctAnswer) ? item.correctAnswer.join(", ") : item.correctAnswer}</small>
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
        <span>{publishScores.isSuccess ? "Scores published to the local game API." : "Publishes calculated points through the local fantasy API."}</span>
      </div>
    </div>
  );
}
