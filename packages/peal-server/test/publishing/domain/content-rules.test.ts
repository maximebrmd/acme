import { describe, expect, it } from "@effect/vitest";
import { Option, Result } from "effect";

import {
  checkDraft,
  checkPublishable,
  violationsOn,
} from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import { emptyContent, textOn } from "#publishing/domain/post-content.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { contentOf, mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const bluesky = channel("1", "bluesky");

const x = channel("2", "x");

const instagram = channel("3", "instagram");

const mastodon = channel("4", "mastodon");

const facebook = channel("5", "facebook");

const threads = channel("6", "threads");

const youtube = channel("7", "youtube");

// Different links, one per path.
const links = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `https://example.com/${index}`
  ).join(" ");

const media = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    MediaAssetIdSchema.make(
      `00000000-0000-7000-8000-${(index + 100).toString().padStart(12, "0")}`
    )
  );

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

describe(violationsOn, () => {
  it("takes Bluesky posts up to 300 graphemes", () => {
    expect(violationsOn(contentOf("a".repeat(300)), bluesky)).toStrictEqual([]);

    expect(violationsOn(contentOf("a".repeat(301)), bluesky)).toStrictEqual([
      {
        _tag: "textTooLong",
        ...bluesky,
        length: 301,
        maximum: 300,
        unit: "graphemes",
      },
    ]);
  });

  it("refuses Bluesky posts over 3,000 bytes, even within 300 graphemes", () => {
    expect(violationsOn(contentOf("👨‍👩‍👧".repeat(200)), bluesky)).toStrictEqual([
      {
        _tag: "textTooLong",
        ...bluesky,
        length: 3600,
        maximum: 3000,
        unit: "utf8Bytes",
      },
    ]);
  });

  it("weighs X posts, links counting 23", () => {
    const link = `https://example.com/${"long/".repeat(100)}`;

    expect(
      violationsOn(contentOf(`${"a".repeat(256)} ${link}`), x)
    ).toStrictEqual([]);

    expect(violationsOn(contentOf("日".repeat(141)), x)).toStrictEqual([
      {
        _tag: "textTooLong",
        ...x,
        length: 282,
        maximum: 280,
        unit: "weighted",
      },
    ]);
  });

  // Meta's Threads "Posts" page: "Text posts are limited to 500
  // characters. Emojis are counted as the number of UTF-8 bytes."
  it("counts each emoji of a Threads post by its UTF-8 bytes", () => {
    expect(
      violationsOn(contentOf(`${"a".repeat(480)}${"😀".repeat(5)}`), threads)
    ).toStrictEqual([]);

    expect(
      violationsOn(contentOf(`${"é".repeat(490)}${"😀".repeat(5)}`), threads)
    ).toStrictEqual([
      {
        _tag: "textTooLong",
        ...threads,
        length: 510,
        maximum: 500,
        unit: "emojiBytes",
      },
    ]);
  });

  // The same page: "Threads posts containing more than 5 links will fail to
  // post", where "All unique URLs found in the text field are counted".
  it("takes Threads posts with 5 different links at most", () => {
    expect(
      violationsOn(
        contentOf(`${links(5)} and again https://example.com/0.`),
        threads
      )
    ).toStrictEqual([]);

    expect(violationsOn(contentOf(links(6)), threads)).toStrictEqual([
      { _tag: "tooManyLinks", ...threads, count: 6, maximum: 5 },
    ]);

    // Other platforms set no such limit.
    expect(violationsOn(contentOf(links(6)), mastodon)).toStrictEqual([]);
  });

  it("counts Mastodon characters as code points", () => {
    expect(violationsOn(contentOf("👍🏽".repeat(250)), mastodon)).toStrictEqual(
      []
    );

    expect(violationsOn(contentOf("👍🏽".repeat(251)), mastodon)).toStrictEqual([
      {
        _tag: "textTooLong",
        ...mastodon,
        length: 502,
        maximum: 500,
        unit: "codePoints",
      },
    ]);
  });

  it("takes Google Business Profile posts up to 1,500 characters", () => {
    const location = { ...mastodon, platform: "googleBusiness" as const };

    expect(violationsOn(contentOf("é".repeat(1500)), location)).toStrictEqual(
      []
    );

    expect(violationsOn(contentOf("é".repeat(1501)), location)).toStrictEqual([
      {
        _tag: "textTooLong",
        ...location,
        length: 1501,
        maximum: 1500,
        unit: "codePoints",
      },
    ]);
  });

  it("asks for media on Instagram, and caps its hashtags and mentions", () => {
    const tags = Array.from({ length: 31 }, (_, index) => `#tag${index}`);
    const names = Array.from({ length: 21 }, (_, index) => `@name${index}`);

    expect(
      violationsOn(contentOf(`${tags.join(" ")} ${names.join(" ")}`), instagram)
    ).toStrictEqual([
      { _tag: "mediaRequired", ...instagram },
      { _tag: "tooManyHashtags", ...instagram, count: 31, maximum: 30 },
      { _tag: "tooManyMentions", ...instagram, count: 21, maximum: 20 },
    ]);

    expect(
      violationsOn(contentOf("A caption", { media: media(1) }), instagram)
    ).toStrictEqual([]);
  });

  it("keeps a YouTube description within 5,000 bytes, without < or >", () => {
    const video = { media: media(1) };

    expect(
      violationsOn(contentOf("é".repeat(2500), video), youtube)
    ).toStrictEqual([]);
    expect(
      violationsOn(contentOf("é".repeat(2501), video), youtube)
    ).toStrictEqual([
      {
        _tag: "textTooLong",
        ...youtube,
        length: 5002,
        maximum: 5000,
        unit: "utf8Bytes",
      },
    ]);
    expect(
      violationsOn(contentOf("Size > 2 <b>", video), youtube)
    ).toStrictEqual([
      { _tag: "forbiddenCharacters", ...youtube, characters: ["<", ">"] },
    ]);
    expect(violationsOn(contentOf("No video"), youtube)).toStrictEqual([
      { _tag: "mediaRequired", ...youtube },
    ]);
  });

  it("caps the media a platform shows", () => {
    expect(
      violationsOn(contentOf("Five images", { media: media(5) }), bluesky)
    ).toStrictEqual([
      { _tag: "tooManyMedia", ...bluesky, count: 5, maximum: 4 },
    ]);
  });

  it("refuses a post with nothing to show", () => {
    expect(violationsOn(contentOf("  \n "), facebook)).toStrictEqual([
      { _tag: "empty", ...facebook },
    ]);

    expect(
      violationsOn(contentOf("", { media: media(1) }), facebook)
    ).toStrictEqual([]);
  });

  it("checks the text a channel has, its override if any", () => {
    const content = contentOf("a".repeat(400), {
      overrides: [[bluesky.channelId, "Short for Bluesky"]],
    });

    expect(textOn(content, bluesky.channelId)).toBe("Short for Bluesky");
    expect(violationsOn(content, bluesky)).toStrictEqual([]);
    expect(violationsOn(content, mastodon)).toStrictEqual([]);
    expect(violationsOn(content, x)).toStrictEqual([
      {
        _tag: "textTooLong",
        ...x,
        length: 400,
        maximum: 280,
        unit: "weighted",
      },
    ]);
  });
});

