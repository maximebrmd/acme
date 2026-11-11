import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

import { WebhookEventTypeSchema } from "#webhooks/domain/webhook-event-type.ts";
import {
  channelsOf,
  postWideEventTypes,
  WebhookEventSchema,
} from "#webhooks/domain/webhook-event.ts";
import type {
  EventChannels,
  WebhookEvent,
} from "#webhooks/domain/webhook-event.ts";

// One stored event of every type, as the persisted contract keeps them.
const stored = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.toCodecJson(Schema.Array(WebhookEventSchema)))
)(
  await readFile(
    path.join(
      import.meta.dirname,
      "..",
      "infrastructure",
      "fixtures",
      "persisted",
      "events",
      "stored.json"
    ),
    "utf-8"
  )
);

const ofType = (type: WebhookEvent["type"]) => {
  const event = stored.find((each) => each.type === type);

  if (event === undefined) {
    throw new Error(`No stored event of type ${type}`);
  }

  return event;
};

const expected = (event: WebhookEvent): EventChannels => {
  const { data } = event;

  if ("targets" in data) {
    return {
      _tag: "named",
      channelIds: data.targets.map(({ channelId }) => channelId),
    };
  }

  if ("channelId" in data) {
    return { _tag: "named", channelIds: [data.channelId] };
  }

  return postWideEventTypes.some((type) => type === event.type)
    ? { _tag: "ofPost" }
    : { _tag: "none" };
};

describe(channelsOf, () => {
  it.each(WebhookEventTypeSchema.literals)(
    "says which channels a %s event concerns",
    (type) => {
      const event = ofType(type);

      expect(channelsOf(event)).toStrictEqual(expected(event));
    }
  );

  it("names a post's channels for its whole-post events from its targets", () => {
    expect(channelsOf(ofType("post.scheduled"))).toStrictEqual({
      _tag: "named",
      channelIds: [
        "019a6f3e-7b10-7c3a-9d41-5e2f8a6b4c03",
        "019a6f3e-7b10-7c3a-9d41-5e2f8a6b4c05",
      ],
    });
  });

  it("leaves files, boosts and tests about no channel", () => {
    for (const type of [
      "media.ready",
      "boost.started",
      "webhook.test",
    ] as const) {
      expect(channelsOf(ofType(type))).toStrictEqual({ _tag: "none" });
    }
  });

  it("asks the teller for the channels of a post event that names none", () => {
    for (const type of postWideEventTypes) {
      expect(channelsOf(ofType(type))).toStrictEqual({ _tag: "ofPost" });
    }
  });
});
