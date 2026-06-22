import { useState } from "react";
import { useFantasy } from "../../app/fantasy-context";
import { FantasyQuestionCard } from "./FantasyQuestionCard";
import { useSubmitFantasyPrediction, useSubmitFantasyPredictions } from "../../services/fantasy-queries";
import {
  fantasyDeadlineLabel,
  fantasyMatchTitle,
  fantasyPredictionForQuestion,
  fantasyQuestionIsLocked,
} from "../../utils/fantasy";
import { formatDate, formatKickoff } from "../../utils/football";
import type { FantasyMatch, FantasyQuestion } from "../../types/fantasy";

// ── Chevron icon ──────────────────────────────────────────────────────────────
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      width: 16,
      height: 16,
      flexShrink: 0,
      transition: "transform 0.2s ease",
      transform: open ? "rotate(180deg)" : "rotate(0deg)",
    }}
  >
    <polyline points="4 6 8 10 12 6" />
  </svg>
);

// ── Summary chips ─────────────────────────────────────────────────────────────
interface SummaryChipProps {
  label: string;
  variant?: "default" | "success" | "warning" | "muted";
}

const SummaryChip = ({ label, variant = "default" }: SummaryChipProps) => (
  <span className={`poll-group-chip poll-group-chip--${variant}`}>{label}</span>
);

// ── Per-group summary computed from data ──────────────────────────────────────
function useGroupSummary(match: FantasyMatch, questions: FantasyQuestion[]) {
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

  return { answeredCount, earnedPts, totalPts, hasResult, isScored, allAnswered, anyOpenUnlocked };
}

function GroupSummaryChips({
  match,
  questions,
}: {
  match: FantasyMatch;
  questions: FantasyQuestion[];
}) {
  const { answeredCount, earnedPts, totalPts, hasResult, isScored, allAnswered, anyOpenUnlocked } =
    useGroupSummary(match, questions);

  return (
    <div className="poll-group-chips">
      {/* Match status */}
      {match.status === "COMPLETED" && (
        <SummaryChip label="Completed" variant={hasResult ? "success" : "warning"} />
      )}
      {match.status === "LOCKED" && <SummaryChip label="Live" variant="warning" />}
      {match.status === "SCHEDULED" && anyOpenUnlocked && (
        <SummaryChip label="Open" variant="default" />
      )}
      {match.status === "SCHEDULED" && !anyOpenUnlocked && (
        <SummaryChip label="Locked" variant="muted" />
      )}

      {/* Result published */}
      {hasResult && <SummaryChip label="Result published" variant="success" />}

      {/* Points / answered */}
      {isScored ? (
        <SummaryChip
          label={`${earnedPts}/${totalPts} pts`}
          variant={earnedPts > 0 ? "success" : "muted"}
        />
      ) : (
        <SummaryChip
          label={allAnswered ? `All answered · ${totalPts} pts` : `${answeredCount}/${questions.length} answered`}
          variant={allAnswered ? "success" : anyOpenUnlocked ? "warning" : "muted"}
        />
      )}
    </div>
  );
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

  const { anyOpenUnlocked } = useGroupSummary(match, questions);

  // Auto-expand: open if there are unanswered open questions
  const hasUnanswered = questions.some((q) => {
    const pred = fantasyPredictionForQuestion(q.id, participantId, data);
    return !fantasyQuestionIsLocked(q, data) && !pred?.answer;
  });
  const [expanded, setExpanded] = useState(hasUnanswered);

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
    <section className="content-section fantasy-poll-group">
      {/* ── Collapsible header ── */}
      <button
        className="poll-group-toggle"
        onClick={() => setExpanded((v) => !v)}
        type="button"
        aria-expanded={expanded}
      >
        <div className="poll-group-toggle__meta">
          <span className="eyebrow">{eyebrow ?? match.stage}</span>
          <h2>{heading ?? fantasyMatchTitle(match, data.teams)}</h2>
          <p className="poll-group-toggle__sub">
            {subheading ?? `${formatDate(match.kickoff, true)} · kickoff ${formatKickoff(match.kickoff)} · ${fantasyDeadlineLabel(match.pollCloseAt)}`}
          </p>
        </div>

        <div className="poll-group-toggle__right">
          {/* Always show chips when collapsed; hide when expanded to keep header clean */}
          <GroupSummaryChips match={match} questions={questions} />
          <ChevronIcon open={expanded} />
        </div>
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <>
          {/* Top save row */}
          <div className="fantasy-poll-actions fantasy-poll-actions--top">
            <strong>{totalPts} pts</strong>
            {anyOpenUnlocked && (
              <button disabled={submitPredictions.isPending || changedAnswers.length === 0} onClick={saveChanged} type="button">
                {bulkLabel}
              </button>
            )}
          </div>

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

          {/* Bottom save row */}
          {anyOpenUnlocked && (
            <div className="fantasy-poll-actions fantasy-poll-actions--bottom">
              <strong>{changedAnswers.length > 0 ? `${changedAnswers.length} changed` : "All saved"}</strong>
              <button disabled={submitPredictions.isPending || changedAnswers.length === 0} onClick={saveChanged} type="button">
                {bulkLabel}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
