import { Config, DateTime, Effect, Option } from "effect";
import { Flag } from "effect/cli";

import { Refused } from "#refused.ts";

// The zone a time is chosen in: the flag, then TZ, then this machine's,
// which Intl answers (UTC where it knows none).
export const timeZoneFlag = Flag.String("time-zone").pipe(
  Flag.withAlias("zone"),
  Flag.withMetavar("<zone>"),
  Flag.withDescription(
    "The IANA time zone the time is chosen in, such as Europe/Paris: calendars show the post in it, and an --at without an offset is read in it. Defaults to TZ, then to this machine's zone, which is UTC where it has none."
  ),
  Flag.withFallbackConfig(Config.String("TZ")),
  Flag.withDefault(DateTime.zoneToString(DateTime.zoneMakeLocal()))
);

const atDescription =
  "When it goes out: an instant with its offset, such as 2026-11-20T09:00:00Z or 2026-11-20T10:00:00+01:00, or a local time without one, such as 2026-11-20T10:00, read in --time-zone.";

export const atFlag = Flag.String("at").pipe(
  Flag.withMetavar("<instant>"),
  Flag.withDescription(atDescription)
);

const withOffset =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/u;

const wallClock = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/u;

/**
 * The instant `--at` names. A local time is read in `zone`; one the clocks
 * skip or repeat there is refused rather than guessed, as a post goes out
 * once, at a time its author chose.
 */
export const instantOf = (
  given: string,
  zone: string
): Effect.Effect<DateTime.Utc, Refused> => {
  if (withOffset.test(given)) {
    return Option.match(DateTime.make(given), {
      onNone: () =>
        Effect.fail(new Refused({ reason: `--at ${given} is not a time.` })),
      onSome: (at) => Effect.succeed(DateTime.toUtc(at)),
    });
  }

  if (!wallClock.test(given)) {
    return Effect.fail(
      new Refused({
        reason: `--at takes an instant with its offset, such as 2026-11-20T09:00:00Z, or a local time such as 2026-11-20T10:00, read in --time-zone: not ${given}.`,
      })
    );
  }

  if (Option.isNone(DateTime.zoneMakeNamed(zone))) {
    return Effect.fail(
      new Refused({
        reason: `${zone} is not a time zone this machine knows: give an IANA zone, such as Europe/Paris, with --time-zone.`,
      })
    );
  }

  // The wall-clock time, written as UTC, then read as the zone's own.
  return Option.match(
    DateTime.makeZoned(`${given}Z`, {
      adjustForTimeZone: true,
      disambiguation: "reject",
      timeZone: zone,
    }),
    {
      onNone: () =>
        Effect.fail(
          new Refused({
            reason: `${given} is not a time in ${zone}, or the clocks skip or repeat it there: give an instant with its offset instead.`,
          })
        ),
      onSome: (at) => Effect.succeed(DateTime.toUtc(at)),
    }
  );
};
