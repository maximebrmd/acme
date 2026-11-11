import { describe, expect, it } from "@effect/vitest";
import { Option, Result, Schema } from "effect";

import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import {
  checkDraft,
  checkPublishable,
  optionViolationsOn,
} from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import { InstagramOptions } from "#publishing/domain/instagram-options.ts";
import {
  maxPinterestLinkLength,
  maxPinterestTitleLength,
  PinterestOptions,
} from "#publishing/domain/pinterest-options.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import {
  noOptionsOn,
  optionsPlatforms,
  takesOptions,
  TargetOptionsSchema,
} from "#publishing/domain/target-options.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import {
  maxYouTubeTagsLength,
  YouTubeOptions,
  youTubeTagsLength,
} from "#publishing/domain/youtube-options.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { contentOf, mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const youtube = channel("1", "youtube");

const tiktok = channel("2", "tiktok");

const mastodon = channel("3", "mastodon");

const finishedYouTube = new YouTubeOptions({
  madeForKids: false,
  title: "A synthetic launch video",
});

const finishedTikTok = new TikTokOptions({ privacyLevel: "SELF_ONLY" });

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

const on = (target: ChannelOnPlatform, options: TargetOptions) =>
  new ChannelOptions({ channelId: target.channelId, options });

describe("the platforms that take options", () => {
  it("are every platform", () => {
    expect(optionsPlatforms).toStrictEqual([
      "x",
      "linkedin",
      "bluesky",
      "mastodon",
      "threads",
      "instagram",
      "facebook",
      "tiktok",
      "youtube",
      "pinterest",
      "googleBusiness",
    ]);
    expect(takesOptions("facebook")).toBeTruthy();
    expect(noOptionsOn("instagram")).toStrictEqual(
      Option.some(new InstagramOptions({}))
    );
  });

  it("start with nothing chosen", () => {
    expect(noOptionsOn("youtube")).toStrictEqual(
      Option.some(new YouTubeOptions({}))
    );
  });

  it("decode by their platform tag, and refuse an unknown one", () => {
    const decode = Schema.decodeUnknownExit(TargetOptionsSchema);

    expect(
      Schema.decodeUnknownSync(TargetOptionsSchema)({
        platform: "tiktok",
        privacyLevel: "SELF_ONLY",
      })
    ).toStrictEqual(finishedTikTok);
    expect(decode({ platform: "myspace" })._tag).toBe("Failure");
    expect(decode({ platform: "tiktok", privacyLevel: "EVERYONE" })._tag).toBe(
      "Failure"
    );
  });
});

describe("YouTube's options", () => {
  it("need a title and whether the video is made for kids", () => {
    expect(optionViolationsOn(youtube, Option.none())).toStrictEqual([
      { _tag: "optionMissing", ...youtube, field: "title" },
      { _tag: "optionMissing", ...youtube, field: "madeForKids" },
    ]);

    expect(
      optionViolationsOn(
        youtube,
        Option.some(new YouTubeOptions({ madeForKids: true, title: "  " }))
      )
    ).toStrictEqual([{ _tag: "optionMissing", ...youtube, field: "title" }]);

    expect(
      optionViolationsOn(youtube, Option.some(finishedYouTube))
    ).toStrictEqual([]);
  });

  it("take a title of 100 characters without angle brackets", () => {
    const titled = (title: string) =>
      optionViolationsOn(
        youtube,
        Option.some(new YouTubeOptions({ madeForKids: false, title }))
      );

    expect(titled("é".repeat(100))).toStrictEqual([]);
    expect(titled("👍".repeat(101))).toStrictEqual([
      {
        _tag: "optionTooLong",
        ...youtube,
        field: "title",
        length: 101,
        maximum: 100,
      },
    ]);
    expect(titled("Launch <today>")).toStrictEqual([
      { _tag: "optionInvalid", ...youtube, field: "title" },
    ]);
  });

  it("count tags as YouTube does, quotes and commas included", () => {
    expect(youTubeTagsLength([])).toBe(0);
    // "Foo-Baz" is seven characters, "Foo Baz" nine with its quotes.
    expect(youTubeTagsLength(["Foo-Baz"])).toBe(7);
    expect(youTubeTagsLength(["Foo Baz"])).toBe(9);
    expect(youTubeTagsLength(["Foo-Baz", "Foo Baz"])).toBe(17);
  });

  it("take tags up to 500 characters together, none blank or with a comma", () => {
    const tagged = (tags: readonly string[]) =>
      optionViolationsOn(
        youtube,
        Option.some(
          new YouTubeOptions({ madeForKids: false, tags, title: "A title" })
        )
      );

    const fifty = Array.from({ length: 50 }, () => "a".repeat(9));

    expect(youTubeTagsLength(fifty)).toBe(maxYouTubeTagsLength - 1);
    expect(tagged(fifty)).toStrictEqual([]);
    expect(tagged([...fifty, "b"])).toStrictEqual([
      {
        _tag: "optionTooLong",
        ...youtube,
        field: "tags",
        length: 501,
        maximum: 500,
      },
    ]);
    expect(tagged(["launch", " "])).toStrictEqual([
      { _tag: "optionInvalid", ...youtube, field: "tags" },
    ]);
    expect(tagged(["launch,day"])).toStrictEqual([
      { _tag: "optionInvalid", ...youtube, field: "tags" },
    ]);
  });

  it("take a category by its number", () => {
    const inCategory = (categoryId: string) =>
      optionViolationsOn(
        youtube,
        Option.some(
          new YouTubeOptions({ categoryId, madeForKids: true, title: "Hi" })
        )
      );

    expect(inCategory("22")).toStrictEqual([]);
    expect(inCategory("People & Blogs")).toStrictEqual([
      { _tag: "optionInvalid", ...youtube, field: "categoryId" },
    ]);
  });
});

