import { assert, describe, it } from "@effect/vitest";
import {
  Cron,
  DateTime,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Schema,
  Scope,
} from "effect";
import { ClusterCron, RunnerAddress } from "effect/cluster";
import type { Sharding } from "effect/cluster";
import { SqlClient } from "effect/sql";

import { clusterLayer } from "#app/cluster.ts";
import { CronsLive } from "#app/crons.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { WarnChannelsNeedingReconnect } from "#channels/application/warn-channels-needing-reconnect.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationScheduler } from "#publishing/application/publication-scheduler.ts";
import { publishingWith, publishingWorkers } from "#publishing/container.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget } from "#publishing/domain/post-target.ts";
import { createDraft, schedulePost } from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import {
  FakePlatform,
  FakePlatformPublisher,
} from "#publishing/infrastructure/fake-platform-publisher.ts";
import { PublishPostV1 } from "#publishing/infrastructure/workflows/publish-post.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { purgeFinishedClusterRows } from "#shared/infrastructure/cluster-retention.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { RecordingPublicationOutcomes } from "#test/publishing/infrastructure/recorded-outcomes.ts";
import {
  actorIn,
  ReferencesTest,
  syntheticContent,
} from "#test/publishing/support.ts";

// The cluster as the server runs it: SingleRunner with SQL message and
// runner storage, on the Postgres that DATABASE_URL names, with the real
// clock. Only this file runs a SQL runner, since runners on one database
// share its shards. Each server here is a restart of the same runner, whose
// address stays the same from run to run. Tests leave no job waiting behind,
// as a dev server on the same database would run it.

const runner = RunnerAddress.make("acme-server-test", 34_431);

const Cluster = clusterLayer({
  entityMessagePollInterval: Duration.millis(100),
  entityTerminationTimeout: Duration.zero,
  runnerAddress: Option.some(runner),
});

const Database = MigrationsLive.pipe(Layer.provideMerge(DatabaseLive));

// A cron that ticks every second, to leave finished cron runs behind. Its
// rows are deleted after the test that runs it: a server that does not
// register it would retry its pending run forever.
const tickName = "test.tick";

const Ticks = ClusterCron.make({
  cron: Cron.parseUnsafe("* * * * * *", "UTC"),
  execute: Effect.void,
  name: tickName,
});

// The channels jobs the server's crons call, doing nothing: a real sweep
// would refresh, or mark, the channels other suites keep in this database.
const ChannelJobsTest = Layer.mergeAll(
  Layer.succeed(
    RefreshChannelTokens,
    RefreshChannelTokens.of({
      refresh: () => Effect.succeed("skipped"),
      sweep: Effect.succeed({
        due: 0,
        failed: 0,
        reconnectRequired: 0,
        refreshed: 0,
        unavailable: 0,
      }),
    })
  ),
  Layer.succeed(
    WarnChannelsNeedingReconnect,
    WarnChannelsNeedingReconnect.of({
      run: Effect.succeed({
        expired: 0,
        reconnectRequired: 0,
        reconnectSoon: 0,
      }),
    })
  ),
  Layer.succeed(
    ConnectChannel,
    ConnectChannel.of({
      choose: () => Effect.die("not used by the crons"),
      complete: () => Effect.die("not used by the crons"),
      connectable: () => Effect.die("not used by the crons"),
      purgeExpired: Effect.succeed(0),
      reconnect: () => Effect.die("not used by the crons"),
      start: () => Effect.die("not used by the crons"),
    })
  )
);

const serverWith = <E, R>(
  platforms: Layer.Layer<Layer.Success<typeof FakePlatformPublisher>, E, R>,
  crons: Layer.Layer<
    never,
    never,
    | Layer.Success<typeof ChannelJobsTest>
    | Sharding.Sharding
    | SqlClient.SqlClient
  > = CronsLive
) =>
  Layer.mergeAll(publishingWorkers(platforms), crons).pipe(
    Layer.provideMerge(publishingWith(ReferencesTest)),
    Layer.provideMerge(RecordingPublicationOutcomes),
    Layer.provideMerge(ChannelJobsTest),
    Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
    Layer.provideMerge(Cluster),
    Layer.provideMerge(platforms)
  );

const live = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.timeout(Duration.seconds(20)));

const waitUntil = <E, R>(
  label: string,
  condition: Effect.Effect<boolean, E, R>
) =>
  Effect.gen(function* waiting() {
    for (let round = 0; round < 200; round += 1) {
      if (yield* condition) {
        return;
      }

      yield* Effect.sleep(Duration.millis(50));
    }

    assert.fail(`Timed out waiting until ${label}`);
  });

