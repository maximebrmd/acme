import { Config, Schema } from "effect";

/** What a workspace reads on X a UTC day unless the operator says. */
export const defaultXDailyReads = 500;

/**
 * `X_ANALYTICS_DAILY_READS`: the posts and accounts each workspace may read
 * on X a UTC day, 500 unless set; 0 reads nothing. One read again the same
 * day is not counted twice, as X bills it once. Anything but a whole
 * number, never negative, stops the server.
 */
export const xDailyReadsConfig = Config.schema(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  "X_ANALYTICS_DAILY_READS"
).pipe(Config.withDefault(defaultXDailyReads));
