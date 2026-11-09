import { describe, expect, it } from "@effect/vitest";
import type { Channel, Post } from "acme-contract";

import { connectedTargets } from "#posts/channel-selection.ts";

const channel = (id: string): Channel => ({
  avatarUrl: null,
  displayName: null,
  handle: `@acme_${id}`,
  id,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

const draftFor = (...channelIds: readonly string[]): Post => ({
  authorId: null,
  content: { media: [], overrides: [], text: "A synthetic draft" },
  id: "00000000-0000-7000-8000-000000000001",
  outcome: null,
  schedule: null,
  status: "draft",
  targets: channelIds.map((channelId, index) => ({
    channelId,
    failureReason: null,
    id: `00000000-0000-7000-8000-00000000010${index}`,
    options: null,
    permalink: null,
    publishedAt: null,
    round: 1,
    status: "pending",
    unconfirmedReason: null,
  })),
});

describe(connectedTargets, () => {
  it("keeps the post's channels, in its order", () => {
    expect(
      connectedTargets(draftFor("b", "a"), [channel("a"), channel("b")])
    ).toStrictEqual(["b", "a"]);
  });

  it("leaves out a channel disconnected since the draft was saved", () => {
    expect(
      connectedTargets(draftFor("gone", "a"), [channel("a")])
    ).toStrictEqual(["a"]);
  });

  it("starts a new post on no channel", () => {
    expect(connectedTargets(undefined, [channel("a")])).toStrictEqual([]);
  });
});
