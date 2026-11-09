import { Config, Duration, Effect, Layer, Option } from "effect";
import {
  ClusterWorkflowEngine,
  RunnerAddress,
  SingleRunner,
} from "effect/cluster";
import type { ShardingConfig } from "effect/cluster";
import { Digest } from "effect/crypto";

// The runner never listens: one server runs every shard, with no transport
// between runners. Its address is only its identity in cluster_runners, which
// also seeds the ids of the messages it writes, so each process needs its own.
// Under Docker, HOSTNAME is the container id.
const runnerPort = 34_431;

const runnerAddress = Config.String("HOSTNAME").pipe(
  Config.withDefault("acme-server"),
  Config.map((host) => RunnerAddress.make(host, runnerPort))
);

type ShardingSettings = Partial<ShardingConfig.ShardingConfig["Service"]>;

// SingleRunner reads its settings from the environment as well, and its
// runner address from HOST and PORT, which name the HTTP server here. The
// settings below replace whatever those variables say.
const runnerLive = (overrides: ShardingSettings) =>
  Layer.unwrap(
    Effect.gen(function* RunnerLive() {
      const address = yield* runnerAddress;

      return SingleRunner.layer({
        // Postgres advisory locks on each shard, so a second process started
        // by mistake waits instead of running the same workflows.
        runnerStorage: "sql",
        shardingConfig: {
          // A workflow sleeping until its instant wakes on the next poll of
          // storage: this bounds how late a post goes out.
          entityMessagePollInterval: Duration.seconds(2),
          // How long shutdown waits for calls in flight to the platforms.
          entityTerminationTimeout: Duration.seconds(60),
          runnerAddress: Option.some(address),
          ...overrides,
        },
      });
    })
  );

/**
 * Durable workflows and cluster entities on one server, stored in Postgres
 * next to the application's tables: messages, replies and runners live in the
 * cluster_* tables, which Effect creates and migrates when this layer builds.
 *
 * It needs the SqlClient that the repositories use, so a use case can write
 * its rows and start a workflow in one transaction. Tests pass `overrides`.
 */
export const clusterLayer = (overrides: ShardingSettings = {}) =>
  ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(runnerLive(overrides)),
    // Message keys longer than the column are stored as their SHA-256.
    Layer.provide(Digest.layerWebCrypto)
  );

export const ClusterLive = clusterLayer();
