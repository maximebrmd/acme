import { createHmac } from "node:crypto";

import { ConfigProvider, Effect, Layer, Redacted } from "effect";

import { TokenCipherLive } from "#channels/infrastructure/web-crypto-token-cipher.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  actorIn,
  DatabaseTest,
  freshWorkspace,
  syntheticKeyring,
} from "#test/channels/support.ts";
import { TransactionsTest } from "#test/notifications/support.ts";
import { FakeTransport } from "#test/webhooks/fakes/fake-transport.ts";
import { StartedJobs } from "#test/webhooks/fakes/started-jobs.ts";
import { ToldNotices } from "#test/webhooks/fakes/told-notices.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import type { NewEndpoint } from "#webhooks/application/webhook-endpoints.ts";
import { webhooksWith } from "#webhooks/container.ts";
import { signedContent } from "#webhooks/domain/signature.ts";
import { CipherEndpointSecrets } from "#webhooks/infrastructure/cipher-endpoint-secrets.ts";
import { DrizzleDeliveryStore } from "#webhooks/infrastructure/drizzle-delivery-store.ts";
import { DrizzleEndpointStore } from "#webhooks/infrastructure/drizzle-endpoint-store.ts";
import { DrizzleWebhookRecords } from "#webhooks/infrastructure/drizzle-webhook-records.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

/** Secrets encrypted with a synthetic keyring, never used outside tests. */
export const SecretsTest = CipherEndpointSecrets.pipe(
  Layer.provide(TokenCipherLive),
  Layer.provide(
    ConfigProvider.layer(
      ConfigProvider.fromUnknown({ PEAL_TOKEN_KEYS: syntheticKeyring })
    )
  )
);

/**
 * The webhooks use cases on Postgres, with real secrets, a transport that
 * sends nothing (FakeTransport), deliveries attempted when the test says
 * so (StartedJobs), and notices recorded (ToldNotices).
 */
export const WebhooksTest = Layer.merge(
  webhooksWith(
    Layer.mergeAll(
      DrizzleEndpointStore,
      DrizzleDeliveryStore,
      SecretsTest,
      FakeTransport.layer,
      StartedJobs.layer,
      ToldNotices.layer
    )
  ),
  DrizzleWebhookRecords
).pipe(Layer.provideMerge(TransactionsTest), Layer.provideMerge(DatabaseTest));

/** An owner, who manages webhooks, in a workspace of their own. */
export const freshOwner: Effect.Effect<Actor, never, Ids> = freshWorkspace.pipe(
  Effect.map((workspaceId) => actorIn(workspaceId, permissionsFor("owner")))
);

/** Someone with this role in the workspace. */
export const memberOf = (
  workspaceId: WorkspaceId,
  role: "admin" | "contributor" | "editor" | "owner" | "viewer"
): Actor => actorIn(workspaceId, permissionsFor(role));

/** What a test asks of an endpoint unless it says otherwise. */
export const receiver = (
  host: string,
  settings: Partial<NewEndpoint> = {}
): NewEndpoint => ({
  description: "Synthetic receiver",
  enabled: true,
  eventTypes: ["post.published", "post.failed"],
  url: `https://${host}/hooks`,
  ...settings,
});

/** A new endpoint of the actor's workspace, on a host of its own. */
export const freshEndpoint = Effect.fn("freshEndpoint")(function* freshEndpoint(
  actor: Actor,
  settings: Partial<NewEndpoint> = {}
) {
  const endpoints = yield* WebhookEndpoints;
  const host = `${crypto.randomUUID()}.hooks.example.com`;
  const created = yield* endpoints.create(actor, receiver(host, settings));

  return { ...created, host };
});

/**
 * The signature the Standard Webhooks libraries compute for a request with
 * `secret`: HMAC-SHA256, keyed with the bytes after `whsec_`, over
 * `<id>.<timestamp>.<body>`.
 */
export const referenceSignature = (
  secret: Redacted.Redacted,
  request: {
    readonly body: string;
    readonly headers: Readonly<Record<string, string>>;
  }
): string => {
  const key = Buffer.from(
    Redacted.value(secret).slice("whsec_".length),
    "base64"
  );

  const mac = createHmac("sha256", key)
    .update(
      signedContent({
        body: request.body,
        id: request.headers["webhook-id"] ?? "",
        timestamp: Number(request.headers["webhook-timestamp"]),
      })
    )
    .digest("base64");

  return `v1,${mac}`;
};
