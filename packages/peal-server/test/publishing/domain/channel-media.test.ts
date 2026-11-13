import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";

import { approvalSubject } from "#publishing/domain/approval-subject.ts";
import { checkPublishable } from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import {
  partsOn,
  PostContent,
  sentTo,
  shownMedia,
  withTextOn,
} from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const bluesky = channel("1", "bluesky");

const instagram = channel("2", "instagram");

const mastodon = channel("3", "mastodon");

const mediaIds = Array.from({ length: 6 }, (_, index) =>
  MediaAssetIdSchema.make(
    `00000000-0000-7000-8000-${(index + 100).toString().padStart(12, "0")}`
  )
);

const attached = (from: number, to: number) =>
  mediaIds
    .slice(from, to)
    .map((mediaId) => new MediaAttachment({ altText: "Synthetic", mediaId }));

const files = mediaIds.map((mediaId) => mediaFile(mediaId));

const violationsOf = (
  result: Result.Result<
    PostContent,
    { readonly violations: readonly ContentViolation[] }
  >
): readonly ContentViolation[] =>
  Option.match(Result.getFailure(result), {
    onNone: () => [],
    onSome: ({ violations }) => violations,
  });

// Five images, which Bluesky's four refuse; two of them on Bluesky.
const content = new PostContent({
  followUps: [
    new PostPart({
      delaySeconds: 0,
      media: attached(0, 1),
      overrides: [
        new TextOverride({
          channelId: bluesky.channelId,
          media: [],
          text: "The second part, without its image here",
        }),
      ],
      text: "The second part",
    }),
  ],
  media: attached(0, 5),
  overrides: [
    new TextOverride({
      channelId: bluesky.channelId,
      media: attached(4, 6),
      text: "Two images on Bluesky",
    }),
    new TextOverride({ channelId: mastodon.channelId, text: "Text only" }),
  ],
  text: "Five images",
});

describe(partsOn, () => {
  it("gives a channel the media its override gives it, part by part", () => {
    expect(
      partsOn(content, bluesky.channelId).map(({ media }) =>
        media.map(({ mediaId }) => mediaId)
      )
    ).toStrictEqual([mediaIds.slice(4, 6), []]);
  });

  it("gives every other channel the part's own media", () => {
    for (const other of [instagram, mastodon]) {
      expect(
        partsOn(content, other.channelId).map(({ media }) =>
          media.map(({ mediaId }) => mediaId)
        )
      ).toStrictEqual([mediaIds.slice(0, 5), mediaIds.slice(0, 1)]);
    }
  });
});

describe(shownMedia, () => {
  it("lists every file of every channel, each once", () => {
    expect(shownMedia(content).map(({ mediaId }) => mediaId)).toStrictEqual(
      mediaIds
    );
  });
});

describe(sentTo, () => {
  it("is the post with the channel's media, and the texts it had", () => {
    const onBluesky = sentTo(content, bluesky.channelId);

    expect(onBluesky.media.map(({ mediaId }) => mediaId)).toStrictEqual(
      mediaIds.slice(4, 6)
    );
    expect(onBluesky.followUps[0]?.media).toStrictEqual([]);
    expect(shownMedia(onBluesky).map(({ mediaId }) => mediaId)).toStrictEqual(
      mediaIds.slice(4, 6)
    );
    expect(onBluesky.overrides.map(({ text }) => text)).toStrictEqual([
      "Two images on Bluesky",
      "Text only",
    ]);
  });
});

describe(withTextOn, () => {
  it("keeps the media an override gives its channel", () => {
    const edited = withTextOn(content, 0, bluesky.channelId, "Edited");

    expect(edited.overrides[0]).toStrictEqual(
      new TextOverride({
        channelId: bluesky.channelId,
        media: attached(4, 6),
        text: "Edited",
      })
    );
  });
});

describe("checking a post with media of its own on a channel", () => {
  it("checks each channel on the media it receives", () => {
    expect(
      violationsOf(
        checkPublishable(content, [bluesky, mastodon], files)
      ).filter(({ _tag }) => _tag === "tooManyMedia")
    ).toStrictEqual([
      {
        _tag: "tooManyMedia",
        channelId: mastodon.channelId,
        count: 5,
        maximum: 4,
        platform: "mastodon",
      },
    ]);
  });

  it("lets a channel that needs media take it from its override", () => {
    const textOnly = new PostContent({
      media: [],
      overrides: [
        new TextOverride({
          channelId: instagram.channelId,
          media: attached(0, 1),
          text: "With an image here",
        }),
      ],
      text: "No image",
    });

    expect(
      violationsOf(checkPublishable(textOnly, [instagram], files))
    ).toStrictEqual([]);
    expect(
      violationsOf(checkPublishable(textOnly, [instagram, mastodon], files))
    ).toStrictEqual([]);
  });

  it("refuses an override's media for a channel the post is not for", () => {
    expect(
      violationsOf(checkPublishable(content, [instagram], files))
    ).toContainEqual({
      _tag: "overrideWithoutChannel",
      channelId: bluesky.channelId,
    });
  });
});

describe("the approval of a post with media of its own on a channel", () => {
  it("covers the media of every channel", () => {
    const other = new PostContent({
      followUps: content.followUps,
      media: content.media,
      overrides: [
        new TextOverride({
          channelId: bluesky.channelId,
          media: attached(4, 5),
          text: "Two images on Bluesky",
        }),
        new TextOverride({ channelId: mastodon.channelId, text: "Text only" }),
      ],
      text: content.text,
    });

    expect(approvalSubject(other, [])).not.toBe(approvalSubject(content, []));
  });

  it("is written as before for a post without any", () => {
    const plain = new PostContent({
      media: attached(0, 1),
      overrides: [
        new TextOverride({ channelId: mastodon.channelId, text: "Here" }),
      ],
      text: "A post",
    });

    expect(approvalSubject(plain, [])).toBe(
      JSON.stringify({
        channels: [],
        media: [{ altText: "Synthetic", mediaId: mediaIds[0] }],
        overrides: [{ channelId: mastodon.channelId, text: "Here" }],
        text: "A post",
      })
    );
  });
});
