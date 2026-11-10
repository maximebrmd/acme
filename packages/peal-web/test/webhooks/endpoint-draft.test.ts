import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { SubscribableWebhookEventTypeSchema } from "peal-contract";
import type { WebhookEndpoint } from "peal-contract";

import {
  changeOf,
  draftOf,
  emptyDraft,
  everyTypeChosen,
  newEndpointOf,
  withEveryType,
  withType,
} from "#webhooks/endpoint-draft.ts";

const at = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const endpoint: WebhookEndpoint = {
  createdAt: at,
  description: "Synthetic receiver",
  disabledAt: null,
  disabledReason: null,
  enabled: true,
  eventTypes: ["post.published", "post.failed"],
  failingSince: null,
  id: "00000000-0000-7000-8000-000000000001",
  previousSecretExpiresAt: null,
  updatedAt: at,
  url: "https://hooks.example.com/peal",
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
