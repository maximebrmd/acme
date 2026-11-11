import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { PartnerNotFound } from "./partner-not-found.ts";
import { TooManyWebhookEndpoints } from "./too-many-webhook-endpoints.ts";
import { TooManyWebhookSends } from "./too-many-webhook-sends.ts";
import { WebhookDeliveryNotFound } from "./webhook-delivery-not-found.ts";
import { WebhookEndpointDisabled } from "./webhook-endpoint-disabled.ts";
import { WebhookEndpointNotFound } from "./webhook-endpoint-not-found.ts";
import {
  SubscribableWebhookEventTypeSchema,
  WebhookEventTypeSchema,
} from "./webhook-events.ts";
import { WebhookFilterRefused } from "./webhook-filter-refused.ts";
import { WebhookUrlRefused } from "./webhook-url-refused.ts";
import { WebhooksNotConfigured } from "./webhooks-not-configured.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** How many webhook endpoints a workspace may have, whatever its plan. */
export const maxWebhookEndpoints = 10;

/**
 * How many test events and deliveries sent again a workspace's members
 * may start in an hour.
 */
export const webhookManualSendsPerHour = 30;

/** The longest a webhook endpoint's address may be. */
export const maxWebhookUrlLength = 2048;

/** The longest a webhook endpoint's description may be. */
export const maxWebhookDescriptionLength = 200;

/** How many attempts a delivery gets, over about a day. */
export const maxWebhookAttempts = 8;

/** How many hours a rotated secret still signs beside the new one. */
export const webhookSecretOverlapHours = 24;

/** How many days of failed attempts turn an endpoint off. */
export const webhookFailingDays = 5;

/** How many days a delivery stays in its endpoint's log. */
export const webhookDeliveryRetentionDays = 30;

/** How many channels an endpoint may listen to. */
export const maxWebhookFilterChannels = 50;

/** How many workspaces a partner endpoint may listen to. */
export const maxWebhookFilterWorkspaces = 200;

/**
 * How many deliveries a workspace's members may send again by the many in
 * an hour, apart from the test events and single sends of
 * `webhookManualSendsPerHour`.
 */
export const webhookBulkRedeliveriesPerHour = 1000;

/** How many deliveries one call sends again at most. */
export const maxWebhookBulkRedelivery = 100;

/**
 * Why an endpoint is off: a member turned it off (`manual`), every attempt
 * failed for days (`failing`), or the receiver answered 410 Gone (`gone`).
 */
export const WebhookDisabledReasonSchema = Schema.Literals([
  "manual",
  "failing",
  "gone",
]).annotate({ identifier: "WebhookDisabledReason" });

export type WebhookDisabledReason = typeof WebhookDisabledReasonSchema.Type;

/**
 * What an endpoint hears: the events of its own workspace (`workspace`),
 * or, in a partner account's home workspace, those of every workspace the
 * partner owns too (`partner`). Chosen when it is created.
 */
export const WebhookEndpointScopeSchema = Schema.Literals([
  "workspace",
  "partner",
]).annotate({ identifier: "WebhookEndpointScope" });

export type WebhookEndpointScope = typeof WebhookEndpointScopeSchema.Type;

/**
 * Where a workspace is told what happens in it. Never its signing secret,
 * which is shown once, when it is created or rotated.
 */
