import { describe, expect, it } from "@effect/vitest";
import { Duration, Option } from "effect";

import {
  countsChannel,
  isCounted,
} from "#analytics/domain/counted-platforms.ts";
import {
  describeFields,
  isDescribed,
} from "#publishing/domain/field-description.ts";
import { LinkedInOptions } from "#publishing/domain/linkedin-options.ts";
import {
  defaultCategoryRegion,
  defaultLookupPageSize,
  describeLookup,
  lookupNamed,
  lookupNames,
  lookups,
  lookupsOn,
  queryOf,
} from "#publishing/domain/lookup.ts";
import { maxAltTextLength } from "#publishing/domain/media-attachment.ts";
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
import {
  capabilitiesOf,
  capabilitiesVersion,
  everyCapabilities,
} from "#publishing/domain/platform-capabilities.ts";
import { platformRules } from "#publishing/domain/platform-rules.ts";
import { maxMediaPerPost } from "#publishing/domain/post-content.ts";
import { maxPostTextLength } from "#publishing/domain/post-text.ts";
import {
  describeOptionsOn,
  optionConstraintsOn,
  optionsPlatforms,
  TargetOptionsSchema,
} from "#publishing/domain/target-options.ts";
import {
  creatorRestrictions,
  creatorViolationsOn,
  TikTokCreator,
} from "#publishing/domain/tiktok-creator.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import {
  maxYouTubeTagsLength,
  maxYouTubeTitleLength,
  YouTubeOptions,
} from "#publishing/domain/youtube-options.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { mediaFile } from "#test/publishing/support.ts";

const fieldNamed = (platform: Platform, name: string) =>
  describeOptionsOn(platform)
    .filter(isDescribed)
    .find((field) => field.name === name);

const required = (platform: Platform) =>
  describeOptionsOn(platform)
    .filter(isDescribed)
    .flatMap((field) => (field.required ? [field.name] : []));

