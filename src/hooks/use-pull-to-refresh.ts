import { useCallback, useEffect, useRef, useState } from "react";

export type PullToRefreshState = "idle" | "pulling" | "ready" | "refreshing" | "success";

interface UsePullToRefreshOptions {
  disabled?: boolean;
  isRefreshing: boolean;
  maxPull?: number;
  onRefresh: () => Promise<unknown>;
  successDuration?: number;
  threshold?: number;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  progress: number;
  pullDistance: number;
  state: PullToRefreshState;
}

const resistance = 0.45;
const minScrollTop = 2;

/**
 * Adds mobile pull-down detection to a scrollable container.
 *
 * @param options - Pull-to-refresh behavior and state flags.
 * @param options.disabled - Whether touch listeners should be disabled.
 * @param options.isRefreshing - Whether a refresh is already in progress.
 * @param options.maxPull - Maximum indicator travel distance in pixels.
 * @param options.onRefresh - Async callback invoked after the pull threshold is crossed.
 * @param options.successDuration - Milliseconds to show the success state before resetting.
 * @param options.threshold - Pull distance required before release triggers refresh.
 * @returns Container ref plus state needed to render the refresh affordance.
 */
export const usePullToRefresh = ({
  disabled = false,
  isRefreshing,
  maxPull = 120,
  onRefresh,
  successDuration = 700,
  threshold = 80,
}: UsePullToRefreshOptions): UsePullToRefreshReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PullToRefreshState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const stateRef = useRef<PullToRefreshState>("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Triggers a light vibration on devices that support the Vibration API.
   *
   * @param milliseconds - Vibration duration.
   * @returns Nothing; unsupported devices ignore the call.
   */
  const vibrate = (milliseconds: number) => {
    navigator.vibrate?.(milliseconds);
  };

  /**
   * Resets pull state back to idle and clears the visible distance.
   *
   * @returns Nothing; state is updated in place.
   */
  const reset = useCallback(() => {
    isPullingRef.current = false;
    setState("idle");
    setPullDistance(0);
  }, []);

  /**
   * Starts tracking a pull gesture when the scroll container is at the top.
   *
   * @param event - Native touch start event.
   * @returns Nothing; gesture state is stored in refs.
   */
  const onTouchStart = useCallback((event: TouchEvent) => {
    if (disabled || isRefreshing || stateRef.current === "refreshing") return;
    const element = containerRef.current;
    const firstTouch = event.touches[0];
    if (!element || !firstTouch || element.scrollTop > minScrollTop) return;

    startYRef.current = firstTouch.clientY;
    isPullingRef.current = true;
  }, [disabled, isRefreshing]);

  /**
   * Updates pull distance and readiness while the user drags downward.
   *
   * @param event - Native touch move event.
   * @returns Nothing; state updates drive the indicator UI.
   */
  const onTouchMove = useCallback((event: TouchEvent) => {
    if (!isPullingRef.current || disabled) return;
    const element = containerRef.current;
    const firstTouch = event.touches[0];
    if (!element || !firstTouch) return;

    if (element.scrollTop > minScrollTop) {
      reset();
      return;
    }

    const deltaY = firstTouch.clientY - startYRef.current;
    if (deltaY <= 0) {
      setPullDistance(0);
      setState("idle");
      return;
    }

    event.preventDefault();

    const nextDistance = Math.min(deltaY * resistance, maxPull);
    const isNowReady = nextDistance >= threshold;
    const wasReady = stateRef.current === "ready";

    setPullDistance(nextDistance);
    if (isNowReady && !wasReady) {
      vibrate(25);
      setState("ready");
    } else if (!isNowReady && stateRef.current !== "pulling") {
      vibrate(10);
      setState("pulling");
    }
  }, [disabled, maxPull, reset, threshold]);

  /**
   * Finishes the pull gesture and runs refresh when the threshold was crossed.
   *
   * @returns Promise that resolves after the refresh handling completes.
   */
  const onTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;
    isPullingRef.current = false;

    if (stateRef.current !== "ready") {
      reset();
      return;
    }

    setState("refreshing");
    setPullDistance(threshold);

    try {
      await onRefresh();
      setState("success");
      vibrate(25);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(reset, successDuration);
    } catch {
      reset();
    }
  }, [disabled, onRefresh, reset, successDuration, threshold]);

  /**
   * Cancels a pull gesture without triggering refresh.
   *
   * @returns Nothing; resets gesture state.
   */
  const onTouchCancel = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || disabled) return undefined;

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    element.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchCancel);
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, [disabled, onTouchCancel, onTouchEnd, onTouchMove, onTouchStart]);

  return {
    containerRef,
    progress: Math.min(pullDistance / threshold, 1),
    pullDistance,
    state,
  };
};
