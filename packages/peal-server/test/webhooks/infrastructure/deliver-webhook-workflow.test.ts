import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";
import { TestClock } from "effect/testing";

import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  clusterOver,
  eventually,
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
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { webhooksWith, WebhooksWorkersLive } from "#webhooks/container.ts";
import { maxAttempts, retryDelays } from "#webhooks/domain/delivery-policy.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";
import { DrizzleDeliveryStore } from "#webhooks/infrastructure/drizzle-delivery-store.ts";
import { DrizzleEndpointStore } from "#webhooks/infrastructure/drizzle-endpoint-store.ts";
import { WorkflowDeliveryJobs } from "#webhooks/infrastructure/workflow-delivery-jobs.ts";

// Deliveries as the server runs them: started in the transaction that
// saves them, attempted by DeliverWebhookV1 on an in-memory cluster driven
// by TestClock, to a transport that sends nothing.
const ServerTest = WebhooksWorkersLive.pipe(
  Layer.provideMerge(
    webhooksWith(
      Layer.mergeAll(
        DrizzleEndpointStore,
        DrizzleDeliveryStore,
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
});
