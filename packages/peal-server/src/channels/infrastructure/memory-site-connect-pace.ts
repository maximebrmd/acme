import { Effect, Layer } from "effect";
import { RateLimiter } from "effect/persistence";

import { SiteConnectLimited } from "#channels/application/site-connect-limited.ts";
import { SiteConnectPace } from "#channels/application/site-connect-pace.ts";

// The tries a workspace has an hour: enough to fix a mistyped address or
// password many times over.
const triesPerHour = 30;

/** SiteConnectPace counted in this process, per workspace and hour. */
export const MemorySiteConnectPace = Layer.effect(
  SiteConnectPace,
  Effect.gen(function* MemorySiteConnectPace() {
    const limiter = yield* RateLimiter.make;

    return SiteConnectPace.of({
      take: (workspaceId) =>
        limiter
          .consume({
            algorithm: "fixed-window",
            key: `site-connect:${workspaceId}`,
            limit: triesPerHour,
            onExceeded: "fail",
            window: "1 hour",
          })
          .pipe(
            Effect.asVoid,
            Effect.catchTag("RateLimiterError", (limited) =>
              limited.reason._tag === "RateLimitExceeded"
                ? Effect.fail(new SiteConnectLimited())
                : Effect.die(limited)
            )
          ),
    });
  })
).pipe(Layer.provide(RateLimiter.layerStoreMemory));
