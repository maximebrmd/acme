import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

// The webhooks page's queries and mutations. A change to the endpoints
// passes `reactivityKeys: endpointsChanged(workspaceId)`, and one that makes
// a delivery `deliveriesChanged(endpointId)`, which list them again.

/** What refreshes a workspace's webhook endpoints once a change lands. */
export const endpointsChanged = (workspaceId: string) => [
  `webhooks:${workspaceId}`,
];

/** What refreshes an endpoint's delivery log once something was sent. */
export const deliveriesChanged = (endpointId: string) => [
  `webhook-deliveries:${endpointId}`,
];

export const workspaceWebhooks = Atom.family((workspaceId: string) =>
  PealApi.query("webhooks", "list", {
    params: { workspaceId },
    reactivityKeys: endpointsChanged(workspaceId),
  })
);

// Workspace ids, endpoint ids and cursors are UUIDs, so a slash cannot
// appear in any of them.
const deliveryPages = Atom.family((key: string) => {
  const [workspaceId = "", endpointId = "", cursor = ""] = key.split("/");

  return PealApi.query("webhooks", "listDeliveries", {
    params: { endpointId, workspaceId },
    query: cursor === "" ? {} : { cursor },
    reactivityKeys: deliveriesChanged(endpointId),
  });
});

/**
 * A page of an endpoint's deliveries, newest first: the first, or the one
 * at `cursor`.
 */
export const deliveryPage = (
  workspaceId: string,
  endpointId: string,
  cursor: Option.Option<string>
) =>
  deliveryPages(
    `${workspaceId}/${endpointId}/${Option.getOrElse(cursor, () => "")}`
  );

export const createWebhook = PealApi.mutation("webhooks", "create");

export const updateWebhook = PealApi.mutation("webhooks", "update");

export const deleteWebhook = PealApi.mutation("webhooks", "delete");

export const rotateWebhookSecret = PealApi.mutation("webhooks", "rotateSecret");

export const sendWebhookTest = PealApi.mutation("webhooks", "sendTest");

export const redeliverWebhook = PealApi.mutation("webhooks", "redeliver");
