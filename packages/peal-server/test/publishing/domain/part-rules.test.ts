import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";

import {
  checkPublishable,
  partViolationsOn,
} from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { followUpsOn } from "#publishing/domain/platform-rules.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { maxFollowUps, PostPart } from "#publishing/domain/post-part.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const bluesky = channel("1", "bluesky");
const x = channel("2", "x");
const mastodon = channel("4", "mastodon");
const youtube = channel("7", "youtube");

const part = (
  text: string,
  fields: Partial<Pick<PostPart, "media" | "overrides">> = {}
) =>
  new PostPart({
    delaySeconds: 0,
    media: fields.media ?? [],
    overrides: fields.overrides ?? [],
    text,
  });

const thread = (text: string, ...followUps: readonly PostPart[]) =>
  new PostContent({ followUps, media: [], overrides: [], text });

const violationsOf = (
  content: PostContent,
  channels: readonly ChannelOnPlatform[],
  files: Parameters<typeof checkPublishable>[2] = []
) =>
  Option.match(Result.getFailure(checkPublishable(content, channels, files)), {
    onNone: () => [],
    onSome: ({ violations }) => violations,
  });

describe("the platforms that take the parts after a post's first", () => {
  it("are those with threads Peal can post with what it is granted", () => {
    expect(
      platforms.flatMap((platform) => {
        const rules = followUpsOn(platform);

        return rules === undefined ? [] : [[platform, rules.kind]];
      })
    ).toStrictEqual([
      ["x", "thread"],
      ["bluesky", "thread"],
      ["mastodon", "thread"],
    ]);
  });

  it("take as many parts as a post holds", () => {
    expect(followUpsOn("x")?.maximum).toBe(maxFollowUps);
  });
});

describe("a post of several parts", () => {
  it("goes to a platform with threads when each part fits it", () => {
    expect(
      violationsOf(thread("First", part("Second"), part("Third")), [
        bluesky,
        mastodon,
        x,
      ])
    ).toStrictEqual([]);
  });

  it("is refused where the platform takes one part only", () => {
    expect(
      violationsOf(thread("A video's description", part("And a reply")), [
        youtube,
        x,
      ]).filter(({ _tag }) => _tag === "tooManyParts")
    ).toStrictEqual([
      { _tag: "tooManyParts", ...youtube, count: 2, maximum: 1 },
    ]);
  });

  it("names the part that is too long, by its place", () => {
    const long = "a".repeat(301);

    expect(
      violationsOf(thread("First", part("Second"), part(long)), [bluesky])
    ).toStrictEqual([
      {
        _tag: "textTooLong",
        ...bluesky,
        length: 301,
        maximum: 300,
        part: 2,
        unit: "graphemes",
      },
    ]);
  });

  it("checks the text a part has on the channel, not its text elsewhere", () => {
    const long = "a".repeat(301);

    expect(
      violationsOf(
        thread(
          "First",
          part(long, {
            overrides: [
              new TextOverride({ channelId: bluesky.channelId, text: "Short" }),
            ],
          })
        ),
        [bluesky]
      )
    ).toStrictEqual([]);
  });

  it("refuses a part with no text and no media, and names it", () => {
    expect(violationsOf(thread("First", part("  ")), [x])).toStrictEqual([
      { _tag: "empty", ...x, part: 1 },
    ]);
  });

  it("leaves the first part's violations as they were, without a place", () => {
    expect(violationsOf(thread("", part("Second")), [x])).toStrictEqual([
      { _tag: "empty", ...x },
    ]);
  });

  it("checks each part's media against the platform, by part", () => {
    const mediaId = MediaAssetIdSchema.make(
      "00000000-0000-7000-8000-000000000101"
    );

    const content = thread(
      "First",
      part("Second", {
        media: [new MediaAttachment({ altText: "", mediaId })],
      })
    );

    expect(
      violationsOf(
        content,
        [bluesky],
        [mediaFile(mediaId, { byteSize: 3_000_000 })]
      )
    ).toStrictEqual([
      {
        _tag: "mediaTooLarge",
        ...bluesky,
        byteSize: 3_000_000,
        maximum: 2_000_000,
        mediaId,
        part: 1,
      },
    ]);
  });

  it("lists nothing about parts for a post of one part", () => {
    expect(partViolationsOn(thread("Alone"), youtube, [])).toStrictEqual([]);
  });
});
