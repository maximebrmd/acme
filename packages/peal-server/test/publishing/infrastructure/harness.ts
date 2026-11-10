import { assert } from "@effect/vitest";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Ref,
  Scope,
} from "effect";
import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
} from "effect/cluster";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { AccountRules } from "#publishing/application/account-rules.ts";
import { ChannelHealth } from "#publishing/application/channel-health.ts";
import type { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SchedulePostRequest } from "#publishing/application/post-scheduling.ts";
import { PublicationJournal } from "#publishing/application/publication-journal.ts";
import { PublicationScheduler } from "#publishing/application/publication-scheduler.ts";
import { publishingWorkers } from "#publishing/container.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { DrizzleContentFingerprints } from "#publishing/infrastructure/drizzle-content-fingerprints.ts";
import { DrizzleIdempotencyKeys } from "#publishing/infrastructure/drizzle-idempotency-keys.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { DrizzlePublicationJournal } from "#publishing/infrastructure/drizzle-publication-journal.ts";
import {
  FakePlatform,
  FakePlatformPublisher,
} from "#publishing/infrastructure/fake-platform-publisher.ts";
import { WorkflowPublicationScheduler } from "#publishing/infrastructure/workflow-publication-scheduler.ts";
import { PublishPostV1 } from "#publishing/infrastructure/workflows/publish-post.ts";
import { PublishTargetV1 } from "#publishing/infrastructure/workflows/publish-target.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { MigrationsLive } from "#shared/infrastructure/migrations.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { RecordingOperatorAlerts } from "#test/publishing/infrastructure/recorded-app-refusals.ts";
import { RecordingPublicationOutcomes } from "#test/publishing/infrastructure/recorded-outcomes.ts";
import {
  actorIn,
  ReferencesTest,
  syntheticContent,
} from "#test/publishing/support.ts";

// The publishing workflows on an in-memory cluster, driven by TestClock, with
// the real repositories on the Postgres that DATABASE_URL names. Ids are
// random, so tests never meet each other's rows.

/** The channels the platform was told to reconnect. */
export class Reconnects extends Context.Service<
  Reconnects,
  { readonly requested: Effect.Effect<readonly ChannelId[]> }
>()("test/publishing/Reconnects") {}

const RecordingChannelHealth = Layer.effectContext(
  Effect.gen(function* RecordingChannelHealth() {
    const requested = yield* Ref.make<readonly ChannelId[]>([]);

    return Context.make(
      ChannelHealth,
      ChannelHealth.of({
        reconnectRequired: (channelId) =>
          Ref.update(requested, (ids) => [...ids, channelId]),
      })
    ).pipe(Context.add(Reconnects, { requested: Ref.get(requested) }));
  })
);

/** The database, migrated. */
export const DatabaseTest = MigrationsLive.pipe(
  Layer.provideMerge(DatabaseLive)
);

export const clusterOver = <S, E, R>(storage: Layer.Layer<S, E, R>) =>
  ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(storage),
    Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop]),
    Layer.provide(
      ShardingConfig.layer({
        // Tests poll storage themselves (`eventually`), so the timers are
        // backstops, kept long so a jump of a day of virtual time stays
        // cheap.
        entityMessagePollInterval: Duration.minutes(1),
        // Shutdown does not wait on virtual time.
        entityTerminationTimeout: Duration.zero,
        refreshAssignmentsInterval: Duration.minutes(1),
        sendRetryInterval: Duration.millis(100),
      })
    )
  );

type Journal = PublicationJournal["Service"];

/**
 * The journal in Postgres, as `change` turns it: a test's way to make one of
 * its writes fail or never answer.
 */
export const journalWith = (
  change: (journal: Journal) => Effect.Effect<Journal>
) =>
  Layer.effect(PublicationJournal, PublicationJournal.use(change)).pipe(
    Layer.provide(DrizzlePublicationJournal)
  );

/**
 * One server: the publishing use cases, workflows and gates on a fresh
 * Sharding over `storage`, calling `platforms`, with `journal`. Several
 * deploys over one storage are restarts.
 */
export const deployWith = <S, E, R, EP, RP, RJ>(
  storage: Layer.Layer<S, E, R>,
  platforms: Layer.Layer<PlatformPublisher, EP, RP>,
  journal: Layer.Layer<PublicationJournal, never, RJ>
) =>
  publishingWorkers(platforms).pipe(
    Layer.provideMerge(PostScheduling.layer),
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleContentFingerprints,
        DrizzleIdempotencyKeys,
        DrizzlePostRepository,
        journal,
        RecordingChannelHealth,
        RecordingOperatorAlerts,
        RecordingPublicationOutcomes,
        WorkflowPublicationScheduler,
        ReferencesTest,
        AccountRules.none,
        PostEvents.none
      )
    ),
    Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
    Layer.provideMerge(clusterOver(storage))
  );

