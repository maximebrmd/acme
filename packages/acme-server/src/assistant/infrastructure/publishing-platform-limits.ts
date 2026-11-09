import { Effect, Layer } from "effect";

import { PlatformLimits } from "#assistant/application/ports/platform-limits.ts";
import { textLimitsOn } from "#publishing/application/platform-text-limits.ts";

/** The platforms' text limits, as the publishing context checks them. */
export const PublishingPlatformLimitsLive = Layer.succeed(
  PlatformLimits,
  PlatformLimits.of({
    textLimitsOf: (platform) => Effect.succeed(textLimitsOn(platform)),
  })
);
