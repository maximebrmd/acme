import { useEffect, useState } from "react";

/**
 * The value once it has stayed the same for `delayMs`: what a search asks
 * for while the person types, so each pause asks once, never each key.
 */
export const useDebounced = <A>(value: A, delayMs: number): A => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return settled;
};