/** One server with the journal in Postgres (see `deployWith`). */
export const deploy = <S, E, R, EP, RP>(
  storage: Layer.Layer<S, E, R>,
  platforms: Layer.Layer<PlatformPublisher, EP, RP>
) => deployWith(storage, platforms, DrizzlePublicationJournal);

/**
 * A server with its own in-memory storage and fake platform, and `journal`.
 */
export const publishingTestWith = <RJ>(
  journal: Layer.Layer<PublicationJournal, never, RJ>
) =>
  deployWith(MessageStorage.layerMemory, FakePlatformPublisher, journal).pipe(
    Layer.provideMerge(FakePlatformPublisher),
    Layer.provideMerge(DatabaseTest)
  );

/** A server with its own in-memory storage and fake platform. */
export const PublishingTest = publishingTestWith(DrizzlePublicationJournal);

// Starts jobs as usual and never stops one, as if every interrupt were lost.
const SchedulerLosingInterrupts = Layer.effect(
  PublicationScheduler,
  PublicationScheduler.use((scheduler) =>
    Effect.succeed(
      PublicationScheduler.of({ ...scheduler, cancel: () => Effect.void })
    )
  )
).pipe(Layer.provide(WorkflowPublicationScheduler));

/**
 * PublishingTest with a scheduler that never stops a job, so only the
 * post's revision keeps a stale job from publishing.
 */
export const PublishingLosingInterruptsTest = Layer.fresh(
  // Fresh: the same layer value inside PublishingTest is built once.
  PostScheduling.layer
).pipe(
  Layer.provide(SchedulerLosingInterrupts),
  Layer.provideMerge(PublishingTest)
);

export const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

/** Moves virtual time to `iso`. */
export const setTime = (iso: string) =>
  TestClock.setTime(DateTime.toEpochMillis(utc(iso)));

/**
 * Runs `test` on a fresh server built at virtual time `start`. The clock is
 * set first: built at the epoch, the cluster's timers would replay every
 * second up to the start.
 */
export const onServerAt = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof PublishingTest>>,
  server: Layer.Layer<
    Layer.Success<typeof PublishingTest>,
    Layer.Error<typeof PublishingTest>
  > = PublishingTest
) => setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(server))));

export const scheduleIn = (iso: string, zone = "Europe/Paris") =>
  new Schedule({ at: utc(iso), timeZone: TimeZoneIdSchema.make(zone) });

/** A new channel id. */
export const newChannel = newId(ChannelIdSchema).pipe(Effect.provide(IdsLive));

/** Schedules a post on the given channels for a new workspace. */
export const schedulePost = Effect.fn("test.schedulePost")(
  function* schedulePost(
    channelIds: SchedulePostRequest["channelIds"],
    schedule: Schedule
  ) {
    const workspaceId = yield* newId(WorkspaceIdSchema).pipe(
      Effect.provide(IdsLive)
    );

    const scheduling = yield* PostScheduling;

    const { post } = yield* scheduling.schedule(actorIn(workspaceId), {
      channelIds,
      content: syntheticContent,
      schedule,
    });

    return post;
  }
);

/**
 * Lets the cluster work until `condition` holds: polls storage, nudges
 * virtual time by a millisecond and gives Postgres real time to answer, as
 * often as needed for about ten seconds.
 */
export const eventually = <E, R>(
  label: string,
  condition: Effect.Effect<boolean, E, R>
) =>
  Effect.gen(function* waiting() {
    const sharding = yield* Sharding.Sharding;

    for (let round = 0; round < 1000; round += 1) {
      if (yield* condition) {
        return;
      }

      yield* sharding.pollStorage;
      yield* TestClock.adjust(Duration.millis(1));
      yield* TestClock.withLive(Effect.sleep(Duration.millis(10)));
    }

    assert.fail(`Timed out waiting until ${label}`);
  });

/** Lets the cluster work for a while, for checks that nothing happens. */
export const settle = (rounds = 50) =>
  Effect.gen(function* settling() {
    const sharding = yield* Sharding.Sharding;

    for (let round = 0; round < rounds; round += 1) {
      yield* sharding.pollStorage;
      yield* TestClock.withLive(Effect.sleep(Duration.millis(10)));
    }
  });

/** The post as stored now. */
export const storedPost = (postId: PostId) =>
  Effect.gen(function* readingPost() {
    const posts = yield* PostRepository;
    const stored = yield* posts.find(postId);

    return Option.getOrThrowWith(
      stored,
      () => new Error("The post is missing")
    );
  });

export const targetsOf = (postId: PostId) =>
  PostRepository.use((posts) => posts.targets(postId));

export const statusOf = (post: Post) => post.status._tag;

export const targetStatuses = (targets: readonly PostTarget[]) =>
  targets.map((target) => target.status._tag);

