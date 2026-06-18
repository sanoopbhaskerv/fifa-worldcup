import { useState } from "react";
import type { FantasyPrediction, FantasyQuestion } from "../../types/fantasy";

interface FantasyQuestionCardProps {
  question: FantasyQuestion;
  prediction?: FantasyPrediction;
  isSubmitting?: boolean;
  selectedAnswer?: string;
  onAnswerChange?: (answer: string) => void;
  onSubmit?: (answer: string) => void;
}

/**
 * Renders one fantasy prediction question with local answer selection.
 *
 * @param props - Component props.
 * @param props.question - Question to render.
 * @param props.prediction - Existing prediction for the active participant.
 * @param props.isSubmitting - Whether the selected answer is being saved.
 * @param props.selectedAnswer - Optional controlled draft answer.
 * @param props.onAnswerChange - Optional controlled draft-answer handler.
 * @param props.onSubmit - Save handler for an answer selection.
 * @returns Interactive poll card.
 */
export const FantasyQuestionCard = ({
  question,
  prediction,
  isSubmitting = false,
  selectedAnswer,
  onAnswerChange,
  onSubmit,
}: FantasyQuestionCardProps) => {
  const initial = Array.isArray(prediction?.answer) ? prediction.answer[0] : prediction?.answer;
  const [localSelected, setLocalSelected] = useState(initial ?? "");
  const selected = selectedAnswer ?? localSelected;
  const locked = question.status !== "OPEN";
  const unchanged = Boolean(selected && selected === initial);
  const isExactScore = question.type === "EXACT_SCORE";
  const changeSelected = (answer: string) => {
    setLocalSelected(answer);
    onAnswerChange?.(answer);
  };

  return (
    <article className={`fantasy-poll-card fantasy-poll-card--${question.status.toLowerCase()}`}>
      <header>
        <span className="eyebrow">{question.category.replaceAll("_", " ")}</span>
        <strong>{question.points} pts</strong>
      </header>
      <h3>{question.text}</h3>
      {isExactScore ? (
        <label className="fantasy-score-input">
          Score
          <input
            disabled={locked}
            inputMode="text"
            onChange={(event) => changeSelected(event.target.value)}
            placeholder="0-0 or Brazil 3 Germany 4"
            value={selected}
          />
        </label>
      ) : (
        <div className="fantasy-options" role="group" aria-label={question.text}>
          {question.options.map((option) => (
            <button
              className={`fantasy-option ${selected === option ? "fantasy-option--selected" : ""}`}
              disabled={locked}
              key={option}
              onClick={() => changeSelected(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      <footer>
        <span>{locked ? "Locked" : unchanged ? "Saved pick" : selected ? "Draft selected" : "Open for picks"}</span>
        {onSubmit && !locked && (
          <button
            className="fantasy-save-pick"
            disabled={!selected || isSubmitting || unchanged}
            onClick={() => onSubmit(selected)}
            type="button"
          >
            {isSubmitting ? "Saving..." : unchanged ? "Saved" : "Save pick"}
          </button>
        )}
        {prediction?.pointsAwarded !== undefined && <strong>{prediction.pointsAwarded}/{question.points} pts</strong>}
      </footer>
    </article>
  );
};
