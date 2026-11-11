import { DateTime, Duration, Option, Schema } from "effect";

import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { partsOn } from "./post-content.ts";
import type { PostContent } from "./post-content.ts";
import { postFormatOf } from "./post-format.ts";
import type { TargetOptions } from "./target-options.ts";

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
 * the same video. The one option kept is the format, when the options
 * choose one (a story, a reel), as its public sees a story apart from a
 * feed post of the same file: a feed post, `feed` chosen or not, reads as
 * it did before formats, so the digests kept still match.
 *
 * A post of several parts is all of them, in order, each read the same
 * way: two threads that open alike and go on differently are two posts,
 * and so are a thread and its first part alone. The waits between parts
 * are left out, as the time a post goes out is. A post of one part reads
 * as it did before posts had parts, so the digests kept of earlier posts
 * (`post_targets.content_digest`) still match.
 */
export const contentOn = (
  content: PostContent,
  channelId: ChannelId,
  options: Option.Option<TargetOptions> = Option.none()
): string => {
  const [first, ...later] = partsOn(content, channelId).map((part) => ({
    media: part.media.map(({ mediaId }) => mediaId),
    text: part.text.normalize("NFC").trim(),
  }));

  const read = later.length === 0 ? first : { ...first, parts: later };

  return JSON.stringify(
    Option.match(postFormatOf(options), {
      onNone: () => read,
      onSome: (format) => ({ ...read, format }),
    })
  );
};

/** A channel that already has the content, and the post that sends it. */
export const DuplicateSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  postId: PostIdSchema,
});

export type Duplicate = typeof DuplicateSchema.Type;
