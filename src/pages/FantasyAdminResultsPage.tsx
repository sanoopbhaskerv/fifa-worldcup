import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { fantasyMatchTitle, fantasyTeamName } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";
import {
  useFetchResultFactsFromProvider,
  useSaveFantasyResult,
  usePublishFantasyScores,
} from "../services/fantasy-queries";
import type { ResultFactsFromProvider } from "../services/fantasy-queries";
import type { FantasyMatch } from "../types/fantasy";

interface PendingMatchCardProps {
  match: FantasyMatch;
  participantId: string;
}

/**
 * Admin card for a completed match that has no saved result yet.
 * Supports fetch → review → save+publish workflow.
 */
function PendingMatchCard({ match, participantId }: PendingMatchCardProps) {
  const { data } = useFantasy();
  const [fetched, setFetched] = useState<ResultFactsFromProvider | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMutation = useFetchResultFactsFromProvider();
  const saveMutation = useSaveFantasyResult(participantId);
  const publishMutation = usePublishFantasyScores(participantId);

  const homeTeam = fantasyTeamName(match.homeTeamId, data.teams);
  const awayTeam = fantasyTeamName(match.awayTeamId, data.teams);

  const handleFetch = () => {
    setErrorMsg(null);
    fetchMutation.mutate(match.id, {
      onSuccess: (res) => setFetched(res),
      onError: (err) => setErrorMsg(err.message),
    });
  };

  const handleSaveAndPublish = async () => {
    if (!fetched) return;
    setSaveStatus("saving");
    setErrorMsg(null);
    try {
      await saveMutation.mutateAsync({ matchId: match.id, result: fetched.resultFacts });
      await publishMutation.mutateAsync(match.id);
      setSaveStatus("done");
    } catch (err) {
      setSaveStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to save or publish scores.");
    }
  };

  if (saveStatus === "done") {
    return (
      <article className="content-section fantasy-admin-result fantasy-admin-result--published">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Published</span>
            <h2>{fantasyMatchTitle(match, data.teams)}</h2>
          </div>
          <Link to={`/fantasy/admin/score-review/${match.id}`}>Review <ArrowIcon /></Link>
        </div>
        <p className="fantasy-admin-success">✓ Scores published and leaderboard updated.</p>
      </article>
    );
  }

  return (
    <article className="content-section fantasy-admin-result">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Completed · Awaiting results</span>
          <h2>{fantasyMatchTitle(match, data.teams)}</h2>
        </div>
      </div>

      {!fetched ? (
        <div className="fantasy-admin-fetch">
          {errorMsg && <p className="fantasy-admin-error">{errorMsg}</p>}
          <button
            className="btn btn--primary"
            disabled={fetchMutation.isPending}
            onClick={handleFetch}
            type="button"
          >
            {fetchMutation.isPending ? "Fetching from API-Football…" : "Fetch from API-Football"}
          </button>
        </div>
      ) : (
        <>
          <div className="fantasy-admin-scoreline">
            <span>{homeTeam}</span>
            <strong>
              {fetched.resultFacts.homeScore} : {fetched.resultFacts.awayScore}
            </strong>
            <span>{awayTeam}</span>
          </div>

          <dl className="fantasy-result-facts">
            <div>
              <dt>Winner</dt>
              <dd>
                {fetched.resultFacts.winnerTeamId
                  ? fantasyTeamName(fetched.resultFacts.winnerTeamId, data.teams)
                  : "Draw"}
              </dd>
            </div>
            <div>
              <dt>First scoring team</dt>
              <dd>
                {fetched.resultFacts.firstScoringTeamId
                  ? fantasyTeamName(fetched.resultFacts.firstScoringTeamId, data.teams)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>First scorer</dt>
              <dd>{fetched.resultFacts.firstGoalScorer ?? "—"}</dd>
            </div>
            <div>
              <dt>First goal minute</dt>
              <dd>
                {fetched.resultFacts.firstGoalMinute != null
                  ? `${fetched.resultFacts.firstGoalMinute}'`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Man of the Match</dt>
              <dd>{fetched.resultFacts.manOfTheMatch ?? "—"}</dd>
            </div>
            <div>
              <dt>Both teams scored</dt>
              <dd>{fetched.resultFacts.bothTeamsScored ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Total goals range</dt>
              <dd>{fetched.resultFacts.totalGoalsRange ?? "—"}</dd>
            </div>
            <div>
              <dt>Penalty awarded</dt>
              <dd>{fetched.resultFacts.penaltyAwarded ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Penalty goal</dt>
              <dd>{fetched.resultFacts.penaltyGoal ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Red card</dt>
              <dd>{fetched.resultFacts.redCard ? "Yes" : "No"}</dd>
            </div>
            {fetched.resultFacts.anytimeScorers && fetched.resultFacts.anytimeScorers.length > 0 && (
              <div>
                <dt>All scorers</dt>
                <dd>{fetched.resultFacts.anytimeScorers.join(", ")}</dd>
              </div>
            )}
            {fetched.resultFacts.playersWithTwoPlusGoals &&
              fetched.resultFacts.playersWithTwoPlusGoals.length > 0 && (
                <div>
                  <dt>2+ goals</dt>
                  <dd>{fetched.resultFacts.playersWithTwoPlusGoals.join(", ")}</dd>
                </div>
              )}
          </dl>

          {fetched.goalTimeline.length > 0 && (
            <div className="fantasy-goal-timeline">
              <h3>Goal timeline</h3>
              <table className="fantasy-timeline-table">
                <thead>
                  <tr>
                    <th>Min</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Type</th>
                    <th>Time window</th>
                  </tr>
                </thead>
                <tbody>
                  {fetched.goalTimeline.map((g, i) => (
                    <tr key={i}>
                      <td>
                        {g.minute}
                        {g.extraMinute != null ? `+${g.extraMinute}` : ""}′
                      </td>
                      <td>{g.player}</td>
                      <td>
                        {g.team === "home"
                          ? homeTeam
                          : g.team === "away"
                            ? awayTeam
                            : g.team}
                      </td>
                      <td>{g.type}</td>
                      <td>{g.timeRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="fantasy-admin-actions">
            {errorMsg && <p className="fantasy-admin-error">{errorMsg}</p>}
            <button
              className="btn btn--secondary"
              disabled={saveStatus === "saving"}
              onClick={() => {
                setFetched(null);
                setErrorMsg(null);
                setSaveStatus("idle");
              }}
              type="button"
            >
              Re-fetch
            </button>
            <button
              className="btn btn--primary"
              disabled={saveStatus === "saving"}
              onClick={handleSaveAndPublish}
              type="button"
            >
              {saveStatus === "saving" ? "Publishing…" : "Save & Publish Scores"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}

/**
 * Displays the admin result-entry workspace.
 * Shows completed matches without results first (fetch → review → publish),
 * then already-saved results with a link to the score review page.
 *
 * @returns Admin result entry page.
 */
export default function FantasyAdminResultsPage() {
  const { data } = useFantasy();
  const participantId = data.activeParticipantId;

  const resultMatchIds = new Set(data.results.map((r) => r.matchId));

  const pendingMatches = data.matches.filter(
    (m) => m.status === "COMPLETED" && !resultMatchIds.has(m.id),
  );

  const completedResults = data.results
    .map((result) => {
      const match = data.matches.find((m) => m.id === result.matchId);
      return match ? { match, result } : undefined;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="page fantasy-page">
      <PageHeading
        eyebrow="Admin"
        title="Result entry"
        description="Fetch match facts from API-Football, review them, then save and publish scores. Players will see their results immediately after publishing."
      />

      {pendingMatches.length > 0 && (
        <div className="fantasy-admin-grid">
          {pendingMatches.map((match) => (
            <PendingMatchCard key={match.id} match={match} participantId={participantId} />
          ))}
        </div>
      )}

      {completedResults.length > 0 && (
        <>
          <h2 className="fantasy-admin-section-title">Published results</h2>
          <div className="fantasy-admin-grid">
            {completedResults.map(({ match, result }) => (
              <article className="content-section fantasy-admin-result" key={match.id}>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Scores published</span>
                    <h2>{fantasyMatchTitle(match, data.teams)}</h2>
                  </div>
                  <Link to={`/fantasy/admin/score-review/${match.id}`}>
                    Review <ArrowIcon />
                  </Link>
                </div>
                <div className="fantasy-admin-scoreline">
                  <span>{fantasyTeamName(match.homeTeamId, data.teams)}</span>
                  <strong>
                    {result.homeScore} : {result.awayScore}
                  </strong>
                  <span>{fantasyTeamName(match.awayTeamId, data.teams)}</span>
                </div>
                <dl className="fantasy-result-facts">
                  <div>
                    <dt>Winner</dt>
                    <dd>
                      {result.winnerTeamId
                        ? fantasyTeamName(result.winnerTeamId, data.teams)
                        : "Draw"}
                    </dd>
                  </div>
                  <div>
                    <dt>First scorer</dt>
                    <dd>{result.firstGoalScorer ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>First goal minute</dt>
                    <dd>{result.firstGoalMinute != null ? `${result.firstGoalMinute}'` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Man of the Match</dt>
                    <dd>{result.manOfTheMatch ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Penalty awarded</dt>
                    <dd>{result.penaltyAwarded ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt>Red card</dt>
                    <dd>{result.redCard ? "Yes" : "No"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}

      {pendingMatches.length === 0 && completedResults.length === 0 && (
        <section className="content-section fantasy-admin-note">
          <span className="eyebrow">Nothing to do yet</span>
          <h2>No completed matches</h2>
          <p>
            Matches will appear here once their status is set to COMPLETED. Use the Fixtures admin
            page to update match status after a game ends.
          </p>
        </section>
      )}
    </div>
  );
}
