import { Context } from "effect";
import type { Duration, Effect } from "effect";

import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

/**
 * Makes a delivery's attempts, after the transaction that saved it
 * commits, and keeps trying on the retry schedule: the first at once, or
 * `startAfter` later, to space out deliveries sent again together.
 * Starting it twice for one delivery runs it once.
 */
export class DeliveryJobs extends Context.Service<
  DeliveryJobs,
  {
    readonly start: (
      deliveryId: WebhookDeliveryId,
      startAfter?: Duration.Duration
    ) => Effect.Effect<void>;
  }
>()("peal-server/webhooks/application/DeliveryJobs") {}
