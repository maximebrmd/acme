import { useSyncExternalStore } from "react";

const subscribe = () => () => {
  // Nothing changes once hydrated.
};

/**
 * False on the server and while the page hydrates, true after: for content
 * that only the browser can fetch, such as queries made with the visitor's
 * cookies, so the server and the first browser render agree.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
