import { Context } from "effect";
import type { Effect } from "effect";

import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";

/**
 * Makes a delivery's attempts, after the transaction that saved it
 * commits, and keeps trying on the retry schedule. Starting it twice for
 * one delivery runs it once.
 */
export class DeliveryJobs extends Context.Service<
  DeliveryJobs,
  { readonly start: (deliveryId: WebhookDeliveryId) => Effect.Effect<void> }
>()("peal-server/webhooks/application/DeliveryJobs") {}
