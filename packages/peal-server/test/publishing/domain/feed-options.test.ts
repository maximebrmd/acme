import { describe, expect, it } from "@effect/vitest";
import { Option, Result, Schema } from "effect";

import {
  gateRestrictions,
  gateViolationsOn,
} from "#publishing/domain/bluesky-gates.ts";
import {
  BlueskyOptions,
  maxBlueskyLanguages,
} from "#publishing/domain/bluesky-options.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { checkPublishable } from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import {
  MastodonOptions,
  maxMastodonContentWarningLength,
} from "#publishing/domain/mastodon-options.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import {
  describeOptionsOn,
  optionConstraintsOn,
  optionProblemsOn,
  takesOptions,
  TargetOptionsSchema,
} from "#publishing/domain/target-options.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import {
  maxThreadsTopicTagLength,
  ThreadsOptions,
} from "#publishing/domain/threads-options.ts";
import { XOptions } from "#publishing/domain/x-options.ts";
import { blueskyGateScopes } from "#shared/domain/bluesky-scopes.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { contentOf, mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const mastodon = channel("1", "mastodon");

const threads = channel("2", "threads");

const photo = MediaAssetIdSchema.make("00000000-0000-7000-8000-0000000000a1");

const decode = Schema.decodeUnknownExit(TargetOptionsSchema);

const fields = (platform: Platform) =>
  describeOptionsOn(platform).map((field) =>
    "_tag" in field ? field : [field.name, field.type, field.required]
  );

const violationsOf = (
  result: Result.Result<
    unknown,
    { readonly violations: readonly ContentViolation[] }
  >
): readonly ContentViolation[] =>
  Option.match(Result.getFailure(result), {
    onNone: () => [],
    onSome: ({ violations }) => violations,
  });

const on = (target: ChannelOnPlatform, options: TargetOptions) =>
  new ChannelOptions({ channelId: target.channelId, options });

describe("the options of Mastodon, Bluesky, Threads and X", () => {
  it("are taken, and need nothing", () => {
    for (const platform of ["mastodon", "bluesky", "threads", "x"] as const) {
      expect(takesOptions(platform)).toBeTruthy();
      expect(optionProblemsOn(platform, Option.none())).toStrictEqual([]);
    }
  });

  it.each([
    [
      {
        contentWarning: "Spoilers for the finale",
        language: "fr",
        platform: "mastodon",
        quotePolicy: "followers",
        sensitive: true,
        visibility: "unlisted",
      },
      "Success",
    ],
    // A private mention is not a post.
    [{ platform: "mastodon", visibility: "direct" }, "Failure"],
    [
      {
        contentLabel: "graphic-media",
        languages: ["en", "pt-BR"],
        platform: "bluesky",
      },
      "Success",
    ],
    [{ contentLabel: "gore", platform: "bluesky" }, "Failure"],
    [
      {
        languages: Array.from({ length: maxBlueskyLanguages + 1 }, () => "en"),
        platform: "bluesky",
      },
      "Failure",
    ],
    [
      {
        linkAttachment: "https://example.test/launch",
        platform: "threads",
        replyControl: "followers_only",
        topicTag: "Synthetic launches",
      },
      "Success",
    ],
    [{ platform: "threads", replyControl: "nobody" }, "Failure"],
    [
      {
        communityId: "1700000000000000001",
        madeWithAi: true,
        paidPartnership: false,
        platform: "x",
        replySettings: "mentionedUsers",
        shareWithFollowers: true,
      },
      "Success",
    ],
    [{ platform: "x", replySettings: "everyone" }, "Failure"],
  ] as const)("decode %j to a %s", (input, outcome) => {
    expect(decode(input)._tag).toBe(outcome);
  });

  it("describe every field to clients", () => {
    expect(fields("mastodon")).toStrictEqual([
      ["contentWarning", "text", false],
      ["language", "text", false],
      ["quotePolicy", "choice", false],
      ["sensitive", "boolean", false],
      ["visibility", "choice", false],
    ]);
    expect(fields("bluesky")).toStrictEqual([
      ["contentLabel", "choice", false],
      ["disableQuotes", "boolean", false],
      ["languages", "textList", false],
      ["replies", "choice", false],
      ["replyFollowers", "boolean", false],
      ["replyFollowing", "boolean", false],
      ["replyMentioned", "boolean", false],
    ]);
    expect(fields("threads")).toStrictEqual([
      ["linkAttachment", "text", false],
      ["replyControl", "choice", false],
      ["topicTag", "text", false],
    ]);
    expect(fields("x")).toStrictEqual([
      ["communityId", "text", false],
      ["madeWithAi", "boolean", false],
      ["paidPartnership", "boolean", false],
      ["replySettings", "choice", false],
      ["shareWithFollowers", "boolean", false],
    ]);
  });
});

