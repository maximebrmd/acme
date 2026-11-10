import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

/** A limit a text passes: how long it is, counted as the platform counts. */
export interface TextOverflow {
  readonly length: number;
  readonly maximum: number;
  readonly unit: string;
}

/**
 * The platforms' text rules, from publishing: a reply is a post on its
 * platform, and takes the same length.
 */
export class ReplyLimits extends Context.Service<
  ReplyLimits,
  {
    /** The first limit of the platform the text passes, if any. */
    readonly overflow: (
      platform: Platform,
      text: string
    ) => Effect.Effect<Option.Option<TextOverflow>>;
  }
>()("peal-server/engagement/application/ReplyLimits") {}
