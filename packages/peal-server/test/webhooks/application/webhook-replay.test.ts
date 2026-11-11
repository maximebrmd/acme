import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  answered,
  FakeTransport,
} from "#test/webhooks/fakes/fake-transport.ts";
import { StartedJobs } from "#test/webhooks/fakes/started-jobs.ts";
import {
  freshEndpoint,
  freshOwner,
  memberOf,
  WebhooksTest,
} from "#test/webhooks/support.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { anyDelivery } from "#webhooks/application/ports/delivery-store.ts";
import { ManualSends } from "#webhooks/application/ports/manual-sends.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import type {
  LogFilters,
  Redelivery,
} from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import {
  bulkRedeliveriesPerHour,
  bulkReplaySpacing,
  maxAttempts,
  maxBulkRedelivery,
} from "#webhooks/domain/delivery-policy.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import { DrizzleManualSends } from "#webhooks/infrastructure/drizzle-manual-sends.ts";

const tagOf = <E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<unknown, E, R>
): Effect.Effect<string, never, R> =>
  effect.pipe(
    Effect.match({
      onFailure: (failure) => failure._tag,
      onSuccess: () => "succeeded",
    })
  );

// Tells the actor's workspace that a post went live, once per call.
const tellPublished = Effect.fn("tellPublished")(function* tellPublished(
  actor: Actor
) {
  const targetId = yield* newId(PostTargetIdSchema);
  const channelId = yield* newId(ChannelIdSchema);
  const postId = yield* newId(PostIdSchema);
  const publishedAt = yield* DateTime.now;

  yield* WebhookEvents.use((events) =>
    events.publish({
      event: {
        data: {
          channelId,
          permalink: null,
          platform: "mastodon",
          postId,
          publishedAt,
          round: 1,
          targetId,
          workspaceId: actor.workspaceId,
        },
        type: "post.published",
      },
      key: `post-target:${targetId}:1:published`,
    })
  );
});

const everything: LogFilters = { ...anyDelivery, endpointId: Option.none() };

const all = { after: Option.none(), limit: 100 };

// The endpoint's deliveries, oldest first, every page of them.
const logOf = Effect.fn("logOf")(function* logOf(
  actor: Actor,
  endpointId: string
) {
  const deliveries = yield* WebhookDeliveries;
  const read: WebhookDelivery[] = [];
  let after = Option.none<WebhookDelivery["id"]>();

  do {
    const page = yield* deliveries.page(actor, endpointId, {
      after,
      limit: 100,
    });

    read.push(...page.items);
    after = page.next;
  } while (Option.isSome(after));

  return read.toReversed();
});

// Fails a delivery for good: its last attempt answered 500.
const failForGood = Effect.fn("failForGood")(function* failForGood(
  host: string,
  delivery: WebhookDelivery
) {
  yield* FakeTransport.use((transport) => transport.next(host, answered(500)));
  yield* DeliverWebhook.use((delivering) =>
    delivering.attempt(delivery.id, maxAttempts)
  );
});

// An endpoint with `count` deliveries that failed for good, oldest first,
// a minute apart.
const failing = Effect.fn("failing")(function* failing(
  owner: Actor,
  count: number
) {
  const created = yield* freshEndpoint(owner, {
    eventTypes: ["post.published"],
  });

  yield* Effect.forEach(
    Array.from({ length: count }),
    () =>
      tellPublished(owner).pipe(Effect.andThen(TestClock.adjust("1 minute"))),
    { discard: true }
  );

  const log = yield* logOf(owner, created.endpoint.id);

  yield* Effect.forEach(
    log,
    (delivery) => failForGood(created.host, delivery),
    {
      discard: true,
    }
  );

  return { ...created, failed: log };
});

const byIds = (deliveries: readonly WebhookDelivery[]): Redelivery => ({
  _tag: "ids",
  deliveryIds: deliveries.map(({ id }) => id),
});

const failedOf = (
  endpointId: string
): Extract<Redelivery, { readonly _tag: "failed" }> => ({
  _tag: "failed",
  endpointId,
  eventType: Option.none(),
  since: Option.none(),
  until: Option.none(),
});