const warned = (contentWarning: string) =>
  new MastodonOptions({ contentWarning }).problems();

describe("Mastodon's options", () => {
  it("take a one-line content warning of 500 characters", () => {
    expect(warned("é".repeat(maxMastodonContentWarningLength))).toStrictEqual(
      []
    );
    expect(
      warned("é".repeat(maxMastodonContentWarningLength + 1))
    ).toStrictEqual([
      {
        _tag: "tooLong",
        field: "contentWarning",
        length: maxMastodonContentWarningLength + 1,
        maximum: maxMastodonContentWarningLength,
      },
    ]);
    expect(warned("  ")).toStrictEqual([
      { _tag: "invalid", field: "contentWarning" },
    ]);
    expect(warned("Two\nlines")).toStrictEqual([
      { _tag: "invalid", field: "contentWarning" },
    ]);
  });

  it("take a language as a code of two or three letters", () => {
    expect(new MastodonOptions({ language: "de" }).problems()).toStrictEqual(
      []
    );
    expect(new MastodonOptions({ language: "ast" }).problems()).toStrictEqual(
      []
    );
    expect(
      new MastodonOptions({ language: "English" }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "language" }]);
  });

  it("refuse a quote policy on a followers-only post, which nobody may quote", () => {
    expect(
      new MastodonOptions({
        quotePolicy: "public",
        visibility: "private",
      }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "quotePolicy" }]);
    expect(
      new MastodonOptions({
        quotePolicy: "followers",
        visibility: "unlisted",
      }).problems()
    ).toStrictEqual([]);
    expect(optionConstraintsOn("mastodon")).toStrictEqual([
      {
        _tag: "onlyWith",
        field: "quotePolicy",
        other: "visibility",
        values: ["public", "unlisted"],
      },
    ]);
  });

  it("count the content warning in the text's limit, on every part", () => {
    const warning = "a".repeat(100);

    const options = [
      on(mastodon, new MastodonOptions({ contentWarning: warning })),
    ];

    expect(
      violationsOf(
        checkPublishable(contentOf("b".repeat(400)), [mastodon], [], options)
      )
    ).toStrictEqual([]);

    expect(
      violationsOf(
        checkPublishable(contentOf("b".repeat(401)), [mastodon], [], options)
      )
    ).toStrictEqual([
      {
        _tag: "textTooLong",
        ...mastodon,
        length: 501,
        maximum: 500,
        unit: "codePoints",
      },
    ]);

    const thread = new PostContent({
      followUps: [
        new PostPart({
          delaySeconds: 0,
          media: [],
          overrides: [],
          text: "c".repeat(401),
        }),
      ],
      media: [],
      overrides: [],
      text: "A first part",
    });

    expect(
      violationsOf(checkPublishable(thread, [mastodon], [], options))
    ).toStrictEqual([
      {
        _tag: "textTooLong",
        ...mastodon,
        length: 501,
        maximum: 500,
        part: 1,
        unit: "codePoints",
      },
    ]);
  });
});

describe("Bluesky's options", () => {
  it("take up to three language tags", () => {
    expect(
      new BlueskyOptions({ languages: ["en", "pt-BR", "zh-Hant"] }).problems()
    ).toStrictEqual([]);
    expect(
      new BlueskyOptions({ languages: ["en", "not a tag"] }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "languages" }]);
  });

  it.each([
    "en",
    "pt-BR",
    "zh-Hant-TW",
    "es-419",
    "sl-rozaj",
    "de-CH-1901",
    "zh-yue-HK",
    "en-US-u-ca-gregory",
    "en-x-synth",
  ])("take %s, a tag BCP 47 shapes as the PDS checks it", (tag) => {
    expect(new BlueskyOptions({ languages: [tag] }).problems()).toStrictEqual(
      []
    );
  });

  it.each(["en-a", "en-ab1", "e", "en-", "en--US", "en-x", "1en", "en-US-a"])(
    "refuse %s at scheduling, as the PDS would at its time",
    (tag) => {
      expect(new BlueskyOptions({ languages: [tag] }).problems()).toStrictEqual(
        [{ _tag: "invalid", field: "languages" }]
      );
    }
  );
});