const pinterestProblems = (fields: Partial<PinterestOptions>) =>
  new PinterestOptions({ platform: "pinterest", ...fields }).problems();

describe("Pinterest's options", () => {
  it("need the board the Pin is saved to, by its id", () => {
    expect(pinterestProblems({})).toStrictEqual([
      { _tag: "missing", field: "boardId" },
    ]);
    expect(pinterestProblems({ boardId: "549755885001" })).toStrictEqual([]);
    expect(
      pinterestProblems({ boardId: "summer-recipes", boardSectionId: "salads" })
    ).toStrictEqual([
      { _tag: "invalid", field: "boardId" },
      { _tag: "invalid", field: "boardSectionId" },
    ]);
  });

  it("take a title of 100 characters and a link of 2,048", () => {
    const board = { boardId: "549755885001" };

    expect(
      pinterestProblems({
        ...board,
        link: `https://peal.example/${"a".repeat(maxPinterestLinkLength - 21)}`,
        title: "é".repeat(maxPinterestTitleLength),
      })
    ).toStrictEqual([]);
    expect(
      pinterestProblems({
        ...board,
        link: `https://peal.example/${"a".repeat(maxPinterestLinkLength)}`,
        title: "😀".repeat(maxPinterestTitleLength + 1),
      })
    ).toStrictEqual([
      {
        _tag: "tooLong",
        field: "link",
        length: maxPinterestLinkLength + 21,
        maximum: maxPinterestLinkLength,
      },
      {
        _tag: "tooLong",
        field: "title",
        length: maxPinterestTitleLength + 1,
        maximum: maxPinterestTitleLength,
      },
    ]);
  });

  it("take a web address as link, and a hex colour", () => {
    const board = { boardId: "549755885001" };

    expect(
      pinterestProblems({
        ...board,
        dominantColor: "#6E7874",
        link: "http://peal.example",
      })
    ).toStrictEqual([]);
    expect(
      pinterestProblems({
        ...board,
        dominantColor: "grey",
        link: "peal.example/recipes",
      })
    ).toStrictEqual([
      { _tag: "invalid", field: "dominantColor" },
      { _tag: "invalid", field: "link" },
    ]);
  });

  it("take a video's cover at a whole second, never before its start", () => {
    const decode = Schema.decodeUnknownOption(PinterestOptions);

    expect(
      Option.isSome(decode({ coverSecond: 12, platform: "pinterest" }))
    ).toBeTruthy();

    for (const coverSecond of [-1, 1.5]) {
      expect(decode({ coverSecond, platform: "pinterest" })).toStrictEqual(
        Option.none()
      );
    }
  });
});

