import { DateTime, Duration, Option } from "effect";
import { Headers } from "effect/http";

// Platforms say when to try again in one of three ways:
//
// - `Retry-After`: seconds to wait, or an HTTP date (RFC 9110).
// - A reset time: `X-RateLimit-Reset` on Mastodon, an ISO 8601 timestamp;
//   `RateLimit-Reset` on AT Protocol servers, epoch seconds.
// - The IETF draft's `RateLimit-Reset`, seconds from now.
//
// Values above this are epoch seconds rather than a wait: a billion seconds
// is more than 31 years.
const epochSecondsFrom = 1_000_000_000;

const numberPattern = /^\d+(?:\.\d+)?$/u;

// A wait in seconds, an instant in epoch seconds, or a date.
const untilValue = (
  value: string,
  now: DateTime.Utc
): Option.Option<Duration.Duration> => {
  const trimmed = value.trim();

  if (numberPattern.test(trimmed)) {
    const seconds = Number(trimmed);

    return Option.some(
      seconds >= epochSecondsFrom
        ? DateTime.distance(now, DateTime.makeUnsafe(seconds * 1000))
        : Duration.seconds(seconds)
    );
  }

  return DateTime.make(trimmed).pipe(
    Option.map((at) => DateTime.distance(now, DateTime.toUtc(at)))
  );
};

/**
 * How long the platform asked to wait before trying again, from its answer's
 * headers, if it said: `Retry-After` first, then a rate limit's reset time.
 * A time already past is no wait.
 */
export const retryAfterOf = (
  headers: Headers.Headers,
  now: DateTime.Utc
): Option.Option<Duration.Duration> => {
  for (const name of ["retry-after", "x-ratelimit-reset", "ratelimit-reset"]) {
    const wait = Headers.get(headers, name).pipe(
      Option.flatMap((value) => untilValue(value, now))
    );

    if (Option.isSome(wait)) {
      return Option.some(Duration.max(wait.value, Duration.zero));
    }
  }

  return Option.none();
};
