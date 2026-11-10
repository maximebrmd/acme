import { DateTime, Duration } from "effect";

/**
 * How long a day of an ad's numbers is kept: 13 months, so a month can be
 * compared with the same one a year before. The data-processing registry
 * (`adInsights`) and the privacy policy's table state it: change them
 * together.
 */
export const insightRetention = Duration.days(396);

/** Days before this instant are deleted. */
export const insightCutoff = (now: DateTime.Utc): DateTime.Utc =>
  DateTime.subtractDuration(now, insightRetention);

/**
 * How far back the first sync of an account reads, and how far each later
 * one reads again, as networks correct recent days for some time.
 */
export const firstSyncDays = 90;
export const resyncDays = 7;
