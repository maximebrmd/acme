import { DateTime } from "effect";
import type { Duration } from "effect";

import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  addDays,
  fromWallClock,
  localDateOf,
} from "#shared/domain/wall-clock.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

// The YouTube Data API's quotas reset at midnight Pacific Time.
const pacific = TimeZoneIdSchema.make("America/Los_Angeles");

/** The day YouTube counts `now` in, Pacific Time. */
export const quotaDayOf = (now: DateTime.Utc): LocalDate =>
  localDateOf(now, pacific);

/** How long until YouTube's quotas reset after `now`: next Pacific midnight. */
export const untilQuotaReset = (now: DateTime.Utc): Duration.Duration =>
  DateTime.distance(
    now,
    DateTime.toUtc(
      fromWallClock(
        addDays(quotaDayOf(now), 1),
        { hour: 0, minute: 0 },
        pacific
      )
    )
  );
