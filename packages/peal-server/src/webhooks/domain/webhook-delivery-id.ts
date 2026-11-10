import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A delivery's id: a UUIDv7, so an endpoint's log reads newest first. */
export const WebhookDeliveryIdSchema = Uuid7Schema.pipe(
  Schema.brand("WebhookDeliveryId")
);

export type WebhookDeliveryId = typeof WebhookDeliveryIdSchema.Type;
