import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";

import { ChannelOptions } from "#publishing/domain/channel-options.ts";
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
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
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
const pinterest = channel("8", "pinterest");

const commenting: readonly Platform[] = [
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
];

const facebook = channel("9", "facebook");

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
  it("are those with threads, and those where the account comments under its post", () => {
    expect(
      platforms.flatMap((platform) => {
        const rules = followUpsOn(platform);

        return rules === undefined ? [] : [[platform, rules.kind]];
      })
    ).toStrictEqual([
      ["x", "thread"],
      ["linkedin", "comment"],
      ["bluesky", "thread"],
      ["mastodon", "thread"],
      ["instagram", "comment"],
      ["facebook", "comment"],
      ["youtube", "comment"],
    ]);
  });

  it("take one first comment where parts are comments", () => {
    expect(
      commenting.map((platform) => followUpsOn(platform)?.maximum)
    ).toStrictEqual([1, 1, 1, 1]);
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
      violationsOf(thread("A pin's description", part("And a reply")), [
        pinterest,
        x,
      ]).filter(({ _tag }) => _tag === "tooManyParts")
    ).toStrictEqual([
      { _tag: "tooManyParts", ...pinterest, count: 2, maximum: 1 },
    ]);
  });

  it("is refused past the one comment a platform with comments takes", () => {
    expect(
      violationsOf(
        thread("A video's description", part("A comment"), part("Another")),
        [youtube]
      ).filter(({ _tag }) => _tag === "tooManyParts")
    ).toStrictEqual([
      { _tag: "tooManyParts", ...youtube, count: 3, maximum: 2 },
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

describe("a first comment", () => {
  const mediaId = MediaAssetIdSchema.make(
    "00000000-0000-7000-8000-000000000102"
  );

  it("goes under a post on a platform with comments, held to text", () => {
    expect(
      violationsOf(thread("A page's post", part("The first comment")), [
        facebook,
      ])
    ).toStrictEqual([]);
  });

  it("is refused with a file, which Peal never sends with a comment", () => {
    expect(
      violationsOf(
        thread(
          "A page's post",
          part("With a picture", {
            media: [new MediaAttachment({ altText: "", mediaId })],
          })
        ),
        [facebook],
        [mediaFile(mediaId)]
      )
    ).toStrictEqual([
      { _tag: "tooManyMedia", ...facebook, count: 1, maximum: 0, part: 1 },
    ]);
  });

  it("needs a text", () => {
    expect(
      violationsOf(thread("A page's post", part(" ")), [facebook])
    ).toStrictEqual([{ _tag: "empty", ...facebook, part: 1 }]);
  });

  it("is held to the comment's limits, not to a post's media rules", () => {
    // Instagram publishes no post without a file: a comment needs none.
    const instagram = channel("6", "instagram");

    expect(
      violationsOf(
        new PostContent({
          followUps: [part("The first comment")],
          media: [new MediaAttachment({ altText: "", mediaId })],
          overrides: [],
          text: "A caption",
        }),
        [instagram],
        [mediaFile(mediaId)]
      )
    ).toStrictEqual([]);
  });

  it("goes under a LinkedIn page's post, never a profile's", () => {
    const page: ChannelOnPlatform = {
      ...channel("3", "linkedin"),
      connection: "linkedinPage",
    };

    const profile = channel("5", "linkedin");
    const content = thread("A post", part("The first comment"));

    expect(violationsOf(content, [page])).toStrictEqual([]);
    expect(violationsOf(content, [profile])).toStrictEqual([
      { _tag: "tooManyParts", ...profile, count: 2, maximum: 1 },
    ]);
  });
});

describe("a first comment on a video made for kids", () => {
  it("is refused, as YouTube turns comments off on such videos", () => {
    const content = thread("A video's description", part("The first comment"));

    const refused = Option.match(
      Result.getFailure(
        checkPublishable(
          content,
          [youtube],
          [],
          [
            new ChannelOptions({
              channelId: youtube.channelId,
              options: new YouTubeOptions({
                madeForKids: true,
                title: "A video",
              }),
            }),
          ]
        )
      ),
      { onNone: () => [], onSome: ({ violations }) => violations }
    ).filter(({ _tag }) => _tag === "commentsTurnedOff");

    expect(refused).toStrictEqual([
      { _tag: "commentsTurnedOff", ...youtube, field: "madeForKids", part: 1 },
    ]);
  });

  it("lets a comment through on a video not made for kids", () => {
    const content = thread("A video's description", part("The first comment"));

    const violations = Option.match(
      Result.getFailure(
        checkPublishable(
          content,
          [youtube],
          [],
          [
            new ChannelOptions({
              channelId: youtube.channelId,
              options: new YouTubeOptions({
                madeForKids: false,
                title: "A video",
              }),
            }),
          ]
        )
      ),
      { onNone: () => [], onSome: (rejected) => rejected.violations }
    );

    expect(
      violations.some(({ _tag }) => _tag === "commentsTurnedOff")
    ).toBeFalsy();
  });
});
