import { Schema } from "effect";

import { ChannelIdSchema } from "#shared/domain/ids.ts";

import type { MediaAttachment } from "./media-attachment.ts";
import { PartMediaSchema } from "./part-media.ts";
import { PostTextSchema } from "./post-text.ts";

/**
 * What a part of a post has on one of its channels instead of its own:
 * its text there, and, when `media` is given, the images and videos it
 * shows there instead of its own, in order (none at all when empty).
 * Left out, the channel shows the part's own media.
 */
export class TextOverride extends Schema.Class<TextOverride>(
  "peal-server/publishing/domain/TextOverride"
)({
  channelId: ChannelIdSchema,
  media: Schema.optionalKey(PartMediaSchema),
  text: PostTextSchema.check(Schema.isNonEmpty()),
}) {}

/**
 * The override with another text or other media, what it does not change
 * kept: its media stay given only when they were, or are now.
 */
export const changedOverride = (
  override: TextOverride,
  change: {
    readonly media?: readonly MediaAttachment[];
    readonly text?: string;
  }
): TextOverride => {
  const media = change.media ?? override.media;
  const text = change.text ?? override.text;
  const { channelId } = override;

  return new TextOverride(
    media === undefined ? { channelId, text } : { channelId, media, text }
  );
};