layer(WebhooksTest)("the delivery log across endpoints", (it) => {
  it.effect("lists every endpoint's deliveries, filtered", () =>
    Effect.gen(function* search() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const endpoints = yield* WebhookEndpoints;
      const first = yield* failing(owner, 2);
      const second = yield* freshEndpoint(owner);
      const test = yield* endpoints.sendTest(owner, second.endpoint.id);

      const ids = (filters: Partial<LogFilters>) =>
        deliveries
          .search(owner, { ...everything, ...filters }, all)
          .pipe(Effect.map(({ items }) => items.map(({ id }) => id)));

      const [older, newer] = first.failed.map(({ id }) => id);

      assert(older !== undefined && newer !== undefined);
      assert.deepStrictEqual(yield* ids({}), [test.id, newer, older]);
      assert.deepStrictEqual(yield* ids({ status: Option.some("failed") }), [
        newer,
        older,
      ]);
      assert.deepStrictEqual(
        yield* ids({ endpointId: Option.some(second.endpoint.id) }),
        [test.id]
      );
      assert.deepStrictEqual(
        yield* ids({ eventType: Option.some("webhook.test") }),
        [test.id]
      );
      assert.deepStrictEqual(
        yield* ids({
          since: Option.some(
            first.failed[1]?.createdAt ?? DateTime.nowUnsafe()
          ),
          until: Option.some(test.createdAt),
        }),
        [newer]
      );
      assert.deepStrictEqual(
        yield* ids({ endpointId: Option.some("nope") }),
        []
      );

      // Each says where it goes, and whose event it is.
      const [shown] = (yield* deliveries.search(owner, everything, all)).items;

      assert.strictEqual(shown?.endpointId, second.endpoint.id);
      assert.strictEqual(shown?.eventWorkspaceId, owner.workspaceId);
    })
  );

  it.effect("pages by cursor, steady while new deliveries arrive", () =>
    Effect.gen(function* pages() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint } = yield* freshEndpoint(owner);

      yield* Effect.forEach([1, 2, 3], () => tellPublished(owner), {
        discard: true,
      });

      const first = yield* deliveries.search(owner, everything, {
        after: Option.none(),
        limit: 2,
      });

      // One more arrives between the pages.
      yield* tellPublished(owner);

      const second = yield* deliveries.search(owner, everything, {
        after: first.next,
        limit: 2,
      });

      const log = (yield* logOf(owner, endpoint.id)).map(({ id }) => id);

      assert.deepStrictEqual(
        [...first.items, ...second.items].map(({ id }) => id),
        log.slice(0, 3).toReversed()
      );
      assert.deepStrictEqual(second.next, Option.none());
    })
  );

  it.effect("shows nothing of another workspace, and needs webhook:read", () =>
    Effect.gen(function* guarded() {
      const owner = yield* freshOwner;
      const stranger = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint } = yield* freshEndpoint(owner);

      yield* tellPublished(owner);

      assert.lengthOf(
        (yield* deliveries.search(stranger, everything, all)).items,
        0
      );
      assert.lengthOf(
        (yield* deliveries.search(
          stranger,
          { ...everything, endpointId: Option.some(endpoint.id) },
          all
        )).items,
        0
      );
      assert.strictEqual(
        yield* tagOf(
          deliveries.search(
            memberOf(owner.workspaceId, "contributor"),
            everything,
            all
          )
        ),
        "MissingPermission"
      );
    })
  );
});

