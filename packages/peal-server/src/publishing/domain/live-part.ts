import { Schema } from "effect";

import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

/**
 * A part of a post that went live on a channel: its place in the post, from
 * 0, the platform's id for it and its address, when known, when it went
 * out, and the round that sent it. A part a member found by hand has no id
 * unless they gave one.
 */
export const LivePartSchema = Schema.Struct({
  index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  permalink: Schema.Option(Schema.String),
  platformPostId: Schema.Option(PlatformPostIdSchema),
  publishedAt: Schema.DateTimeUtc,
  round: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
});

export type LivePart = typeof LivePartSchema.Type;
