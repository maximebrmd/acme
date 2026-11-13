import { Schema } from "effect";

import { PartMediaSchema } from "./part-media.ts";
import { PostTextSchema } from "./post-text.ts";
import { TextOverride } from "./text-override.ts";

export { maxMediaPerPost, PartMediaSchema } from "./part-media.ts";

/**
 * The most parts that follow a post's first: a post is 25 parts at most,
 * Peal's own bound, as no platform names one for its threads.
 */
export const maxFollowUps = 24;

/** The longest wait before a part: a day after the part before it. */
export const maxPartDelaySeconds = 86_400;

const isUniqueBy =
  <A>(key: (item: A) => string) =>
  (items: readonly A[]): boolean =>
    new Set(items.map(key)).size === items.length;

/** What one part has instead on some channels: one override per channel. */
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
