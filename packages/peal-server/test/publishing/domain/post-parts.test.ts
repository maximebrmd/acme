import { describe, expect, it } from "@effect/vitest";
import { Duration, Schema } from "effect";

import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import {
  partCount,
  partsOn,
  PostContent,
  shownMedia,
} from "#publishing/domain/post-content.ts";
import {
  maxFollowUps,
  maxPartDelaySeconds,
  PostPart,
} from "#publishing/domain/post-part.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";

const mastodon = ChannelIdSchema.make("00000000-0000-7000-8000-000000000001");
const bluesky = ChannelIdSchema.make("00000000-0000-7000-8000-000000000002");

const photo = new MediaAttachment({
  altText: "A loaf on a counter",
  mediaId: MediaAssetIdSchema.make("00000000-0000-7000-8000-0000000000c1"),
});

const chart = new MediaAttachment({
  altText: "",
  mediaId: MediaAssetIdSchema.make("00000000-0000-7000-8000-0000000000c2"),
});

const part = (
  text: string,
  fields: Partial<Pick<PostPart, "delaySeconds" | "media" | "overrides">> = {}
) =>
  new PostPart({
    delaySeconds: fields.delaySeconds ?? 0,
    media: fields.media ?? [],
    overrides: fields.overrides ?? [],
    text,
  });

const decode = Schema.decodeUnknownSync(PostContent);

describe("a post's parts", () => {
  it("is one part when nothing follows it, as every post was", () => {
    const content = new PostContent({
      media: [photo],
      overrides: [new TextOverride({ channelId: bluesky, text: "Short" })],
      text: "Launch day",
    });

    expect(content.followUps).toStrictEqual([]);
    expect(partCount(content)).toBe(1);

    expect(partsOn(content, mastodon)).toStrictEqual([
      { delay: Duration.zero, index: 0, media: [photo], text: "Launch day" },
    ]);

    expect(partsOn(content, bluesky)).toStrictEqual([
      { delay: Duration.zero, index: 0, media: [photo], text: "Short" },
    ]);
  });

  it("decodes content stored before posts had parts as a single part", () => {
    const stored = decode({ media: [], overrides: [], text: "Launch day" });

    expect(stored.followUps).toStrictEqual([]);
  });

  it("reads each part on a channel: its own text there, or the part's", () => {
    const content = new PostContent({
      followUps: [
        part("Second", {
          delaySeconds: 90,
          media: [chart],
          overrides: [
            new TextOverride({ channelId: bluesky, text: "Second, shorter" }),
          ],
        }),
        part("Third"),
      ],
      media: [photo],
      overrides: [],
      text: "First",
    });

    expect(partCount(content)).toBe(3);

    expect(partsOn(content, bluesky)).toStrictEqual([
      { delay: Duration.zero, index: 0, media: [photo], text: "First" },
      {
        delay: Duration.seconds(90),
        index: 1,
        media: [chart],
        text: "Second, shorter",
      },
      { delay: Duration.zero, index: 2, media: [], text: "Third" },
    ]);

    expect(partsOn(content, mastodon)[1]?.text).toBe("Second");
  });

  it("lists the media of every part, each file once", () => {
    const content = new PostContent({
      followUps: [part("Second", { media: [chart, photo] })],
      media: [photo],
      overrides: [],
      text: "First",
    });

    expect(shownMedia(content)).toStrictEqual([photo, chart]);
  });

  it(`holds at most ${maxFollowUps} parts after the first`, () => {
    const followUps = Array.from({ length: maxFollowUps + 1 }, () => ({
      delaySeconds: 0,
      media: [],
      overrides: [],
      text: "More",
    }));

    expect(() =>
      decode({ followUps, media: [], overrides: [], text: "First" })
    ).toThrow(/followUps/u);

    expect(
      decode({
        followUps: followUps.slice(1),
        media: [],
        overrides: [],
        text: "First",
      }).followUps
    ).toHaveLength(maxFollowUps);
  });

  it.each([-1, 1.5, maxPartDelaySeconds + 1])(
    "refuses a wait of %s seconds before a part",
    (delaySeconds) => {
      expect(() =>
        Schema.decodeUnknownSync(PostPart)({
          delaySeconds,
          media: [],
          overrides: [],
          text: "Later",
        })
      ).toThrow(/delaySeconds/u);
    }
  );

  it("takes one text per channel and each file once in a part", () => {
    const again = { channelId: bluesky, text: "Twice" };

    expect(() =>
      Schema.decodeUnknownSync(PostPart)({
        delaySeconds: 0,
        media: [],
        overrides: [again, again],
        text: "Later",
      })
    ).toThrow(/one text per channel/u);

    const file = { altText: "", mediaId: chart.mediaId };

    expect(() =>
      Schema.decodeUnknownSync(PostPart)({
        delaySeconds: 0,
        media: [file, file],
        overrides: [],
        text: "Later",
      })
    ).toThrow(/each media attached once/u);
  });
});
