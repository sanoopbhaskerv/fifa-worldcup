import { useFantasy } from "../app/fantasy-context";
import { fantasyMatchTitle } from "../utils/fantasy";
import { PageHeading } from "../components/PageSections";

/**
 * Displays the active participant's submitted predictions.
 *
 * @returns My predictions page.
 */
export default function FantasyPredictionsPage() {
  const { data } = useFantasy();
  const predictions = data.predictions.filter((prediction) => prediction.participantId === data.activeParticipantId);

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="My picks" title="Predictions" description="Open answers can still change in the real backend until the poll locks. Locked and scored answers stay visible." />
      <section className="fantasy-prediction-list">
        {predictions.map((prediction) => {
          const question = data.questions.find((item) => item.id === prediction.questionId);
          const match = question?.matchId ? data.matches.find((item) => item.id === question.matchId) : undefined;
          if (!question) return null;
          return (
            <article className="fantasy-prediction-row" key={prediction.id}>
              <div>
                <span className="eyebrow">{match ? fantasyMatchTitle(match, data.teams) : "Tournament"}</span>
                <h2>{question.text}</h2>
                <p>{Array.isArray(prediction.answer) ? prediction.answer.join(", ") : prediction.answer}</p>
              </div>
              <span className={`status status--${question.status === "OPEN" ? "upcoming" : question.status === "SCORED" ? "completed" : "postponed"}`}>{question.status}</span>
              <strong>{prediction.pointsAwarded === undefined ? "-" : prediction.pointsAwarded}/{question.points}</strong>
            </article>
          );
        })}
      </section>
    </div>
  );
}
