import { Schema } from "effect";

import { ChannelIdSchema } from "#shared/domain/ids.ts";

import { PostTextSchema } from "./post-text.ts";

/** The text a post has on one of its channels instead of its own. */
export class TextOverride extends Schema.Class<TextOverride>(
  "peal-server/publishing/domain/TextOverride"
)({
  channelId: ChannelIdSchema,
  text: PostTextSchema.check(Schema.isNonEmpty()),
}) {}
