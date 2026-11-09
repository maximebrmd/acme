import { DateTime } from "effect";

import type { LocalDate } from "#shared/domain/wall-clock.ts";

/** The day a request counts toward, and when the next day's count starts. */
export interface UsageWindow {
  /** The day in UTC. */
  readonly day: LocalDate;
  /** Midnight UTC after `day`, when the daily quota starts again. */
  readonly resetsAt: DateTime.Utc;
}

/**
 * The quota's day at an instant. Days are UTC days, the same for every
 * workspace wherever its members are, so a quota never stretches across a
 * change of time zone.
 */
export const usageWindowAt = (now: DateTime.Utc): UsageWindow => {
  const { day, month, year } = DateTime.toPartsUtc(now);

  return {
    day: { day, month, year },
    resetsAt: DateTime.add(DateTime.startOf(now, "day"), { days: 1 }),
  };
};

/** How many requests are left of a daily allowance once `used` counted. */
export const remainingOf = (dailyLimit: number, used: number): number =>
  Math.max(0, dailyLimit - used);
