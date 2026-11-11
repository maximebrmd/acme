import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Layer, Option, Ref } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";
import { TestClock } from "effect/testing";

import { DatabaseError } from "#shared/application/database-error.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  clusterOver,
  eventually,
  eventuallyNow,
  setTime,
  settle,
} from "#test/publishing/infrastructure/harness.ts";
import {
  answered,
  FakeTransport,
} from "#test/webhooks/fakes/fake-transport.ts";
import { ToldNotices } from "#test/webhooks/fakes/told-notices.ts";
import {
  freshEndpoint,
  freshOwner,
  SecretsTest,
} from "#test/webhooks/support.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { webhooksWith, WebhooksWorkersLive } from "#webhooks/container.ts";
import {
  bulkReplaySpacing,
  maxAttempts,
  retryDelays,
} from "#webhooks/domain/delivery-policy.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";
import { DrizzleDeliveryStore } from "#webhooks/infrastructure/drizzle-delivery-store.ts";
import { DrizzleEndpointStore } from "#webhooks/infrastructure/drizzle-endpoint-store.ts";
import { WorkflowDeliveryJobs } from "#webhooks/infrastructure/workflow-delivery-jobs.ts";
import { recoveryDelay } from "#webhooks/infrastructure/workflows/deliver-webhook.ts";

// Whether the database is away, for the store below.
const away = Ref.makeUnsafe(false);

// The delivery store, which cannot read a delivery while the database is
// away.
const UnsteadyDeliveryStore = Layer.effect(
  DeliveryStore,
  Effect.gen(function* UnsteadyDeliveryStore() {
    const store = yield* DeliveryStore;

    return DeliveryStore.of({
      ...store,
      get: (id) =>
        Ref.get(away).pipe(
          Effect.flatMap((gone) =>
            gone
              ? Effect.fail(new DatabaseError({ cause: "away" }))
              : store.get(id)
          )
        ),
    });
  })
).pipe(Layer.provide(DrizzleDeliveryStore));

// Deliveries as the server runs them: started in the transaction that
// saves them, attempted by DeliverWebhookV1 on an in-memory cluster driven
// by TestClock, to a transport that sends nothing.
const ServerTest = WebhooksWorkersLive.pipe(
  Layer.provideMerge(
    webhooksWith(
      Layer.mergeAll(
        DrizzleEndpointStore,
        UnsteadyDeliveryStore,
        SecretsTest,
        FakeTransport.layer,
        WorkflowDeliveryJobs,
        ToldNotices.layer
      )
    )
  ),
  Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
  Layer.provideMerge(clusterOver(MessageStorage.layerMemory)),
  Layer.provideMerge(DatabaseTest)
);

const onServerAt = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof ServerTest> | Scope.Scope>
) => setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(ServerTest))));

const timeout = 60_000;

const stored = (deliveryId: WebhookDeliveryId) =>
  DeliveryStore.use((store) => store.get(deliveryId)).pipe(
    Effect.map(Option.getOrThrow)
  );

const attemptsOf = (deliveryId: WebhookDeliveryId) =>
  stored(deliveryId).pipe(Effect.map(({ attempts }) => attempts));

