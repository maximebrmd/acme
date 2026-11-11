import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

/**
 * Tells the members who manage a workspace's webhooks that Peal turned one
 * of its endpoints off at `at`, once per turning off, or that a delivery to
 * one that is still on failed for good, once per endpoint and UTC day, in
 * the caller's transaction.
 */
export class EndpointNotices extends Context.Service<
  EndpointNotices,
  {
    readonly turnedOff: (
      endpoint: WebhookEndpoint,
      reason: "failing" | "gone",
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    readonly failing: (
      endpoint: WebhookEndpoint,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/webhooks/application/EndpointNotices") {}
