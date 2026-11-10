import { describe, expect, it } from "@effect/vitest";
import { Exit, Schema } from "effect";
import {
  ContentViolationSchema,
  googleBusinessLocalTimePattern as contractLocalTimePattern,
  maxGoogleBusinessTitleLength as contractMaxBusinessTitleLength,
  maxYouTubeTagsLength as contractMaxTagsLength,
  maxYouTubeTitleLength as contractMaxTitleLength,
  optionsPlatforms as contractOptionsPlatforms,
  PostContentSchema,
  TargetOptionsSchema as ContractOptionsSchema,
  youTubeTagsLength as contractTagsLength,
} from "peal-contract";
import * as contractOptions from "peal-contract";
import type { ContentViolation as ContractViolation } from "peal-contract";
import * as ContractText from "peal-contract/post-text";

import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import {
  googleBusinessLocalTimePattern,
  maxGoogleBusinessTitleLength,
} from "#publishing/domain/google-business-options.ts";
import { maxLinkedInMentionNameLength } from "#publishing/domain/linkedin-mentions.ts";
import {
  LinkedInVisibilitySchema,
  maxLinkedInDocumentTitleLength,
  maxLinkedInLinkDescriptionLength,
  maxLinkedInLinkTitleLength,
  maxLinkedInLinkUrlLength,
  maxLinkedInMentions,
} from "#publishing/domain/linkedin-options.ts";
import { maxAltTextLength } from "#publishing/domain/media-attachment.ts";
import {
  maxPinterestLinkLength,
  maxPinterestTitleLength,
} from "#publishing/domain/pinterest-options.ts";
import { platformRules } from "#publishing/domain/platform-rules.ts";
import {
  maxMediaPerPost,
  PostContent,
} from "#publishing/domain/post-content.ts";
import { maxPostTextLength } from "#publishing/domain/post-text.ts";
import {
  optionsPlatforms,
  TargetOptionsSchema,
} from "#publishing/domain/target-options.ts";
import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
  TextUnitSchema,
} from "#publishing/domain/text-length.ts";
import {
  maxYouTubeTagsLength,
  maxYouTubeTitleLength,
  youTubeTagsLength,
} from "#publishing/domain/youtube-options.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import {
  linkCases,
  weightedCases,
} from "#test/publishing/domain/x-conformance.ts";

// Clients count text with the contract's copy of the rules, so a composer
// shows what the server will accept. These keep the copy equal to the
// server's rules.

const texts = [
  "",
  "hello",
  "👍🏽👨‍👩‍👧 é 日本語 Мир —…",
  "Read https://example.com/one and www.example.org/two. (see https://example.com).",
  "#launch day, #été, #2026 and issue#42 with @peal_example and team@example.com",
  "a".repeat(3001),
  "Read peal.social now, or example.co.uk/path?x=1.",
  `${"x".repeat(268)} example.com`,
  "https://localhost/x, https://t.co/abc/more and 1\u20E3",
  ...linkCases.map(({ text }) => text),
  ...weightedCases.map(({ text }) => text),
];

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-000000000001");

const mediaAssetId = MediaAssetIdSchema.make(
  "00000000-0000-7000-8000-00000000a001"
);

