import { describe, expect, it } from "@effect/vitest";
import type { MediaAttachment, PostContent } from "peal-contract";

import {
  channelMediaOf,
  channelTextsOf,
  mediaWaitingForText,
  overridesFrom,
  withChannelMedia,
} from "#posts/channel-media.ts";

const photo = (mediaId: string): MediaAttachment => ({
  altText: "",
  mediaId,
});

const saved: PostContent = {
  media: [photo("m1"), photo("m2")],
  overrides: [
    // Its own media, under the post's own text.
    { channelId: "bluesky", media: [photo("m2")], text: "The post" },
    // Its own text and media.
    { channelId: "x", media: [], text: "Shorter" },
    // Its own text alone.
    { channelId: "mastodon", text: "Longer, here" },
  ],
  text: "The post",
};

describe(channelMediaOf, () => {
  it("reads the media a saved post gives some channels", () => {
    expect(channelMediaOf(saved)).toStrictEqual({
      bluesky: [photo("m2")],
      x: [],
    });
    expect(channelMediaOf(undefined)).toStrictEqual({});
  });
});

describe(channelTextsOf, () => {
  it("lets a channel that repeats the post's text follow it", () => {
    expect(channelTextsOf(saved)).toStrictEqual({
      mastodon: "Longer, here",
      x: "Shorter",
    });
  });
});

describe(overridesFrom, () => {
  const channelIds = ["bluesky", "x", "mastodon"];

  it("sends what the composer holds, the post's text under media alone", () => {
    expect(
      overridesFrom({
        channelIds,
        channelMedia: channelMediaOf(saved),
        overrides: channelTextsOf(saved),
        text: "The post, edited",
      })
    ).toStrictEqual([
      { channelId: "bluesky", media: [photo("m2")], text: "The post, edited" },
      { channelId: "x", media: [], text: "Shorter" },
      { channelId: "mastodon", text: "Longer, here" },
    ]);
  });

  it("sends nothing for a channel the post no longer goes to", () => {
    expect(
      overridesFrom({
        channelIds: ["mastodon"],
        channelMedia: channelMediaOf(saved),
        overrides: channelTextsOf(saved),
        text: "The post",
      })
    ).toStrictEqual([{ channelId: "mastodon", text: "Longer, here" }]);
  });

  it("cannot send media of its own without a text", () => {
    const blank = {
      channelIds: ["bluesky"],
      channelMedia: { bluesky: [photo("m2")] },
      overrides: {},
      text: "  ",
    };

    expect(overridesFrom(blank)).toStrictEqual([]);
    expect(mediaWaitingForText(blank)).toStrictEqual(["bluesky"]);
    expect(
      mediaWaitingForText({ ...blank, overrides: { bluesky: "Here" } })
    ).toStrictEqual([]);
  });
});

describe(withChannelMedia, () => {
  it("gives a channel media of its own, or takes them back", () => {
    const own = withChannelMedia({}, "bluesky", [photo("m1")]);

    expect(own).toStrictEqual({ bluesky: [photo("m1")] });
    expect(withChannelMedia(own, "bluesky", undefined)).toStrictEqual({});
  });
});
