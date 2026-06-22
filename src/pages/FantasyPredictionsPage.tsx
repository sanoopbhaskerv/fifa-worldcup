import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { CollapsibleMatchGroup, type ChipDef } from "../features/fantasy/CollapsibleMatchGroup";
import { MatchFilterControls, type MatchFilterValue, useMatchFilters } from "../components/MatchFilterControls";
import { pastMatchesRange } from "../components/MatchDateRangeFilter";
import { fantasyMatchTitle } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";
import type { FantasyMatch, FantasyPrediction, FantasyQuestion } from "../types/fantasy";

type PredictionRow = { prediction: FantasyPrediction; question: FantasyQuestion };
type PredictionMatchGroup = { match: FantasyMatch; predictions: PredictionRow[] };

const allMatchesFilter = (): MatchFilterValue => ({ matchId: "", dateRange: pastMatchesRange() });

const answerLabel = (answer: string | string[]) =>
  Array.isArray(answer) ? answer.join(", ") : answer;

const questionStatusClass = (status: FantasyQuestion["status"]) =>
  status === "OPEN" ? "upcoming" : status === "SCORED" ? "completed" : "postponed";

/** Derive summary chips for a prediction group (read-only, no interactive questions). */
function predictionChips(match: FantasyMatch, rows: PredictionRow[], hasResult: boolean): ChipDef[] {
  const chips: ChipDef[] = [];

  if (match.status === "COMPLETED") chips.push({ label: "Completed", variant: hasResult ? "success" : "warning" });
  else if (match.status === "LOCKED") chips.push({ label: "Live", variant: "warning" });
  else chips.push({ label: match.status === "SCHEDULED" ? "Upcoming" : match.status, variant: "muted" });

  if (hasResult) chips.push({ label: "Result published", variant: "success" });

  const scoredRows = rows.filter((r) => r.prediction.pointsAwarded !== undefined);
  if (scoredRows.length > 0) {
    const earned = scoredRows.reduce((sum, r) => sum + (r.prediction.pointsAwarded ?? 0), 0);
    const total = rows.reduce((sum, r) => sum + r.question.points, 0);
    chips.push({ label: `${earned}/${total} pts`, variant: earned > 0 ? "success" : "muted" });
  } else {
    const total = rows.reduce((sum, r) => sum + r.question.points, 0);
    chips.push({ label: `${rows.length} picks · ${total} pts`, variant: "muted" });
  }

  return chips;
}

/**
 * Displays the active participant's submitted predictions, grouped by match.
 * Each match group is collapsible with a scored-pts summary when collapsed.
 */
export default function FantasyPredictionsPage() {
  const { data } = useFantasy();
  const [matchFilter, setMatchFilter] = useState<MatchFilterValue>(() => allMatchesFilter());

  const myPredictions = data.predictions.filter((p) => p.participantId === data.activeParticipantId);
  const predictionRows = myPredictions
    .map((prediction) => {
      const question = data.questions.find((q) => q.id === prediction.questionId);
      return question ? { prediction, question } : undefined;
    })
    .filter((item): item is PredictionRow => Boolean(item));

  const matchGroups = data.matches
    .map((match) => ({
      match,
      predictions: predictionRows.filter((r) => r.question.matchId === match.id),
    }))
    .filter((g) => g.predictions.length > 0);

  const tournamentPredictions = predictionRows.filter((r) => !r.question.matchId);

  const { dateFilteredItems, filteredItems, resolvedMatchId } = useMatchFilters<PredictionMatchGroup>({
    items: matchGroups,
    value: matchFilter,
    getMatch: (g) => g.match,
  });

  const resultIds = new Set(data.results.map((r) => r.matchId));

  return (
    <div className="page fantasy-page">
      <PageHeading
        eyebrow="My picks"
        title="Predictions"
        description="Open answers can still change until the poll locks. Locked and scored answers stay visible."
      />

      <div className="fantasy-page-actions fantasy-page-actions--filters-only">
        <div className="fantasy-page-actions__inline-filters fantasy-page-actions__inline-filters--always">
          <MatchFilterControls
            allMatchesLabel="All prediction matches"
            dateFilterVariant="history"
            matches={dateFilteredItems.map((g) => g.match)}
            onChange={setMatchFilter}
            teams={data.teams}
            value={{ ...matchFilter, matchId: resolvedMatchId }}
          />
        </div>
      </div>

      <div className="fantasy-poll-groups">
        {filteredItems.map(({ match, predictions: rows }) => (
          <CollapsibleMatchGroup
            key={match.id}
            match={match}
            chips={predictionChips(match, rows, resultIds.has(match.id))}
            eyebrow={match.stage}
            heading={fantasyMatchTitle(match, data.teams)}
            defaultExpanded={match.status !== "COMPLETED" || !resultIds.has(match.id)}
          >
            <div className="fantasy-prediction-list">
              {rows.map(({ prediction, question }) => (
                <article className="fantasy-prediction-row" key={prediction.id}>
                  <div>
                    <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
                    <h2>{question.text}</h2>
                    <p>{answerLabel(prediction.answer)}</p>
                  </div>
                  <span className={`status status--${questionStatusClass(question.status)}`}>
                    {question.status}
                  </span>
                  <strong>
                    {prediction.pointsAwarded === undefined ? "—" : prediction.pointsAwarded}/{question.points}
                  </strong>
                </article>
              ))}
            </div>
          </CollapsibleMatchGroup>
        ))}

        {!resolvedMatchId && tournamentPredictions.length > 0 && (
          <CollapsibleMatchGroup
            key="tournament"
            match={{
              id: "tournament",
              status: "SCHEDULED",
              kickoff: data.tournament.startDate,
              pollCloseAt: data.tournament.startDate,
              stage: "Tournament",
              homeTeamId: "",
              awayTeamId: "",
              tournamentId: data.tournament.id,
              importance: "NORMAL",
            }}
            chips={predictionChips(
              { id: "tournament", status: "SCHEDULED" } as FantasyMatch,
              tournamentPredictions,
              false,
            )}
            eyebrow="Tournament-long"
            heading="Tournament picks"
            subheading="Season-long predictions"
            defaultExpanded
          >
            <div className="fantasy-prediction-list">
              {tournamentPredictions.map(({ prediction, question }) => (
                <article className="fantasy-prediction-row" key={prediction.id}>
                  <div>
                    <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
                    <h2>{question.text}</h2>
                    <p>{answerLabel(prediction.answer)}</p>
                  </div>
                  <span className={`status status--${questionStatusClass(question.status)}`}>
                    {question.status}
                  </span>
                  <strong>
                    {prediction.pointsAwarded === undefined ? "—" : prediction.pointsAwarded}/{question.points}
                  </strong>
                </article>
              ))}
            </div>
          </CollapsibleMatchGroup>
        )}

        {filteredItems.length === 0 && (!tournamentPredictions.length || resolvedMatchId) && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Nothing here</span>
                <h2>No predictions match this filter</h2>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