// One violation of each kind. Both records are typed by the other's tags, so
// a kind added on one side only fails to compile.
const violations: Record<ContractViolation["_tag"], ContentViolation> = {
  altTextTooLong: {
    _tag: "altTextTooLong",
    channelId,
    length: 1001,
    maximum: 1000,
    mediaId: mediaAssetId,
    platform: "x",
  },
  aspectRatioUnsupported: {
    _tag: "aspectRatioUnsupported",
    channelId,
    height: 1000,
    maximum: 1.91,
    mediaId: mediaAssetId,
    minimum: 0.8,
    platform: "instagram",
    width: 3000,
  },
  empty: { _tag: "empty", channelId, platform: "x" },
  forbiddenCharacters: {
    _tag: "forbiddenCharacters",
    channelId,
    characters: ["<", ">"],
    platform: "youtube",
  },
  mediaRequired: { _tag: "mediaRequired", channelId, platform: "instagram" },
  mediaTooLarge: {
    _tag: "mediaTooLarge",
    byteSize: 6_000_000,
    channelId,
    maximum: 5_242_880,
    mediaId: mediaAssetId,
    platform: "x",
  },
  mediaTooSmall: {
    _tag: "mediaTooSmall",
    byteSize: 74_999,
    channelId,
    mediaId: mediaAssetId,
    minimum: 75_000,
    platform: "linkedin",
  },
  mediaTypeUnsupported: {
    _tag: "mediaTypeUnsupported",
    channelId,
    contentType: "image/gif",
    mediaId: mediaAssetId,
    platform: "instagram",
  },
  mixedMedia: { _tag: "mixedMedia", channelId, platform: "mastodon" },
  noChannels: { _tag: "noChannels" },
  optionInvalid: {
    _tag: "optionInvalid",
    channelId,
    field: "title",
    platform: "youtube",
  },
  optionMissing: {
    _tag: "optionMissing",
    channelId,
    field: "privacyLevel",
    platform: "tiktok",
  },
  optionTooLong: {
    _tag: "optionTooLong",
    channelId,
    field: "title",
    length: 101,
    maximum: 100,
    platform: "youtube",
  },
  optionsForOtherPlatform: {
    _tag: "optionsForOtherPlatform",
    channelId,
    optionsPlatform: "youtube",
    platform: "tiktok",
  },
  optionsWithoutChannel: { _tag: "optionsWithoutChannel", channelId },
  overrideWithoutChannel: { _tag: "overrideWithoutChannel", channelId },
  sideOutOfRange: {
    _tag: "sideOutOfRange",
    channelId,
    height: 320,
    maximum: 4096,
    mediaId: mediaAssetId,
    minimum: 360,
    platform: "tiktok",
    width: 240,
  },
  textTooLong: {
    _tag: "textTooLong",
    channelId,
    length: 301,
    maximum: 300,
    platform: "bluesky",
    unit: "graphemes",
  },
  tooManyHashtags: {
    _tag: "tooManyHashtags",
    channelId,
    count: 31,
    maximum: 30,
    platform: "instagram",
  },
  tooManyLinks: {
    _tag: "tooManyLinks",
    channelId,
    count: 6,
    maximum: 5,
    platform: "threads",
  },
  tooManyMedia: {
    _tag: "tooManyMedia",
    channelId,
    count: 5,
    maximum: 4,
    platform: "bluesky",
  },
  tooManyMentions: {
    _tag: "tooManyMentions",
    channelId,
    count: 21,
    maximum: 20,
    platform: "instagram",
  },
  tooManyPixels: {
    _tag: "tooManyPixels",
    channelId,
    height: 4320,
    maximum: 8_294_400,
    mediaId: mediaAssetId,
    platform: "mastodon",
    width: 7680,
  },
  tooManyVideos: {
    _tag: "tooManyVideos",
    channelId,
    count: 2,
    maximum: 1,
    platform: "x",
  },
  videoTooLong: {
    _tag: "videoTooLong",
    channelId,
    durationMs: 150_000,
    maximumMs: 140_000,
    mediaId: mediaAssetId,
    platform: "x",
  },
  videoTooShort: {
    _tag: "videoTooShort",
    channelId,
    durationMs: 2000,
    mediaId: mediaAssetId,
    minimumMs: 3000,
    platform: "linkedin",
  },
};

const contractTags: Record<ContentViolation["_tag"], true> = {
  altTextTooLong: true,
  aspectRatioUnsupported: true,
  empty: true,
  forbiddenCharacters: true,
  mediaRequired: true,
  mediaTooLarge: true,
  mediaTooSmall: true,
  mediaTypeUnsupported: true,
  mixedMedia: true,
  noChannels: true,
  optionInvalid: true,
  optionMissing: true,
  optionTooLong: true,
  optionsForOtherPlatform: true,
  optionsWithoutChannel: true,
  overrideWithoutChannel: true,
  sideOutOfRange: true,
  textTooLong: true,
  tooManyHashtags: true,
  tooManyLinks: true,
  tooManyMedia: true,
  tooManyMentions: true,
  tooManyPixels: true,
  tooManyVideos: true,
  videoTooLong: true,
  videoTooShort: true,
};

