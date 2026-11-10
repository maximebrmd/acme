import { Effect, Layer, Option } from "effect";

import { ReplyLimits } from "#engagement/application/ports/reply-limits.ts";
import { textOverflowOn } from "#publishing/application/platform-text-limits.ts";

/** The platforms' text limits, as the publishing context checks them. */
export const PublishingReplyLimits = Layer.succeed(
  ReplyLimits,
  ReplyLimits.of({
    overflow: (platform, text) =>
      Effect.succeed(Option.fromUndefinedOr(textOverflowOn(platform, text))),
  })
);