describe("a platform's options, described", () => {
  it("describe every field of every options class", () => {
    expect(TargetOptionsSchema.members).toHaveLength(optionsPlatforms.length);

    for (const options of TargetOptionsSchema.members) {
      const { platform } = new options({});
      const described = describeOptionsOn(platform);

      expect(described.every(isDescribed)).toBeTruthy();
      expect(described.map(({ name }) => name)).toStrictEqual(
        Object.keys(options.fields)
          .filter((name) => name !== "platform")
          .toSorted()
      );
    }
  });

  it("answer a field without notes, or of an unknown shape, as undescribed", () => {
    const described = describeFields(
      { ...YouTubeOptions.fields, added: YouTubeOptions.fields.title },
      { notes: YouTubeOptions.notes, required: [], skip: ["platform"] }
    );

    expect(described.filter((field) => !isDescribed(field))).toStrictEqual([
      { _tag: "undescribed", name: "added" },
    ]);

    expect(
      describeFields(
        { nested: TargetOptionsSchema },
        { notes: { nested: {} }, required: [] }
      )
    ).toStrictEqual([{ _tag: "undescribed", name: "nested" }]);
  });

  it("say what scheduling needs, from the classes' own problems", () => {
    expect(required("youtube")).toStrictEqual(["madeForKids", "title"]);
    expect(required("tiktok")).toStrictEqual(["privacyLevel"]);
    expect(required("pinterest")).toStrictEqual(["boardId"]);
    // Nothing whatever the post: an event's title and dates, a link's
    // title, are needed only with what they go with.
    expect(required("linkedin")).toStrictEqual([]);
    expect(required("googleBusiness")).toStrictEqual([]);
  });

  it("name the lookup that answers a field's values, on every platform", () => {
    expect(
      optionsPlatforms.flatMap((platform) =>
        describeOptionsOn(platform)
          .filter(isDescribed)
          .flatMap(({ lookup, name }) =>
            lookup === undefined ? [] : [[platform, name, lookup]]
          )
      )
    ).toStrictEqual([
      ["linkedin", "mentions", "linkedinOrganizations"],
      ["tiktok", "privacyLevel", "tiktokCreator"],
      ["youtube", "categoryId", "youtubeVideoCategories"],
      ["pinterest", "boardId", "pinterestBoards"],
      ["pinterest", "boardSectionId", "pinterestBoardSections"],
    ]);
  });

  it("take types and values from the schemas", () => {
    expect(fieldNamed("youtube", "privacy")).toStrictEqual({
      ifLeftOut: "public",
      name: "privacy",
      required: false,
      type: "choice",
      values: ["public", "unlisted", "private"],
    });

    expect(fieldNamed("youtube", "tags")).toStrictEqual({
      forbiddenCharacters: [","],
      maxLength: maxYouTubeTagsLength,
      name: "tags",
      required: false,
      type: "textList",
      values: [],
    });

    expect(fieldNamed("tiktok", "privacyLevel")).toStrictEqual({
      lookup: "tiktokCreator",
      name: "privacyLevel",
      required: true,
      type: "choice",
      values: [
        "PUBLIC_TO_EVERYONE",
        "MUTUAL_FOLLOW_FRIENDS",
        "FOLLOWER_OF_CREATOR",
        "SELF_ONLY",
      ],
    });

    expect(fieldNamed("tiktok", "disableDuet")).toStrictEqual({
      ifLeftOut: true,
      name: "disableDuet",
      required: false,
      type: "boolean",
      values: [],
    });
  });

  it("give the limits the classes refuse past", () => {
    const title = fieldNamed("youtube", "title");
    const longest = "a".repeat(maxYouTubeTitleLength);

    expect(title?.maxLength).toBe(maxYouTubeTitleLength);

    expect(
      new YouTubeOptions({ madeForKids: false, title: longest }).problems()
    ).toStrictEqual([]);

    expect(
      new YouTubeOptions({ madeForKids: false, title: `${longest}a` })
        .problems()
        .map(({ _tag, field }) => ({ _tag, field }))
    ).toStrictEqual([{ _tag: "tooLong", field: "title" }]);
  });

  it("name the characters the classes refuse", () => {
    const title = fieldNamed("youtube", "title");

    for (const character of title?.forbiddenCharacters ?? []) {
      expect(
        new YouTubeOptions({
          madeForKids: false,
          title: `a${character}`,
        }).problems()
      ).toStrictEqual([{ _tag: "invalid", field: "title" }]);
    }

    for (const character of fieldNamed("youtube", "tags")
      ?.forbiddenCharacters ?? []) {
      expect(
        new YouTubeOptions({
          madeForKids: false,
          tags: [`a${character}b`],
          title: "A title",
        }).problems()
      ).toStrictEqual([{ _tag: "invalid", field: "tags" }]);
    }
  });

  it("give a link the pattern its rule takes, in whatever case it is written", () => {
    const address = "HTTPS://Shop.Example.test/spring";

    // What the options take, the pattern they describe matches.
    expect(
      new PinterestOptions({
        boardId: "549755885175",
        link: address,
        platform: "pinterest",
      }).problems()
    ).toStrictEqual([]);
    expect(
      new LinkedInOptions({
        linkTitle: "Spring",
        linkUrl: address,
        platform: "linkedin",
      }).problems()
    ).toStrictEqual([]);

    for (const [platform, field] of [
      ["pinterest", "link"],
      ["linkedin", "linkUrl"],
    ] as const) {
      expect(
        new RegExp(fieldNamed(platform, field)?.pattern ?? "$^", "u").test(
          address
        )
      ).toBeTruthy();
    }
  });

  it("give the pattern a category id matches", () => {
    const pattern = new RegExp(
      fieldNamed("youtube", "categoryId")?.pattern ?? "",
      "u"
    );

    expect(pattern.test("22")).toBeTruthy();
    expect(pattern.test("music")).toBeFalsy();
  });

  it("list the rules between options that the classes apply", () => {
    expect(optionConstraintsOn("youtube")).toStrictEqual([]);

    expect(optionConstraintsOn("tiktok")).toStrictEqual([
      {
        _tag: "needsOneOf",
        field: "commercialContent",
        oneOf: ["brandOrganic", "brandContent"],
      },
      {
        _tag: "notWith",
        field: "brandContent",
        other: "privacyLevel",
        value: "SELF_ONLY",
      },
    ]);

    expect(
      new TikTokOptions({
        commercialContent: true,
        privacyLevel: "PUBLIC_TO_EVERYONE",
      }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "commercialContent" }]);

    expect(
      new TikTokOptions({
        brandContent: true,
        privacyLevel: "SELF_ONLY",
      }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "brandContent" }]);
  });
});