const CountSchema = Schema.Tuple([Schema.Struct({ count: Schema.Int })]);

const count = (
  query: Effect.Effect<readonly unknown[], unknown, SqlClient.SqlClient>
) =>
  query.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(CountSchema)),
    Effect.map(([{ count: rows }]) => rows)
  );

const messagesOf = (entityId: string) =>
  SqlClient.SqlClient.use((sql) =>
    count(
      sql`SELECT count(*)::int AS count FROM cluster_messages WHERE entity_id = ${entityId}`
    )
  );

const cronRuns = (processed: boolean) =>
  SqlClient.SqlClient.use((sql) =>
    count(
      sql`SELECT count(*)::int AS count FROM cluster_messages WHERE entity_type = ${`ClusterCron/${tickName}`} AND processed = ${processed}`
    )
  );

const forgetTicks = SqlClient.SqlClient.use((sql) =>
  sql.withTransaction(
    Effect.gen(function* forgettingTicks() {
      const entityType = `ClusterCron/${tickName}`;

      yield* sql`DELETE FROM cluster_replies WHERE request_id IN (SELECT id FROM cluster_messages WHERE entity_type = ${entityType})`;
      yield* sql`DELETE FROM cluster_messages WHERE entity_type = ${entityType}`;
    })
  )
);

const isFinished = (postId: PostId) =>
  PostRepository.use((posts) => posts.find(postId)).pipe(
    Effect.map(
      (stored) =>
        Option.isSome(stored) && stored.value.post.status._tag === "finished"
    )
  );

const scheduleSoon = (delay: Duration.Duration) =>
  Effect.gen(function* schedulingSoon() {
    const workspaceId = yield* newId(WorkspaceIdSchema);
    const channelId = yield* newId(ChannelIdSchema);
    const at = DateTime.addDuration(yield* DateTime.now, delay);

    const { post } = yield* PostScheduling.use((scheduling) =>
      scheduling.schedule(actorIn(workspaceId), {
        channelIds: [channelId],
        content: syntheticContent,
        schedule: new Schedule({
          at,
          timeZone: TimeZoneIdSchema.make("Europe/Paris"),
        }),
      })
    );

    const execution = yield* PostRepository.use((posts) =>
      posts.find(post.id)
    ).pipe(
      Effect.map((stored) =>
        Option.getOrThrowWith(
          stored.pipe(Option.flatMap(({ execution: job }) => job)),
          () => new Error("The post has no job")
        )
      )
    );

    return { execution, post };
  });

const regclass = (name: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly name: string | null;
      }>`SELECT to_regclass(${name})::text AS name`
  ).pipe(Effect.map((rows) => rows[0]?.name ?? null));

