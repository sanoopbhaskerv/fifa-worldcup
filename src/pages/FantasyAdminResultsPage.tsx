import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { MatchFilterControls, type MatchFilterValue, compareMatchesByKickoff, useMatchFilters } from "../components/MatchFilterControls";
import { fantasyMatchTitle, fantasyTeamName } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";
import {
  useFetchResultFactsFromProvider,
  useSaveFantasyResult,
  usePublishFantasyScores,
} from "../services/fantasy-queries";
import type { ResultFactsFromProvider } from "../services/fantasy-queries";
import type { FantasyMatch, FantasyMatchResult } from "../types/fantasy";

const formatMatchDatetime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const allMatchesFilter = (): MatchFilterValue => ({
  matchId: "",
  dateRange: { fromDate: "", toDate: "", groupStageOnly: false },
});

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
            <p className="fantasy-match-meta">{match.stage} · {formatMatchDatetime(match.kickoff)}</p>
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
          <p className="fantasy-match-meta">{match.stage} · {formatMatchDatetime(match.kickoff)}</p>
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

function PublishedResultCard({ match, result }: { match: FantasyMatch; result: FantasyMatchResult }) {
  const { data } = useFantasy();

  return (
    <article className="content-section fantasy-admin-result" key={match.id}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Scores published</span>
          <h2>{fantasyMatchTitle(match, data.teams)}</h2>
          <p className="fantasy-match-meta">{match.stage} · {formatMatchDatetime(match.kickoff)}</p>
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
  );
}

function ResultNotReadyCard({ match }: { match: FantasyMatch }) {
  const { data } = useFantasy();

  return (
    <article className="content-section fantasy-admin-result fantasy-admin-result--pending-status">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{match.status} · Result not ready</span>
          <h2>{fantasyMatchTitle(match, data.teams)}</h2>
          <p className="fantasy-match-meta">{match.stage} · {formatMatchDatetime(match.kickoff)}</p>
        </div>
      </div>
      <p className="fantasy-admin-note-text">Result entry opens once the fixture is marked completed.</p>
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
  const [matchFilter, setMatchFilter] = useState<MatchFilterValue>(() => allMatchesFilter());
  const participantId = data.activeParticipantId;

  const resultByMatchId = new Map(data.results.map((result) => [result.matchId, result]));
  const pollMatchIds = new Set(
    data.questions
      .filter((question) => question.status !== "DRAFT" && question.matchId)
      .map((question) => question.matchId as string),
  );
  const resultMatches = data.matches
    .filter((match) => pollMatchIds.has(match.id) || resultByMatchId.has(match.id))
    .sort(compareMatchesByKickoff);
  const { dateFilteredItems, filteredItems, resolvedMatchId } = useMatchFilters<FantasyMatch>({
    items: resultMatches,
    value: matchFilter,
    getMatch: (match) => match,
  });

  return (
    <div className="page fantasy-page">
      <PageHeading
        eyebrow="Admin"
        title="Result entry"
        description="Fetch match facts from API-Football, review them, then save and publish scores. Players will see their results immediately after publishing."
      />

      {resultMatches.length > 0 && (
        <div className="fantasy-page-actions fantasy-page-actions--filters-only">
          <div className="fantasy-page-actions__inline-filters fantasy-page-actions__inline-filters--always">
            <MatchFilterControls
              allMatchesLabel="All result matches"
              matches={dateFilteredItems}
              onChange={setMatchFilter}
              teams={data.teams}
              value={{ ...matchFilter, matchId: resolvedMatchId }}
            />
          </div>
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="fantasy-admin-grid">
          {filteredItems.map((match) => {
            const result = resultByMatchId.get(match.id);
            if (result) return <PublishedResultCard key={match.id} match={match} result={result} />;
            if (match.status === "COMPLETED") return <PendingMatchCard key={match.id} match={match} participantId={participantId} />;
            return <ResultNotReadyCard key={match.id} match={match} />;
          })}
        </div>
      )}

      {resultMatches.length === 0 && (
        <section className="content-section fantasy-admin-note">
          <span className="eyebrow">Nothing to do yet</span>
          <h2>No published match polls</h2>
          <p>
            Match polls will appear here after they are published. Result entry opens when a match
            is marked completed.
          </p>
        </section>
      )}

      {resultMatches.length > 0 && filteredItems.length === 0 && (
        <section className="content-section fantasy-admin-note">
          <span className="eyebrow">No matches</span>
          <h2>No result entries match this filter</h2>
          <p>Choose a wider date range or clear the match filter.</p>
        </section>
      )}
    </div>
  );
}
