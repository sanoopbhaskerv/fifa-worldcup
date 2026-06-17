import { useFantasy } from "../app/fantasy-context";
import { fantasyMatchTitle, fantasyTeamName } from "../utils/fantasy";
import { PageHeading } from "./FixturesPage";

/**
 * Displays completed fantasy match results and recaps.
 *
 * @returns Results page.
 */
export default function FantasyResultsPage() {
  const { data } = useFantasy();

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Score review" title="Results" description="Admin-entered facts drive scoring. AI text can recap the match, but points come from structured answers." />
      <div className="fantasy-result-list">
        {data.results.map((result) => {
          const match = data.matches.find((item) => item.id === result.matchId);
          const recap = data.recaps.find((item) => item.matchId === result.matchId);
          if (!match) return null;
          return (
            <article className="content-section fantasy-result-card" key={result.matchId}>
              <div className="section-heading">
                <div><span className="eyebrow">Published result</span><h2>{fantasyMatchTitle(match, data.teams)}</h2></div>
                <strong>{result.homeScore} : {result.awayScore}</strong>
              </div>
              <dl className="fantasy-result-facts">
                <div><dt>Winner</dt><dd>{result.winnerTeamId ? fantasyTeamName(result.winnerTeamId, data.teams) : "Draw"}</dd></div>
                <div><dt>First scoring team</dt><dd>{result.firstScoringTeamId ? fantasyTeamName(result.firstScoringTeamId, data.teams) : "No goal"}</dd></div>
                <div><dt>First goal scorer</dt><dd>{result.firstGoalScorer ?? "No goal"}</dd></div>
                <div><dt>First goal time</dt><dd>{result.firstGoalMinute}'</dd></div>
                <div><dt>Man of the Match</dt><dd>{result.manOfTheMatch}</dd></div>
                <div><dt>Total goals</dt><dd>{result.totalGoalsRange}</dd></div>
              </dl>
              {recap && <div className="fantasy-recap-note"><strong>{recap.title}</strong><p>{recap.body}</p></div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
