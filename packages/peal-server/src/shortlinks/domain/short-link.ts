import { Schema } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

import { ShortCodeSchema } from "./short-code.ts";
import { ShortLinkIdSchema } from "./short-link-id.ts";

/**
 * A short address issued for one link of a post's part on one channel
 * (its target): `code` redirects to `destination`. One per target, part
 * and destination, so every run of an attempt sends the same text. It
 * goes with its workspace; staff may turn it off (`disabledAt`).
 */
export class ShortLink extends Schema.Class<ShortLink>(
  "peal-server/shortlinks/domain/ShortLink"
)({
  channelId: ChannelIdSchema,
  code: ShortCodeSchema,
  createdAt: Schema.DateTimeUtc,
  destination: Schema.String,
  disabledAt: Schema.Option(Schema.DateTimeUtc),
  id: ShortLinkIdSchema,
  part: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  postId: PostIdSchema,
  targetId: PostTargetIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}