describe("a platform's capabilities", () => {
  it("hold the platform's rules, options and lookups, under a version", () => {
    const youtube = capabilitiesOf("youtube", true);

    expect(youtube.version).toBe(capabilitiesVersion);
    expect(youtube.rules).toBe(platformRules.youtube);
    expect(youtube.countsPosts).toBeTruthy();
    expect(youtube.lookups.map(({ name }) => name)).toStrictEqual([
      "youtubeVideoCategories",
      "youtubePlaylists",
    ]);
    expect(youtube.options.map(({ name }) => name)).toContain("title");
  });

  it("hold no options nor lookups where a platform has none", () => {
    const bluesky = capabilitiesOf("bluesky", false);

    expect(bluesky.options).toStrictEqual([]);
    expect(bluesky.lookups).toStrictEqual([]);
    expect(bluesky.countsPosts).toBeFalsy();
  });

  it("hold Peal's own limits where they are the stricter", () => {
    const tiktok = capabilitiesOf("tiktok", true);

    expect(platformRules.tiktok.maxMedia).toBe(35);
    expect(tiktok.maxMedia).toBe(maxMediaPerPost);
    expect(tiktok.textLimits).toStrictEqual([
      { maximum: 2200, unit: "utf16Units" },
      { maximum: maxPostTextLength, unit: "utf16Units" },
    ]);
    expect(capabilitiesOf("x", false).maxAltTextLength).toBe(1000);
    expect(capabilitiesOf("facebook", false)).toMatchObject({
      maxAltTextLength,
      maxMedia: maxMediaPerPost,
    });
  });

  it("hold a platform's own limits where they are the stricter", () => {
    expect(capabilitiesOf("pinterest", true)).toMatchObject({
      maxAltTextLength: 500,
      maxMedia: 5,
      textLimits: [
        { maximum: 800, unit: "codePoints" },
        { maximum: maxPostTextLength, unit: "utf16Units" },
      ],
    });
  });

  it("say which options a lookup fills", () => {
    expect(
      capabilitiesOf("youtube", true).lookups.map(({ fills, name }) => [
        name,
        fills,
      ])
    ).toStrictEqual([
      ["youtubeVideoCategories", ["categoryId"]],
      ["youtubePlaylists", []],
    ]);
  });

  it("cover every platform, in the platforms' order", () => {
    expect(
      everyCapabilities((platform) => platform === "mastodon").map(
        ({ countsPosts, platform }) => [platform, countsPosts]
      )
    ).toStrictEqual(
      platforms.map((platform) => [platform, platform === "mastodon"])
    );
  });

  it("name, for an option, only a lookup of its platform", () => {
    const strays = platforms.flatMap((platform) => {
      const names = new Set(lookupsOn(platform).map(({ name }) => name));

      return capabilitiesOf(platform, false).options.filter(
        ({ lookup }) => lookup !== undefined && !names.has(lookup)
      );
    });

    expect(strays).toStrictEqual([]);
  });
});

