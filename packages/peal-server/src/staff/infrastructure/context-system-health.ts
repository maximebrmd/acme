import { Config, Effect, Exit, Layer, Option } from "effect";

import { ChannelOversight } from "#channels/application/channel-oversight.ts";
import { PostOversight } from "#publishing/application/post-oversight.ts";
import { makeDatabasePing } from "#shared/infrastructure/database-ping.ts";
import { SystemHealth } from "#staff/application/ports/system-health.ts";

import { healthOf } from "./channel-health.ts";

/**
 * The release the server runs: OTEL_SERVICE_VERSION, which the production
 * stack sets to the release's tag. Read when the server starts.
 */
const releaseConfig = Config.option(Config.String("OTEL_SERVICE_VERSION")).pipe(
  Config.map(Option.filter((release) => release.trim() !== ""))
);

/**
 * The server's health: the readiness check's database ping, the release,
 * and what publishing and the channels hold in every workspace.
 */
export const ContextSystemHealth = Layer.effect(
  SystemHealth,
  Effect.gen(function* ContextSystemHealth() {
    const ping = yield* makeDatabasePing;
    const release = yield* releaseConfig;
    const posts = yield* PostOversight;
    const channels = yield* ChannelOversight;

    return SystemHealth.of({
      due: (range) => posts.due(range),
      failingChannels: (limit) =>
        channels
          .failing(limit)
          .pipe(Effect.map((found) => found.map(healthOf))),
      overdue: (before) => posts.overdue(before),
      ready: ping.pipe(
        Effect.exit,
        Effect.map(Exit.isSuccess),
        Effect.withSpan("SystemHealth.ready")
      ),
      release,
    });
  })
);