layer(WebhooksTest)("sending many deliveries again", (it) => {
  it.effect("sends the ones named, each as a new delivery of its event", () =>
    Effect.gen(function* named() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint, failed } = yield* failing(owner, 2);

      const result = yield* deliveries.redeliverMany(owner, {
        _tag: "ids",
        deliveryIds: [...failed.map(({ id }) => id), "not-an-id"],
      });

      assert.deepStrictEqual(
        result.redelivered.map(({ eventId, redeliveryOf }) => [
          eventId,
          Option.getOrNull(redeliveryOf),
        ]),
        failed.map(({ eventId, id }) => [eventId, id])
      );
      assert.isTrue(
        result.redelivered.every(
          ({ endpointId, status }) =>
            endpointId === endpoint.id && status._tag === "pending"
        )
      );
      assert.deepStrictEqual(result.skipped, [
        { deliveryId: "not-an-id", reason: "notFound" },
      ]);
      assert.strictEqual(result.remaining, 0);

      // Started a quarter of a second apart, the first at once.
      const delays = yield* StartedJobs.use((jobs) => jobs.delays);

      assert.deepStrictEqual(
        result.redelivered.map(({ id }) =>
          Duration.toMillis(delays.get(id) ?? Duration.infinity)
        ),
        [0, Duration.toMillis(bulkReplaySpacing)]
      );
    })
  );

  it.effect("sends an endpoint's failed ones oldest first, 100 a call", () =>
    Effect.gen(function* selection() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint, failed } = yield* failing(owner, maxBulkRedelivery + 3);

      const first = yield* deliveries.redeliverMany(
        owner,
        failedOf(endpoint.id)
      );

      assert.lengthOf(first.redelivered, maxBulkRedelivery);
      assert.deepStrictEqual(
        first.redelivered.map(({ redeliveryOf }) =>
          Option.getOrNull(redeliveryOf)
        ),
        failed.slice(0, maxBulkRedelivery).map(({ id }) => id)
      );
      assert.strictEqual(first.remaining, 3);

      // Again: only what is left, nothing twice.
      const second = yield* deliveries.redeliverMany(
        owner,
        failedOf(endpoint.id)
      );

      assert.deepStrictEqual(
        second.redelivered.map(({ redeliveryOf }) =>
          Option.getOrNull(redeliveryOf)
        ),
        failed.slice(maxBulkRedelivery).map(({ id }) => id)
      );
      assert.strictEqual(second.remaining, 0);

      const third = yield* deliveries.redeliverMany(
        owner,
        failedOf(endpoint.id)
      );

      assert.lengthOf(third.redelivered, 0);
      assert.strictEqual(third.remaining, 0);
    })
  );

  it.effect("narrows a selection by time and type", () =>
    Effect.gen(function* narrowed() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint, failed } = yield* failing(owner, 3);
      const [, middle, last] = failed;

      assert(middle !== undefined && last !== undefined);

      const result = yield* deliveries.redeliverMany(owner, {
        ...failedOf(endpoint.id),
        since: Option.some(middle.createdAt),
        until: Option.some(last.createdAt),
      });

      assert.deepStrictEqual(
        result.redelivered.map(({ redeliveryOf }) =>
          Option.getOrNull(redeliveryOf)
        ),
        [middle.id]
      );

      const otherType = yield* deliveries.redeliverMany(owner, {
        ...failedOf(endpoint.id),
        eventType: Option.some("media.ready"),
      });

      assert.lengthOf(otherType.redelivered, 0);
    })
  );

  it.effect("skips what was sent again, and an endpoint turned off", () =>
    Effect.gen(function* skips() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const endpoints = yield* WebhookEndpoints;
      const on = yield* failing(owner, 1);
      const off = yield* failing(owner, 1);
      const named = byIds([...on.failed, ...off.failed]);

      yield* endpoints.update(owner, off.endpoint.id, { enabled: false });

      const first = yield* deliveries.redeliverMany(owner, named);

      assert.lengthOf(first.redelivered, 1);
      assert.deepStrictEqual(first.skipped, [
        { deliveryId: off.failed[0]?.id ?? "", reason: "endpointDisabled" },
      ]);

      // Sent again already, and that one is still pending.
      const again = yield* deliveries.redeliverMany(owner, named);

      assert.lengthOf(again.redelivered, 0);
      assert.deepStrictEqual(
        again.skipped.map(({ reason }) => reason),
        ["alreadySent", "endpointDisabled"]
      );
    })
  );

  it.effect("sends each failed one once when two calls come together", () =>
    Effect.gen(function* together() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint, failed } = yield* failing(owner, 5);

      const [one, two] = yield* Effect.all(
        [
          deliveries.redeliverMany(owner, failedOf(endpoint.id)),
          deliveries.redeliverMany(owner, byIds(failed)),
        ],
        { concurrency: "unbounded" }
      );

      assert.strictEqual(one.redelivered.length + two.redelivered.length, 5);

      const log = yield* logOf(owner, endpoint.id);

      assert.lengthOf(log, 10);
      assert.deepStrictEqual(
        log
          .flatMap(({ redeliveryOf }) => Option.toArray(redeliveryOf))
          .toSorted(),
        failed.map(({ id }) => id).toSorted()
      );
    })
  );

  it.effect("refuses a call whole past the hour's budget", () =>
    Effect.gen(function* budget() {
      const owner = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint, failed } = yield* failing(owner, 2);

      // Another server took all but one of the hour's.
      const taken = yield* ManualSends.use((sends) =>
        sends.take(owner.workspaceId, "bulk", bulkRedeliveriesPerHour - 1)
      ).pipe(
        Effect.provide(
          Layer.fresh(DrizzleManualSends.pipe(Layer.provide(DatabaseTest)))
        )
      );

      assert.strictEqual(taken._tag, "taken");

      const refusal = yield* deliveries
        .redeliverMany(owner, failedOf(endpoint.id))
        .pipe(Effect.flip);

      assert.strictEqual(refusal._tag, "TooManyManualSends");
      assert.strictEqual(
        refusal._tag === "TooManyManualSends" ? refusal.allowed : 0,
        bulkRedeliveriesPerHour
      );
      // Nothing was sent.
      assert.lengthOf(yield* logOf(owner, endpoint.id), 2);

      // One is left, and the single sends have their own.
      const one = yield* deliveries.redeliverMany(
        owner,
        byIds(failed.slice(1))
      );

      assert.lengthOf(one.redelivered, 1);
      yield* deliveries.redeliver(
        owner,
        endpoint.id,
        failed[0]?.id ?? "missing"
      );
    })
  );

  it.effect("needs webhook:manage, and an endpoint of the workspace", () =>
    Effect.gen(function* guarded() {
      const owner = yield* freshOwner;
      const stranger = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint, failed } = yield* failing(owner, 1);

      assert.deepStrictEqual(
        yield* Effect.all([
          tagOf(
            deliveries.redeliverMany(
              memberOf(owner.workspaceId, "viewer"),
              byIds(failed)
            )
          ),
          tagOf(deliveries.redeliverMany(stranger, failedOf(endpoint.id))),
        ]),
        ["MissingPermission", "EndpointNotFound"]
      );

      const theirs = yield* deliveries.redeliverMany(stranger, byIds(failed));

      assert.deepStrictEqual(
        theirs.skipped.map(({ reason }) => reason),
        ["notFound"]
      );
    })
  );
});
