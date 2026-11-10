import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/** A webhook endpoint's id: a UUIDv7, so endpoints list oldest first. */
export const WebhookEndpointIdSchema = Uuid7Schema.pipe(
  Schema.brand("WebhookEndpointId")
);

export type WebhookEndpointId = typeof WebhookEndpointIdSchema.Type;