describe("TikTok's options", () => {
  it("need who sees the post, with no default", () => {
    expect(optionViolationsOn(tiktok, Option.none())).toStrictEqual([
      { _tag: "optionMissing", ...tiktok, field: "privacyLevel" },
    ]);
    expect(
      optionViolationsOn(tiktok, Option.some(finishedTikTok))
    ).toStrictEqual([]);
  });

  it("need a commercial post to say whose brand it promotes", () => {
    const disclosed = (fields: {
      readonly brandContent?: boolean;
      readonly brandOrganic?: boolean;
    }) =>
      optionViolationsOn(
        tiktok,
        Option.some(
          new TikTokOptions({
            commercialContent: true,
            privacyLevel: "PUBLIC_TO_EVERYONE",
            ...fields,
          })
        )
      );

    expect(disclosed({})).toStrictEqual([
      { _tag: "optionInvalid", ...tiktok, field: "commercialContent" },
    ]);
    expect(disclosed({ brandOrganic: true })).toStrictEqual([]);
    expect(disclosed({ brandContent: true })).toStrictEqual([]);
    expect(disclosed({ brandContent: true, brandOrganic: true })).toStrictEqual(
      []
    );
  });

  it("refuse a paid partnership only its creator may see", () => {
    expect(
      optionViolationsOn(
        tiktok,
        Option.some(
          new TikTokOptions({
            brandContent: true,
            commercialContent: true,
            privacyLevel: "SELF_ONLY",
          })
        )
      )
    ).toStrictEqual([
      { _tag: "optionInvalid", ...tiktok, field: "brandContent" },
    ]);
  });
});

describe("options on a post's channels", () => {
  it("are refused on another platform's channel, before its own rules", () => {
    expect(
      optionViolationsOn(tiktok, Option.some(finishedYouTube))
    ).toStrictEqual([
      {
        _tag: "optionsForOtherPlatform",
        ...tiktok,
        optionsPlatform: "youtube",
      },
    ]);
    expect(
      optionViolationsOn(mastodon, Option.some(finishedTikTok))
    ).toStrictEqual([
      {
        _tag: "optionsForOtherPlatform",
        ...mastodon,
        optionsPlatform: "tiktok",
      },
    ]);
  });

  it("are needed to schedule on YouTube and TikTok, after the text rules", () => {
    const videoId = MediaAssetIdSchema.make(
      "00000000-0000-7000-8000-00000000a001"
    );

    const content = contentOf("A synthetic video", { media: [videoId] });
    const files = [mediaFile(videoId, { contentType: "video/mp4" })];

    expect(
      violationsOf(
        checkPublishable(content, [mastodon, youtube, tiktok], files)
      )
    ).toStrictEqual([
      { _tag: "optionMissing", ...youtube, field: "title" },
      { _tag: "optionMissing", ...youtube, field: "madeForKids" },
      { _tag: "optionMissing", ...tiktok, field: "privacyLevel" },
    ]);

    expect(
      checkPublishable(content, [mastodon, youtube, tiktok], files, [
        on(youtube, finishedYouTube),
        on(tiktok, finishedTikTok),
      ])
    ).toStrictEqual(Result.succeed(content));
  });

  it("name only the post's channels", () => {
    const content = contentOf("A synthetic video");

    expect(
      violationsOf(
        checkPublishable(
          content,
          [mastodon],
          [],
          [on(youtube, finishedYouTube)]
        )
      )
    ).toStrictEqual([
      { _tag: "optionsWithoutChannel", channelId: youtube.channelId },
    ]);
  });

  it("may be unfinished in a draft, but never another platform's", () => {
    const content = contentOf("");

    expect(
      checkDraft(
        content,
        [youtube, tiktok],
        [on(youtube, new YouTubeOptions({}))]
      )
    ).toStrictEqual(Result.succeed(content));

    expect(
      violationsOf(
        checkDraft(
          content,
          [tiktok],
          [on(tiktok, finishedYouTube), on(youtube, finishedYouTube)]
        )
      )
    ).toStrictEqual([
      { _tag: "optionsWithoutChannel", channelId: youtube.channelId },
      {
        _tag: "optionsForOtherPlatform",
        ...tiktok,
        optionsPlatform: "youtube",
      },
    ]);
  });
});
