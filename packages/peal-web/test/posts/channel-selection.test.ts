import { describe, expect, it } from "@effect/vitest";
import type { Channel, Post } from "peal-contract";

import {
  connectedTargets,
  everyChannel,
  offersEveryChannel,
} from "#posts/channel-selection.ts";

const active: Channel["status"] = { _tag: "active" };

const channel = (id: string, status: Channel["status"] = active): Channel => ({
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: `@peal_${id}`,
  id,
  label: null,
  platform: "mastodon",
  status,
  tokenExpiresAt: null,
});

const draftFor = (...channelIds: readonly string[]): Post => ({
  authorId: null,
  content: { media: [], overrides: [], text: "A synthetic draft" },
  createdVia: null,
  id: "00000000-0000-7000-8000-000000000001",
  occurrence: null,
  outcome: null,
  queueId: null,
  recyclingId: null,
  schedule: null,
  scheduledBy: null,
  scheduledVia: null,
  shortenLinks: false,
  status: "draft",
  tagIds: [],
  targets: channelIds.map((channelId, index) => ({
    channelId,
    editedAt: null,
    failureReason: null,
    id: `00000000-0000-7000-8000-00000000010${index}`,
    options: null,
    parts: { count: 1, live: [] },
    permalink: null,
    publishedAt: null,
    removedAt: null,
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

describe(everyChannel, () => {
  it("selects every channel the picker offers, in the list's order", () => {
    expect(
      everyChannel([channel("a"), channel("b"), channel("c")], ["c"])
    ).toStrictEqual(["a", "b", "c"]);
  });

  it("leaves out a channel that is off or must be reconnected", () => {
    expect(
      everyChannel(
        [
          channel("a"),
          channel("off", { _tag: "disabled", refreshNeeded: false }),
          channel("b"),
          channel("stale", { _tag: "refreshNeeded" }),
        ],
        []
      )
    ).toStrictEqual(["a", "b"]);
  });

  it("keeps such a channel when the post already goes to it", () => {
    expect(
      everyChannel(
        [
          channel("off", { _tag: "disabled", refreshNeeded: false }),
          channel("a"),
        ],
        ["off"]
      )
    ).toStrictEqual(["off", "a"]);
  });
});

describe(offersEveryChannel, () => {
  it("offers to select them all from three channels up", () => {
    expect(offersEveryChannel([channel("a"), channel("b")])).toBeFalsy();
    expect(
      offersEveryChannel([channel("a"), channel("b"), channel("c")])
    ).toBeTruthy();
  });
});
