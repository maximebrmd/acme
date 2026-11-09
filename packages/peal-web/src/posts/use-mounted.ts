import { useSyncExternalStore } from "react";

const subscribe = () => () => {
  // The value never changes once mounted.
};

/**
 * Whether the component runs in the browser, after hydration. What depends
 * on the browser (its time zone, the current time) renders then, so the
 * server's HTML and the first client render agree.
 */
export const useMounted = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
