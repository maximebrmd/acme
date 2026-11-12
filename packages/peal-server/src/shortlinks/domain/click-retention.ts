import { DateTime } from "effect";

import { clickDayOf } from "./click-range.ts";

/**
 * How many days a short link's daily click counts are kept: 400, as a
 * workspace's usage days, so a month compares with the same month a year
 * before.
 */
export const clickRetentionDays = 400;

/** At `now`, the counts of the days before this one are deleted. */
export const clickCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtract(clickDayOf(now), { days: clickRetentionDays });
