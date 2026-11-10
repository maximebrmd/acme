import { assert, layer } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";

import { actorIn } from "#test/channels/support.ts";
import { FakeTransport } from "#test/webhooks/fakes/fake-transport.ts";
import {
  freshEndpoint,
  freshOwner,
  WebhooksTest,
} from "#test/webhooks/support.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { PurgeDeliveries } from "#webhooks/application/purge-deliveries.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { WebhookRecords } from "#webhooks/application/webhook-records.ts";

const tagOf = <E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<unknown, E, R>
): Effect.Effect<string, never, R> =>
  effect.pipe(
    Effect.match({
      onFailure: (failure) => failure._tag,
      onSuccess: () => "succeeded",
    })
  );

const firstPage = { after: Option.none(), limit: 50 };

layer(WebhooksTest)("an endpoint's delivery log", (it) => {
  it.effect("lists its deliveries newest first, a page at a time", () =>
    Effect.gen(function* pages() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint } = yield* freshEndpoint(owner);
      const other = yield* freshEndpoint(owner);

      const sent = yield* Effect.forEach([1, 2, 3], () =>
        endpoints.sendTest(owner, endpoint.id)
      );

      yield* endpoints.sendTest(owner, other.endpoint.id);

      const newest = sent.map(({ id }) => id).toReversed();

      const first = yield* deliveries.page(owner, endpoint.id, {
        after: Option.none(),
        limit: 2,
      });

      assert.deepStrictEqual(
        first.items.map(({ id }) => id),
        newest.slice(0, 2)
      );
      assert.deepStrictEqual(first.next, Option.fromUndefinedOr(newest[1]));

      const second = yield* deliveries.page(owner, endpoint.id, {
        after: first.next,
        limit: 2,
      });

      assert.deepStrictEqual(
        second.items.map(({ id }) => id),
        newest.slice(2)
      );
      assert.deepStrictEqual(second.next, Option.none());
    })
  );

  it.effect("is read with webhook:read, in its own workspace only", () =>
    Effect.gen(function* guarded() {
      const owner = yield* freshOwner;
      const stranger = yield* freshOwner;
      const deliveries = yield* WebhookDeliveries;
      const { endpoint } = yield* freshEndpoint(owner);

      const delivery = yield* WebhookEndpoints.use((endpoints) =>
        endpoints.sendTest(owner, endpoint.id)
      );

      const readOnly = actorIn(
        owner.workspaceId,
        owner.permissions.filter((permission) => permission.endsWith(":read"))
      );

      const nobody = actorIn(owner.workspaceId, ["post:read"]);

      assert.lengthOf(
        (yield* deliveries.page(readOnly, endpoint.id, firstPage)).items,
        1
      );
      assert.strictEqual(
        yield* tagOf(deliveries.page(nobody, endpoint.id, firstPage)),
        "MissingPermission"
      );
      assert.strictEqual(
        yield* tagOf(deliveries.page(stranger, endpoint.id, firstPage)),
        "EndpointNotFound"
      );
      assert.strictEqual(
        yield* tagOf(deliveries.redeliver(readOnly, endpoint.id, delivery.id)),
        "MissingPermission"
      );
      assert.strictEqual(
        yield* tagOf(deliveries.redeliver(stranger, endpoint.id, delivery.id)),
        "EndpointNotFound"
      );
    })
  );

  it.effect("sends an event again as a new delivery of the same event", () =>
    Effect.gen(function* sendsAgain() {
      const owner = yield* freshOwner;
      const endpoints = yield* WebhookEndpoints;
      const deliveries = yield* WebhookDeliveries;
      const transport = yield* FakeTransport;
      const delivering = yield* DeliverWebhook;
      const { endpoint, host } = yield* freshEndpoint(owner);
      const other = yield* freshEndpoint(owner);
      const original = yield* endpoints.sendTest(owner, endpoint.id);

      yield* delivering.attempt(original.id, 1);
      yield* TestClock.adjust("10 minutes");

      const again = yield* deliveries.redeliver(
        owner,
        endpoint.id,
        original.id
      );

      yield* delivering.attempt(again.id, 1);

      const [first, second] = yield* transport.sentTo(host);

      assert(first !== undefined && second !== undefined);
      assert.notStrictEqual(again.id, original.id);
      assert.strictEqual(again.eventId, original.eventId);
      assert.strictEqual(
        second.headers["webhook-id"],
        first.headers["webhook-id"]
      );
      assert.strictEqual(second.body, first.body);
      assert.notStrictEqual(
        second.headers["webhook-timestamp"],
        first.headers["webhook-timestamp"]
      );
      assert.notStrictEqual(
        second.headers["webhook-signature"],
        first.headers["webhook-signature"]
      );
      assert.lengthOf(
        (yield* deliveries.page(owner, endpoint.id, firstPage)).items,
        2
      );

      // Only a delivery of this endpoint, and only while it is on.
      assert.strictEqual(
        yield* tagOf(
          deliveries.redeliver(owner, other.endpoint.id, original.id)
        ),
        "DeliveryNotFound"
      );
      assert.strictEqual(
        yield* tagOf(deliveries.redeliver(owner, endpoint.id, "not-an-id")),
        "DeliveryNotFound"
      );

      yield* endpoints.update(owner, endpoint.id, { enabled: false });

      assert.strictEqual(
        yield* tagOf(deliveries.redeliver(owner, endpoint.id, original.id)),
        "EndpointDisabled"
      );
    })
  );

  it.effect(
    "keeps a delivery thirty days, and its event as long as one refers to it",
    () =>
      Effect.gen(function* retention() {
        // Long before any other test's rows, which the purge must not reach:
        // it ends every workspace's retention.
        yield* TestClock.setTime(Date.UTC(1900, 0, 1));

        const owner = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const deliveries = yield* WebhookDeliveries;
        const store = yield* DeliveryStore;
        const { endpoint } = yield* freshEndpoint(owner);
        const old = yield* endpoints.sendTest(owner, endpoint.id);
        const alsoOld = yield* endpoints.sendTest(owner, endpoint.id);

        yield* TestClock.adjust("20 days");

        // Sent again: the event now has a delivery made later.
        const again = yield* deliveries.redeliver(owner, endpoint.id, old.id);

        yield* TestClock.adjust("11 days");

        assert.strictEqual(
          yield* PurgeDeliveries.use((purging) => purging.purge),
          2
        );

        assert.deepStrictEqual(
          (yield* deliveries.page(owner, endpoint.id, firstPage)).items.map(
            ({ id }) => id
          ),
          [again.id]
        );
        assert.isTrue(Option.isSome(yield* store.event(old.eventId)));
        assert.isTrue(Option.isNone(yield* store.event(alsoOld.eventId)));
      })
  );
});

