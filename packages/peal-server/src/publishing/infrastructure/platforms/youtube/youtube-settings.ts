import { Config, Schema } from "effect";

/**
 * What a Google Cloud project may spend a day on uploads, in units of the
 * YouTube Data API's Video Uploads quota bucket, where videos.insert costs
 * one: 100 by default. A project granted more says so here.
 */
export const defaultDailyUploads = 100;

/**
 * How many custom thumbnails the server sets a day: 100 by default. Each
 * thumbnails.set costs about 50 units of the project's general quota
 * (10,000 a day by default, "approximately 50 units", read 2026-11-11), so
 * the default spends half of it and leaves lookups and polls theirs.
 */
export const defaultDailyThumbnails = 100;

/**
 * `YOUTUBE_DAILY_THUMBNAILS`: the thumbnails this server sets a day,
 * across every channel, by Pacific day; 0 sets none, and a video is then
 * published without the thumbnail its options name. A value that is not a
 * whole number stops the server.
 */
export const youtubeDailyThumbnailsConfig = Config.schema(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  "YOUTUBE_DAILY_THUMBNAILS"
).pipe(Config.withDefault(defaultDailyThumbnails));

/**
 * `YOUTUBE_DAILY_UPLOADS`: the units of the Video Uploads bucket this
 * server spends a day, across every channel; 0 uploads nothing. A value
 * that is not a whole number stops the server.
 */
export const youtubeDailyUploadsConfig = Config.schema(
  Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  "YOUTUBE_DAILY_UPLOADS"
).pipe(Config.withDefault(defaultDailyUploads));
