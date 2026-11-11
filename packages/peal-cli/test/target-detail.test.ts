import { describe, expect, it } from "@effect/vitest";
import type { PostTarget } from "peal-contract";

import { targetDetail } from "#commands/posts.ts";

// A published YouTube target, as the API answers it.
const published: PostTarget = {
  channelId: "0190f3a0-0000-7000-8000-00000000c001",
  failureReason: null,
  id: "0190f3a0-0000-7000-8000-00000000d001",
  options: null,
  parts: { count: 1, live: [] },
  permalink: "https://www.youtube.com/watch?v=synthetic",
  publishedAt: null,
  removedAt: null,
  round: 1,
  status: "published",
  unconfirmedReason: null,
};

describe("how a target went", () => {
  it("is published at its address", () => {
    expect(targetDetail(published)).toBe(
      "published at https://www.youtube.com/watch?v=synthetic"
    );
  });

  it("says when the video went live without its thumbnail", () => {
    expect(targetDetail({ ...published, thumbnailNotSet: true })).toBe(
      "published at https://www.youtube.com/watch?v=synthetic; its thumbnail was not set: the channel may not be allowed custom thumbnails, or YouTube refused the image"
    );
  });
});
