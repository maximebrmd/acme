import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { webhookHealthOf } from "#staff/infrastructure/webhook-health.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import {
  createEndpoint,
  WebhookEndpoint,
} from "#webhooks/domain/webhook-endpoint.ts";
import { parseWebhookUrl } from "#webhooks/domain/webhook-url.ts";

const now = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const endpoint = createEndpoint(
  WebhookEndpointIdSchema.make("00000000-0000-7000-8000-000000000071"),
  WorkspaceIdSchema.make("11111111-1111-4111-8111-111111111111"),
  {
    description: "Synthetic receiver",
    enabled: true,
    eventTypes: ["post.published", "post.failed"],
    url: Result.getOrThrow(
      parseWebhookUrl(
        "https://hooks.example.com/t/synthetic-token?key=synthetic"
      )
    ),
  },
  now
);

describe(webhookHealthOf, () => {
  it("shows staff an endpoint's host and state, never its path, query or description", () => {
    const health = webhookHealthOf(endpoint);

    expect(health).toStrictEqual({
      disabledReason: Option.none(),
      enabled: true,
      eventTypes: 2,
      failingSince: Option.none(),
      host: "hooks.example.com",
      id: endpoint.id,
    });
    expect(JSON.stringify(health)).not.toContain("synthetic");
  });

  it("says why an endpoint is off, and since when it fails", () => {
    const off = new WebhookEndpoint({
      createdAt: endpoint.createdAt,
      description: endpoint.description,
      eventTypes: endpoint.eventTypes,
      failingSince: Option.some(now),
      id: endpoint.id,
      previousSecretExpiresAt: Option.none(),
      status: { _tag: "disabled", at: now, reason: "failing" },
      updatedAt: now,
      url: endpoint.url,
      workspaceId: endpoint.workspaceId,
    });

    expect(webhookHealthOf(off)).toMatchObject({
      disabledReason: Option.some("failing"),
      enabled: false,
      failingSince: Option.some(now),
    });
  });
});