describe("Threads' options", () => {
  it("take one topic of 50 characters, without periods or ampersands", () => {
    expect(
      new ThreadsOptions({
        topicTag: "é".repeat(maxThreadsTopicTagLength),
      }).problems()
    ).toStrictEqual([]);
    expect(
      new ThreadsOptions({
        topicTag: "é".repeat(maxThreadsTopicTagLength + 1),
      }).problems()
    ).toStrictEqual([
      {
        _tag: "tooLong",
        field: "topicTag",
        length: maxThreadsTopicTagLength + 1,
        maximum: maxThreadsTopicTagLength,
      },
    ]);
    expect(
      new ThreadsOptions({ topicTag: "Salt & pepper" }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "topicTag" }]);
    expect(new ThreadsOptions({ topicTag: "v1.2" }).problems()).toStrictEqual([
      { _tag: "invalid", field: "topicTag" },
    ]);
  });

  it("take a link attachment by https only", () => {
    expect(
      new ThreadsOptions({
        linkAttachment: "HTTPS://example.test/launch",
      }).problems()
    ).toStrictEqual([]);
    expect(
      new ThreadsOptions({
        linkAttachment: "http://example.test/launch",
      }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "linkAttachment" }]);
  });

  it("refuse a link attachment on a post with media, which Threads ignores", () => {
    const linked = [
      on(
        threads,
        new ThreadsOptions({ linkAttachment: "https://example.test/launch" })
      ),
    ];

    expect(
      violationsOf(
        checkPublishable(contentOf("Text alone"), [threads], [], linked)
      )
    ).toStrictEqual([]);
    expect(
      violationsOf(
        checkPublishable(
          contentOf("With a photo", { media: [photo] }),
          [threads],
          [mediaFile(photo)],
          linked
        )
      )
    ).toStrictEqual([
      { _tag: "optionInvalid", ...threads, field: "linkAttachment" },
    ]);
  });
});

describe("X's options", () => {
  it("take a community by its id, and share it with followers only with one", () => {
    expect(
      new XOptions({
        communityId: "1700000000000000001",
        shareWithFollowers: true,
      }).problems()
    ).toStrictEqual([]);
    expect(
      new XOptions({ communityId: "my-community" }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "communityId" }]);
    expect(new XOptions({ shareWithFollowers: true }).problems()).toStrictEqual(
      [{ _tag: "missing", field: "communityId" }]
    );
    expect(optionConstraintsOn("x")).toStrictEqual([
      {
        _tag: "neededWith",
        field: "communityId",
        other: "shareWithFollowers",
        values: ["true"],
      },
    ]);
  });
});

const bluesky = channel("4", "bluesky");

const before = [
  "atproto",
  "repo:app.bsky.feed.post?action=create&action=delete",
];

const granted = [...before, ...blueskyGateScopes];

describe("Bluesky's gates", () => {
  it("say who may reply: everyone, nobody, or some named", () => {
    expect(
      new BlueskyOptions({
        replies: "limited",
        replyFollowers: true,
        replyMentioned: false,
      }).problems()
    ).toStrictEqual([]);
    expect(new BlueskyOptions({ replies: "limited" }).problems()).toStrictEqual(
      [{ _tag: "invalid", field: "replies" }]
    );
    expect(
      new BlueskyOptions({ replies: "nobody", replyFollowing: true }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "replyFollowing" }]);
  });

  it("are refused on a channel that did not grant their scopes, and said beforehand", () => {
    const gated = Option.some<TargetOptions>(
      new BlueskyOptions({ disableQuotes: true, replies: "nobody" })
    );

    expect(gateViolationsOn(bluesky, gated, before)).toStrictEqual([
      { _tag: "optionInvalid", ...bluesky, field: "disableQuotes" },
      { _tag: "optionInvalid", ...bluesky, field: "replies" },
    ]);
    expect(gateViolationsOn(bluesky, gated, granted)).toStrictEqual([]);
    // Nothing gated, nothing refused.
    expect(
      gateViolationsOn(
        bluesky,
        Option.some(new BlueskyOptions({ replies: "everyone" })),
        before
      )
    ).toStrictEqual([]);
    expect(gateRestrictions(before)).toStrictEqual([
      { _tag: "optionNeedsReconnect", field: "disableQuotes" },
      { _tag: "optionNeedsReconnect", field: "replies" },
    ]);
    expect(gateRestrictions(granted)).toStrictEqual([]);
  });
});