export const WebhookEndpointSchema = Schema.Struct({
  // The channels it hears about, as saved; empty for every channel. An
  // event about no channel (a file, a boost) reaches it whatever it lists.
  channelIds: Schema.Array(Schema.String),
  createdAt: Schema.DateTimeUtc,
  description: Schema.String,
  // When it was turned off, and why; null while it is on.
  disabledAt: Schema.NullOr(Schema.DateTimeUtc),
  disabledReason: Schema.NullOr(WebhookDisabledReasonSchema),
  // Off, it is sent nothing, and events that happen meanwhile are not kept
  // for it.
  enabled: Schema.Boolean,
  eventTypes: Schema.Array(SubscribableWebhookEventTypeSchema),
  // Since when every attempt has failed; null once one succeeded.
  failingSince: Schema.NullOr(Schema.DateTimeUtc),
  id: Schema.String,
  // Until when the secret before the last rotation still signs deliveries,
  // beside the current one; null when only the current one does.
  previousSecretExpiresAt: Schema.NullOr(Schema.DateTimeUtc),
  scope: WebhookEndpointScopeSchema,
  updatedAt: Schema.DateTimeUtc,
  url: Schema.String,
  // The workspaces a partner endpoint hears, as saved; empty for every
  // one it hears. Always empty on an endpoint of the `workspace` scope.
  workspaceIds: Schema.Array(Schema.String),
}).annotate({ identifier: "WebhookEndpoint" });

export type WebhookEndpoint = typeof WebhookEndpointSchema.Type;

const UrlSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxWebhookUrlLength)
);

const DescriptionSchema = Schema.String.check(
  Schema.isMaxLength(maxWebhookDescriptionLength)
);

const EventTypesSchema = Schema.NonEmptyArray(
  SubscribableWebhookEventTypeSchema
);

// Ids are checked for their shape only: one that names nothing matches
// nothing.
const ChannelFilterSchema = Schema.Array(
  Schema.String.check(Schema.isUUID(7), Schema.isLowercased())
).check(Schema.isMaxLength(maxWebhookFilterChannels));

const WorkspaceFilterSchema = Schema.Array(
  Schema.String.check(Schema.isUUID(), Schema.isLowercased())
).check(Schema.isMaxLength(maxWebhookFilterWorkspaces));

export const NewWebhookEndpointSchema = Schema.Struct({
  // The channels it hears about, `maxWebhookFilterChannels` at most; every
  // channel when left out or empty.
  channelIds: Schema.optionalKey(ChannelFilterSchema),
  // What it is for; empty when left out.
  description: Schema.optionalKey(DescriptionSchema),
  // On unless false.
  enabled: Schema.optionalKey(Schema.Boolean),
  eventTypes: EventTypesSchema,
  // `workspace` unless given: `partner`, in a partner account's home
  // workspace, hears every workspace the partner owns too.
  scope: Schema.optionalKey(WebhookEndpointScopeSchema),
  // HTTPS, on the default port, on a public host, without credentials.
  url: UrlSchema,
  // The workspaces a `partner` endpoint hears, its home workspace only if
  // listed; every one when left out or empty. Refused on any other scope.
  workspaceIds: Schema.optionalKey(WorkspaceFilterSchema),
})
  .check(
    Schema.makeFilter(
      (endpoint) =>
        endpoint.scope === "partner" ||
        (endpoint.workspaceIds ?? []).length === 0 || {
          issue: "Only an endpoint of the `partner` scope takes workspaceIds",
          path: ["workspaceIds"],
        }
    )
  )
  .annotate({ identifier: "NewWebhookEndpoint" });

export type NewWebhookEndpoint = typeof NewWebhookEndpointSchema.Type;

/**
 * What to change of an endpoint: what is left out stays as it is, and an
 * empty filter hears everything again.
 */
export const WebhookEndpointChangeSchema = Schema.Struct({
  channelIds: Schema.optionalKey(ChannelFilterSchema),
  description: Schema.optionalKey(DescriptionSchema),
  enabled: Schema.optionalKey(Schema.Boolean),
  eventTypes: Schema.optionalKey(EventTypesSchema),
  url: Schema.optionalKey(UrlSchema),
  // Only for an endpoint of the `partner` scope (422
  // `WebhookFilterRefused` on any other).
  workspaceIds: Schema.optionalKey(WorkspaceFilterSchema),
}).annotate({ identifier: "WebhookEndpointChange" });

export type WebhookEndpointChange = typeof WebhookEndpointChangeSchema.Type;

export const WebhookEndpointSecretSchema = Schema.Struct({
  endpoint: WebhookEndpointSchema,
  // The signing secret (`whsec_…`), shown this once: verify each delivery's
  // `webhook-signature` with it.
  secret: Schema.String,
}).annotate({ identifier: "WebhookEndpointSecret" });

