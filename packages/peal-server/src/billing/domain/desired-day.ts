import { DateTime, Duration, Option } from "effect";

/**
 * How far ahead a cancellation may ask its contract to end: a little over
 * a year, so a yearly plan can be let run to its end and no further. A
 * later day is a mistake, as a year mistyped, and would keep the plan
 * renewing until then. The contract copies it (`desiredDayHorizonDays`).
 */
export const desiredDayHorizon = Duration.days(400);

/** Whether the day asked for, if any, is one a cancellation may ask. */
export const withinHorizon = (
  desiredAt: Option.Option<DateTime.Utc>,
  now: DateTime.Utc
): boolean =>
  !Option.exists(desiredAt, (desired) =>
    DateTime.isGreaterThan(
      desired,
      DateTime.addDuration(now, desiredDayHorizon)
    )
  );
