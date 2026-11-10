import { describe, expect, it } from "@effect/vitest";

import { objectIdsOf } from "#activity/domain/object-ids.ts";

describe(objectIdsOf, () => {
  it("keeps the ids a path names, without the workspace's", () => {
    expect(
      objectIdsOf({
        channelId: "0195d2c0-0000-7000-8000-000000000002",
        platform: "mastodon",
        postId: "0195d2c0-0000-7000-8000-000000000001",
        workspaceId: "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60",
      })
    ).toStrictEqual({
      channelId: "0195d2c0-0000-7000-8000-000000000002",
      platform: "mastodon",
      postId: "0195d2c0-0000-7000-8000-000000000001",
    });
  });

  it("leaves out what is not shaped like an id, as it could hold anything", () => {
    expect(
      objectIdsOf({
        "bad name": "0195d2c0-0000-7000-8000-000000000001",
        email: "ana@example.test",
        missing: undefined,
        note: "A synthetic sentence someone wrote.",
        query: "a?b=c",
        tooLong: "a".repeat(129),
      })
    ).toStrictEqual({});
  });
});
