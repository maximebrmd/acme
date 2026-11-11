import { DateTime, Effect, Option, Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { WebhookEventIdSchema } from "./webhook-event-id.ts";
import { eventVersion, WebhookEventSchema } from "./webhook-event.ts";

/**
 * An event kept until its deliveries are over and their log expires: what
 * happened, when, the id receivers know it by, and, for a workspace a
 * partner owns, the partner's own id for it as it was then.
 */
export class RecordedEvent extends Schema.Class<RecordedEvent>(
  "peal-server/webhooks/domain/RecordedEvent"
)({
  event: WebhookEventSchema,
  externalId: Schema.Option(Schema.String).pipe(
    Schema.withConstructorDefault(Effect.succeed(Option.none()))
  ),
  id: WebhookEventIdSchema,
  occurredAt: Schema.DateTimeUtc,
  // A made-up event of its type, sent as a test: receivers never act on it.
  sample: Schema.Boolean.pipe(
    Schema.withConstructorDefault(Effect.succeed(false))
  ),
  workspaceId: WorkspaceIdSchema,
}) {}

const EventJson = Schema.toCodecJson(WebhookEventSchema);

// An event's JSON, as the object it is: its type and its data.
const decodeFields = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Json)
);

/**
 * The request body for an event, the same on every attempt: what the
 * Standard Webhooks specification recommends a payload holds (the event's
 * `type`, the `timestamp` it happened at, and its `data`), with its `id`
 * (also the `webhook-id` header), the `version` of its data, and
 * `workspaceExternalId`, the id a partner gave the workspace it happened
 * in, null for any other workspace. A sample adds `sample: true`, so its
 * receiver can tell it from a fact. What is signed is this text, byte for
 * byte.
 */
export const bodyOf = (recorded: RecordedEvent): string => {
  const fields = {
    ...decodeFields(Schema.encodeSync(EventJson)(recorded.event)),
    id: recorded.id,
    timestamp: DateTime.formatIso(recorded.occurredAt),
    version: eventVersion,
    workspaceExternalId: Option.getOrNull(recorded.externalId),
  };

  // Only a sample says so: the events of facts stay as they always were.
  return JSON.stringify(recorded.sample ? { ...fields, sample: true } : fields);
};
