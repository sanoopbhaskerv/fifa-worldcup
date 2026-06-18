import { Link } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { fantasyMatchTitle, fantasyTeamName } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";

/**
 * Displays the admin result-entry workspace.
 *
 * @returns Admin result entry page.
 */
export default function FantasyAdminResultsPage() {
  const { data } = useFantasy();
  const completed = data.results.map((result) => {
    const match = data.matches.find((item) => item.id === result.matchId);
    return match ? { match, result } : undefined;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Result entry" description="Enter structured match facts, review calculated points, then publish scores and recap." />
      <div className="fantasy-admin-grid">
        {completed.map(({ match, result }) => (
          <article className="content-section fantasy-admin-result" key={match.id}>
            <div className="section-heading">
              <div><span className="eyebrow">Ready for review</span><h2>{fantasyMatchTitle(match, data.teams)}</h2></div>
              <Link to={`/fantasy/admin/score-review/${match.id}`}>Review <ArrowIcon /></Link>
            </div>
            <div className="fantasy-admin-scoreline">
              <span>{fantasyTeamName(match.homeTeamId, data.teams)}</span>
              <strong>{result.homeScore} : {result.awayScore}</strong>
              <span>{fantasyTeamName(match.awayTeamId, data.teams)}</span>
            </div>
            <dl className="fantasy-result-facts">
              <div><dt>Winner</dt><dd>{result.winnerTeamId ? fantasyTeamName(result.winnerTeamId, data.teams) : "Draw"}</dd></div>
              <div><dt>First scorer</dt><dd>{result.firstGoalScorer}</dd></div>
              <div><dt>First goal minute</dt><dd>{result.firstGoalMinute}'</dd></div>
              <div><dt>Man of the Match</dt><dd>{result.manOfTheMatch}</dd></div>
              <div><dt>Penalty awarded</dt><dd>{result.penaltyAwarded ? "Yes" : "No"}</dd></div>
              <div><dt>Red card</dt><dd>{result.redCard ? "Yes" : "No"}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <section className="content-section fantasy-admin-note">
        <span className="eyebrow">Result workflow</span>
        <h2>Backend-backed scoring</h2>
        <p>Result facts are loaded from the fantasy backend. Use score review to inspect calculated points before publishing.</p>
      </section>
    </div>
  );
}
