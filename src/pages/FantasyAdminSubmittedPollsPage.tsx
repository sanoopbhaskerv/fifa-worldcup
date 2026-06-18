import { useFantasy } from "../app/fantasy-context";
import { fantasyMatchTitle, fantasyParticipant } from "../utils/fantasy";
import { formatKickoff } from "../utils/football";
import { PageHeading } from "./FixturesPage";

const answerLabel = (answer: string | string[]) => Array.isArray(answer) ? answer.join(", ") : answer;

/**
 * Displays poll response coverage for admin follow-up.
 *
 * @returns Admin poll response page.
 */
export default function FantasyAdminSubmittedPollsPage() {
  const { data } = useFantasy();
  const visibleQuestions = data.questions
    .filter((question) => question.status !== "DRAFT")
    .sort((left, right) => (left.closeAt || "").localeCompare(right.closeAt || ""));

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Poll responses" description="See who answered each poll and who is still pending so you can follow up." />
      <section className="content-section fantasy-submitted-polls">
        <div className="section-heading">
          <div><span className="eyebrow">Coverage</span><h2>{visibleQuestions.length} polls</h2></div>
        </div>
        <div className="fantasy-submitted-poll-list">
          {visibleQuestions.map((question) => {
            const match = data.matches.find((item) => item.id === question.matchId);
            const responses = data.predictions
              .filter((prediction) => prediction.questionId === question.id)
              .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
            const answeredIds = new Set(responses.map((prediction) => prediction.participantId));
            const pending = data.participants.filter((participant) => !answeredIds.has(participant.id));
            return (
              <article className="fantasy-submitted-poll" key={question.id}>
                <header>
                  <div>
                    <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
                    <h3>{question.text}</h3>
                    <p>{match ? fantasyMatchTitle(match, data.teams) : "Tournament poll"} · locks {formatKickoff(question.closeAt)}</p>
                  </div>
                  <strong>{responses.length}/{data.participants.length}</strong>
                </header>
                <div className="fantasy-response-columns">
                  <section>
                    <h4>Answered</h4>
                    {responses.map((prediction) => {
                      const participant = fantasyParticipant(prediction.participantId, data.participants);
                      return (
                        <div className="fantasy-response-row" key={prediction.id}>
                          <span>{participant?.avatar ?? participant?.nickname.slice(0, 2).toUpperCase() ?? "P"}</span>
                          <div>
                            <strong>{participant?.nickname ?? prediction.participantId}</strong>
                            <small>{answerLabel(prediction.answer)} · {formatKickoff(prediction.submittedAt)}</small>
                          </div>
                        </div>
                      );
                    })}
                    {responses.length === 0 && <p>No answers yet.</p>}
                  </section>
                  <section>
                    <h4>Pending</h4>
                    {pending.map((participant) => (
                      <div className="fantasy-response-row fantasy-response-row--pending" key={participant.id}>
                        <span>{participant.avatar ?? participant.nickname.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{participant.nickname}</strong>
                          <small>{participant.email ?? participant.phone ?? participant.id}</small>
                        </div>
                      </div>
                    ))}
                    {pending.length === 0 && <p>Everyone has answered.</p>}
                  </section>
                </div>
              </article>
            );
          })}
          {visibleQuestions.length === 0 && <p>No published polls yet.</p>}
        </div>
      </section>
    </div>
  );
}