export type WebhookEndpointSecret = typeof WebhookEndpointSecretSchema.Type;

/** Where a delivery is: still being attempted, taken, or given up. */
export const WebhookDeliveryStatusSchema = Schema.Literals([
  "pending",
  "succeeded",
  "failed",
]).annotate({ identifier: "WebhookDeliveryStatus" });

export type WebhookDeliveryStatus = typeof WebhookDeliveryStatusSchema.Type;

/**
 * Why a delivery failed for good: every attempt failed (`exhausted`), the
 * receiver answered 410 Gone (`gone`), its endpoint was turned off before
 * it got through (`endpointDisabled`), or the server can no longer read the
 * endpoint's secret (`notConfigured`).
 */
export const WebhookDeliveryFailureSchema = Schema.Literals([
  "exhausted",
  "gone",
  "endpointDisabled",
  "notConfigured",
]).annotate({ identifier: "WebhookDeliveryFailure" });

export type WebhookDeliveryFailure = typeof WebhookDeliveryFailureSchema.Type;

/**
 * Why an attempt got no answer: none came in time (`timeout`), the
 * connection could not be made or broke (`connection`), or Peal did not
 * send it, the address no longer being HTTPS on a public host (`refused`).
 */
export const WebhookAttemptErrorSchema = Schema.Literals([
  "timeout",
  "connection",
  "refused",
]).annotate({ identifier: "WebhookAttemptError" });

export type WebhookAttemptError = typeof WebhookAttemptErrorSchema.Type;

/** One event on its way to an endpoint, as the endpoint's log keeps it. */
export const WebhookDeliverySchema = Schema.Struct({
  // How many attempts were made so far.
  attempts: Schema.Int,
  // When it succeeded or failed for good; null while it is pending.
  completedAt: Schema.NullOr(Schema.DateTimeUtc),
  createdAt: Schema.DateTimeUtc,
  // How long the last attempt took, in milliseconds.
  durationMs: Schema.NullOr(Schema.Int),
  // The endpoint it goes to.
  endpointId: Schema.String,
  // Why the last attempt got no answer, when it got none.
  error: Schema.NullOr(WebhookAttemptErrorSchema),
  // The event's id, which the receiver gets as `webhook-id`.
  eventId: Schema.String,
  eventType: WebhookEventTypeSchema,
  // Why it failed for good, once it has.
  failureReason: Schema.NullOr(WebhookDeliveryFailureSchema),
  id: Schema.String,
  lastAttemptAt: Schema.NullOr(Schema.DateTimeUtc),
  // When the next attempt is made, while one is left.
  nextAttemptAt: Schema.NullOr(Schema.DateTimeUtc),
  // The delivery this one sends again; null for an event's first.
  redeliveryOf: Schema.NullOr(Schema.String),
  // The start of what the receiver answered the last attempt with, when
  // that was not a success: one line, 256 characters at most.
  responseExcerpt: Schema.NullOr(Schema.String),
  // The status the receiver answered the last attempt with.
  responseStatus: Schema.NullOr(Schema.Int),
  status: WebhookDeliveryStatusSchema,
  // The workspace the event happened in: for a partner endpoint, one of
  // the partner's workspaces, which the partner knows by
  // `workspaceExternalId` (null when it gave none, and for any other).
  workspaceExternalId: Schema.NullOr(Schema.String),
  workspaceId: Schema.String,
}).annotate({ identifier: "WebhookDelivery" });

export type WebhookDelivery = typeof WebhookDeliverySchema.Type;

