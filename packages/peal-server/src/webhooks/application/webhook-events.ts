import { Context, DateTime, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { wants } from "#webhooks/domain/webhook-endpoint.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import type { WebhookEvent } from "#webhooks/domain/webhook-event.ts";

import { dispatch } from "./dispatch.ts";
import type { DeliveryJobs } from "./ports/delivery-jobs.ts";
import { DeliveryStore } from "./ports/delivery-store.ts";
import { EndpointStore } from "./ports/endpoint-store.ts";

/** Something that happened in a workspace, for its endpoints to hear. */
export interface EventToPublish {
  readonly event: WebhookEvent;
  /**
   * Names what happened, such as `post-target:<id>:<round>:published`: an
   * event whose key was published before is not sent again. Ids and
   * instants only, never content.
   */
  readonly key: string;
}

/**
 * Sends an event to the endpoints of its workspace that are on and
 * subscribe to its type: one delivery each, once per key.
 *
 * It runs in one transaction, joining the caller's: the event, its
 * deliveries and the start of their jobs commit with the fact they tell,
 * or not at all, and then a call again does it all again. The requests go
 * out after the commit. A workspace without such an endpoint keeps nothing.
 */
export class WebhookEvents extends Context.Service<
  WebhookEvents,
  {
    readonly publish: (
      request: EventToPublish
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/webhooks/application/WebhookEvents") {
  static readonly layer = Layer.effect(
    WebhookEvents,
    Effect.gen(function* WebhookEventsLive() {
      const endpoints = yield* EndpointStore;
      const deliveries = yield* DeliveryStore;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<DeliveryJobs | DeliveryStore | Ids>();

      const publishOnce = Effect.fn("WebhookEvents.publishOnce")(
        function* publishOnce({ event, key }: EventToPublish) {
          const { workspaceId } = event.data;

          const listening = (yield* endpoints.list(workspaceId)).filter(
            (endpoint) => wants(endpoint, event.type)
          );

          if (listening.length === 0) {
            return;
          }

          const recorded = new RecordedEvent({
            event,
            id: yield* newId(WebhookEventIdSchema),
            occurredAt: yield* DateTime.now,
            workspaceId,
          });

          if (!(yield* deliveries.recordEvent(recorded, key))) {
            return;
          }

          yield* Effect.forEach(
            listening,
            (endpoint) => dispatch(endpoint, recorded),
            { discard: true }
          );
        },
        Effect.provideContext(ports)
      );

      return WebhookEvents.of({
        publish: (request) =>
          transaction(publishOnce(request)).pipe(
            Effect.annotateLogs({ webhookEvent: request.event.type })
          ),
      });
    })
  );
}
