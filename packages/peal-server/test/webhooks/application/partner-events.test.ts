// A partner hears what happens in the workspaces it owns: on the endpoints
// of the `partner` scope in its home workspace, with its own id for each.
import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref, Schema } from "effect";

import { newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";
import { FakeTransport } from "#test/webhooks/fakes/fake-transport.ts";
import { StartedJobs } from "#test/webhooks/fakes/started-jobs.ts";
import { ToldNotices } from "#test/webhooks/fakes/told-notices.ts";
import {
  freshEndpoint,
  freshOwner,
  SecretsTest,
} from "#test/webhooks/support.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { EventOrigins } from "#webhooks/application/ports/event-origins.ts";
import type { EventOrigin } from "#webhooks/application/ports/event-origins.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";
import { webhooksWith } from "#webhooks/container.ts";
import { bodyOf } from "#webhooks/domain/recorded-event.ts";
import { DrizzleDeliveryStore } from "#webhooks/infrastructure/drizzle-delivery-store.ts";
import { DrizzleEndpointStore } from "#webhooks/infrastructure/drizzle-endpoint-store.ts";

// Whose each workspace is, as a test says.
class Owned extends Context.Service<
  Owned,
  Ref.Ref<ReadonlyMap<WorkspaceId, EventOrigin>>
>()("test/webhooks/Owned") {
  static readonly layer = Layer.effect(
    Owned,
    Ref.make<ReadonlyMap<WorkspaceId, EventOrigin>>(new Map())
  );
}

const OriginsTest = Layer.effect(
  EventOrigins,
  Effect.gen(function* OriginsTest() {
    const owned = yield* Owned;

    return EventOrigins.of({
      isPartnerHome: (workspaceId) =>
        Ref.get(owned).pipe(
          Effect.map((origins) =>
            [...origins.values()].some(
              ({ homeWorkspaceId }) => homeWorkspaceId === workspaceId
            )
          )
        ),
      of: (workspaceId) =>
        Ref.get(owned).pipe(
          Effect.map((origins) =>
            Option.fromUndefinedOr(origins.get(workspaceId))
          )
        ),
    });
  })
);

const PartnerWebhooksTest = webhooksWith(
  Layer.mergeAll(
    DrizzleEndpointStore,
    DrizzleDeliveryStore,
    SecretsTest,
    FakeTransport.layer,
    StartedJobs.layer,
    ToldNotices.layer,
    OriginsTest
  )
).pipe(
  Layer.provideMerge(Owned.layer),
  Layer.provideMerge(TransactionsTest),
  Layer.provideMerge(DatabaseTest)
);

// The partner whose home workspace is `home` owns `workspace`.
const owns = (
  home: Actor,
  workspace: Actor,
  externalId: Option.Option<string>
) =>
  Owned.use((owned) =>
    Ref.update(owned, (origins) =>
      new Map(origins).set(workspace.workspaceId, {
        externalId,
        homeWorkspaceId: home.workspaceId,
      })
    )
  );

// An account connected in the actor's workspace, under a key of its own.
const connected = Effect.fn("connected")(function* connected(actor: Actor) {
  const channelId = yield* newId(ChannelIdSchema);

  const request: EventToPublish = {
    event: {
      data: {
        channelId,
        platform: "mastodon",
        reconnected: false,
        workspaceId: actor.workspaceId,
      },
      type: "channel.connected",
    },
    key: `channel:${channelId}:connected:${String(DateTime.toEpochMillis(yield* DateTime.now))}`,
  };

  return request;
});

const logOf = (actor: Actor, endpointId: string) =>
  WebhookDeliveries.use((deliveries) =>
    deliveries.page(actor, endpointId, { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ items }) => items));

const PayloadSchema = Schema.fromJsonString(
  Schema.Struct({
    data: Schema.Struct({ workspaceId: Schema.String }),
    workspaceExternalId: Schema.NullOr(Schema.String),
  })
);

// The body receivers get for the one event in an endpoint's log.
const payloadOf = Effect.fn("payloadOf")(function* payloadOf(
  actor: Actor,
  endpointId: string
) {
  const [delivery] = yield* logOf(actor, endpointId);

  const recorded = yield* DeliveryStore.use((store) =>
    store.event(Option.getOrThrow(Option.fromUndefinedOr(delivery)).eventId)
  );

  return yield* Schema.decodeUnknownEffect(PayloadSchema)(
    bodyOf(Option.getOrThrow(recorded))
  );
});

const channelEvents = { eventTypes: ["channel.connected"] } as const;

