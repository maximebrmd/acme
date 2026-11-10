import { DateTime, Effect, Layer } from "effect";

import { Notify } from "#notifications/application/notify.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { EndpointNotices } from "#webhooks/application/ports/endpoint-notices.ts";
import { hostOf } from "#webhooks/domain/webhook-url.ts";

/**
 * Endpoint notices through the notifications context, which tells the
 * members who manage the workspace's webhooks once per key, in the app and
 * by email, in the transaction that turned the endpoint off. The key names
 * that turning off (the endpoint, and when), so one turned back on and
 * failing again is told again. The notice names the endpoint by its id and its host, never its
 * whole address.
 */
export const NotifiedEndpointNotices = Layer.effect(
  EndpointNotices,
  Effect.gen(function* NotifiedEndpointNotices() {
    const notices = yield* Notify;

    return EndpointNotices.of({
      turnedOff: (endpoint, reason, at) =>
        notices
          .notify({
            event: {
              _tag: "WebhookEndpointDisabled",
              endpointId: endpoint.id,
              host: hostOf(endpoint.url),
              reason,
            },
            key: `webhook-endpoint:${endpoint.id}:turned-off:${DateTime.formatIso(at)}`,
            workspaceId: endpoint.workspaceId,
          })
          .pipe(
            Effect.catchTag("RecipientsUnavailable", (failure) =>
              Effect.fail(new DatabaseError({ cause: failure }))
            )
          ),
    });
  })
);
