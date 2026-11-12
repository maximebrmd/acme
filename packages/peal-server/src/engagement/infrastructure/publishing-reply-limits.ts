import { Effect, Layer, Option } from "effect";

import { ReplyLimits } from "#engagement/application/ports/reply-limits.ts";
import { textOverflowOn } from "#publishing/application/platform-text-limits.ts";

/**
 * The platforms' text limits, as the publishing context checks them. A
 * reply takes its post's limit: on Facebook Pages and Instagram too, as
 * none of Meta's comment references (Comment, IG Comment and its replies,
 * read 2026-11-12) states a length for a comment.
 */
export const PublishingReplyLimits = Layer.succeed(
  ReplyLimits,
  ReplyLimits.of({
    overflow: (platform, text) =>
      Effect.succeed(Option.fromUndefinedOr(textOverflowOn(platform, text))),
  })
);