describe("a channel's capabilities, by the way in it came through", () => {
  const page = Option.some("linkedinPage" as const);
  const profile = Option.some("linkedinProfile" as const);

  it("give a LinkedIn company page the lookup of pages, and a profile none", () => {
    expect(
      capabilitiesOf("linkedin", true).lookups.map(({ name }) => name)
    ).toStrictEqual(["linkedinOrganizations"]);
    expect(
      capabilitiesOf("linkedin", true, page).lookups.map(({ name }) => name)
    ).toStrictEqual(["linkedinOrganizations"]);
    expect(capabilitiesOf("linkedin", false, profile).lookups).toStrictEqual(
      []
    );
    expect(
      lookupNamed("linkedin", "linkedinOrganizations", profile)
    ).toStrictEqual(Option.none());
    expect(
      lookupNamed("linkedin", "linkedinOrganizations", page)
    ).toStrictEqual(Option.some("linkedinOrganizations"));
  });

  it("leave every other platform's lookups as they are, whatever the way in", () => {
    for (const platform of platforms.filter((name) => name !== "linkedin")) {
      for (const connection of [
        Option.none(),
        Option.some("instagramLogin" as const),
        Option.some("facebookLogin" as const),
      ]) {
        expect(lookupsOn(platform, connection)).toStrictEqual(
          lookupsOn(platform)
        );
      }
    }
  });

  it("count a LinkedIn company page's posts, never a profile's", () => {
    expect(isCounted("linkedin")).toBeTruthy();
    expect(countsChannel("linkedin", page)).toBeTruthy();
    expect(countsChannel("linkedin", profile)).toBeFalsy();
    expect(countsChannel("linkedin", Option.none())).toBeFalsy();

    for (const platform of platforms.filter((name) => name !== "linkedin")) {
      expect(countsChannel(platform, Option.none())).toBe(isCounted(platform));
    }
  });

  it("count posts on the platforms with a reader, and no other", () => {
    expect(platforms.filter((platform) => isCounted(platform))).toStrictEqual([
      "linkedin",
      "bluesky",
      "mastodon",
      "threads",
      "instagram",
      "facebook",
      "tiktok",
      "youtube",
      "pinterest",
    ]);
  });

  it("count posts on X only where the operator turned its billed reads on", () => {
    expect(isCounted("x")).toBeFalsy();
    expect(isCounted("x", { x: true })).toBeTruthy();
    expect(countsChannel("x", Option.none(), { x: true })).toBeTruthy();
    expect(countsChannel("x", Option.none())).toBeFalsy();
  });
});

describe("the lookups of a platform", () => {
  it("need the fields they cannot run without", () => {
    expect(
      lookupNames.map((name) => [
        name,
        describeLookup(name).input.flatMap((field) =>
          field.required ? [field.name] : []
        ),
      ])
    ).toStrictEqual([
      ["youtubeVideoCategories", []],
      ["youtubePlaylists", []],
      ["tiktokCreator", []],
      ["pinterestBoards", []],
      ["pinterestBoardSections", ["boardId"]],
      ["linkedinOrganizations", ["vanityName"]],
    ]);
    // What is marked needed is what the lookup refuses to run without.
    expect(queryOf("linkedinOrganizations", {})).toStrictEqual(Option.none());
    expect(queryOf("pinterestBoardSections", {})).toStrictEqual(Option.none());
  });

  it("describe the input each takes, from its schema", () => {
    for (const name of lookupNames) {
      const described = describeFields(lookups[name].input.fields, {
        notes: lookups[name].notes,
        required: [],
      });

      expect(described.every(isDescribed)).toBeTruthy();
    }

    expect(lookupsOn("youtube")).toStrictEqual([
      {
        input: [
          {
            name: "language",
            pattern: "^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$",
            required: false,
            type: "text",
            values: [],
          },
          {
            ifLeftOut: defaultCategoryRegion,
            name: "regionCode",
            pattern: "^[A-Z]{2}$",
            required: false,
            type: "text",
            values: [],
          },
        ],
        name: "youtubeVideoCategories",
        paged: false,
        platform: "youtube",
      },
      {
        input: [
          {
            maxLength: 512,
            name: "cursor",
            required: false,
            type: "text",
            values: [],
          },
          {
            ifLeftOut: defaultLookupPageSize,
            maximum: 50,
            minimum: 1,
            name: "limit",
            required: false,
            type: "integer",
            values: [],
          },
        ],
        name: "youtubePlaylists",
        paged: true,
        platform: "youtube",
      },
    ]);
  });

  it("belong to one platform", () => {
    expect(lookupNamed("youtube", "youtubePlaylists")).toStrictEqual(
      Option.some("youtubePlaylists")
    );
    expect(lookupNamed("tiktok", "youtubePlaylists")).toStrictEqual(
      Option.none()
    );
    expect(lookupNamed("youtube", "boards")).toStrictEqual(Option.none());
  });

  it("decode their input, with what is left out", () => {
    expect(queryOf("youtubeVideoCategories", {})).toStrictEqual(
      Option.some({
        _tag: "youtubeVideoCategories",
        language: Option.none(),
        regionCode: defaultCategoryRegion,
      })
    );

    expect(
      queryOf("youtubeVideoCategories", { language: "fr", regionCode: "FR" })
    ).toStrictEqual(
      Option.some({
        _tag: "youtubeVideoCategories",
        language: Option.some("fr"),
        regionCode: "FR",
      })
    );

    expect(queryOf("youtubePlaylists", { limit: 5 })).toStrictEqual(
      Option.some({
        _tag: "youtubePlaylists",
        cursor: Option.none(),
        limit: 5,
      })
    );
  });

  it("refuse an input they do not take", () => {
    expect(
      queryOf("youtubeVideoCategories", { regionCode: "fr" })
    ).toStrictEqual(Option.none());
    expect(queryOf("youtubePlaylists", { limit: 51 })).toStrictEqual(
      Option.none()
    );
    expect(queryOf("youtubePlaylists", { regionCode: "FR" })).toStrictEqual(
      Option.none()
    );
    expect(queryOf("tiktokCreator", { cursor: "next" })).toStrictEqual(
      Option.none()
    );
  });
});

