import { useFantasy } from "../app/fantasy-context";
import { fantasyMatchTitle, fantasyParticipant } from "../utils/fantasy";
import { formatKickoff } from "../utils/football";
import { PageHeading } from "./FixturesPage";

/**
 * Displays player-created polls for admin review.
 *
 * @returns Admin submitted polls page.
 */
export default function FantasyAdminSubmittedPollsPage() {
  const { data } = useFantasy();
  const submittedPolls = data.questions
    .filter((question) => question.source === "USER" || question.createdByParticipantId || question.id.startsWith("user-"))
    .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Admin" title="Submitted polls" description="Review polls created by players and see who submitted them." />
      <section className="content-section fantasy-submitted-polls">
        <div className="section-heading">
          <div><span className="eyebrow">User generated</span><h2>{submittedPolls.length} polls</h2></div>
        </div>
        <div className="fantasy-submitted-poll-list">
          {submittedPolls.map((question) => {
            const match = data.matches.find((item) => item.id === question.matchId);
            const creator = question.createdByParticipantId ? fantasyParticipant(question.createdByParticipantId, data.participants) : undefined;
            const answerCount = data.predictions.filter((prediction) => prediction.questionId === question.id).length;
            return (
              <article className="fantasy-submitted-poll" key={question.id}>
                <header>
                  <div>
                    <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
                    <h3>{question.text}</h3>
                  </div>
                  <strong>{answerCount} picks</strong>
                </header>
                <dl>
                  <div><dt>Submitted by</dt><dd>{creator?.nickname ?? "Unknown player"}</dd></div>
                  <div><dt>Match</dt><dd>{match ? fantasyMatchTitle(match, data.teams) : "Tournament poll"}</dd></div>
                  <div><dt>Status</dt><dd>{question.status}</dd></div>
                  <div><dt>Locks</dt><dd>{formatKickoff(question.closeAt)}</dd></div>
                </dl>
                {question.options.length > 0 && (
                  <div className="fantasy-draft-options">
                    {question.options.map((option) => <span key={option}>{option}</span>)}
                  </div>
                )}
                {question.type === "EXACT_SCORE" && <p>Free score answer</p>}
              </article>
            );
          })}
          {submittedPolls.length === 0 && <p>No player-submitted polls yet.</p>}
        </div>
      </section>
    </div>
  );
}
