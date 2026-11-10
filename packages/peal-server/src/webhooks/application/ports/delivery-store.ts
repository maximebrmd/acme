import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";
import type { WebhookEventId } from "#webhooks/domain/webhook-event-id.ts";

/** A page of an endpoint's deliveries, newest first. */
export interface DeliveryPageRequest {
  /** The last delivery of the page before, if this is not the first. */
  readonly after: Option.Option<WebhookDeliveryId>;
  readonly limit: number;
}

export interface DeliveryPage {
  readonly items: readonly WebhookDelivery[];
  /** Where the next page starts, if there is one. */
  readonly next: Option.Option<WebhookDeliveryId>;
}

/**
 * The events on their way to endpoints, and each endpoint's log of
 * deliveries. Events hold ids, states, codes and instants, never content.
 */
export class DeliveryStore extends Context.Service<
  DeliveryStore,
  {
    /**
     * Keeps an event under the key that names what happened, and says
     * whether it is new: false, keeping nothing, for a key seen before, so
     * a fact told twice is sent once.
     */
    readonly recordEvent: (
      event: RecordedEvent,
      key: string
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly event: (
      eventId: WebhookEventId
    ) => Effect.Effect<Option.Option<RecordedEvent>, DatabaseError>;
    readonly insert: (
      delivery: WebhookDelivery
    ) => Effect.Effect<void, DatabaseError>;
    /** Any workspace's delivery, for the job that makes its attempts. */
    readonly get: (
      deliveryId: WebhookDeliveryId
    ) => Effect.Effect<Option.Option<WebhookDelivery>, DatabaseError>;
    /** The delivery, if it is one of this endpoint of the workspace. */
    readonly findIn: (
      workspaceId: WorkspaceId,
      endpointId: WebhookEndpointId,
      deliveryId: WebhookDeliveryId
    ) => Effect.Effect<Option.Option<WebhookDelivery>, DatabaseError>;
    /** Saves how a delivery's attempts stand. */
    readonly save: (
      delivery: WebhookDelivery
    ) => Effect.Effect<void, DatabaseError>;
    readonly page: (
      endpointId: WebhookEndpointId,
      request: DeliveryPageRequest
    ) => Effect.Effect<DeliveryPage, DatabaseError>;
    /**
     * Deletes up to `limit` deliveries created before `before`, then the
     * events no delivery refers to any more, and says how many deliveries
     * went.
     */
    readonly purge: (
      before: DateTime.Utc,
      limit: number
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/webhooks/application/DeliveryStore") {}
