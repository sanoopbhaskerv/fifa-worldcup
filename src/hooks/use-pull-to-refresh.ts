import { useEffect, useRef, useState } from "react";

const threshold = 72;
const maxPull = 118;

export const usePullToRefresh = ({
  disabled,
  isRefreshing,
  onRefresh,
}: {
  disabled?: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<unknown>;
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = useRef(0);

  const updatePullDistance = (distance: number) => {
    pullDistanceRef.current = distance;
    setPullDistance(distance);
  };

  useEffect(() => {
    if (disabled) return undefined;

    let startY = 0;
    let pulling = false;

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || isRefreshing) return;
      startY = event.touches[0]?.clientY ?? 0;
      pulling = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pulling) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const distance = currentY - startY;
      if (distance <= 0) {
        updatePullDistance(0);
        return;
      }
      updatePullDistance(Math.min(maxPull, distance * 0.55));
    };

    const onTouchEnd = () => {
      if (!pulling) return;
      pulling = false;
      const shouldRefresh = pullDistanceRef.current >= threshold;
      updatePullDistance(0);
      if (shouldRefresh) void onRefresh();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, isRefreshing, onRefresh]);

  return {
    pullDistance,
    ready: pullDistance >= threshold,
  };
};
