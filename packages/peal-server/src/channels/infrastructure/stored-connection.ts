import { Option } from "effect";

/**
 * The connection a row names, in its stored form for the domain's schema to
 * check: an Instagram row written before Instagram Login names none, and
 * came through Facebook Login. Rows of other platforms name none.
 */
export const storedConnection = (
  platform: string,
  column: string | null
): Option.Option<string> =>
  Option.fromNullOr(column).pipe(
    Option.orElse(() =>
      platform === "instagram" ? Option.some("facebookLogin") : Option.none()
    )
  );
