import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { DeliverWebhook } from "#webhooks/application/deliver-webhook.ts";
import { PurgeDeliveries } from "#webhooks/application/purge-deliveries.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import { WebhookOversight } from "#webhooks/application/webhook-oversight.ts";
import { CipherEndpointSecrets } from "#webhooks/infrastructure/cipher-endpoint-secrets.ts";
import { DrizzleDeliveryStore } from "#webhooks/infrastructure/drizzle-delivery-store.ts";
import { DrizzleEndpointStore } from "#webhooks/infrastructure/drizzle-endpoint-store.ts";
import { DrizzleWebhookRecords } from "#webhooks/infrastructure/drizzle-webhook-records.ts";
import { HttpWebhookTransport } from "#webhooks/infrastructure/http-webhook-transport.ts";
import { NotifiedEndpointNotices } from "#webhooks/infrastructure/notified-endpoint-notices.ts";
import { WindowedManualSends } from "#webhooks/infrastructure/windowed-manual-sends.ts";
import { WorkflowDeliveryJobs } from "#webhooks/infrastructure/workflow-delivery-jobs.ts";

// Deliveries go to hosts members chose: through the outbound guard, which
// needs Dns.
const TransportLive = HttpWebhookTransport.pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);

/**
 * The webhooks context's use cases on `adapters`, which provide its ports:
 * the endpoints and their delivery logs for members (WebhookEndpoints,
 * WebhookDeliveries), the events the other contexts publish
 * (WebhookEvents), the attempts for the workers (DeliverWebhook), the
 * retention (PurgeDeliveries), and WebhookOversight for the staff console.
 * Needs a TransactionRunner and Ids.
 */
export const webhooksWith = <ROut, E, R>(adapters: Layer.Layer<ROut, E, R>) =>
  Layer.mergeAll(
    WebhookEvents.layer,
    WebhookEndpoints.layer,
    WebhookDeliveries.layer,
    DeliverWebhook.layer,
    PurgeDeliveries.layer,
    WebhookOversight.layer
  ).pipe(
    Layer.provideMerge(adapters),
    // Counted in this process, unless the adapters bring another count.
    Layer.provide(WindowedManualSends)
  );

/**
 * The webhooks context as the server runs it: endpoints, events and
 * deliveries in Postgres, secrets on the channels context's TokenCipher,
 * deliveries sent through the outbound guard by DeliverWebhookV1, and
 * endpoints turned off told through the notifications context's Notify;
 * with WebhookRecords, for the workspace context's exports and erasures.
 * Needs the database (Drizzle and SqlClient), migrated, a
 * TransactionRunner, Ids, the workflow engine, Dns, the TokenCipher and
 * Notify, which the composition root provides.
 */
export const WebhooksLive = Layer.merge(
  webhooksWith(
    Layer.mergeAll(
      DrizzleEndpointStore,
      DrizzleDeliveryStore,
      CipherEndpointSecrets,
      TransportLive,
      WorkflowDeliveryJobs,
      NotifiedEndpointNotices
    )
  ),
  DrizzleWebhookRecords
);

// The webhooks endpoints. They need the use cases WebhooksLive provides, and
// the Authentication and WorkspaceAccess middleware of the workspace context,
// which the composition root brings.
export { WebhooksHandlers as WebhooksApiLive } from "#webhooks/api/webhooks.ts";

/** Registers the workflow that makes deliveries' attempts. Needs WebhooksLive. */
export { DeliverWebhookV1Live as WebhooksWorkersLive } from "#webhooks/infrastructure/workflows/deliver-webhook.ts";

/** The daily end of the delivery logs' retention. */
export { WebhooksCronsLive } from "#webhooks/infrastructure/crons.ts";
