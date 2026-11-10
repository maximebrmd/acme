import { Schema } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";

/**
 * A webhook event's id: a UUIDv7. Receivers get it as `webhook-id`, the
 * same on every delivery of the event, and deduplicate with it.
 */
export const WebhookEventIdSchema = Uuid7Schema.pipe(
  Schema.brand("WebhookEventId")
);

export type WebhookEventId = typeof WebhookEventIdSchema.Type;
