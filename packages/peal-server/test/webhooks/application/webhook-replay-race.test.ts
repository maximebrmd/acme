import { setTimeout as delay } from "node:timers/promises";

import { assert, layer } from "@effect/vitest";
import { DateTime, Deferred, Effect, Fiber, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";
import {
  answered,
  FakeTransport,
} from "#test/webhooks/fakes/fake-transport.ts";
import { PausedReplay } from "#test/webhooks/fakes/paused-replay.ts";
import { StartedJobs } from "#test/webhooks/fakes/started-jobs.ts";
import { ToldNotices } from "#test/webhooks/fakes/told-notices.ts";
import {
  freshEndpoint,
  freshOwner,
  SecretsTest,
} from "#test/webhooks/support.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import { webhooksWith } from "#webhooks/container.ts";
import { maxAttempts } from "#webhooks/domain/delivery-policy.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";
import { DrizzleEndpointStore } from "#webhooks/infrastructure/drizzle-endpoint-store.ts";

// Two replays sent together that name different deliveries of one event
// to one endpoint, the delivery and its failed redelivery: the event is
// sent again once, whichever comes first.

const PausedTest = webhooksWith(
  Layer.mergeAll(
    DrizzleEndpointStore,
    PausedReplay.layer,
    SecretsTest,
    FakeTransport.layer,
    StartedJobs.layer,
    ToldNotices.layer
  )
).pipe(Layer.provideMerge(TransactionsTest), Layer.provideMerge(DatabaseTest));

const tellPublished = Effect.fn("tellPublished")(function* tellPublished(
  actor: Actor
) {
  const targetId = yield* newId(PostTargetIdSchema);

  yield* WebhookEvents.use((events) =>
    Effect.gen(function* told() {
      return yield* events.publish({
        event: {
          data: {
            channelId: yield* newId(ChannelIdSchema),
            permalink: null,
            platform: "mastodon",
            postId: yield* newId(PostIdSchema),
            publishedAt: yield* DateTime.now,
            round: 1,
            targetId,
            workspaceId: actor.workspaceId,
          },
          type: "post.published",
        },
        key: `post-target:${targetId}:1:published`,
      });
    })
  );
});

const failForGood = (host: string, deliveryId: WebhookDeliveryId) =>
  FakeTransport.use((transport) => transport.next(host, answered(500))).pipe(
    Effect.andThen(
      DeliverWebhook.use((delivering) =>
        delivering.attempt(deliveryId, maxAttempts)
      )
    )
  );

// Whether a transaction waits for the lock that replays of one event take.
const waitingForTheEvent = SqlClient.SqlClient.use(
  (sql) =>
    sql<{
      waiting: number;
    }>`SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%webhooks/redelivery%'`
).pipe(Effect.map((rows) => (rows[0]?.waiting ?? 0) > 0));

// A moment of real time: the database works on its own clock.
const pause = Effect.promise(async () => {
  await delay(20);
});

layer(PausedTest)("two replays of one event sent together", (it) => {
  it.effect("send the event again once", () =>
    Effect.gen(function* race() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const paused = yield* PausedReplay;

      const { endpoint, host } = yield* freshEndpoint(owner, {
        eventTypes: ["post.published"],
      });

      yield* tellPublished(owner);

      const [original] = (yield* deliveries.page(owner, endpoint.id, {
        after: Option.none(),
        limit: 10,
      })).items;

      assert(original !== undefined);
      yield* failForGood(host, original.id);

      // Sent again once already, and failed again.
      const { redelivered } = yield* deliveries.redeliverMany(owner, {
        _tag: "ids",
        deliveryIds: [original.id],
      });

      const [repeated] = redelivered;

      assert(repeated !== undefined);
      yield* failForGood(host, repeated.id);

      // One replay names the first delivery, and waits once it has read
      // what was sent again; the other names the redelivery meanwhile.
      yield* paused.arm;

      const namingOriginal = yield* deliveries
        .redeliverMany(owner, { _tag: "ids", deliveryIds: [original.id] })
        .pipe(Effect.forkChild);

      yield* Deferred.await(paused.reached);

      const namingRepeated = yield* deliveries
        .redeliverMany(owner, { _tag: "ids", deliveryIds: [repeated.id] })
        .pipe(Effect.forkChild);

      // Until the second ends, or waits for the first.
      let waits = false;

      while (!waits && namingRepeated.pollUnsafe() === undefined) {
        yield* pause;
        waits = yield* waitingForTheEvent;
      }

      yield* Deferred.succeed(paused.release, true);

      const results = yield* Fiber.joinAll([namingOriginal, namingRepeated]);

      assert.strictEqual(
        results.reduce(
          (sent, { redelivered: again }) => sent + again.length,
          0
        ),
        1
      );
      assert.deepStrictEqual(
        results.flatMap(({ skipped }) => skipped.map(({ reason }) => reason)),
        ["alreadySent"]
      );
    })
  );
});
