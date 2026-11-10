import { Option } from "effect";
import type { ActivityEvent as ActivityEventView } from "peal-contract";

import type { ActivityEvent } from "#activity/domain/activity-event.ts";

/** An event as the API shows it to the workspace's owners. */
export const toEventView = (event: ActivityEvent): ActivityEventView => {
  const { actor } = event;

  return {
    actor:
      actor._tag === "apiKey"
        ? { _tag: "apiKey", apiKeyId: actor.apiKeyId }
        : { _tag: "user", userId: Option.getOrNull(actor.userId) },
    application: event.application.pipe(
      Option.map(({ id, name }) => ({ id, name: Option.getOrNull(name) })),
      Option.getOrNull
    ),
    errorCode: Option.getOrNull(event.errorCode),
    id: event.id,
    impersonated: event.impersonated,
    objectIds: event.objectIds,
    occurredAt: event.occurredAt,
    operation: event.operation,
    requestId: Option.getOrNull(event.requestId),
    status: Option.getOrNull(event.status),
    via: event.via,
  };
};
