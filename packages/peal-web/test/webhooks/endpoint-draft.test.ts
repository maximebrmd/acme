import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { SubscribableWebhookEventTypeSchema } from "peal-contract";
import type { WebhookEndpoint } from "peal-contract";

import {
  changeOf,
  draftOf,
  emptyDraft,
  everyTypeChosen,
  goneChannelIds,
  newEndpointOf,
  withChannel,
  withEveryType,
  withType,
  workspaceIdsOf,
} from "#webhooks/endpoint-draft.ts";

const at = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const endpoint: WebhookEndpoint = {
  channelIds: [],
  createdAt: at,
  description: "Synthetic receiver",
  disabledAt: null,
  disabledReason: null,
  enabled: true,
  eventTypes: ["post.published", "post.failed"],
  failingSince: null,
  id: "00000000-0000-7000-8000-000000000001",
  previousSecretExpiresAt: null,
  scope: "workspace",
  updatedAt: at,
  url: "https://hooks.example.com/peal",
  workspaceIds: [],
};

describe(newEndpointOf, () => {
  it("is nothing without an address or an event", () => {
    expect(newEndpointOf(emptyDraft)).toStrictEqual(Option.none());
    expect(
      newEndpointOf({ ...emptyDraft, url: "https://hooks.example.com/peal" })
    ).toStrictEqual(Option.none());
    expect(
      newEndpointOf(withType(emptyDraft, "media.ready", true))
    ).toStrictEqual(Option.none());
  });

  it("lists the chosen events in the vocabulary's order, the address trimmed", () => {
    const draft = withType(
      withType(
        {
          ...emptyDraft,
          description: " For the studio ",
          url: " https://hooks.example.com/peal ",
        },
        "media.ready",
        true
      ),
      "post.failed",
      true
    );

    expect(newEndpointOf(draft)).toStrictEqual(
      Option.some({
        description: "For the studio",
        enabled: true,
        eventTypes: ["post.failed", "media.ready"],
        url: "https://hooks.example.com/peal",
      })
    );
  });
});

describe(withEveryType, () => {
  it("chooses every event, or none", () => {
    const all = withEveryType(emptyDraft, true);

    expect([...all.eventTypes].toSorted()).toStrictEqual(
      SubscribableWebhookEventTypeSchema.literals.toSorted()
    );
    expect(everyTypeChosen(all)).toBeTruthy();
    expect(everyTypeChosen(withType(all, "media.ready", false))).toBeFalsy();
    expect(withEveryType(all, false).eventTypes.size).toBe(0);
  });
});

describe(changeOf, () => {
  it("starts from the endpoint as it is", () => {
    expect(changeOf(draftOf(endpoint))).toStrictEqual(
      Option.some({
        channelIds: [],
        description: "Synthetic receiver",
        eventTypes: ["post.published", "post.failed"],
        url: "https://hooks.example.com/peal",
      })
    );
  });

  it("is nothing once no event is left", () => {
    expect(changeOf(withEveryType(draftOf(endpoint), false))).toStrictEqual(
      Option.none()
    );
  });
});

describe("an endpoint's filters", () => {
  const channel = "00000000-0000-7000-8000-0000000000c1";
  const tenant = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

  it("sends the channels chosen, and none to hear every channel", () => {
    const draft = withType(
      { ...emptyDraft, url: "https://hooks.example.com/peal" },
      "post.published",
      true
    );

    expect(
      Option.map(newEndpointOf(withChannel(draft, channel, true)), (made) =>
        "channelIds" in made ? made.channelIds : []
      )
    ).toStrictEqual(Option.some([channel]));
    expect(
      Option.map(newEndpointOf(draft), (made) => "channelIds" in made)
    ).toStrictEqual(Option.some(false));
    expect(
      Option.map(
        changeOf(
          withChannel(
            withChannel(draftOf(endpoint), channel, true),
            channel,
            false
          )
        ),
        (change) => change.channelIds
      )
    ).toStrictEqual(Option.some([]));
  });

  it("names the channels it hears that are no longer connected, which can be taken off", () => {
    const gone = "00000000-0000-7000-8000-0000000000c2";
    const filtered = draftOf({ ...endpoint, channelIds: [channel, gone] });
    const connected = [{ id: channel, label: "@peal_example" }];

    expect(goneChannelIds(filtered, connected)).toStrictEqual([gone]);
    expect(
      Option.map(
        changeOf(withChannel(filtered, gone, false)),
        (change) => change.channelIds
      )
    ).toStrictEqual(Option.some([channel]));
    expect(goneChannelIds(draftOf(endpoint), connected)).toStrictEqual([]);
  });

  it("sends the workspaces of a partner endpoint only, one a line", () => {
    const partner = draftOf({
      ...endpoint,
      scope: "partner",
      workspaceIds: [tenant],
    });

    expect(partner.workspaceIds).toBe(tenant);
    expect(
      Option.map(
        changeOf({ ...partner, workspaceIds: `${tenant}\n\n ${tenant} ` }),
        (change) => change.workspaceIds
      )
    ).toStrictEqual(Option.some([tenant]));
    expect(
      Option.map(
        changeOf(draftOf(endpoint)),
        (change) => "workspaceIds" in change
      )
    ).toStrictEqual(Option.some(false));
    expect(workspaceIdsOf("")).toStrictEqual([]);
  });
});
