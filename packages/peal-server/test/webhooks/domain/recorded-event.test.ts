import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { bodyOf, RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { WebhookEventIdSchema } from "#webhooks/domain/webhook-event-id.ts";
import { WebhookEventTypeSchema } from "#webhooks/domain/webhook-event-type.ts";
import { WebhookEventSchema } from "#webhooks/domain/webhook-event.ts";

describe(bodyOf, () => {
  it("writes the event as the payload receivers read", () => {
    const recorded = new RecordedEvent({
      event: {
        data: {
          channelId: ChannelIdSchema.make(
            "00000000-0000-7000-8000-00000000000c"
          ),
          permalink: "https://social.example/@peal_example/1",
          platform: "mastodon",
          postId: PostIdSchema.make("00000000-0000-7000-8000-00000000000a"),
          publishedAt: DateTime.makeUnsafe("2026-11-10T09:00:02Z"),
          round: 1,
          targetId: PostTargetIdSchema.make(
            "00000000-0000-7000-8000-00000000000b"
          ),
          workspaceId: WorkspaceIdSchema.make(
            "11111111-1111-4111-8111-111111111111"
          ),
        },
        type: "post.published",
      },
      id: WebhookEventIdSchema.make("00000000-0000-7000-8000-000000000001"),
      occurredAt: DateTime.makeUnsafe("2026-11-10T09:00:03Z"),
      workspaceId: WorkspaceIdSchema.make(
        "11111111-1111-4111-8111-111111111111"
      ),
    });

    expect(JSON.parse(bodyOf(recorded))).toStrictEqual({
      data: {
        channelId: "00000000-0000-7000-8000-00000000000c",
        permalink: "https://social.example/@peal_example/1",
        platform: "mastodon",
        postId: "00000000-0000-7000-8000-00000000000a",
        publishedAt: "2026-11-10T09:00:02.000Z",
        round: 1,
        targetId: "00000000-0000-7000-8000-00000000000b",
        workspaceId: "11111111-1111-4111-8111-111111111111",
      },
      id: "00000000-0000-7000-8000-000000000001",
      timestamp: "2026-11-10T09:00:03.000Z",
      type: "post.published",
      version: 1,
      workspaceExternalId: null,
    });
    expect(bodyOf(recorded)).toBe(bodyOf(recorded));
  });
});

describe("the events", () => {
  it("have one schema per type", () => {
    const types = WebhookEventSchema.members.map(
      (member) => member.fields.type.literal
    );

    expect(types.toSorted()).toStrictEqual(
      WebhookEventTypeSchema.literals.toSorted()
    );
  });
});
