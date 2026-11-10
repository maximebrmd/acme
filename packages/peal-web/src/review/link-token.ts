import { Option } from "effect";

const decoded = Option.liftThrowable(decodeURIComponent);

/**
 * A review link's token, from the fragment of its address (`#token`).
 * A fragment that is not a well-formed address component, as one cut short
 * in a message, is taken as it is: it opens nothing, and the page says the
 * link was not found rather than failing.
 */
export const tokenOfFragment = (fragment: string): string => {
  const raw = fragment.startsWith("#") ? fragment.slice(1) : fragment;

  return decoded(raw).pipe(Option.getOrElse(() => raw));
};
