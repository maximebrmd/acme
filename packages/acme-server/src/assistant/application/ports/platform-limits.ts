import { Context } from "effect";
import type { Effect } from "effect";

import type { TextLimit } from "#assistant/domain/text-limit.ts";
import type { Platform } from "#shared/domain/platform.ts";

/**
 * The limits each platform sets on a post's text, as publishing checks them,
 * so a shortened post is cut to what the platform takes.
 */
export class PlatformLimits extends Context.Service<
  PlatformLimits,
  {
    /** None when no limit is known for the platform. */
    readonly textLimitsOf: (
      platform: Platform
    ) => Effect.Effect<readonly TextLimit[]>;
  }
>()("acme-server/assistant/application/PlatformLimits") {}
