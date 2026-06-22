import { useState } from "react";
import { useFantasy } from "../../app/fantasy-context";
import { FantasyQuestionCard } from "./FantasyQuestionCard";
import { CollapsibleMatchGroup, type ChipDef } from "./CollapsibleMatchGroup";
import { useSubmitFantasyPrediction, useSubmitFantasyPredictions } from "../../services/fantasy-queries";
import {
  fantasyMatchTitle,
  fantasyPredictionForQuestion,
  fantasyQuestionIsLocked,
} from "../../utils/fantasy";
import type { FantasyMatch, FantasyQuestion } from "../../types/fantasy";

// ── Chip derivation for poll groups ──────────────────────────────────────────
function usePollGroupChips(match: FantasyMatch, questions: FantasyQuestion[]): ChipDef[] {
  const { data } = useFantasy();
  const participantId = data.activeParticipantId;

  const predictions = questions.map((q) => fantasyPredictionForQuestion(q.id, participantId, data));
  const answeredCount = predictions.filter((p) => p?.answer != null).length;
  const scoredPredictions = predictions.filter((p) => p?.pointsAwarded !== undefined);
  const earnedPts = scoredPredictions.reduce((sum, p) => sum + (p?.pointsAwarded ?? 0), 0);
  const totalPts = questions.reduce((sum, q) => sum + q.points, 0);
  const hasResult = data.results.some((r) => r.matchId === match.id);
  const isScored = scoredPredictions.length > 0;
  const allAnswered = answeredCount === questions.length && questions.length > 0;
  const anyOpenUnlocked = questions.some((q) => !fantasyQuestionIsLocked(q, data));

  const chips: ChipDef[] = [];

  if (match.status === "COMPLETED") chips.push({ label: "Completed", variant: hasResult ? "success" : "warning" });
  else if (match.status === "LOCKED") chips.push({ label: "Live", variant: "warning" });
  else if (anyOpenUnlocked) chips.push({ label: "Open", variant: "default" });
  else chips.push({ label: "Locked", variant: "muted" });

  if (hasResult) chips.push({ label: "Result published", variant: "success" });

  if (isScored) {
    chips.push({ label: `${earnedPts}/${totalPts} pts`, variant: earnedPts > 0 ? "success" : "muted" });
  } else {
    chips.push({
      label: allAnswered ? `All answered · ${totalPts} pts` : `${answeredCount}/${questions.length} answered`,
      variant: allAnswered ? "success" : anyOpenUnlocked ? "warning" : "muted",
    });
  }

  return chips;
}

// ── Main component ─────────────────────────────────────────────────────────────
interface MatchPollGroupProps {
  match: FantasyMatch;
  questions: FantasyQuestion[];
  /** Optional label override for the eyebrow (defaults to match stage) */
  eyebrow?: string;
  /** Optional heading override (defaults to match title) */
  heading?: string;
  /** Optional subheading (defaults to kickoff + deadline line) */
  subheading?: string;
}

export function MatchPollGroup({
  match,
  questions,
  eyebrow,
  heading,
  subheading,
}: MatchPollGroupProps) {
  const { data } = useFantasy();
  const participantId = data.activeParticipantId;

  const submitPrediction = useSubmitFantasyPrediction(participantId);
  const submitPredictions = useSubmitFantasyPredictions(participantId);

  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});

  const chips = usePollGroupChips(match, questions);
  const anyOpenUnlocked = questions.some((q) => !fantasyQuestionIsLocked(q, data));

  // Auto-expand: open if there are unanswered open questions
  const hasUnanswered = questions.some((q) => {
    const pred = fantasyPredictionForQuestion(q.id, participantId, data);
    return !fantasyQuestionIsLocked(q, data) && !pred?.answer;
  });

  const initialAnswer = (q: FantasyQuestion) => {
    const pred = fantasyPredictionForQuestion(q.id, participantId, data);
    return Array.isArray(pred?.answer) ? pred.answer[0] : pred?.answer ?? "";
  };
  const selectedAnswer = (q: FantasyQuestion) => draftAnswers[q.id] ?? initialAnswer(q);

  const changedAnswers = questions
    .filter((q) => !fantasyQuestionIsLocked(q, data))
    .map((q) => ({
      questionId: q.id,
      answer: selectedAnswer(q).trim(),
      initial: initialAnswer(q),
    }))
    .filter(({ answer, initial }) => answer.length > 0 && answer !== initial);

  const clearDrafts = (ids: string[]) =>
    setDraftAnswers((cur) => Object.fromEntries(Object.entries(cur).filter(([id]) => !ids.includes(id))));

  const saveChanged = () => {
    if (changedAnswers.length === 0) return;
    submitPredictions.mutate(
      { participantId, predictions: changedAnswers.map(({ answer, questionId }) => ({ answer, questionId })) },
      { onSuccess: () => clearDrafts(changedAnswers.map(({ questionId }) => questionId)) },
    );
  };

  const bulkLabel =
    submitPredictions.isPending ? "Saving…" : changedAnswers.length > 0 ? `Save ${changedAnswers.length} changed` : "All saved";

  const totalPts = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <CollapsibleMatchGroup
      match={match}
      chips={chips}
      eyebrow={eyebrow}
      heading={heading ?? fantasyMatchTitle(match, data.teams)}
      subheading={subheading}
      defaultExpanded={hasUnanswered}
    >
      {anyOpenUnlocked && (
        <div className="fantasy-poll-actions fantasy-poll-actions--top">
          <strong>{totalPts} pts</strong>
          <button disabled={submitPredictions.isPending || changedAnswers.length === 0} onClick={saveChanged} type="button">
            {bulkLabel}
          </button>
        </div>
      )}

      <div className="fantasy-poll-list">
        {questions.map((q) => (
          <FantasyQuestionCard
            key={q.id}
            isSubmitting={submitPrediction.isPending && submitPrediction.variables?.questionId === q.id}
            isLocked={fantasyQuestionIsLocked(q, data)}
            onAnswerChange={(answer) => setDraftAnswers((cur) => ({ ...cur, [q.id]: answer }))}
            onSubmit={(answer) =>
              submitPrediction.mutate(
                { answer, participantId, questionId: q.id },
                { onSuccess: () => clearDrafts([q.id]) },
              )
            }
            prediction={fantasyPredictionForQuestion(q.id, participantId, data)}
            question={q}
            selectedAnswer={selectedAnswer(q)}
          />
        ))}
      </div>

      {anyOpenUnlocked && (
        <div className="fantasy-poll-actions fantasy-poll-actions--bottom">
          <strong>{changedAnswers.length > 0 ? `${changedAnswers.length} changed` : "All saved"}</strong>
          <button disabled={submitPredictions.isPending || changedAnswers.length === 0} onClick={saveChanged} type="button">
            {bulkLabel}
          </button>
        </div>
      )}
    </CollapsibleMatchGroup>
  );
}
