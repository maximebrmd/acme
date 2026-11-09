import { Option, Schema } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import { MediaAttachment } from "./media-attachment.ts";
import { PostTextSchema } from "./post-text.ts";
import { TextOverride } from "./text-override.ts";

/** The most images and videos a post holds: what the largest carousels take. */
export const maxMediaPerPost = 20;

const isUniqueBy =
  <A>(key: (item: A) => string) =>
  (items: readonly A[]): boolean =>
    new Set(items.map(key)).size === items.length;

/**
 * What a post says: its text, the media it shows, in order, and the text it
 * has instead on some of its channels.
 */
export class PostContent extends Schema.Class<PostContent>(
  "acme-server/publishing/domain/PostContent"
)({
  media: Schema.Array(MediaAttachment).check(
    Schema.isMaxLength(maxMediaPerPost),
    Schema.makeFilter(
      isUniqueBy((attachment: MediaAttachment) => attachment.mediaId),
      { expected: "each media attached once" }
    )
  ),
  overrides: Schema.Array(TextOverride).check(
    Schema.makeFilter(
      isUniqueBy((override: TextOverride) => override.channelId),
      { expected: "one text per channel" }
    )
  ),
  text: PostTextSchema,
}) {}

/** A post that says nothing yet. */
export const emptyContent = new PostContent({
  media: [],
  overrides: [],
  text: "",
});

/** The text the post has on a channel: its override there, or its own. */
export const textOn = (content: PostContent, channelId: ChannelId): string =>
  Option.fromUndefinedOr(
    content.overrides.find((override) => override.channelId === channelId)
  ).pipe(
    Option.map((override) => override.text),
    Option.getOrElse(() => content.text)
  );
