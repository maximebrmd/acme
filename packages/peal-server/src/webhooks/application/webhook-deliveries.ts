import { Context, Duration, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  bulkReplaySpacing,
  maxBulkRedelivery,
} from "#webhooks/domain/delivery-policy.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";
import type { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

import { DeliveryNotFound } from "./delivery-not-found.ts";
import { dispatch } from "./dispatch.ts";
import { EndpointDisabled } from "./endpoint-disabled.ts";
import { EndpointNotFound } from "./endpoint-not-found.ts";
import type { DeliveryJobs } from "./ports/delivery-jobs.ts";
import { anyDelivery, DeliveryStore } from "./ports/delivery-store.ts";
import type {
  DeliveryFilters,
  DeliveryPage,
  DeliveryPageRequest,
  FailedSelection,
} from "./ports/delivery-store.ts";
import { EndpointStore } from "./ports/endpoint-store.ts";
import { ManualSends } from "./ports/manual-sends.ts";
import { refusedSends } from "./refused-sends.ts";
import type { TooManyManualSends } from "./too-many-manual-sends.ts";

const decodeEndpointId = Schema.decodeUnknownOption(WebhookEndpointIdSchema);

const decodeDeliveryId = Schema.decodeUnknownOption(WebhookDeliveryIdSchema);

/** What one endpoint's log is filtered by. */
export type EndpointLogFilters = Pick<DeliveryFilters, "eventType" | "status">;

/** The workspace's log across endpoints, filtered by an endpoint too. */
export type LogFilters = Omit<DeliveryFilters, "endpointId"> & {
  readonly endpointId: Option.Option<string>;
};

/**
 * Which deliveries to send again: these, by id, or the failed deliveries
 * of an endpoint that a selection names.
 */
export type Redelivery =
  | { readonly _tag: "ids"; readonly deliveryIds: readonly string[] }
  | ({
      readonly _tag: "failed";
      readonly endpointId: string;
    } & FailedSelection);

/**
 * Why a delivery asked for was not sent again: its endpoint is off, it is
 * not one of the workspace's, or its event was sent again already, and
 * that delivery is pending or went through.
 */
export type SkipReason = "alreadySent" | "endpointDisabled" | "notFound";

export interface Skipped {
  readonly deliveryId: string;
  readonly reason: SkipReason;
}

/** What a call to send many again did. */
export interface Redelivered {
  readonly redelivered: readonly WebhookDelivery[];
  /** How many more failed deliveries the selection holds. */
  readonly remaining: number;
  readonly skipped: readonly Skipped[];
}

interface Sending {
  readonly delivery: WebhookDelivery;
  readonly endpoint: WebhookEndpoint;
}

/**
 * A workspace's delivery logs, for someone acting in it: reading them
 * needs webhook:read, sending a delivery again webhook:manage.
 */
export class WebhookDeliveries extends Context.Service<
  WebhookDeliveries,
  {
    /** The endpoint's deliveries, newest first, a page at a time. */
    readonly page: (
      actor: Actor,
      endpointId: string,
      request: DeliveryPageRequest,
      filters?: EndpointLogFilters
    ) => Effect.Effect<
      DeliveryPage,
      DatabaseError | EndpointNotFound | MissingPermission
    >;
    /**
     * The workspace's deliveries across its endpoints, newest first, a
     * page at a time: a partner endpoint's include those of its tenants'
     * events. An endpoint id that names none of the workspace's lists
     * nothing.
     */
    readonly search: (
      actor: Actor,
      filters: LogFilters,
      request: DeliveryPageRequest
    ) => Effect.Effect<DeliveryPage, DatabaseError | MissingPermission>;
    /**
     * Sends a delivery's event to its endpoint again, as a new delivery:
     * the receiver gets the same event id and body, signed anew.
     */
    readonly redeliver: (
      actor: Actor,
      endpointId: string,
      deliveryId: string
    ) => Effect.Effect<
      WebhookDelivery,
      | DatabaseError
      | DeliveryNotFound
      | EndpointDisabled
      | EndpointNotFound
      | MissingPermission
      | TooManyManualSends
    >;
    /**
     * Sends many deliveries again, `maxBulkRedelivery` at most, each to
     * its own endpoint whatever that endpoint's filters are now, in one
     * transaction: the budget of `bulkRedeliveriesPerHour` is taken for
     * them all or the call sends nothing, and calls sent together take
     * turns on the deliveries, so none is sent twice. A selection takes
     * the endpoint's failed deliveries oldest first, the last of each
     * event only. Each endpoint's are started `bulkReplaySpacing` apart.
     */
    readonly redeliverMany: (
      actor: Actor,
      redelivery: Redelivery
    ) => Effect.Effect<
      Redelivered,
      DatabaseError | EndpointNotFound | MissingPermission | TooManyManualSends
    >;
  }
>()("peal-server/webhooks/application/WebhookDeliveries") {
  static readonly layer = Layer.effect(
    WebhookDeliveries,
    Effect.gen(function* WebhookDeliveriesLive() {
      const endpoints = yield* EndpointStore;
      const deliveries = yield* DeliveryStore;
      const manual = yield* ManualSends;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<DeliveryJobs | DeliveryStore | Ids>();

      const endpointOf = Effect.fn("WebhookDeliveries.endpointOf")(
        function* endpointOf(actor: Actor, endpointId: string) {
          const id = decodeEndpointId(endpointId);

          const endpoint = Option.isSome(id)
            ? yield* endpoints.findIn(actor.workspaceId, id.value)
            : Option.none<WebhookEndpoint>();

          return Option.isSome(endpoint)
            ? endpoint.value
            : yield* new EndpointNotFound({ endpointId });
        }
      );

      const page = Effect.fn("WebhookDeliveries.page")(function* page(
        actor: Actor,
        endpointId: string,
        request: DeliveryPageRequest,
        filters: EndpointLogFilters = anyDelivery
      ) {
        yield* Effect.fromResult(authorize(actor, "webhook:read"));

        const endpoint = yield* endpointOf(actor, endpointId);

        return yield* deliveries.search(
          actor.workspaceId,
          {
            ...anyDelivery,
            endpointId: Option.some(endpoint.id),
            eventType: filters.eventType,
            status: filters.status,
          },
          request
        );
      });

      const search = Effect.fn("WebhookDeliveries.search")(function* search(
        actor: Actor,
        { endpointId, ...filters }: LogFilters,
        request: DeliveryPageRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "webhook:read"));

        const id = endpointId.pipe(Option.map(decodeEndpointId));

        // An id that is not one names no endpoint: nothing is listed.
        if (Option.isSome(id) && Option.isNone(id.value)) {
          const empty: DeliveryPage = { items: [], next: Option.none() };

          return empty;
        }

        return yield* deliveries.search(
          actor.workspaceId,
          { ...filters, endpointId: Option.flatten(id) },
          request
        );
      });

      const redeliver = Effect.fn("WebhookDeliveries.redeliver")(
        function* redeliver(
          actor: Actor,
          endpointId: string,
          deliveryId: string
        ) {
          yield* Effect.fromResult(authorize(actor, "webhook:manage"));

          const endpoint = yield* endpointOf(actor, endpointId);
          const id = decodeDeliveryId(deliveryId);

          const delivery = Option.isSome(id)
            ? yield* deliveries.findIn(actor.workspaceId, endpoint.id, id.value)
            : Option.none<WebhookDelivery>();

          const recorded = Option.isSome(delivery)
            ? yield* deliveries.event(delivery.value.eventId)
            : Option.none();

          if (Option.isNone(delivery) || Option.isNone(recorded)) {
            return yield* new DeliveryNotFound({ deliveryId });
          }

          if (endpoint.status._tag === "disabled") {
            return yield* new EndpointDisabled({ endpointId: endpoint.id });
          }

          const original = delivery.value;
          const event = recorded.value;

          return yield* transaction(
            Effect.gen(function* sendAgainWithinBudget() {
              yield* refusedSends(
                yield* manual.take(actor.workspaceId, "single", 1)
              );

              return yield* dispatch(endpoint, event, {
                redeliveryOf: original.id,
              });
            })
          );
        },
        Effect.provideContext(ports)
      );

      // The deliveries a call names, held for its transaction, with those
      // it names that are not the workspace's.
      const chosen = Effect.fn("WebhookDeliveries.chosen")(function* chosen(
        actor: Actor,
        redelivery: Redelivery
      ) {
        if (redelivery._tag === "failed") {
          const endpoint = yield* endpointOf(actor, redelivery.endpointId);

          const { deliveries: failed, total } = yield* deliveries.lockFailed(
            endpoint.id,
            redelivery,
            maxBulkRedelivery
          );

          return {
            found: failed,
            missing: [],
            remaining: Math.max(0, total - failed.length),
          };
        }

        const asked = [
          ...new Set(redelivery.deliveryIds.slice(0, maxBulkRedelivery)),
        ];

        const ids = asked.flatMap((deliveryId) =>
          Option.toArray(decodeDeliveryId(deliveryId))
        );

        const found = yield* deliveries.lockIn(actor.workspaceId, ids);
        const known = new Set<string>(found.map(({ id }) => id));

        return {
          found,
          missing: asked.filter((deliveryId) => !known.has(deliveryId)),
          remaining: 0,
        };
      });

      // Each delivery's endpoint, read once.
      const endpointsOf = Effect.fn("WebhookDeliveries.endpointsOf")(
        function* endpointsOf(found: readonly WebhookDelivery[]) {
          const ids = [...new Set(found.map(({ endpointId }) => endpointId))];

          const read = yield* Effect.forEach(
            ids,
            (id) =>
              endpoints
                .get(id)
                .pipe(Effect.map((endpoint) => [id, endpoint] as const)),
            { concurrency: 1 }
          );

          return new Map<WebhookEndpointId, Option.Option<WebhookEndpoint>>(
            read
          );
        }
      );

      const redeliverMany = Effect.fn("WebhookDeliveries.redeliverMany")(
        function* redeliverMany(actor: Actor, redelivery: Redelivery) {
          yield* Effect.fromResult(authorize(actor, "webhook:manage"));

          return yield* transaction(
            Effect.gen(function* sendManyAgain() {
              const { found, missing, remaining } = yield* chosen(
                actor,
                redelivery
              );

              // Read once the deliveries are held: what another call sent
              // again before it let them go is seen here.
              const sentAgain = yield* deliveries.sentAgain(found);
              const owners = yield* endpointsOf(found);

              const skipped: Skipped[] = missing.map((deliveryId) => ({
                deliveryId,
                reason: "notFound",
              }));

              const sending: Sending[] = [];

              // One delivery of an event to an endpoint is sent again,
              // however many of them the call names: the newest.
              const newest = new Map<string, WebhookDelivery["id"]>(
                found.map((delivery) => [
                  `${delivery.endpointId}:${delivery.eventId}`,
                  delivery.id,
                ])
              );

              for (const delivery of found) {
                const owner = owners.get(delivery.endpointId) ?? Option.none();

                if (Option.isNone(owner)) {
                  skipped.push({ deliveryId: delivery.id, reason: "notFound" });
                } else if (owner.value.status._tag === "disabled") {
                  skipped.push({
                    deliveryId: delivery.id,
                    reason: "endpointDisabled",
                  });
                } else if (
                  delivery.status._tag === "pending" ||
                  sentAgain.has(delivery.id) ||
                  newest.get(`${delivery.endpointId}:${delivery.eventId}`) !==
                    delivery.id
                ) {
                  skipped.push({
                    deliveryId: delivery.id,
                    reason: "alreadySent",
                  });
                } else {
                  sending.push({ delivery, endpoint: owner.value });
                }
              }

              if (sending.length > 0) {
                yield* refusedSends(
                  yield* manual.take(actor.workspaceId, "bulk", sending.length)
                );
              }

              // Each endpoint's in turn, `bulkReplaySpacing` apart.
              const turns = new Map<WebhookEndpointId, number>();

              const redelivered = yield* Effect.forEach(
                sending,
                Effect.fnUntraced(function* sendAgain({ delivery, endpoint }) {
                  const turn = turns.get(endpoint.id) ?? 0;

                  turns.set(endpoint.id, turn + 1);

                  const recorded = yield* deliveries.event(delivery.eventId);

                  return Option.isSome(recorded)
                    ? [
                        yield* dispatch(endpoint, recorded.value, {
                          redeliveryOf: delivery.id,
                          startAfter: Duration.times(bulkReplaySpacing, turn),
                        }),
                      ]
                    : [];
                }),
                // In order: each endpoint's turns count up.
                { concurrency: 1 }
              );

              const result: Redelivered = {
                redelivered: redelivered.flat(),
                remaining,
                skipped,
              };

              return result;
            })
          );
        },
        Effect.provideContext(ports)
      );

      return WebhookDeliveries.of({
        page,
        redeliver,
        redeliverMany,
        search,
      });
    })
  );
}
