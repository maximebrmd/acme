import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import type { SocialChannel, ChannelSet, Platform } from "peal-contract";

import {
  appliedSet,
  channelSetDetailsOf,
  connectedChannels,
  editableChannelIds,
  missingChannels,
  withChannel,
} from "#channel-sets/selection.ts";
import { initialValues } from "#posts/target-options.ts";

const channel = (
  id: string,
  platform: Platform = "mastodon"
): SocialChannel => ({
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: `@peal_${id}`,
  id,
  label: null,
  platform,
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

const set = (fields: Partial<ChannelSet>): ChannelSet => ({
  channelIds: [],
  createdAt: DateTime.makeUnsafe("2026-11-01T09:00:00Z"),
  id: "s1",
  name: "Launch",
  options: [],
  unavailableChannelIds: [],
  ...fields,
});

const channels = [channel("a"), channel("b"), channel("y", "youtube")];

describe(connectedChannels, () => {
  it("keeps the set's channels that are connected, in the workspace's order", () => {
    const kept = set({
      channelIds: ["b", "gone", "a"],
      unavailableChannelIds: ["gone"],
    });

    expect(connectedChannels(kept, channels).map(({ id }) => id)).toStrictEqual(
      ["a", "b"]
    );
    expect(missingChannels(kept, channels)).toStrictEqual(["gone"]);
    expect(editableChannelIds(kept, channels)).toStrictEqual(["a", "b"]);
  });

  it("counts as missing a channel the server calls unavailable, listed or not", () => {
    const kept = set({ channelIds: ["a", "b"], unavailableChannelIds: ["b"] });

    expect(missingChannels(kept, channels)).toStrictEqual(["b"]);
  });
});

describe(appliedSet, () => {
  it("selects the connected channels and counts those left out", () => {
    expect(
      appliedSet(
        set({
          channelIds: ["a", "gone", "other"],
          unavailableChannelIds: ["gone", "other"],
        }),
        channels
      )
    ).toStrictEqual({ channelIds: ["a"], dropped: 2, values: {} });
  });

  it("fills the options the set keeps, as the options fields hold them", () => {
    const applied = appliedSet(
      set({
        channelIds: ["a", "y"],
        options: [
          {
            channelId: "y",
            options: { platform: "youtube", title: "A synthetic title" },
          },
        ],
      }),
      channels
    );

    expect(applied.channelIds).toStrictEqual(["a", "y"]);
    expect(applied.dropped).toBe(0);
    expect(Object.keys(applied.values)).toStrictEqual(["y"]);
    expect(applied.values["y"]).toStrictEqual({
      ...initialValues("youtube"),
      title: "A synthetic title",
    });
  });

  it("fills nothing for a channel whose options the set does not keep", () => {
    expect(
      appliedSet(set({ channelIds: ["y"] }), channels).values
    ).toStrictEqual({});
  });
});

describe(channelSetDetailsOf, () => {
  it("saves a name, the channels, and the options of those channels only", () => {
    const options = [
      { channelId: "y", options: { platform: "youtube" } },
      { channelId: "unticked", options: { platform: "youtube" } },
    ] as const;

    expect(channelSetDetailsOf(" Launch ", ["a", "y"], options)).toStrictEqual(
      Option.some({
        channelIds: ["a", "y"],
        name: "Launch",
        options: [{ channelId: "y", options: { platform: "youtube" } }],
      })
    );
  });

  it.each([
    ["no name", "  ", ["a"]],
    ["no channel", "Launch", []],
    ["a name too long", "x".repeat(61), ["a"]],
  ])("saves nothing with %s", (_, name, channelIds) => {
    expect(channelSetDetailsOf(name, channelIds, [])).toStrictEqual(
      Option.none()
    );
  });
});

describe(withChannel, () => {
  it("ticks and unticks a channel, in the workspace's order", () => {
    expect(withChannel(["b"], channels, "a", true)).toStrictEqual(["a", "b"]);
    expect(withChannel(["a", "b"], channels, "a", false)).toStrictEqual(["b"]);
  });
});
