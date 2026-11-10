import { DateTime, Duration, Schema } from "effect";

import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { textOn } from "./post-content.ts";
import type { PostContent } from "./post-content.ts";

/**
 * How close two posts with the same content on one channel must be, by the
 * times they go out, for the second to be taken for a mistake: less than
 * 23 hours, the shortest day a time zone has. A post that repeats every
 * day at the same local time is never closer, even the day the clocks go
 * forward.
 */
export const duplicateWindow = Duration.hours(23);

/** The times a post at `at` must stay clear of, both ends excluded. */
export const duplicateRange = (at: DateTime.Utc) => ({
  after: DateTime.subtractDuration(at, duplicateWindow),
  before: DateTime.addDuration(at, duplicateWindow),
});

/**
 * What a channel receives of a post, in a form that is the same whenever
 * its public would see the same post: the text it has there, without the
 * spaces around it and in one Unicode form, and its media, in order. Alt
 * text and options are left out: the same video under another title is
 * the same video.
 */
export const contentOn = (content: PostContent, channelId: ChannelId): string =>
  JSON.stringify({
    media: content.media.map(({ mediaId }) => mediaId),
    text: textOn(content, channelId).normalize("NFC").trim(),
  });

/** A channel that already has the content, and the post that sends it. */
export const DuplicateSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  postId: PostIdSchema,
});

export type Duplicate = typeof DuplicateSchema.Type;
