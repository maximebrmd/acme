import { describe, expect, it } from "@effect/vitest";
import { ContentViolationSchema, PostContentSchema } from "acme-contract";
import type { ContentViolation as ContractViolation } from "acme-contract";
import * as ContractText from "acme-contract/post-text";
import { Schema } from "effect";

import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import { maxAltTextLength } from "#publishing/domain/media-attachment.ts";
import { platformRules } from "#publishing/domain/platform-rules.ts";
import {
  maxMediaPerPost,
  PostContent,
} from "#publishing/domain/post-content.ts";
import { maxPostTextLength } from "#publishing/domain/post-text.ts";
import {
  countHashtags,
  countMentions,
  measureText,
  TextUnitSchema,
} from "#publishing/domain/text-length.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";

// Clients count text with the contract's copy of the rules, so a composer
// shows what the server will accept. These keep the copy equal to the
// server's rules.

const texts = [
  "",
  "hello",
  "👍🏽👨‍👩‍👧 é 日本語 Мир —…",
  "Read https://example.com/one and www.example.org/two. (see https://example.com).",
  "#launch day, #été, #2026 and issue#42 with @acme_example and team@example.com",
  "a".repeat(3001),
];

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-000000000001");

const mediaAssetId = MediaAssetIdSchema.make(
  "00000000-0000-7000-8000-00000000a001"
);

// One violation of each kind. Both records are typed by the other's tags, so
// a kind added on one side only fails to compile.
const violations: Record<ContractViolation["_tag"], ContentViolation> = {
  empty: { _tag: "empty", channelId, platform: "x" },
  mediaRequired: { _tag: "mediaRequired", channelId, platform: "instagram" },
  noChannels: { _tag: "noChannels" },
  overrideWithoutChannel: { _tag: "overrideWithoutChannel", channelId },
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
};

const contractTags: Record<ContentViolation["_tag"], true> = {
  empty: true,
  mediaRequired: true,
  noChannels: true,
  overrideWithoutChannel: true,
  textTooLong: true,
  tooManyHashtags: true,
  tooManyMedia: true,
  tooManyMentions: true,
};

describe("the contract's post text rules", () => {
  it("hold the server's platform rules and limits", () => {
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
