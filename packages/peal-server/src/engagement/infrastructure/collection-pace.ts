import { Config, Duration, Effect, Layer, Schema } from "effect";

import { CommentsPaceRef } from "#engagement/application/collect-comments.ts";
import { longestWindow } from "#engagement/domain/collection-schedule.ts";

/**
 * `PEAL_ENGAGEMENT_CONCURRENCY`: how many channels the comments collection
 * reads at the same time, 8 unless set. Anything but a whole number from 1
 * to 256 stops the server.
 */
export const engagementConcurrencyConfig = Config.schema(
  Schema.Int.check(Schema.isBetween({ maximum: 256, minimum: 1 })),
  "PEAL_ENGAGEMENT_CONCURRENCY"
);

/**
 * `PEAL_ENGAGEMENT_WINDOW_DAYS`: how many days after it went live a post's
 * comments are read, 30 unless set, 90 at most. Comments are other
 * people's: a longer window keeps them longer.
 */
export const engagementWindowConfig = Config.schema(
  Schema.Int.check(
    Schema.isBetween({ maximum: Duration.toDays(longestWindow), minimum: 1 })
  ),
  "PEAL_ENGAGEMENT_WINDOW_DAYS"
);

/** The collection's pace, with what the settings give. */
export const CommentsPaceLive = Layer.effect(
  CommentsPaceRef,
  Effect.gen(function* CommentsPaceLive() {
    const pace = yield* CommentsPaceRef;

    const channelConcurrency = yield* engagementConcurrencyConfig.pipe(
      Config.withDefault(pace.channelConcurrency)
    );

    const days = yield* engagementWindowConfig.pipe(
      Config.withDefault(Duration.toDays(pace.window))
    );

    return { ...pace, channelConcurrency, window: Duration.days(days) };
  })
);
