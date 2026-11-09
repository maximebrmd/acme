import { useEffect } from "react";

/**
 * Calls `refresh` every `intervalMillis` while the page is visible, and as
 * soon as it becomes visible again: a hidden tab asks nothing.
 */
export const useRefreshWhileVisible = (
  refresh: () => void,
  intervalMillis: number
): void => {
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const timer = window.setInterval(refreshIfVisible, intervalMillis);

    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refresh, intervalMillis]);
};
