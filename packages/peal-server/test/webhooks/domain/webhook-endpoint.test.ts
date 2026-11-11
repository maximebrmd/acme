import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";
import type { Duration } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { WebhookEndpointIdSchema } from "#webhooks/domain/webhook-endpoint-id.ts";
import {
  changeEndpoint,
  createEndpoint,
  failedTooLong,
  previousSecretSigns,
  rotateSecret,
  takesWorkspaceFilter,
  wants,
  WebhookEndpoint,
} from "#webhooks/domain/webhook-endpoint.ts";
import type {
  EndpointSettings,
  EventReach,
} from "#webhooks/domain/webhook-endpoint.ts";
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
  channelIds: endpoint.channelIds,
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
  workspaceIds: endpoint.workspaceIds,
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

const { workspaceId } = endpoint;

const tenant = WorkspaceIdSchema.make("22222222-2222-4222-8222-222222222222");

const channel = (n: number) =>
  ChannelIdSchema.make(`00000000-0000-7000-8000-00000000010${String(n)}`);

// An event of this type, in this workspace, about these channels; none for
// an event about no channel.
const reach = (
  type: EventReach["type"],
  channels?: readonly ChannelId[],
  inWorkspace = workspaceId
): EventReach => ({
  channelIds: Option.fromUndefinedOr(channels),
  type,
  workspaceId: inWorkspace,
});

const listening = (filters: Partial<EndpointSettings>, scope?: "partner") =>
  createEndpoint(
    endpoint.id,
    workspaceId,
    {
      ...settings,
      eventTypes: ["post.published", "post.scheduled", "media.ready"],
      ...filters,
    },
    now,
    scope
  );

describe(wants, () => {
  it("takes the events it subscribes to, while it is on", () => {
    expect(wants(endpoint, reach("post.published", [channel(1)]))).toBeTruthy();
    expect(wants(endpoint, reach("media.ready"))).toBeFalsy();

    const off = changeEndpoint(endpoint, { enabled: false }, now);

    expect(wants(off, reach("post.published", [channel(1)]))).toBeFalsy();
  });

  it("takes a test event whatever it subscribes to", () => {
    expect(wants(endpoint, reach("webhook.test"))).toBeTruthy();
  });

  it("takes an event of a listed channel only, when it lists some", () => {
    const some = listening({ channelIds: [channel(2)] });

    expect(wants(some, reach("post.published", [channel(2)]))).toBeTruthy();
    expect(wants(some, reach("post.published", [channel(1)]))).toBeFalsy();
  });

  it("takes a post's event when one of its channels is listed", () => {
    const some = listening({ channelIds: [channel(2)] });
    const three = [channel(1), channel(2), channel(3)];

    expect(wants(some, reach("post.scheduled", three))).toBeTruthy();
    expect(
      wants(some, reach("post.scheduled", [channel(1), channel(3)]))
    ).toBeFalsy();
  });

  it("takes an event about no channel whatever channels it lists", () => {
    const some = listening({ channelIds: [channel(2)] });

    expect(wants(some, reach("media.ready"))).toBeTruthy();
  });

  it("takes every channel's events when it lists none", () => {
    const every = listening({ channelIds: [] });

    expect(wants(every, reach("post.published", [channel(1)]))).toBeTruthy();
    expect(wants(every, reach("post.scheduled", []))).toBeTruthy();
  });

  it("hears the listed workspaces only, its home one included", () => {
    const partner = listening({ workspaceIds: [tenant] }, "partner");

    expect(
      wants(partner, reach("post.published", [channel(1)], tenant))
    ).toBeTruthy();
    expect(wants(partner, reach("post.published", [channel(1)]))).toBeFalsy();

    const withHome = listening(
      { workspaceIds: [tenant, workspaceId] },
      "partner"
    );

    expect(wants(withHome, reach("post.published", [channel(1)]))).toBeTruthy();
  });

  it("hears every workspace of its scope when it lists none", () => {
    const partner = listening({}, "partner");

    expect(
      wants(partner, reach("media.ready", undefined, tenant))
    ).toBeTruthy();
    expect(wants(partner, reach("media.ready"))).toBeTruthy();
  });

  it("applies both filters together", () => {
    const partner = listening(
      { channelIds: [channel(2)], workspaceIds: [tenant] },
      "partner"
    );

    expect(
      wants(partner, reach("post.published", [channel(2)], tenant))
    ).toBeTruthy();
    expect(
      wants(partner, reach("post.published", [channel(1)], tenant))
    ).toBeFalsy();
    expect(wants(partner, reach("post.published", [channel(2)]))).toBeFalsy();
  });
});

describe(takesWorkspaceFilter, () => {
  it("is a partner endpoint's only", () => {
    expect(takesWorkspaceFilter("partner")).toBeTruthy();
    expect(takesWorkspaceFilter("workspace")).toBeFalsy();
    expect(listening({ workspaceIds: [tenant] }).workspaceIds).toStrictEqual(
      []
    );
  });

  it("is kept as saved, each id once", () => {
    const partner = listening(
      {
        channelIds: [channel(2), channel(2), channel(1)],
        workspaceIds: [tenant, tenant],
      },
      "partner"
    );

    expect(partner.channelIds).toStrictEqual([channel(2), channel(1)]);
    expect(partner.workspaceIds).toStrictEqual([tenant]);
  });

  it("is changed when named, an empty list clearing it", () => {
    const partner = listening({ channelIds: [channel(2)] }, "partner");

    expect(
      changeEndpoint(partner, { description: "Renamed" }, now).channelIds
    ).toStrictEqual([channel(2)]);
    expect(
      changeEndpoint(partner, { channelIds: [] }, now).channelIds
    ).toStrictEqual([]);
    expect(
      changeEndpoint(partner, { workspaceIds: [tenant] }, now).workspaceIds
    ).toStrictEqual([tenant]);
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
