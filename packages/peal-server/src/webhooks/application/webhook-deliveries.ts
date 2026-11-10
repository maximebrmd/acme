import { Context, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import { WebhookDeliveryIdSchema } from "#webhooks/domain/webhook-delivery-id.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import type { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

import { DeliveryNotFound } from "./delivery-not-found.ts";
import { dispatch } from "./dispatch.ts";
import { EndpointDisabled } from "./endpoint-disabled.ts";
import { EndpointNotFound } from "./endpoint-not-found.ts";
import type { DeliveryJobs } from "./ports/delivery-jobs.ts";
import { DeliveryStore } from "./ports/delivery-store.ts";
import type {
  DeliveryPage,
  DeliveryPageRequest,
} from "./ports/delivery-store.ts";
import { EndpointStore } from "./ports/endpoint-store.ts";

const decodeEndpointId = Schema.decodeUnknownOption(WebhookEndpointIdSchema);

const decodeDeliveryId = Schema.decodeUnknownOption(WebhookDeliveryIdSchema);

/**
 * An endpoint's delivery log, for someone acting in its workspace: reading
 * it needs webhook:read, sending a delivery again webhook:manage.
 */
export class WebhookDeliveries extends Context.Service<
  WebhookDeliveries,
  {
    /** The endpoint's deliveries, newest first, a page at a time. */
    readonly page: (
      actor: Actor,
      endpointId: string,
      request: DeliveryPageRequest
    ) => Effect.Effect<
      DeliveryPage,
      DatabaseError | EndpointNotFound | MissingPermission
    >;
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
    >;
  }
>()("peal-server/webhooks/application/WebhookDeliveries") {
  static readonly layer = Layer.effect(
    WebhookDeliveries,
    Effect.gen(function* WebhookDeliveriesLive() {
      const endpoints = yield* EndpointStore;
      const deliveries = yield* DeliveryStore;
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
        request: DeliveryPageRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "webhook:read"));

        const endpoint = yield* endpointOf(actor, endpointId);

        return yield* deliveries.page(endpoint.id, request);
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

          if (Option.isNone(recorded)) {
            return yield* new DeliveryNotFound({ deliveryId });
          }

          if (endpoint.status._tag === "disabled") {
            return yield* new EndpointDisabled({ endpointId: endpoint.id });
          }

          return yield* transaction(dispatch(endpoint, recorded.value));
        },
        Effect.provideContext(ports)
      );

      return WebhookDeliveries.of({ page, redeliver });
    })
  );
}
