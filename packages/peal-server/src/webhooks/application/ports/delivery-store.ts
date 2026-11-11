import { Context, Option } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";
import type { WebhookEventId } from "#webhooks/domain/webhook-event-id.ts";
import type {
  SubscribableEventType,
  WebhookEventType,
} from "#webhooks/domain/webhook-event-type.ts";

/** A page of deliveries, newest first. */
export interface DeliveryPageRequest {
  /** The last delivery of the page before, if this is not the first. */
  readonly after: Option.Option<WebhookDeliveryId>;
  readonly limit: number;
}

/** Where a delivery stands, as the log filters it. */
export type DeliveryStatusTag = WebhookDelivery["status"]["_tag"];

/**
 * Which deliveries of a workspace's log to list: each filter left out
 * keeps them all. `since` and `until` bound when a delivery was made,
 * `since` included and `until` not.
 */
export interface DeliveryFilters {
  readonly endpointId: Option.Option<WebhookEndpointId>;
  readonly eventType: Option.Option<WebhookEventType>;
  readonly since: Option.Option<DateTime.Utc>;
  readonly status: Option.Option<DeliveryStatusTag>;
  readonly until: Option.Option<DateTime.Utc>;
}

/** No filter: every delivery. */
export const anyDelivery: DeliveryFilters = {
  endpointId: Option.none(),
  eventType: Option.none(),
  since: Option.none(),
  status: Option.none(),
  until: Option.none(),
};

/**
 * Which of an endpoint's failed deliveries to send again: those made in
 * a time range, of a type.
 */
export interface FailedSelection {
  readonly eventType: Option.Option<SubscribableEventType>;
  readonly since: Option.Option<DateTime.Utc>;
  readonly until: Option.Option<DateTime.Utc>;
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
    /**
     * The workspace's deliveries, of every endpoint it has (a partner
     * endpoint's of its tenants' events included), newest first.
     */
    readonly search: (
      workspaceId: WorkspaceId,
      filters: DeliveryFilters,
      request: DeliveryPageRequest
    ) => Effect.Effect<DeliveryPage, DatabaseError>;
    /**
     * These deliveries of the workspace's endpoints, held until the
     * transaction ends, so calls to send them again take turns; those that
     * are not its own are left out.
     */
    readonly lockIn: (
      workspaceId: WorkspaceId,
      deliveryIds: readonly WebhookDeliveryId[]
    ) => Effect.Effect<readonly WebhookDelivery[], DatabaseError>;
    /**
     * The endpoint's failed deliveries that `selection` names and that
     * are the last of their event to it, oldest first, `limit` at most,
     * held as `lockIn` holds them; and how many there are in all.
     */
    readonly lockFailed: (
      endpointId: WebhookEndpointId,
      selection: FailedSelection,
      limit: number
    ) => Effect.Effect<
      {
        readonly deliveries: readonly WebhookDelivery[];
        readonly total: number;
      },
      DatabaseError
    >;
    /**
     * Those of these deliveries whose event has a newer delivery to the
     * same endpoint that is pending or succeeded: sent again already.
     */
    readonly sentAgain: (
      deliveries: readonly WebhookDelivery[]
    ) => Effect.Effect<ReadonlySet<WebhookDeliveryId>, DatabaseError>;
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
