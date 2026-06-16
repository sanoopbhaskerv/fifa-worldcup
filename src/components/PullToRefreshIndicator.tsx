import type { PullToRefreshState } from "../hooks/use-pull-to-refresh";

const labels: Record<PullToRefreshState, string> = {
  idle: "",
  pulling: "Pull to refresh",
  ready: "Release to refresh",
  refreshing: "Refreshing...",
  success: "Up to date",
};

/**
 * Renders the pull-to-refresh indicator driven by gesture state.
 *
 * @param props - Component props.
 * @param props.progress - Pull progress from `0` to `1`.
 * @param props.pullDistance - Current resisted pull distance in pixels.
 * @param props.state - Current pull-to-refresh state.
 * @returns Visual indicator for pull, release, refresh, and success states.
 */
export const PullToRefreshIndicator = ({
  progress,
  pullDistance,
  state,
}: {
  progress: number;
  pullDistance: number;
  state: PullToRefreshState;
}) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const visible = state !== "idle";
  const translateY = state === "idle" ? -60 : Math.min(pullDistance, 72);
  const arrowRotation = state === "ready" || state === "refreshing" || state === "success"
    ? 180
    : progress * 180;

  return (
    <div
      className={`pull-refresh pull-refresh--${state}`}
      style={{ transform: `translate(-50%, ${translateY - 56}px)`, opacity: visible ? 1 : 0 }}
      aria-live="polite"
      aria-label={labels[state]}
    >
      <span className="pull-refresh__icon" aria-hidden="true">
        {(state === "pulling" || state === "ready") && (
          <>
            <svg className="pull-refresh__ring" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r={radius} />
              <circle
                cx="16"
                cy="16"
                r={radius}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: dashOffset,
                }}
              />
            </svg>
            <svg className="pull-refresh__arrow" viewBox="0 0 32 32" style={{ transform: `rotate(${arrowRotation}deg)` }}>
              <path d="M16 10 L16 22 M11 17 L16 22 L21 17" />
            </svg>
          </>
        )}
        {state === "refreshing" && (
          <svg className="pull-refresh__spinner" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r={radius} />
            <circle cx="16" cy="16" r={radius} />
          </svg>
        )}
        {state === "success" && (
          <svg className="pull-refresh__success" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r={radius} />
            <path d="M11 16 L14.5 19.5 L21 13" />
          </svg>
        )}
      </span>
      <span>{labels[state]}</span>
    </div>
  );
};