/** Whether the post's job is parked, waiting for its time. */
export const isSuspended = (postId: PostId) =>
  Effect.gen(function* pollingJob() {
    const { execution } = yield* storedPost(postId);

    if (Option.isNone(execution)) {
      return false;
    }

    const result = yield* PublishPostV1.poll(execution.value);

    return Option.isSome(result) && result.value._tag === "Suspended";
  });

export const callsOn = (channelId: ChannelId) =>
  FakePlatform.use((platform) => platform.calls).pipe(
    Effect.map((calls) =>
      calls.filter((call) => call.request.channelId === channelId)
    )
  );

/** Whether the post has finished publishing. */
export const isFinished = (postId: PostId) =>
  storedPost(postId).pipe(
    Effect.map(({ post }) => post.status._tag === "finished")
  );

/** The outcome of a finished post. */
export const outcomeOf = (postId: PostId) =>
  storedPost(postId).pipe(
    Effect.flatMap(({ post }) =>
      post.status._tag === "finished"
        ? Effect.succeed(post.status.outcome)
        : Effect.die(`The post is ${post.status._tag}, not finished`)
    )
  );

/**
 * Storage, a platform and a database that outlive servers, and the server to
 * deploy over them: building `server` twice is a restart. `serverWith` is the
 * same server with another journal.
 */
export const restartable = Effect.gen(function* restartable() {
  const storage = yield* Layer.build(MessageStorage.MemoryDriver.layer);
  const platforms = yield* Layer.build(FakePlatformPublisher);
  const database = yield* Layer.build(DatabaseTest);

  const driver = Context.get(storage, MessageStorage.MemoryDriver);

  const serverWith = <RJ>(
    journal: Layer.Layer<PublicationJournal, never, RJ>
  ) =>
    deployWith(
      Layer.succeed(MessageStorage.MessageStorage, driver.storage),
      Layer.succeedContext(platforms),
      journal
    ).pipe(
      Layer.provideMerge(Layer.succeedContext(platforms)),
      Layer.provideMerge(Layer.succeedContext(database))
    );

  return {
    platform: Context.get(platforms, FakePlatform),
    server: serverWith(DrizzlePublicationJournal),
    serverWith,
  };
});

/**
 * Stops a server: closes its scope while virtual time moves, as shutdown
 * waits on timers.
 */
export const shutDown = (scope: Scope.Closeable) =>
  Effect.gen(function* stopping() {
    const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void), {
      startImmediately: true,
    });

    for (let round = 0; round < 500; round += 1) {
      if (closing.pollUnsafe() !== undefined) {
        return;
      }

      yield* TestClock.adjust(Duration.millis(100));
      yield* TestClock.withLive(Effect.sleep(Duration.millis(10)));
    }

    assert.fail("The server did not shut down");
  });

/** The calls journaled for a target, in order. */
export const journalOf = (targetId: string) =>
  Effect.gen(function* readingJournal() {
    const sql = yield* SqlClient.SqlClient;

    return yield* sql<{
      readonly attempt: number;
      readonly finished: boolean;
      readonly idempotency_key: string;
    }>`SELECT attempt, finished_at IS NOT NULL AS finished, idempotency_key FROM publishing.publication_calls WHERE target_id = ${targetId} ORDER BY attempt`;
  });

/** The attempts recorded for a target, in order. */
export const attemptsOf = (targetId: string) =>
  Effect.gen(function* readingAttempts() {
    const sql = yield* SqlClient.SqlClient;

    return yield* sql<{
      readonly attempt: number;
      readonly decision: string;
      readonly outcome: string;
      readonly retry_delay_millis: number | null;
    }>`SELECT attempt, decision, outcome, retry_delay_millis FROM publishing.publication_attempts WHERE target_id = ${targetId} ORDER BY attempt`;
  });

/** The job started for the post's current revision. */
export const executionOf = (postId: PostId) =>
  storedPost(postId).pipe(
    Effect.map(({ execution }) =>
      Option.getOrThrowWith(execution, () => new Error("The post has no job"))
    )
  );

/** Whether the job has finished, and how. */
export const jobResult = (executionId: string) =>
  PublishPostV1.poll(executionId).pipe(
    Effect.map((result) =>
      Option.isSome(result) && result.value._tag === "Complete"
        ? Option.some(result.value.exit)
        : Option.none()
    )
  );

/**
 * Whether the target's job is parked on a durable clock, as between two
 * attempts. Move time only then: a clock stored after the move would count
 * its delay from the new time.
 */
export const isTargetWaiting = (targetId: PostTargetId, round = 1) =>
  Effect.gen(function* pollingTarget() {
    const executionId = yield* PublishTargetV1.executionId({
      codeVersion: 1,
      round,
      targetId,
    });

    const result = yield* PublishTargetV1.poll(executionId);

    return Option.isSome(result) && result.value._tag === "Suspended";
  });
