import { useState, useEffect, useRef } from "react";

/**
 * Hook that ensures loading state is shown for a minimum duration
 * to prevent UI flickering on fast operations.
 *
 * @param isLoading - The actual loading state
 * @param minDuration - Minimum time in ms to show loading (default: 300ms)
 * @returns The delayed loading state that respects minimum duration
 */
export function useMinimumLoadingTime(
  isLoading: boolean,
  minDuration: number = 300
): boolean {
  const [showLoading, setShowLoading] = useState(isLoading);
  const loadingStartTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Loading started
      loadingStartTime.current = Date.now();
      setShowLoading(true);

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else if (loadingStartTime.current !== null) {
      // Loading finished - check if minimum duration has passed
      const elapsed = Date.now() - loadingStartTime.current;
      const remaining = minDuration - elapsed;

      if (remaining > 0) {
        // Wait for remaining time before hiding
        timeoutRef.current = setTimeout(() => {
          setShowLoading(false);
          loadingStartTime.current = null;
        }, remaining);
      } else {
        // Minimum duration already passed
        setShowLoading(false);
        loadingStartTime.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, minDuration]);

  return showLoading;
}
