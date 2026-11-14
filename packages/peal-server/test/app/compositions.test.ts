// The server's compositions build at runtime, not only in the types: a
// layer provided twice, or below one that needs it, shows here. AppLive
// is built by the integration harness and ErasureReplayServicesLive by the
// replay test; this builds what the server runs its routes and workers on
// (ContextsLive), on a cluster of the test's own, without the HTTP server,
// whose Bun listener vitest's Node does not have.
import { assert, describe, it } from "@effect/vitest";
import { Context, Duration, Effect, Layer, Option } from "effect";
import { RunnerAddress } from "effect/cluster";

import { clusterLayer } from "#app/cluster.ts";
import { ContextsLive } from "#app/server.ts";
import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { storageSettings } from "#test/media/support.ts";

const Cluster = clusterLayer({
  entityMessagePollInterval: Duration.millis(100),
  entityTerminationTimeout: Duration.zero,
  runnerAddress: Option.some(
    RunnerAddress.make("peal-server-compositions", 34_431)
  ),
});

const Built = ContextsLive.pipe(
  Layer.provide(storageSettings),
  Layer.provide(Cluster),
  Layer.provide(MigrationsLive),
  Layer.provide(DatabaseLive)
);

describe("the server's compositions", () => {
  it.effect(
    "build the contexts, engagement's records on the meters below the channels",
    () =>
      Effect.gen(function* builds() {
        const context = yield* Layer.build(Built);

        // Both resolve from the one build: the records a channel's
        // disconnection reaches give back on the server's meters.
        assert.isTrue(
          Option.isSome(Context.getOption(context, EngagementRecords))
        );
        assert.isTrue(Option.isSome(Context.getOption(context, MeteredUsage)));
      }).pipe(Effect.scoped),
    60_000
  );
});