describe("DeliverWebhookV1", () => {
  it.effect(
    "sends a delivery once it is committed, and stops when the receiver takes it",
    () =>
      onServerAt(
        "2026-11-10T09:00:00Z",
        Effect.gen(function* delivers() {
          const owner = yield* freshOwner;
          const transport = yield* FakeTransport;
          const { endpoint, host } = yield* freshEndpoint(owner);

          const delivery = yield* WebhookEndpoints.use((endpoints) =>
            endpoints.sendTest(owner, endpoint.id)
          );

          yield* eventually(
            "the delivery is taken",
            stored(delivery.id).pipe(
              Effect.map(({ status }) => status._tag === "succeeded")
            )
          );

          // Nothing more follows.
          yield* TestClock.adjust("2 days");
          yield* settle();

          assert.lengthOf(yield* transport.sentTo(host), 1);
          assert.strictEqual(yield* attemptsOf(delivery.id), 1);
        })
      ),
    timeout
  );

  it.effect(
    "tries again after each delay of the schedule, then fails the delivery for good",
    () =>
      onServerAt(
        "2026-11-10T09:00:00Z",
        Effect.gen(function* retries() {
          const owner = yield* freshOwner;
          const transport = yield* FakeTransport;
          const { endpoint, host } = yield* freshEndpoint(owner);

          yield* transport.next(
            host,
            ...Array.from({ length: maxAttempts }, () => answered(503))
          );

          const delivery = yield* WebhookEndpoints.use((endpoints) =>
            endpoints.sendTest(owner, endpoint.id)
          );

          for (const [index, delay] of retryDelays.entries()) {
            yield* eventually(
              `attempt ${String(index + 1)} is made`,
              attemptsOf(delivery.id).pipe(
                Effect.map((attempts) => attempts === index + 1)
              )
            );

            // Not before its time.
            yield* settle(10);

            assert.lengthOf(yield* transport.sentTo(host), index + 1);

            yield* TestClock.adjust(delay);
          }

          yield* eventually(
            "the delivery fails for good",
            stored(delivery.id).pipe(
              Effect.map(({ status }) => status._tag === "failed")
            )
          );

          const failed = yield* stored(delivery.id);

          assert.strictEqual(failed.attempts, maxAttempts);
          assert.deepStrictEqual(
            failed.status._tag === "failed" ? failed.status.reason : null,
            "exhausted"
          );
          assert.lengthOf(yield* transport.sentTo(host), maxAttempts);
        })
      ),
    timeout
  );

  it.effect(
    "makes an attempt again once the database is back, however long it was away",
    () =>
      onServerAt(
        "2026-11-10T09:00:00Z",
        Effect.gen(function* recovers() {
          const owner = yield* freshOwner;
          const transport = yield* FakeTransport;
          const { endpoint, host } = yield* freshEndpoint(owner);

          yield* Ref.set(away, true);

          const delivery = yield* WebhookEndpoints.use((endpoints) =>
            endpoints.sendTest(owner, endpoint.id)
          );

          // The attempt's own retries last under three minutes.
          for (let minute = 0; minute < 3; minute += 1) {
            yield* settle(5);
            yield* TestClock.adjust("1 minute");
          }

          yield* settle(10);
          yield* Ref.set(away, false);

          assert.lengthOf(yield* transport.sentTo(host), 0);

          // The attempt is made again a recovery delay after it gave up,
          // which was within those three minutes. The clock gets there in
          // seconds: a read that wakes in the middle of a long jump times
          // out on its connection, as the test's clock runs past it.
          yield* TestClock.adjust(
            Duration.subtract(recoveryDelay, Duration.minutes(3))
          );

          for (let second = 0; second < 200; second += 1) {
            yield* settle(1);
            yield* TestClock.adjust("1 second");
          }

          yield* eventually(
            "the delivery is taken",
            stored(delivery.id).pipe(
              Effect.map(({ status }) => status._tag === "succeeded")
            )
          );

          assert.lengthOf(yield* transport.sentTo(host), 1);
          assert.strictEqual(yield* attemptsOf(delivery.id), 1);
        }).pipe(Effect.ensuring(Ref.set(away, false)))
      ),
    timeout
  );

  it.effect(
    "starts deliveries sent again together a quarter of a second apart",
    () =>
      onServerAt(
        "2026-11-10T09:00:00Z",
        Effect.gen(function* paced() {
          const owner = yield* freshOwner;
          const transport = yield* FakeTransport;
          const { endpoint, host } = yield* freshEndpoint(owner);

          const sent = yield* Effect.forEach([1, 2], () =>
            WebhookEndpoints.use((endpoints) =>
              endpoints.sendTest(owner, endpoint.id)
            )
          );

          for (const delivery of sent) {
            yield* eventually(
              "the test is taken",
              stored(delivery.id).pipe(
                Effect.map(({ status }) => status._tag === "succeeded")
              )
            );
          }

          const { redelivered } = yield* WebhookDeliveries.use((deliveries) =>
            deliveries.redeliverMany(owner, {
              _tag: "ids",
              deliveryIds: sent.map(({ id }) => id),
            })
          );

          const [first, second] = redelivered;

          assert(first !== undefined && second !== undefined);

          // The virtual clock stays where it is until the first is sent,
          // however long the machine takes: the second waits for it.
          yield* eventuallyNow(
            "the first is sent at once",
            attemptsOf(first.id).pipe(Effect.map((attempts) => attempts === 1))
          );
          yield* settle(10);

          assert.strictEqual(yield* attemptsOf(second.id), 0);

          // Not a moment before the quarter of a second.
          yield* TestClock.adjust(
            Duration.subtract(bulkReplaySpacing, Duration.millis(1))
          );
          yield* settle(10);

          assert.strictEqual(yield* attemptsOf(second.id), 0);

          yield* TestClock.adjust(Duration.millis(1));
          yield* eventually(
            "the second follows",
            attemptsOf(second.id).pipe(Effect.map((attempts) => attempts === 1))
          );

          assert.lengthOf(yield* transport.sentTo(host), 4);
        })
      ),
    timeout
  );
});
