import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

import { EndpointStore } from "./ports/endpoint-store.ts";

/**
 * A workspace's webhook endpoints as the staff console reads them. It
 * checks no permission: only the staff context calls it, for staff, and
 * shows of each address its host alone, as a path or a query may hold a
 * secret of the receiver's.
 */
export class WebhookOversight extends Context.Service<
  WebhookOversight,
  {
    readonly ofWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WebhookEndpoint[], DatabaseError>;
  }
>()("peal-server/webhooks/application/WebhookOversight") {
  static readonly layer = Layer.effect(
    WebhookOversight,
    Effect.gen(function* WebhookOversightLive() {
      const endpoints = yield* EndpointStore;

      return WebhookOversight.of({
        ofWorkspace: (workspaceId) => endpoints.list(workspaceId),
      });
    })
  );
}