describe("the contract's post text rules", () => {
  it("hold the server's platform rules, media rules included, and limits", () => {
    expect(ContractText.platformRules).toStrictEqual(platformRules);
    expect(ContractText.TextUnitSchema.literals).toStrictEqual(
      TextUnitSchema.literals
    );
    expect(ContractText.maxPostTextLength).toBe(maxPostTextLength);
    expect(ContractText.maxAltTextLength).toBe(maxAltTextLength);
    expect(ContractText.maxMediaPerPost).toBe(maxMediaPerPost);
  });

  it.each(texts)("count %j as the server does", (text) => {
    for (const unit of TextUnitSchema.literals) {
      expect(ContractText.measureText(text, unit)).toBe(
        measureText(text, unit)
      );
    }

    expect(ContractText.countHashtags(text)).toBe(countHashtags(text));
    expect(ContractText.countMentions(text)).toBe(countMentions(text));
    expect(ContractText.countLinks(text)).toBe(countLinks(text));
  });

  it("describe every violation the server reports", () => {
    expect(Object.keys(violations).toSorted()).toStrictEqual(
      Object.keys(contractTags).toSorted()
    );

    for (const violation of Object.values(violations)) {
      expect(Schema.is(ContentViolationSchema)(violation)).toBeTruthy();
    }
  });

  it("take content up to the server's limits", () => {
    const decode = Schema.decodeUnknownExit(PostContentSchema);

    expect(
      decode({
        media: [],
        overrides: [],
        text: "a".repeat(maxPostTextLength),
      })._tag
    ).toBe("Success");

    expect(
      decode({
        media: [],
        overrides: [],
        text: "a".repeat(maxPostTextLength + 1),
      })._tag
    ).toBe("Failure");
  });

  // Postgres refuses NUL in text and JSON strings: a post holding one would
  // fail as it is saved, a server error, instead of answering 400.
  it.each([
    {
      content: { media: [], overrides: [], text: "a\u0000b" },
      label: "its text",
    },
    {
      content: {
        media: [],
        overrides: [{ channelId, text: "\u0000" }],
        text: "Hi",
      },
      label: "a channel's own text",
    },
    {
      content: {
        media: [{ altText: "a\u0000", mediaId: mediaAssetId }],
        overrides: [],
        text: "Hi",
      },
      label: "alt text",
    },
  ])("refuse a NUL character in $label, as the server does", ({ content }) => {
    expect(Schema.decodeUnknownExit(PostContentSchema)(content)._tag).toBe(
      "Failure"
    );
    expect(Schema.decodeUnknownExit(PostContent)(content)._tag).toBe("Failure");
  });

  it("take the same content without it", () => {
    const content = {
      media: [{ altText: "A chart", mediaId: mediaAssetId }],
      overrides: [{ channelId, text: "For one channel" }],
      text: "Hi",
    };

    expect(Schema.decodeUnknownExit(PostContentSchema)(content)._tag).toBe(
      "Success"
    );
    expect(Schema.decodeUnknownExit(PostContent)(content)._tag).toBe("Success");
  });
});

