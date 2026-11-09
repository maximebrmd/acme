import { Config, Schema } from "effect";

/**
 * What a Google Cloud project may spend a day on uploads, in units of the
 * YouTube Data API's Video Uploads quota bucket, where videos.insert costs
 * one: 100 by default. A project granted more says so here.
 */
export const defaultDailyUploads = 100;

/**
 * `YOUTUBE_DAILY_UPLOADS`: the units of the Video Uploads bucket this
 * server spends a day, across every channel; 0 uploads nothing. A value
 * that is not a whole number stops the server.
 */
export const youtubeDailyUploadsConfig = Config.schema(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  "YOUTUBE_DAILY_UPLOADS"
).pipe(Config.withDefault(defaultDailyUploads));