layer(PartnerWebhooksTest)("a partner's webhook endpoints", (it) => {
  it.effect(
    "hear every workspace the partner owns, with the partner's own id for it",
    () =>
      Effect.gen(function* hears() {
        const home = yield* freshOwner;
        const customer = yield* freshOwner;
        const stranger = yield* freshOwner;
        const events = yield* WebhookEvents;

        yield* owns(home, customer, Option.some("cus_42"));

        const partnerWide = yield* freshEndpoint(home, {
          ...channelEvents,
          scope: "partner",
        });

        const homeOnly = yield* freshEndpoint(home, channelEvents);
        const ofCustomer = yield* freshEndpoint(customer, channelEvents);
        const ofStranger = yield* freshEndpoint(stranger, channelEvents);

        yield* events.publish(yield* connected(customer));

        // The partner's endpoint and the workspace's own: nobody else's,
        // and not the home workspace's endpoints that hear it alone.
        assert.deepStrictEqual(
          yield* Effect.all([
            payloadOf(home, partnerWide.endpoint.id),
            payloadOf(customer, ofCustomer.endpoint.id),
          ]),
          [
            {
              data: { workspaceId: customer.workspaceId },
              workspaceExternalId: "cus_42",
            },
            {
              data: { workspaceId: customer.workspaceId },
              workspaceExternalId: "cus_42",
            },
          ]
        );
        assert.lengthOf(yield* logOf(home, homeOnly.endpoint.id), 0);
        assert.lengthOf(yield* logOf(stranger, ofStranger.endpoint.id), 0);
      })
  );

  it.effect("hear their home workspace too, and nothing of anyone else's", () =>
    Effect.gen(function* own() {
      const home = yield* freshOwner;
      const stranger = yield* freshOwner;
      const other = yield* freshOwner;
      const events = yield* WebhookEvents;

      const customer = yield* freshOwner;

      // The home workspace's partner owns a customer; another partner
      // owns the stranger.
      yield* owns(home, customer, Option.none());
      yield* owns(other, stranger, Option.none());

      const partnerWide = yield* freshEndpoint(home, {
        ...channelEvents,
        scope: "partner",
      });

      yield* events.publish(yield* connected(stranger));

      assert.lengthOf(yield* logOf(home, partnerWide.endpoint.id), 0);

      yield* events.publish(yield* connected(home));

      assert.deepStrictEqual(yield* payloadOf(home, partnerWide.endpoint.id), {
        data: { workspaceId: home.workspaceId },
        workspaceExternalId: null,
      });
    })
  );

  it.effect("are added to a partner's home workspace only", () =>
    Effect.gen(function* refused() {
      const home = yield* freshOwner;
      const customer = yield* freshOwner;
      const ordinary = yield* freshOwner;

      yield* owns(home, customer, Option.none());

      const refusals = yield* Effect.all(
        [customer, ordinary].map((actor) =>
          freshEndpoint(actor, { scope: "partner" }).pipe(
            Effect.flip,
            Effect.map(({ _tag }) => _tag)
          )
        )
      );

      assert.deepStrictEqual(refusals, [
        "PartnerScopeUnavailable",
        "PartnerScopeUnavailable",
      ]);

      const added = yield* freshEndpoint(home, { scope: "partner" });

      assert.strictEqual(added.endpoint.scope, "partner");
    })
  );

  it.effect("hear the workspaces they list only, the home one if listed", () =>
    Effect.gen(function* filtered() {
      const home = yield* freshOwner;
      const listed = yield* freshOwner;
      const unlisted = yield* freshOwner;
      const events = yield* WebhookEvents;

      yield* owns(home, listed, Option.some("staging"));
      yield* owns(home, unlisted, Option.none());

      const staging = yield* freshEndpoint(home, {
        ...channelEvents,
        scope: "partner",
        workspaceIds: [listed.workspaceId],
      });

      yield* events.publish(yield* connected(unlisted));
      yield* events.publish(yield* connected(home));
      yield* events.publish(yield* connected(listed));

      assert.deepStrictEqual(yield* payloadOf(home, staging.endpoint.id), {
        data: { workspaceId: listed.workspaceId },
        workspaceExternalId: "staging",
      });
      assert.lengthOf(yield* logOf(home, staging.endpoint.id), 1);
    })
  );

  it.effect("are logged in the home workspace, naming each tenant", () =>
    Effect.gen(function* logged() {
      const home = yield* freshOwner;
      const customer = yield* freshOwner;
      const events = yield* WebhookEvents;
      const deliveries = yield* WebhookDeliveries;

      yield* owns(home, customer, Option.some("cus_7"));

      const partnerWide = yield* freshEndpoint(home, {
        ...channelEvents,
        scope: "partner",
      });

      yield* events.publish(yield* connected(customer));

      const { items } = yield* deliveries.search(
        home,
        {
          endpointId: Option.none(),
          eventType: Option.none(),
          since: Option.none(),
          status: Option.none(),
          until: Option.none(),
        },
        { after: Option.none(), limit: 10 }
      );

      assert.deepStrictEqual(
        items.map((delivery) => [
          delivery.endpointId,
          delivery.workspaceId,
          delivery.eventWorkspaceId,
          Option.getOrNull(delivery.externalId),
        ]),
        [
          [
            partnerWide.endpoint.id,
            home.workspaceId,
            customer.workspaceId,
            "cus_7",
          ],
        ]
      );

      // The tenant's own log has none of the partner's deliveries.
      const theirs = yield* deliveries.search(
        customer,
        {
          endpointId: Option.none(),
          eventType: Option.none(),
          since: Option.none(),
          status: Option.none(),
          until: Option.none(),
        },
        { after: Option.none(), limit: 10 }
      );

      assert.lengthOf(theirs.items, 0);
    })
  );
});