describe("the cluster on Postgres", () => {
  it.live(
    "creates its tables and registers its runner",
    () =>
      live(
        Effect.gen(function* createsTables() {
          for (const table of [
            "cluster_messages",
            "cluster_replies",
            "cluster_runners",
          ]) {
            assert.strictEqual(yield* regclass(table), table);
          }

          // The runner registers itself in the background once the cluster is
          // up, so under load the row can appear a moment after the tables.
          const runners = SqlClient.SqlClient.use((sql) =>
            count(
              sql`SELECT count(*)::int AS count FROM cluster_runners WHERE address = ${`${runner.host}:${runner.port}`}`
            )
          );

          yield* waitUntil(
            "the runner is registered",
            runners.pipe(Effect.map((registered) => registered > 0))
          );

          assert.strictEqual(yield* runners, 1);
        }).pipe(
          Effect.provide(serverWith(FakePlatformPublisher)),
          Effect.provide(Database)
        )
      ),
    30_000
  );

  it.live(
    "commits a post and the start of its job together, or neither",
    () =>
      live(
        Effect.gen(function* outbox() {
          const { transaction } = yield* TransactionRunner;
          const posts = yield* PostRepository;
          const scheduler = yield* PublicationScheduler;
          const platform = yield* FakePlatform;

          const now = yield* DateTime.now;
          const postId = yield* newId(PostIdSchema);
          const at = DateTime.addDuration(now, Duration.seconds(1));

          const post = yield* Effect.fromResult(
            schedulePost(
              createDraft(
                postId,
                yield* newId(WorkspaceIdSchema),
                syntheticContent
              ),
              new Schedule({
                at,
                timeZone: TimeZoneIdSchema.make("Europe/Paris"),
              }),
              now
            )
          );

          const target = createTarget(
            yield* newId(PostTargetIdSchema),
            postId,
            yield* newId(ChannelIdSchema)
          );

          const execution = yield* PublishPostV1.executionId({
            codeVersion: 1,
            postId,
            revision: post.scheduleRevision,
            scheduledAt: at,
          });

          const rolledBack = yield* transaction(
            Effect.gen(function* insertStartAndFail() {
              yield* posts.insert(post, [target]);
              yield* scheduler.schedule({
                postId,
                revision: post.scheduleRevision,
                scheduledAt: at,
              });

              return yield* Effect.fail<"rolledBack">("rolledBack");
            })
          ).pipe(Effect.flip);

          assert.strictEqual(rolledBack, "rolledBack");
          assert.isTrue(Option.isNone(yield* posts.find(postId)));
          assert.strictEqual(yield* messagesOf(execution), 0);

          const scheduled = yield* scheduleSoon(Duration.seconds(1));

          assert.isAbove(yield* messagesOf(scheduled.execution), 0);

          yield* waitUntil("the post finishes", isFinished(scheduled.post.id));

          assert.lengthOf(yield* platform.calls, 1);
        }).pipe(
          Effect.provide(serverWith(FakePlatformPublisher)),
          Effect.provide(Database)
        )
      ),
    30_000
  );

  it.live(
    "publishes a due post once, across a restart while it sleeps",
    () =>
      live(
        Effect.gen(function* survivesRestart() {
          const database = yield* Layer.build(Database);
          const platforms = yield* Layer.build(FakePlatformPublisher);
          const server = serverWith(Layer.succeedContext(platforms));

          const platform = yield* FakePlatform.pipe(
            Effect.provideContext(platforms)
          );

          const before = yield* Scope.make();

          const first = yield* Layer.buildWithScope(server, before).pipe(
            Effect.provideContext(database)
          );

          const { execution, post } = yield* scheduleSoon(
            Duration.seconds(2)
          ).pipe(Effect.provideContext(first));

          // Its wake-up is stored: the job sleeps durably.
          yield* waitUntil(
            "the job sleeps",
            SqlClient.SqlClient.use((sql) =>
              count(
                sql`SELECT count(*)::int AS count FROM cluster_messages WHERE entity_type = 'Workflow/-/DurableClock' AND entity_id = ${execution}`
              )
            ).pipe(
              Effect.map((clocks) => clocks === 1),
              Effect.provideContext(database)
            )
          );
          yield* Scope.close(before, Exit.void);

          const after = yield* Scope.make();

          const second = yield* Layer.buildWithScope(server, after).pipe(
            Effect.provideContext(database)
          );

          yield* waitUntil(
            "the post finishes",
            isFinished(post.id).pipe(Effect.provideContext(second))
          );

          assert.lengthOf(yield* platform.calls, 1);

          yield* Scope.close(after, Exit.void);
        }).pipe(Effect.scoped)
      ),
    30_000
  );

  it.live(
    "purges finished executions and cron runs, and keeps what still waits",
    () =>
      live(
        Effect.gen(function* purges() {
          const finished = yield* scheduleSoon(Duration.zero);
          const waiting = yield* scheduleSoon(Duration.hours(1));

          yield* waitUntil("a post finishes", isFinished(finished.post.id));
          yield* waitUntil(
            "a cron run is processed",
            cronRuns(true).pipe(Effect.map((runs) => runs > 0))
          );

          // Younger than a day: kept.
          yield* purgeFinishedClusterRows(Duration.days(1));

          assert.isAbove(yield* messagesOf(finished.execution), 0);
          assert.isAbove(yield* cronRuns(true), 0);

          const purged = yield* purgeFinishedClusterRows(Duration.zero);

          assert.isAtLeast(purged.executions, 1);
          assert.isAtLeast(purged.cronRuns, 1);
          assert.strictEqual(yield* messagesOf(finished.execution), 0);
          assert.isAbove(yield* messagesOf(waiting.execution), 0);
          assert.strictEqual(yield* cronRuns(true), 0);
          // The next run of each cron is still scheduled.
          assert.isAbove(yield* cronRuns(false), 0);

          const retention = yield* SqlClient.SqlClient.use((sql) =>
            count(
              sql`SELECT count(*)::int AS count FROM cluster_messages WHERE entity_type = 'ClusterCron/cluster.retention' AND NOT processed`
            )
          );

          assert.isAbove(retention, 0);

          // Leaves no job waiting for a dev server to run.
          yield* PostScheduling.use((scheduling) =>
            scheduling.cancel(
              actorIn(waiting.post.workspaceId),
              waiting.post.id
            )
          );
        }).pipe(
          Effect.provide(
            serverWith(FakePlatformPublisher, Layer.merge(CronsLive, Ticks))
          ),
          // Once the server has stopped.
          Effect.ensuring(Effect.orDie(forgetTicks)),
          Effect.provide(Database)
        )
      ),
    30_000
  );
});
