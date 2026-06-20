import { useState } from "react";
import { useFantasy } from "../app/fantasy-context";
import { MatchFilterControls, type MatchFilterValue, useMatchFilters } from "../components/MatchFilterControls";
import { fantasyMatchTitle } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "../components/PageSections";
import type { FantasyMatch, FantasyPrediction, FantasyQuestion } from "../types/fantasy";

type PredictionRow = {
  prediction: FantasyPrediction;
  question: FantasyQuestion;
};

type PredictionMatchGroup = {
  match: FantasyMatch;
  predictions: PredictionRow[];
};

const allMatchesFilter = (): MatchFilterValue => ({
  matchId: "",
  dateRange: { fromDate: "", toDate: "", groupStageOnly: false },
});

const answerLabel = (answer: string | string[]) => Array.isArray(answer) ? answer.join(", ") : answer;

const questionStatusClass = (status: FantasyQuestion["status"]) =>
  status === "OPEN" ? "upcoming" : status === "SCORED" ? "completed" : "postponed";

/**
 * Displays the active participant's submitted predictions.
 *
 * @returns My predictions page.
 */
export default function FantasyPredictionsPage() {
  const { data } = useFantasy();
  const [matchFilter, setMatchFilter] = useState<MatchFilterValue>(() => allMatchesFilter());
  const predictions = data.predictions.filter((prediction) => prediction.participantId === data.activeParticipantId);
  const predictionRows = predictions
    .map((prediction) => {
      const question = data.questions.find((item) => item.id === prediction.questionId);
      return question ? { prediction, question } : undefined;
    })
    .filter((item): item is PredictionRow => Boolean(item));
  const matchGroups = data.matches
    .map((match) => ({
      match,
      predictions: predictionRows.filter((row) => row.question.matchId === match.id),
    }))
    .filter((group) => group.predictions.length > 0);
  const tournamentPredictions = predictionRows.filter((row) => !row.question.matchId);
  const { dateFilteredItems, filteredItems, resolvedMatchId } = useMatchFilters<PredictionMatchGroup>({
    items: matchGroups,
    value: matchFilter,
    getMatch: (group) => group.match,
  });

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="My picks" title="Predictions" description="Open answers can still change in the real backend until the poll locks. Locked and scored answers stay visible." />
      <div className="fantasy-page-actions fantasy-page-actions--filters-only">
        <div className="fantasy-page-actions__inline-filters fantasy-page-actions__inline-filters--always">
          <MatchFilterControls
            allMatchesLabel="All prediction matches"
            matches={dateFilteredItems.map((group) => group.match)}
            onChange={setMatchFilter}
            teams={data.teams}
            value={{ ...matchFilter, matchId: resolvedMatchId }}
          />
        </div>
      </div>
      <div className="fantasy-prediction-list">
        {filteredItems.map(({ match, predictions: matchPredictions }) => (
          <section className="fantasy-prediction-match-group" key={match.id}>
            <header className="fantasy-match-group-header">
              <div>
                <span className="eyebrow">{match.stage}</span>
                <h2>{fantasyMatchTitle(match, data.teams)}</h2>
                <p>{formatDate(match.kickoff, true)} · {formatKickoff(match.kickoff)}</p>
              </div>
            </header>
            <div className="fantasy-prediction-list">
              {matchPredictions.map(({ prediction, question }) => (
                <article className="fantasy-prediction-row" key={prediction.id}>
                  <div>
                    <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
                    <h2>{question.text}</h2>
                    <p>{answerLabel(prediction.answer)}</p>
                  </div>
                  <span className={`status status--${questionStatusClass(question.status)}`}>{question.status}</span>
                  <strong>{prediction.pointsAwarded === undefined ? "-" : prediction.pointsAwarded}/{question.points}</strong>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!resolvedMatchId && tournamentPredictions.length > 0 && (
          <section className="fantasy-prediction-match-group">
            <header className="fantasy-match-group-header">
              <div>
                <span className="eyebrow">Tournament</span>
                <h2>Tournament picks</h2>
                <p>Season-long predictions</p>
              </div>
            </header>
            <div className="fantasy-prediction-list">
              {tournamentPredictions.map(({ prediction, question }) => (
                <article className="fantasy-prediction-row" key={prediction.id}>
                  <div>
                    <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
                    <h2>{question.text}</h2>
                    <p>{answerLabel(prediction.answer)}</p>
                  </div>
                  <span className={`status status--${questionStatusClass(question.status)}`}>{question.status}</span>
                  <strong>{prediction.pointsAwarded === undefined ? "-" : prediction.pointsAwarded}/{question.points}</strong>
                </article>
              ))}
            </div>
          </section>
        )}
        {filteredItems.length === 0 && (!tournamentPredictions.length || resolvedMatchId) && <p>No predictions match this filter.</p>}
      </div>
    </div>
  );
}
