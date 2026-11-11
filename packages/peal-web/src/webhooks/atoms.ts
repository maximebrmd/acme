import { Option, Schema } from "effect";
import { Atom } from "effect/reactivity";
import {
  WebhookDeliveryStatusSchema,
  WebhookEventTypeSchema,
} from "peal-contract";
import type { WebhookDeliveryStatus, WebhookEventType } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The webhooks page's queries and mutations. A change to the endpoints
// passes `reactivityKeys: endpointsChanged(workspaceId)`, and one that makes
// a delivery `deliveriesChanged(endpointId)`, which list them again.

/** What refreshes a workspace's webhook endpoints once a change lands. */
export const endpointsChanged = (workspaceId: string) => [
  `webhooks:${workspaceId}`,
];

/**
 * What refreshes an endpoint's delivery log, and the workspace's log
 * across endpoints, once something was sent.
 */
export const deliveriesChanged = (endpointId: string) => [
  `webhook-deliveries:${endpointId}`,
  "webhook-deliveries",
];

export const workspaceWebhooks = Atom.family((workspaceId: string) =>
  PealApi.query("webhooks", "list", {
    params: { workspaceId },
    reactivityKeys: endpointsChanged(workspaceId),
  })
);

/** Which deliveries a log shows: each filter left out shows them all. */
export interface LogFilter {
  readonly eventType: Option.Option<WebhookEventType>;
  readonly status: Option.Option<WebhookDeliveryStatus>;
}

export const anyDelivery: LogFilter = {
  eventType: Option.none(),
  status: Option.none(),
};

const decodeKey = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      cursor: Schema.optionalKey(Schema.String),
      endpointId: Schema.optionalKey(Schema.String),
      eventType: Schema.optionalKey(WebhookEventTypeSchema),
      limit: Schema.optionalKey(Schema.Int),
      status: Schema.optionalKey(WebhookDeliveryStatusSchema),
      workspaceId: Schema.String,
    })
  )
);

// A page's query as a key, so pages asked for twice share their atom: what
// is left out is not written.
const keyOf = (
  workspaceId: string,
  endpointId: Option.Option<string>,
  cursor: Option.Option<string>,
  filter: LogFilter,
  limit?: number
) =>
  JSON.stringify({
    cursor: Option.getOrUndefined(cursor),
    endpointId: Option.getOrUndefined(endpointId),
    eventType: Option.getOrUndefined(filter.eventType),
    limit,
    status: Option.getOrUndefined(filter.status),
    workspaceId,
  });

const deliveryPages = Atom.family((written: string) => {
  const { endpointId = "", workspaceId, ...query } = decodeKey(written);

  return PealApi.query("webhooks", "listDeliveries", {
    params: { endpointId, workspaceId },
    query,
    reactivityKeys: deliveriesChanged(endpointId),
  });
});

/**
 * A page of an endpoint's deliveries, newest first, as `filter` narrows
 * them: the first, or the one at `cursor`.
 */
export const deliveryPage = (
  workspaceId: string,
  endpointId: string,
  cursor: Option.Option<string>,
  filter: LogFilter = anyDelivery
) => deliveryPages(keyOf(workspaceId, Option.some(endpointId), cursor, filter));

const searchPages = Atom.family((written: string) => {
  const { workspaceId, ...query } = decodeKey(written);

  return PealApi.query("webhooks", "searchDeliveries", {
    params: { workspaceId },
    query,
    reactivityKeys: ["webhook-deliveries"],
  });
});

/**
 * A page of the workspace's deliveries across its endpoints, newest first,
 * as `filter` narrows them, of one endpoint when given, `limit` a page.
 */
export const searchPage = (
  workspaceId: string,
  endpointId: Option.Option<string>,
  cursor: Option.Option<string>,
  filter: LogFilter,
  limit?: number
) => searchPages(keyOf(workspaceId, endpointId, cursor, filter, limit));

export const createWebhook = PealApi.mutation("webhooks", "create");

export const updateWebhook = PealApi.mutation("webhooks", "update");

export const deleteWebhook = PealApi.mutation("webhooks", "delete");

export const rotateWebhookSecret = PealApi.mutation("webhooks", "rotateSecret");

export const sendWebhookTest = PealApi.mutation("webhooks", "sendTest");

export const redeliverWebhook = PealApi.mutation("webhooks", "redeliver");

export const redeliverWebhooks = PealApi.mutation("webhooks", "redeliverMany");