// Options either side takes, or refuses, the other must too: a client that
// builds them from the contract sends what the server keeps.
const options: readonly unknown[] = [
  { platform: "youtube" },
  {
    categoryId: "22",
    containsSyntheticMedia: false,
    madeForKids: false,
    notifySubscribers: true,
    platform: "youtube",
    privacy: "unlisted",
    tags: ["launch", "launch day"],
    title: "A synthetic launch video",
  },
  // Unfinished or over a limit: kept until the post is scheduled.
  { platform: "youtube", tags: [""], title: "a".repeat(101) },
  { platform: "youtube", tags: Array.from({ length: 501 }, () => "a") },
  { platform: "youtube", title: "a\u0000b" },
  { platform: "youtube", privacy: "friends" },
  { madeForKids: "no", platform: "youtube" },
  { platform: "tiktok" },
  {
    aiGenerated: true,
    brandContent: true,
    brandOrganic: false,
    commercialContent: true,
    disableComment: true,
    disableDuet: false,
    disableStitch: true,
    platform: "tiktok",
    privacyLevel: "FOLLOWER_OF_CREATOR",
  },
  { platform: "tiktok", privacyLevel: "FRIENDS" },
  { platform: "tiktok", title: "TikTok's caption is the post's text" },
  { platform: "linkedin" },
  {
    disableReshare: true,
    documentTitle: "A synthetic deck",
    linkDescription: "What ships",
    linkTitle: "Launch day",
    linkUrl: "https://example.test/launch",
    mentions: [{ name: "Example Bakery", urn: "urn:li:organization:2414183" }],
    platform: "linkedin",
    visibility: "loggedIn",
  },
  // Unfinished or refused later: kept until the post is scheduled.
  { linkTitle: "A title without its link", platform: "linkedin" },
  {
    mentions: [{ name: "Alice", urn: "urn:li:person:aB3dE5fG7h" }],
    platform: "linkedin",
  },
  { platform: "linkedin", visibility: "friends" },
  { mentions: [{ name: "No URN" }], platform: "linkedin" },
  {
    mentions: [{ name: "a".repeat(201), urn: "urn:li:organization:1" }],
    platform: "linkedin",
  },
  {
    mentions: Array.from({ length: 31 }, () => ({
      name: "Example Bakery",
      urn: "urn:li:organization:2414183",
    })),
    platform: "linkedin",
  },
  { documentTitle: "a\u0000b", platform: "linkedin" },
  { platform: "googleBusiness" },
  {
    callToAction: "learnMore",
    callToActionUrl: "https://example.com/menu",
    endsAt: "2026-11-27T18:00",
    platform: "googleBusiness",
    postType: "event",
    startsAt: "2026-11-27T09:00",
    title: "Synthetic open day",
  },
  {
    couponCode: "SYNTHETIC-10",
    platform: "googleBusiness",
    postType: "offer",
    redeemUrl: "https://example.com/redeem",
    terms: "One per synthetic customer.",
  },
  // Unfinished or refused later: kept until the post is scheduled.
  { endsAt: "tomorrow", platform: "googleBusiness", title: "a".repeat(59) },
  { platform: "googleBusiness", postType: "alert" },
  { callToAction: "getOffer", platform: "googleBusiness" },
  { platform: "googleBusiness", title: "a\u0000b" },
  { platform: "mastodon" },
  { platform: "youtube", title: "A title", unknownOption: true },
];

describe("the contract's target options", () => {
  it("are the server's, on the same platforms", () => {
    expect(contractOptionsPlatforms).toStrictEqual(optionsPlatforms);
  });

  it("hold YouTube's limits", () => {
    expect(contractMaxTitleLength).toBe(maxYouTubeTitleLength);
    expect(contractMaxTagsLength).toBe(maxYouTubeTagsLength);

    for (const tags of [[], ["Foo-Baz", "Foo Baz"], ["日本語", "👍🏽 ok"]]) {
      expect(contractTagsLength(tags)).toBe(youTubeTagsLength(tags));
    }
  });

  it("hold Pinterest's limits", () => {
    expect(contractOptions.maxPinterestTitleLength).toBe(
      maxPinterestTitleLength
    );
    expect(contractOptions.maxPinterestLinkLength).toBe(maxPinterestLinkLength);
  });

  it("hold Google Business Profile's limits", () => {
    expect(contractMaxBusinessTitleLength).toBe(maxGoogleBusinessTitleLength);
    expect(contractLocalTimePattern.source).toBe(
      googleBusinessLocalTimePattern.source
    );
  });

  it("hold LinkedIn's limits", () => {
    expect([
      contractOptions.maxLinkedInDocumentTitleLength,
      contractOptions.maxLinkedInLinkDescriptionLength,
      contractOptions.maxLinkedInLinkTitleLength,
      contractOptions.maxLinkedInLinkUrlLength,
      contractOptions.maxLinkedInMentionNameLength,
      contractOptions.maxLinkedInMentions,
    ]).toStrictEqual([
      maxLinkedInDocumentTitleLength,
      maxLinkedInLinkDescriptionLength,
      maxLinkedInLinkTitleLength,
      maxLinkedInLinkUrlLength,
      maxLinkedInMentionNameLength,
      maxLinkedInMentions,
    ]);
    expect(contractOptions.LinkedInVisibilitySchema.literals).toStrictEqual(
      LinkedInVisibilitySchema.literals
    );
  });

  it.each(options)("decode %j as the server does", (input) => {
    const server = Schema.decodeUnknownExit(TargetOptionsSchema)(input);
    const contract = Schema.decodeUnknownExit(ContractOptionsSchema)(input);

    expect(contract._tag).toBe(server._tag);
    expect(
      Exit.isSuccess(server)
        ? Schema.encodeSync(TargetOptionsSchema)(server.value)
        : undefined
    ).toStrictEqual(Exit.isSuccess(contract) ? contract.value : undefined);
  });
});
