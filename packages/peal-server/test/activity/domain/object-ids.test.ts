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

  it("keeps an id as Peal writes it, however the path wrote it", () => {
    expect(
      objectIdsOf({ userId: "5B0C6E64-5D0F-4A7E-9A52-3F1C2D4E5F60" })
    ).toStrictEqual({ userId: "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60" });
  });

  it("leaves out a word someone put where an id goes", () => {
    expect(
      objectIdsOf({
        platform: "notaplatform",
        postId: "any_text_they_like",
        targetId: "ana-at-example-test",
      })
    ).toStrictEqual({});
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
