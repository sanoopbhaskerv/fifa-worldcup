import { FantasyQuestionCard } from "../features/fantasy/FantasyQuestionCard";
import { useFantasy } from "../app/fantasy-context";
import { useSubmitFantasyPrediction } from "../services/fantasy-queries";
import { fantasyDeadlineLabel, fantasyMatchTitle, fantasyPredictionForQuestion, fantasyPublishedQuestions, fantasyQuestionsForMatch } from "../utils/fantasy";
import { formatDate, formatKickoff } from "../utils/football";
import { PageHeading } from "./FixturesPage";

/**
 * Displays match and tournament prediction polls.
 *
 * @returns Polls page.
 */
export default function FantasyPollsPage() {
  const { data } = useFantasy();
  const submitPrediction = useSubmitFantasyPrediction(data.activeParticipantId);
  const tournamentQuestions = fantasyPublishedQuestions(data.questions).filter((question) => !question.matchId);
  const pollMatches = data.matches
    .map((match) => ({ match, questions: fantasyQuestionsForMatch(match.id, data.questions) }))
    .filter(({ questions }) => questions.length > 0);

  return (
    <div className="page fantasy-page">
      <PageHeading eyebrow="Prediction polls" title="Published polls" description="Answer open match polls before lock time. Drafts stay hidden until an admin publishes them." />
      <div className="fantasy-poll-groups">
        {pollMatches.length === 0 && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading">
              <div><span className="eyebrow">Setup pending</span><h2>No published polls yet</h2><p>Sync fixtures, generate drafts, then publish the polls from admin.</p></div>
            </div>
          </section>
        )}
        {pollMatches.map(({ match, questions }) => {
          return (
            <section className="content-section fantasy-poll-group" key={match.id}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{match.status}</span>
                  <h2>{fantasyMatchTitle(match, data.teams)}</h2>
                  <p>{formatDate(match.kickoff, true)} · kickoff {formatKickoff(match.kickoff)} · {fantasyDeadlineLabel(match.pollCloseAt)}</p>
                </div>
                <strong>{questions.reduce((sum, question) => sum + question.points, 0)} pts</strong>
              </div>
              <div className="fantasy-poll-list">
                {questions.map((question) => (
                  <FantasyQuestionCard
                    isSubmitting={submitPrediction.isPending && submitPrediction.variables?.questionId === question.id}
                    key={question.id}
                    onSubmit={(answer) => submitPrediction.mutate({
                      answer,
                      participantId: data.activeParticipantId,
                      questionId: question.id,
                    })}
                    prediction={fantasyPredictionForQuestion(question.id, data.activeParticipantId, data)}
                    question={question}
                  />
                ))}
              </div>
            </section>
          );
        })}
        {tournamentQuestions.length > 0 && (
          <section className="content-section fantasy-poll-group">
            <div className="section-heading"><div><span className="eyebrow">Tournament-long</span><h2>Big calls</h2><p>These lock before the tournament starts and carry higher points.</p></div></div>
            <div className="fantasy-poll-list">
              {tournamentQuestions.map((question) => (
                <FantasyQuestionCard
                  isSubmitting={submitPrediction.isPending && submitPrediction.variables?.questionId === question.id}
                  key={question.id}
                  onSubmit={(answer) => submitPrediction.mutate({
                    answer,
                    participantId: data.activeParticipantId,
                    questionId: question.id,
                  })}
                  prediction={fantasyPredictionForQuestion(question.id, data.activeParticipantId, data)}
                  question={question}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