describe(checkPublishable, () => {
  it("accepts content every channel takes", () => {
    const content = contentOf("Launch day");

    expect(checkPublishable(content, [bluesky, x, mastodon], [])).toStrictEqual(
      Result.succeed(content)
    );
  });

  it("lists every violation, channel by channel", () => {
    const content = contentOf("a".repeat(301), {
      overrides: [[facebook.channelId, "Not on Facebook"]],
    });

    expect(
      violationsOf(checkPublishable(content, [bluesky, instagram], []))
    ).toStrictEqual([
      { _tag: "overrideWithoutChannel", channelId: facebook.channelId },
      {
        _tag: "textTooLong",
        ...bluesky,
        length: 301,
        maximum: 300,
        unit: "graphemes",
      },
      { _tag: "mediaRequired", ...instagram },
    ]);
  });

  it("refuses a post for no channel", () => {
    expect(
      violationsOf(checkPublishable(contentOf("Hi"), [], []))
    ).toStrictEqual([{ _tag: "noChannels" }]);
  });

  it("checks the media on each channel after its text", () => {
    const gif = MediaAssetIdSchema.make("00000000-0000-7000-8000-0000000a0001");
    const content = contentOf("a".repeat(301), { media: [gif] });

    const files = [mediaFile(gif, { contentType: "image/gif" })];

    expect(
      violationsOf(checkPublishable(content, [bluesky, instagram], files))
    ).toStrictEqual([
      {
        _tag: "textTooLong",
        ...bluesky,
        length: 301,
        maximum: 300,
        unit: "graphemes",
      },
      {
        _tag: "mediaTypeUnsupported",
        ...instagram,
        contentType: "image/gif",
        mediaId: gif,
      },
    ]);
  });
});

describe(checkDraft, () => {
  it("lets a draft be longer than its platforms take, or empty", () => {
    expect(checkDraft(contentOf("a".repeat(5000)), [x])).toStrictEqual(
      Result.succeed(contentOf("a".repeat(5000)))
    );

    expect(checkDraft(emptyContent, [])).toStrictEqual(
      Result.succeed(emptyContent)
    );
  });

  it("refuses an override for a channel the draft is not for", () => {
    const content = contentOf("Hi", { overrides: [[x.channelId, "Hi X"]] });

    expect(violationsOf(checkDraft(content, [bluesky]))).toStrictEqual([
      { _tag: "overrideWithoutChannel", channelId: x.channelId },
    ]);
  });
});
