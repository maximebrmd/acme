import { DateTime, Option, Result, Schema } from "effect";
import type { Duration } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import {
  DeliveryAttemptSchema,
  isGone,
  isSuccess,
} from "./delivery-attempt.ts";
import type { DeliveryAttempt } from "./delivery-attempt.ts";
import { InvalidDeliveryTransition } from "./invalid-delivery-transition.ts";
import { WebhookDeliveryIdSchema } from "./webhook-delivery-id.ts";
import type { WebhookDeliveryId } from "./webhook-delivery-id.ts";
import { WebhookEndpointIdSchema } from "./webhook-endpoint-id.ts";
import type { WebhookEndpoint } from "./webhook-endpoint.ts";
import { WebhookEventIdSchema } from "./webhook-event-id.ts";
import type { WebhookEventId } from "./webhook-event-id.ts";
import { WebhookEventTypeSchema } from "./webhook-event-type.ts";
import type { WebhookEventType } from "./webhook-event-type.ts";

/**
 * Why a delivery failed for good:
 *
 * - `exhausted`: every attempt failed, over about a day.
 * - `gone`: the receiver answered 410 Gone.
 * - `endpointDisabled`: its endpoint was turned off before it got through.
 * - `notConfigured`: the server can no longer read the endpoint's secret
 *   (its key left `PEAL_TOKEN_KEYS`), so nothing can be signed.
 */
export const DeliveryFailureSchema = Schema.Literals([
  "exhausted",
  "gone",
  "endpointDisabled",
  "notConfigured",
]);

export type DeliveryFailure = typeof DeliveryFailureSchema.Type;

export const DeliveryStatusSchema = Schema.Union([
  // Waiting for its first attempt, or for the next one at `nextAttemptAt`.
  Schema.TaggedStruct("pending", {
    nextAttemptAt: Schema.Option(Schema.DateTimeUtc),
  }),
  Schema.TaggedStruct("succeeded", { at: Schema.DateTimeUtc }),
  Schema.TaggedStruct("failed", {
    at: Schema.DateTimeUtc,
    reason: DeliveryFailureSchema,
  }),
]);

export type DeliveryStatus = typeof DeliveryStatusSchema.Type;

/**
 * One event on its way to one endpoint, as the endpoint's log shows it:
 * how many attempts were made, how the last one ended, and whether another
 * follows. Sending an event again is a new delivery of the same event,
 * which names the one it repeats (`redeliveryOf`).
 *
 * `workspaceId` is its endpoint's, whose log it is in; the event happened
 * in `eventWorkspaceId`, another one for a partner endpoint's delivery of
 * a tenant's event, which the partner knows by `externalId`.
 */
export class WebhookDelivery extends Schema.Class<WebhookDelivery>(
  "peal-server/webhooks/domain/WebhookDelivery"
)({
  attempts: Schema.Int,
  createdAt: Schema.DateTimeUtc,
  endpointId: WebhookEndpointIdSchema,
  eventId: WebhookEventIdSchema,
  eventType: WebhookEventTypeSchema,
  eventWorkspaceId: WorkspaceIdSchema,
  externalId: Schema.Option(Schema.String),
  id: WebhookDeliveryIdSchema,
  lastAttempt: Schema.Option(DeliveryAttemptSchema),
  redeliveryOf: Schema.Option(WebhookDeliveryIdSchema),
  status: DeliveryStatusSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** The event a delivery sends, as it was recorded. */
export interface DeliveredEvent {
  readonly externalId: Option.Option<string>;
  readonly id: WebhookEventId;
  readonly type: WebhookEventType;
  readonly workspaceId: WorkspaceId;
}

type Transition = Result.Result<WebhookDelivery, InvalidDeliveryTransition>;

type Fields = ConstructorParameters<typeof WebhookDelivery>[0];

// The delivery with some fields changed.
const withFields = (
  delivery: WebhookDelivery,
  changed: Partial<Fields>
): WebhookDelivery =>
  new WebhookDelivery({
    attempts: delivery.attempts,
    createdAt: delivery.createdAt,
    endpointId: delivery.endpointId,
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    eventWorkspaceId: delivery.eventWorkspaceId,
    externalId: delivery.externalId,
    id: delivery.id,
    lastAttempt: delivery.lastAttempt,
    redeliveryOf: delivery.redeliveryOf,
    status: delivery.status,
    workspaceId: delivery.workspaceId,
    ...changed,
  });

/**
 * A delivery of the event to the endpoint, about to be attempted: the
 * event's first, or one that sends it again (`redeliveryOf`).
 */
export const createDelivery = (
  id: WebhookDeliveryId,
  endpoint: WebhookEndpoint,
  event: DeliveredEvent,
  now: DateTime.Utc,
  redeliveryOf: Option.Option<WebhookDeliveryId> = Option.none()
): WebhookDelivery =>
  new WebhookDelivery({
    attempts: 0,
    createdAt: now,
    endpointId: endpoint.id,
    eventId: event.id,
    eventType: event.type,
    eventWorkspaceId: event.workspaceId,
    externalId: event.externalId,
    id,
    lastAttempt: Option.none(),
    redeliveryOf,
    status: { _tag: "pending", nextAttemptAt: Option.none() },
    workspaceId: endpoint.workspaceId,
  });

const over = (delivery: WebhookDelivery): Option.Option<Transition> =>
  delivery.status._tag === "pending"
    ? Option.none()
    : Option.some(
        Result.fail(
          new InvalidDeliveryTransition({
            deliveryId: delivery.id,
            from: delivery.status._tag,
          })
        )
      );

/**
 * Records attempt number `attempt` of a pending delivery: delivered on a
 * 2xx answer; otherwise tried again after `retryIn`, or failed for good
 * when no attempt is left, or at once when the receiver answered 410 Gone.
 * The number is the caller's, so an attempt recorded twice counts once.
 */
export const recordAttempt = (
  delivery: WebhookDelivery,
  attempt: number,
  made: DeliveryAttempt,
  retryIn: Option.Option<Duration.Duration>
): Transition =>
  over(delivery).pipe(
    Option.getOrElse((): Transition => {
      const settled = (status: DeliveryStatus) =>
        Result.succeed(
          withFields(delivery, {
            attempts: Math.max(delivery.attempts, attempt),
            lastAttempt: Option.some(made),
            status,
          })
        );

      if (isSuccess(made.outcome)) {
        return settled({ _tag: "succeeded", at: made.at });
      }

      if (isGone(made.outcome)) {
        return settled({ _tag: "failed", at: made.at, reason: "gone" });
      }

      return Option.match(retryIn, {
        onNone: () =>
          settled({ _tag: "failed", at: made.at, reason: "exhausted" }),
        onSome: (delay) =>
          settled({
            _tag: "pending",
            nextAttemptAt: Option.some(DateTime.addDuration(made.at, delay)),
          }),
      });
    })
  );

/** Ends a pending delivery that can no longer be attempted. */
export const abandonDelivery = (
  delivery: WebhookDelivery,
  reason: "endpointDisabled" | "notConfigured",
  now: DateTime.Utc
): Transition =>
  over(delivery).pipe(
    Option.getOrElse((): Transition =>
      Result.succeed(
        withFields(delivery, { status: { _tag: "failed", at: now, reason } })
      )
    )
  );