layer(WebhooksTest)("a workspace's webhook records", (it) => {
  it.effect(
    "export its endpoints without their secrets, and erase everything",
    () =>
      Effect.gen(function* records() {
        const owner = yield* freshOwner;
        const neighbour = yield* freshOwner;
        const endpoints = yield* WebhookEndpoints;
        const store = yield* DeliveryStore;
        const webhooks = yield* WebhookRecords;
        const { endpoint } = yield* freshEndpoint(owner);
        const kept = yield* freshEndpoint(neighbour);
        const delivery = yield* endpoints.sendTest(owner, endpoint.id);

        assert.deepStrictEqual(
          yield* webhooks.exportWorkspace(owner.workspaceId),
          [
            {
              createdAt: endpoint.createdAt,
              description: endpoint.description,
              enabled: true,
              eventTypes: [...endpoint.eventTypes],
              id: endpoint.id,
              url: endpoint.url,
            },
          ]
        );

        yield* webhooks.eraseWorkspace(owner.workspaceId);

        assert.lengthOf(yield* endpoints.list(owner), 0);
        assert.isTrue(Option.isNone(yield* store.get(delivery.id)));
        assert.isTrue(Option.isNone(yield* store.event(delivery.eventId)));
        assert.lengthOf(yield* webhooks.exportWorkspace(owner.workspaceId), 0);
        assert.lengthOf(yield* endpoints.list(neighbour), 1);
        assert.strictEqual(
          (yield* endpoints.get(neighbour, kept.endpoint.id)).id,
          kept.endpoint.id
        );
      })
  );
});
