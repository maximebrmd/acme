import { Schema } from "effect";

import { MediaAttachment } from "./media-attachment.ts";
import { PostTextSchema } from "./post-text.ts";
import { TextOverride } from "./text-override.ts";

/**
 * The most parts that follow a post's first: a post is 25 parts at most,
 * Peal's own bound, as no platform names one for its threads.
 */
export const maxFollowUps = 24;

/** The longest wait before a part: a day after the part before it. */
export const maxPartDelaySeconds = 86_400;

/** The most images and videos a part holds: what the largest carousels take. */
export const maxMediaPerPost = 20;

const isUniqueBy =
  <A>(key: (item: A) => string) =>
  (items: readonly A[]): boolean =>
    new Set(items.map(key)).size === items.length;

/** The media one part shows, in order: each file once. */
export const PartMediaSchema = Schema.Array(MediaAttachment).check(
  Schema.isMaxLength(maxMediaPerPost),
  Schema.makeFilter(
    isUniqueBy((attachment: MediaAttachment) => attachment.mediaId),
    { expected: "each media attached once" }
  )
);

/** The text one part has instead on some channels: one per channel. */
export const PartOverridesSchema = Schema.Array(TextOverride).check(
  Schema.makeFilter(
    isUniqueBy((override: TextOverride) => override.channelId),
    { expected: "one text per channel" }
  )
);

/**
 * A part of a post that follows its first: what it says, the media it
 * shows, the text it has instead on some channels, and how long it waits
 * after the part before it went out. On a platform with threads it is a
 * reply to the part before it; on one that takes comments, a comment under
 * the post (`./platform-rules.ts`, `followUps`).
 */
export class PostPart extends Schema.Class<PostPart>(
  "peal-server/publishing/domain/PostPart"
)({
  delaySeconds: Schema.Int.check(
    Schema.isBetween({ maximum: maxPartDelaySeconds, minimum: 0 })
  ),
  media: PartMediaSchema,
  overrides: PartOverridesSchema,
  text: PostTextSchema,
}) {}