export const WebhookDeliveryPageSchema = Schema.Struct({
  items: Schema.Array(WebhookDeliverySchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "WebhookDeliveryPage" });

export type WebhookDeliveryPage = typeof WebhookDeliveryPageSchema.Type;

/**
 * Why a delivery asked for was not sent again: its endpoint is off
 * (`endpointDisabled`), it is not one of the workspace's (`notFound`), or
 * its event was sent again already, and that delivery is pending or went
 * through (`alreadySent`), so calling again sends nothing twice.
 */
export const WebhookRedeliverySkipSchema = Schema.Literals([
  "alreadySent",
  "endpointDisabled",
  "notFound",
]).annotate({ identifier: "WebhookRedeliverySkip" });

export type WebhookRedeliverySkip = typeof WebhookRedeliverySkipSchema.Type;

/** What a call to send many deliveries again did. */
export const WebhookBulkRedeliverySchema = Schema.Struct({
  // The new deliveries, still pending: one per delivery sent again.
  redelivered: Schema.Array(WebhookDeliverySchema),
  // How many more failed deliveries the selection holds: call again for
  // them. 0 for a call by ids.
  remaining: Schema.Int,
  skipped: Schema.Array(
    Schema.Struct({
      deliveryId: Schema.String,
      reason: WebhookRedeliverySkipSchema,
    }).annotate({ identifier: "WebhookRedeliverySkipped" })
  ),
}).annotate({ identifier: "WebhookBulkRedelivery" });

export type WebhookBulkRedelivery = typeof WebhookBulkRedeliverySchema.Type;

/**
 * Which deliveries to send again: these (`deliveryIds`), or an endpoint's
 * failed deliveries made in a time range, of a type.
 */
export const WebhookRedeliveryRequestSchema = Schema.Union([
  Schema.Struct({
    deliveryIds: Schema.NonEmptyArray(Schema.String).check(
      Schema.isMaxLength(maxWebhookBulkRedelivery)
    ),
  }).annotate({ identifier: "WebhookRedeliveryByIds" }),
  Schema.Struct({
    endpointId: Schema.String,
    eventType: Schema.optionalKey(SubscribableWebhookEventTypeSchema),
    // Made at or after it.
    since: Schema.optionalKey(Schema.DateTimeUtc),
    // Made before it.
    until: Schema.optionalKey(Schema.DateTimeUtc),
  }).annotate({ identifier: "WebhookRedeliveryOfFailed" }),
]).annotate({ identifier: "WebhookRedeliveryRequest" });

export type WebhookRedeliveryRequest =
  typeof WebhookRedeliveryRequestSchema.Type;

/** How many deliveries a page holds, unless `limit` says otherwise. */
export const defaultWebhookDeliveryPageSize = 30;

/** The most deliveries a page holds. */
export const maxWebhookDeliveryPageSize = 100;

const workspace = { workspaceId: Schema.String };

const endpoint = { ...workspace, endpointId: Schema.String };

const pageQuery = {
  cursor: Schema.optionalKey(Schema.String),
  limit: Schema.optionalKey(
    Schema.Int.check(
      Schema.isBetween({
        maximum: maxWebhookDeliveryPageSize,
        minimum: 1,
      })
    )
  ),
};

const logQuery = {
  ...pageQuery,
  eventType: Schema.optionalKey(WebhookEventTypeSchema),
  status: Schema.optionalKey(WebhookDeliveryStatusSchema),
};

/**
 * A workspace's webhook endpoints: Peal sends each the events it subscribes
 * to, signed as the Standard Webhooks specification says, and keeps a log
 * of its deliveries.
 */
export class WebhooksApi extends HttpApiGroup.make("webhooks")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(WebhookEndpointSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's webhook endpoints, oldest first. Needs webhook:read.",
        summary: "List webhook endpoints",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        TooManyWebhookEndpoints,
        WebhookUrlRefused,
        WebhooksNotConfigured,
        PartnerNotFound,
        WebhookFilterRefused,
      ],
      params: workspace,
      payload: NewWebhookEndpointSchema,
      success: WebhookEndpointSecretSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from it. A workspace has ${maxWebhookEndpoints} endpoints at most, whatever its plan. With \`scope\` \`partner\`, in the home workspace of a partner account, the endpoint also hears what happens in every workspace the partner owns, each event naming its workspace and carrying the partner's own id for it (\`workspaceExternalId\`); any other workspace answers 404 \`PartnerNotFound\`. \`channelIds\` (${maxWebhookFilterChannels} at most) narrows it to the events about those channels: an event of one channel when it is listed, an event of a whole post when one of its channels is, and an event about no channel (a file, a boost) whatever it lists; leave such types out of \`eventTypes\` when they are not wanted. \`workspaceIds\` (${maxWebhookFilterWorkspaces} at most), on a \`partner\` endpoint only, narrows it to those workspaces, the home workspace only if listed. Ids are checked for their shape only: one that names nothing matches nothing, and a filter stays as saved when what it names is gone. Filters apply when each event happens. Needs webhook:manage.`,
        summary: "Create a webhook endpoint",
      })
    ),
    // Declared before the routes of one endpoint, which `deliveries` is not.
    HttpApiEndpoint.get("searchDeliveries", "/deliveries", {
      error: [Forbidden, HttpApiError.BadRequest],
      params: workspace,
      query: {
        ...logQuery,
        endpointId: Schema.optionalKey(Schema.String),
        since: Schema.optionalKey(Schema.DateTimeUtc),
        until: Schema.optionalKey(Schema.DateTimeUtc),
      },
      success: WebhookDeliveryPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's deliveries across its endpoints, newest first, ${defaultWebhookDeliveryPageSize} a page unless \`limit\` (at most ${maxWebhookDeliveryPageSize}) says otherwise, filtered by \`status\`, \`endpointId\`, \`eventType\`, and when they were made: \`since\` (included) and \`until\` (excluded). The deliveries of a \`partner\` endpoint include those of the partner's other workspaces, each naming its workspace (\`workspaceId\`, \`workspaceExternalId\`). A delivery that failed for good (\`failed\`) stays ${webhookDeliveryRetentionDays} days, with the receiver's last answer: send it again with \`POST …/webhooks/deliveries/redeliver\`. Pass the page's \`nextCursor\` as \`cursor\` for the next one. Needs webhook:read.`,
        summary: "List deliveries across endpoints",
      })
    ),
    HttpApiEndpoint.post("redeliverMany", "/deliveries/redeliver", {
      error: [Forbidden, WebhookEndpointNotFound, TooManyWebhookSends],
      params: workspace,
      payload: WebhookRedeliveryRequestSchema,
      success: WebhookBulkRedeliverySchema.pipe(HttpApiSchema.status(202)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Sends many deliveries again, ${maxWebhookBulkRedelivery} a call at most: those named by \`deliveryIds\`, or the failed deliveries of the endpoint \`endpointId\` (made from \`since\`, before \`until\`, of \`eventType\`, each left out for any), oldest first, the last of each event only. Each goes to its own endpoint whatever the endpoint's filters are now, as a new delivery of the same event: the same \`webhook-id\` and body, signed anew. A delivery is skipped when its endpoint is off, when it is not the workspace's, and when its event was sent again since and that delivery is pending or went through, so calling again after a partial run sends nothing twice; \`remaining\` says how many more failed deliveries the selection holds. The new deliveries of an endpoint start a quarter of a second apart. A workspace sends ${webhookBulkRedeliveriesPerHour} deliveries again this way an hour, apart from the test events and single sends: a call that would pass it sends nothing (429 \`TooManyWebhookSends\`). Needs webhook:manage.`,
        summary: "Send many deliveries again",
      })
    ),
    HttpApiEndpoint.get("get", "/:endpointId", {
      error: [Forbidden, WebhookEndpointNotFound],
      params: endpoint,
      success: WebhookEndpointSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Shows one of the workspace's webhook endpoints. Needs webhook:read.",
        summary: "Get a webhook endpoint",
      })
    ),
    HttpApiEndpoint.patch("update", "/:endpointId", {
      error: [
        Forbidden,
        WebhookEndpointNotFound,
        WebhookUrlRefused,
        WebhookFilterRefused,
      ],
      params: endpoint,
      payload: WebhookEndpointChangeSchema,
      success: WebhookEndpointSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Changes an endpoint's address, description, events or filters, or turns it off or back on: what is left out stays as it is, and an empty filter hears everything again; `workspaceIds` is for an endpoint of the `partner` scope only (422 `WebhookFilterRefused`). Filters apply to the events that happen after the change. Turned off, it is sent nothing, its pending deliveries fail, and events that happen meanwhile are not kept for it. Turning it back on forgets the failures that turned it off. Needs webhook:manage.",
        summary: "Update a webhook endpoint",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:endpointId", {
      error: [Forbidden, WebhookEndpointNotFound],
      params: endpoint,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes an endpoint, its secret and its delivery log: nothing more is sent to it. Needs webhook:manage.",
        summary: "Delete a webhook endpoint",
      })
    ),
    HttpApiEndpoint.post("rotateSecret", "/:endpointId/secret", {
      error: [Forbidden, WebhookEndpointNotFound, WebhooksNotConfigured],
      params: endpoint,
      success: WebhookEndpointSecretSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Replaces an endpoint's signing secret, and answers with the new one, which is not shown again. For ${webhookSecretOverlapHours} hours each delivery carries two signatures, one per secret, so the receiver changes its own without missing any; the old one then signs nothing more. Needs webhook:manage.`,
        summary: "Rotate a webhook endpoint's secret",
      })
    ),
    HttpApiEndpoint.post("sendTest", "/:endpointId/test", {
      error: [
        Forbidden,
        WebhookEndpointNotFound,
        WebhookEndpointDisabled,
        TooManyWebhookSends,
      ],
      params: endpoint,
      query: {
        // A sample of this type instead of `webhook.test`.
        eventType: Schema.optionalKey(SubscribableWebhookEventTypeSchema),
      },
      success: WebhookDeliverySchema.pipe(HttpApiSchema.status(202)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Sends the endpoint a \`webhook.test\` event, or, with \`eventType\`, a sample of that type: its real shape, with ids that name nothing, the workspace's own id and \`sample: true\`, which the receiver must never act on. Either goes whatever the endpoint subscribes to or filters. It answers with the delivery, still pending: read the endpoint's deliveries to see how it ended. A workspace sends ${webhookManualSendsPerHour} test events and deliveries again an hour at most (429 \`TooManyWebhookSends\`). Needs webhook:manage.`,
        summary: "Send a test event",
      })
    ),
    HttpApiEndpoint.get("listDeliveries", "/:endpointId/deliveries", {
      error: [Forbidden, WebhookEndpointNotFound, HttpApiError.BadRequest],
      params: endpoint,
      query: logQuery,
      success: WebhookDeliveryPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the endpoint's deliveries, newest first, of a \`status\` and an \`eventType\` when given, ${defaultWebhookDeliveryPageSize} a page unless \`limit\` (at most ${maxWebhookDeliveryPageSize}) says otherwise: each one's status, the receiver's last answer, how many attempts were made and when the next one is. Pass the page's \`nextCursor\` as \`cursor\` for the next one. A delivery is kept ${webhookDeliveryRetentionDays} days. Needs webhook:read.`,
        summary: "List an endpoint's deliveries",
      })
    ),
    HttpApiEndpoint.post(
      "redeliver",
      "/:endpointId/deliveries/:deliveryId/redeliver",
      {
        error: [
          Forbidden,
          WebhookEndpointNotFound,
          WebhookDeliveryNotFound,
          WebhookEndpointDisabled,
          TooManyWebhookSends,
        ],
        params: { ...endpoint, deliveryId: Schema.String },
        success: WebhookDeliverySchema.pipe(HttpApiSchema.status(202)),
      }
    ).annotateMerge(
      OpenApi.annotations({
        description: `Sends the delivery's event to the endpoint again, as a new delivery of the same event: the receiver gets the same \`webhook-id\` and body, with a new timestamp and signature. A workspace sends ${webhookManualSendsPerHour} test events and deliveries again an hour at most (429 \`TooManyWebhookSends\`). Needs webhook:manage.`,
        summary: "Send a delivery again",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/webhooks") {}
