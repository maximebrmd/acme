import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { SealedHeader } from "#webhooks/domain/endpoint-headers.ts";
import type { SealedSecret } from "#webhooks/domain/sealed-secret.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";
import type {
  DisabledReason,
  WebhookEndpoint,
} from "#webhooks/domain/webhook-endpoint.ts";

/**
 * The secrets that sign an endpoint's deliveries, and the headers they
 * carry, as stored.
 */
export interface StoredSecrets {
  readonly current: SealedSecret;
  readonly headers: readonly SealedHeader[];
  /** The one before the last rotation, while the endpoint still keeps it. */
  readonly previous: Option.Option<SealedSecret>;
}

/**
 * The webhook endpoints of every workspace, and their encrypted secrets.
 * Reads that name a workspace only find its own endpoints, whatever the id.
 */
export class EndpointStore extends Context.Service<
  EndpointStore,
  {
    /** The workspace's endpoints, oldest first. */
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WebhookEndpoint[], DatabaseError>;
    readonly findIn: (
      workspaceId: WorkspaceId,
      endpointId: WebhookEndpointId
    ) => Effect.Effect<Option.Option<WebhookEndpoint>, DatabaseError>;
    /** Any workspace's endpoint, for the jobs that deliver to it. */
    readonly get: (
      endpointId: WebhookEndpointId
    ) => Effect.Effect<Option.Option<WebhookEndpoint>, DatabaseError>;
    readonly secrets: (
      endpointId: WebhookEndpointId
    ) => Effect.Effect<Option.Option<StoredSecrets>, DatabaseError>;
    /**
     * Runs `adding` in a transaction that holds back, until it ends, any
     * other one adding an endpoint to the workspace: counting them, then
     * adding one, takes turns.
     */
    readonly addingTo: <A, E, R>(
      workspaceId: WorkspaceId,
      adding: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, DatabaseError | E, R>;
    readonly insert: (
      endpoint: WebhookEndpoint,
      secret: SealedSecret,
      headers: readonly SealedHeader[]
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Saves what a member changed of the endpoint, `from` what they read:
     * its address, description and events, and whether it is on only when
     * they turned it on or off. Peal turning it off meanwhile, as when its
     * deliveries failed for good, is never undone by a change of something
     * else read before. Its headers are written only when `headers` gives
     * them, in place of those it had. Says whether it was still there.
     */
    readonly update: (
      endpoint: WebhookEndpoint,
      from: WebhookEndpoint,
      headers: Option.Option<readonly SealedHeader[]>
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Makes `secret` the endpoint's, and keeps the one it had as the
     * previous one, until the endpoint's `previousSecretExpiresAt`. Says
     * whether the endpoint was still there.
     */
    readonly rotate: (
      endpoint: WebhookEndpoint,
      secret: SealedSecret
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Deletes the endpoint, its secrets and its deliveries. Says whether it
     * was there.
     */
    readonly remove: (
      workspaceId: WorkspaceId,
      endpointId: WebhookEndpointId
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Records that an attempt failed at `now` on an endpoint that is on,
     * and says since when its attempts have failed: `now`, unless an
     * earlier failure was not followed by a success. None for an endpoint
     * that is off, or gone.
     */
    readonly markFailing: (
      endpointId: WebhookEndpointId,
      now: DateTime.Utc
    ) => Effect.Effect<Option.Option<DateTime.Utc>, DatabaseError>;
    /** Records that an attempt succeeded: the endpoint is failing no more. */
    readonly clearFailing: (
      endpointId: WebhookEndpointId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Turns the endpoint off, and says whether this call did: false when it
     * was off already, or gone, so what follows from it happens once.
     */
    readonly disable: (
      endpointId: WebhookEndpointId,
      reason: DisabledReason,
      now: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/webhooks/application/EndpointStore") {}
