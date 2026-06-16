import type { PullToRefreshState } from "../hooks/use-pull-to-refresh";

const labels: Record<PullToRefreshState, string> = {
  idle: "Pull to refresh",
  pulling: "Pull to refresh",
  ready: "Release to refresh",
  refreshing: "Updating...",
  success: "Up to date",
};

/**
 * Renders the pull-to-refresh indicator driven by gesture state.
 *
 * @param props - Component props.
 * @param props.progress - Pull progress from `0` to `1`.
 * @param props.state - Current pull-to-refresh state.
 * @returns Visual indicator for pull, release, refresh, and success states.
 */
export const PullToRefreshIndicator = ({
  progress,
  state,
}: {
  progress: number;
  state: PullToRefreshState;
}) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const isPulling = state === "pulling" || state === "ready";
  const isLocked = state === "refreshing" || state === "success";
  const isComplete = state === "ready" || state === "success";
  const visible = state !== "idle";
  const arrowRotation = state === "ready" || state === "refreshing" || state === "success"
    ? 180
    : progress * 180;

  return (
    <div
      className={`pull-refresh pull-refresh--${state} ${visible ? "pull-refresh--visible" : ""} ${isLocked ? "pull-refresh--locked" : ""}`}
      aria-live="polite"
      aria-label={labels[state]}
    >
      <span className="pull-refresh__icon" aria-hidden="true">
        <svg viewBox="0 0 34 34">
          <circle className="pull-refresh__track" cx="17" cy="17" r={radius} />
          <circle
            className="pull-refresh__progress"
            cx="17"
            cy="17"
            r={radius}
            style={{
              opacity: isPulling ? 1 : 0,
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
            }}
          />
          <g className="pull-refresh__arrow" style={{ opacity: isPulling ? 1 : 0, transform: `rotate(${arrowRotation}deg)` }}>
            <path d="M17 11 L17 23 M12 18 L17 23 L22 18" />
          </g>
          <circle className="pull-refresh__spin-arc" cx="17" cy="17" r={radius} style={{ opacity: state === "refreshing" ? 1 : 0 }} />
          <g className="pull-refresh__check" style={{ opacity: state === "success" ? 1 : 0 }}>
            <circle cx="17" cy="17" r={radius} />
            <path d="M11 17 L15 21 L23 13" />
          </g>
        </svg>
      </span>
      <span className={`pull-refresh__label ${isComplete ? "pull-refresh__label--complete" : ""}`}>{labels[state]}</span>
    </div>
  );
};
