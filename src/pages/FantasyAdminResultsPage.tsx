import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useFantasy } from "../app/fantasy-context";
import { MatchFilterControls, type MatchFilterValue, compareMatchesByKickoff, useMatchFilters } from "../components/MatchFilterControls";
import { pastMatchesRange } from "../components/MatchDateRangeFilter";
import { fantasyMatchTitle, fantasyTeamName } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";
import { resolveFantasyCorrectAnswer } from "../utils/fantasy-scoring";
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
  dateRange: pastMatchesRange(),
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
          <span className="eyebrow">
            {match.automationNote === "NEEDS_MANUAL_RESULT"
              ? "Beyond API window · Manual entry required"
              : "Completed · Awaiting results"}
          </span>
          <h2>{fantasyMatchTitle(match, data.teams)}</h2>
          <p className="fantasy-match-meta">{match.stage} · {formatMatchDatetime(match.kickoff)}</p>
        </div>
      </div>
      {match.automationNote === "NEEDS_MANUAL_RESULT" && (
        <p className="fantasy-admin-warning">
          ⚠️ This match is older than 2 days. The scheduled automation cannot fetch result data from the provider. Use "Fetch from API-Football" below if the data is now available, or enter the result manually.
        </p>
      )}

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
          {/* Scoreline */}
          <div className="fantasy-admin-scoreline">
            <span>{homeTeam}</span>
            <strong>
              {fetched.resultFacts.homeScore} : {fetched.resultFacts.awayScore}
            </strong>
            <span>{awayTeam}</span>
          </div>

          {/* Question-by-question answer verification */}
          {(() => {
            const matchQuestions = data.questions.filter((q) => q.matchId === match.id);
            if (matchQuestions.length === 0) return null;
            // Build a complete-enough result object from the fetched facts so
            // resolveFantasyCorrectAnswer can derive answers the same way scoring does.
            const resultForResolve = {
              matchId: match.id,
              homeScore: fetched.resultFacts.homeScore ?? 0,
              awayScore: fetched.resultFacts.awayScore ?? 0,
              winnerTeamId: fetched.resultFacts.winnerTeamId,
              firstScoringTeamId: fetched.resultFacts.firstScoringTeamId,
              firstGoalMinute: fetched.resultFacts.firstGoalMinute,
              firstGoalScorer: fetched.resultFacts.firstGoalScorer,
              anytimeScorers: fetched.resultFacts.anytimeScorers ?? [],
              playersWithTwoPlusGoals: fetched.resultFacts.playersWithTwoPlusGoals ?? [],
              manOfTheMatch: fetched.resultFacts.manOfTheMatch,
              bothTeamsScored: fetched.resultFacts.bothTeamsScored ?? false,
              totalGoalsRange: fetched.resultFacts.totalGoalsRange ?? "0-1",
              penaltyAwarded: fetched.resultFacts.penaltyAwarded ?? false,
              penaltyGoal: fetched.resultFacts.penaltyGoal ?? false,
              redCard: fetched.resultFacts.redCard ?? false,
              publishedAt: new Date().toISOString(),
            } as FantasyMatchResult;

            return (
              <div className="fantasy-admin-question-verify">
                <h3>Question answers from fetched data</h3>
                <p className="fantasy-admin-verify-hint">
                  Review the derived correct answer for each poll question before saving.
                </p>
                <table className="fantasy-verify-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Options</th>
                      <th>Derived answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchQuestions.map((q) => {
                      const derived = resolveFantasyCorrectAnswer(q, resultForResolve, data);
                      // EXACT_SCORE and free-text types have no options list — skip the check.
                      const hasManagedOptions = q.options.length > 0;
                      const isInOptions = !hasManagedOptions || (derived != null && q.options.includes(derived));
                      return (
                        <tr key={q.id}>
                          <td>
                            <span className="eyebrow">{q.category.replaceAll("_", " ")}</span>
                            <span>{q.text}</span>
                          </td>
                          <td className="fantasy-verify-options">
                            {hasManagedOptions
                              ? q.options.map((opt) => (
                                  <span
                                    key={opt}
                                    className={`fantasy-verify-option${opt === derived ? " fantasy-verify-option--match" : ""}`}
                                  >
                                    {opt}
                                  </span>
                                ))
                              : <span className="fantasy-verify-unknown">free text</span>
                            }
                          </td>
                          <td>
                            {derived == null ? (
                              <span className="fantasy-verify-unknown">—</span>
                            ) : (
                              <strong className={isInOptions ? "fantasy-verify-answer--ok" : "fantasy-verify-answer--warn"}>
                                {derived}
                                {!isInOptions && " ⚠️ not in options"}
                              </strong>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Goal timeline */}
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
          <span className="eyebrow">
            {result.dataUnavailable ? "Scores published · Partial data" : "Scores published"}
          </span>
          <h2>{fantasyMatchTitle(match, data.teams)}</h2>
          <p className="fantasy-match-meta">{match.stage} · {formatMatchDatetime(match.kickoff)}</p>
          {result.dataUnavailable && (
            <p className="fantasy-admin-warning">⚠️ Scorer and card facts were not available when this result was saved. Use "Review" to fetch and complete them.</p>
          )}
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

/**
 * Displays the admin result-entry workspace.
 * Shows completed matches without results first, then saved results.
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
    .filter((match) => match.status === "COMPLETED" && (pollMatchIds.has(match.id) || resultByMatchId.has(match.id)))
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
              dateFilterVariant="history"
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
            return <PendingMatchCard key={match.id} match={match} participantId={participantId} />;
          })}
        </div>
      )}

      {resultMatches.length === 0 && (
        <section className="content-section fantasy-admin-note">
          <span className="eyebrow">Nothing to do yet</span>
          <h2>No published match polls</h2>
          <p>
            Completed match polls will appear here after they are published.
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
