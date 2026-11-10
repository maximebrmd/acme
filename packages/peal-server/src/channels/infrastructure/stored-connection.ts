import { Option } from "effect";

// What a row without a connection came through, on the platforms that have
// several ways in: as `connectionOf` in the shared kernel.
const first = new Map([
  ["instagram", "facebookLogin"],
  ["linkedin", "linkedinProfile"],
]);

/**
 * The connection a row names, in its stored form for the domain's schema to
 * check: an Instagram row written before Instagram Login names none, and
 * came through Facebook Login, as a LinkedIn row written before pages is a
 * member's profile. Rows of other platforms name none.
 */
export const storedConnection = (
  platform: string,
  column: string | null
): Option.Option<string> =>
  Option.fromNullOr(column).pipe(
    Option.orElse(() => Option.fromUndefinedOr(first.get(platform)))
  );
