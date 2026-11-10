import { Option } from "effect";
import type {
  WebhookDelivery as WebhookDeliveryView,
  WebhookEndpoint as WebhookEndpointView,
} from "peal-contract";

import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import type { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

/** An endpoint as the API and the MCP tools show it: never its secret. */
export const toEndpointView = (
  endpoint: WebhookEndpoint
): WebhookEndpointView => {
  const { status } = endpoint;
  const off = status._tag === "disabled" ? status : undefined;

  return {
    createdAt: endpoint.createdAt,
    description: endpoint.description,
    disabledAt: off?.at ?? null,
    disabledReason: off?.reason ?? null,
    enabled: status._tag === "enabled",
    eventTypes: endpoint.eventTypes,
    failingSince: Option.getOrNull(endpoint.failingSince),
    id: endpoint.id,
    previousSecretExpiresAt: Option.getOrNull(endpoint.previousSecretExpiresAt),
    scope: endpoint.scope,
    updatedAt: endpoint.updatedAt,
    url: endpoint.url,
  };
};

/** A delivery as the API and the MCP tools show it. */
export const toDeliveryView = (
  delivery: WebhookDelivery
): WebhookDeliveryView => {
  const { status } = delivery;
  const last = Option.getOrUndefined(delivery.lastAttempt);
  const outcome = last?.outcome;

  return {
    attempts: delivery.attempts,
    completedAt: status._tag === "pending" ? null : status.at,
    createdAt: delivery.createdAt,
    durationMs: last?.durationMs ?? null,
    error: outcome?._tag === "unanswered" ? outcome.reason : null,
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    failureReason: status._tag === "failed" ? status.reason : null,
    id: delivery.id,
    lastAttemptAt: last?.at ?? null,
    nextAttemptAt:
      status._tag === "pending" ? Option.getOrNull(status.nextAttemptAt) : null,
    responseExcerpt:
      outcome?._tag === "answered" ? Option.getOrNull(outcome.excerpt) : null,
    responseStatus: outcome?._tag === "answered" ? outcome.status : null,
    status: status._tag,
  };
};
