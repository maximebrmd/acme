import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";
import type { Duration } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import {
  changeEndpoint,
  createEndpoint,
  failedTooLong,
  previousSecretSigns,
  rotateSecret,
  wants,
  WebhookEndpoint,
} from "#webhooks/domain/webhook-endpoint.ts";
import type { EndpointSettings } from "#webhooks/domain/webhook-endpoint.ts";
import { parseWebhookUrl } from "#webhooks/domain/webhook-url.ts";

const now = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const later = (duration: Duration.Input) => DateTime.addDuration(now, duration);

const settings: EndpointSettings = {
  description: "Synthetic receiver",
  enabled: true,
  eventTypes: ["post.failed", "post.published"],
  url: Result.getOrThrow(parseWebhookUrl("https://hooks.example.com/peal")),
};

const endpoint = createEndpoint(
  WebhookEndpointIdSchema.make("00000000-0000-7000-8000-000000000001"),
  WorkspaceIdSchema.make("11111111-1111-4111-8111-111111111111"),
  settings,
  now
);

// The endpoint's fields, to build one in another state.
const fields = {
  createdAt: endpoint.createdAt,
  description: endpoint.description,
  eventTypes: endpoint.eventTypes,
  failingSince: endpoint.failingSince,
  id: endpoint.id,
  previousSecretExpiresAt: endpoint.previousSecretExpiresAt,
  status: endpoint.status,
  updatedAt: endpoint.updatedAt,
  url: endpoint.url,
  workspaceId: endpoint.workspaceId,
};

describe(createEndpoint, () => {
  it("lists each event type once, in the vocabulary's order", () => {
    const created = createEndpoint(
      endpoint.id,
      endpoint.workspaceId,
      {
        ...settings,
        eventTypes: ["media.ready", "post.failed", "media.ready"],
      },
      now
    );

    expect(created.eventTypes).toStrictEqual(["post.failed", "media.ready"]);
  });

  it("starts on, or off when asked", () => {
    expect(endpoint.status).toStrictEqual({ _tag: "enabled" });
    expect(
      createEndpoint(
        endpoint.id,
        endpoint.workspaceId,
        { ...settings, enabled: false },
        now
      ).status
    ).toStrictEqual({ _tag: "disabled", at: now, reason: "manual" });
  });
});

describe(wants, () => {
  it("takes the events it subscribes to, while it is on", () => {
    expect(wants(endpoint, "post.published")).toBeTruthy();
    expect(wants(endpoint, "media.ready")).toBeFalsy();

    const off = changeEndpoint(endpoint, { enabled: false }, now);

    expect(wants(off, "post.published")).toBeFalsy();
  });

  it("takes a test event whatever it subscribes to", () => {
    expect(wants(endpoint, "webhook.test")).toBeTruthy();
  });
});

describe(changeEndpoint, () => {
  it("changes only what is named", () => {
    const changed = changeEndpoint(
      endpoint,
      { description: "Renamed" },
      later("1 hour")
    );

    expect(changed).toStrictEqual(
      new WebhookEndpoint({
        ...fields,
        description: "Renamed",
        updatedAt: later("1 hour"),
      })
    );
  });

  it("keeps why an endpoint is off when it is turned off again", () => {
    const off = new WebhookEndpoint({
      ...fields,
      status: { _tag: "disabled", at: now, reason: "failing" },
    });

    expect(
      changeEndpoint(off, { enabled: false }, later("1 hour")).status
    ).toStrictEqual({ _tag: "disabled", at: now, reason: "failing" });
  });

  it("forgets the failures of an endpoint turned back on", () => {
    const off = new WebhookEndpoint({
      ...fields,
      failingSince: Option.some(now),
      status: { _tag: "disabled", at: later("5 days"), reason: "failing" },
    });

    const on = changeEndpoint(off, { enabled: true }, later("6 days"));

    expect(on.status).toStrictEqual({ _tag: "enabled" });
    expect(on.failingSince).toStrictEqual(Option.none());
  });
});

describe(rotateSecret, () => {
  it("lets the secret before sign for a day more", () => {
    const rotated = rotateSecret(endpoint, now);

    expect(previousSecretSigns(endpoint, now)).toBeFalsy();
    expect(previousSecretSigns(rotated, later("23 hours"))).toBeTruthy();
    expect(previousSecretSigns(rotated, later("24 hours"))).toBeFalsy();
  });
});

describe(failedTooLong, () => {
  it("is five days of failures", () => {
    expect(failedTooLong(now, later("4 days"))).toBeFalsy();
    expect(failedTooLong(now, later("5 days"))).toBeTruthy();
  });
});