describe("a TikTok creator's restrictions", () => {
  const channel = {
    channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000001"),
    platform: "tiktok" as const,
  };

  const mediaId = MediaAssetIdSchema.make(
    "00000000-0000-7000-8000-00000000a001"
  );

  const creator = new TikTokCreator({
    avatarUrl: Option.none(),
    commentDisabled: true,
    duetDisabled: true,
    maxVideoDuration: Option.some(Duration.minutes(10)),
    nickname: "Peal Example",
    privacyLevels: ["FOLLOWER_OF_CREATOR", "SELF_ONLY"],
    stitchDisabled: false,
    username: "peal_example",
  });

  it("say beforehand what scheduling would refuse", () => {
    expect(creatorRestrictions(creator, false)).toStrictEqual([
      {
        _tag: "optionValues",
        field: "privacyLevel",
        values: ["FOLLOWER_OF_CREATOR", "SELF_ONLY"],
      },
      { _tag: "optionFixed", field: "disableComment", value: true },
      { _tag: "optionFixed", field: "disableDuet", value: true },
      { _tag: "videoDuration", maximumMs: 600_000 },
      {
        _tag: "mediaTypesRefused",
        contentTypes: ["image/jpeg", "image/webp"],
      },
    ]);

    expect(
      creatorRestrictions(creator, true).map(({ _tag }) => _tag)
    ).not.toContain("mediaTypesRefused");
  });

  it("agree with the violations scheduling reports", () => {
    const video = mediaFile(mediaId, {
      contentType: "video/mp4",
      duration: Option.some(Duration.minutes(11)),
    });

    const against = new TikTokOptions({
      disableComment: false,
      disableDuet: false,
      disableStitch: false,
      privacyLevel: "PUBLIC_TO_EVERYONE",
    });

    expect(
      creatorViolationsOn(channel, creator, Option.some(against), [video]).map(
        (violation) =>
          violation._tag === "optionInvalid" ? violation.field : violation._tag
      )
    ).toStrictEqual([
      "privacyLevel",
      "disableComment",
      "disableDuet",
      "videoTooLong",
    ]);

    const within = new TikTokOptions({
      disableComment: true,
      disableDuet: true,
      disableStitch: false,
      privacyLevel: "SELF_ONLY",
    });

    expect(
      creatorViolationsOn(channel, creator, Option.some(within), [
        mediaFile(mediaId, {
          contentType: "video/mp4",
          duration: Option.some(Duration.minutes(10)),
        }),
      ])
    ).toStrictEqual([]);
  });
});
