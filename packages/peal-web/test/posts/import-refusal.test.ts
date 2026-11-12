import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";
import type { Locale } from "next-intl";
import {
  ChannelSetNotFound,
  DuplicatePost,
  Forbidden,
  IdempotencyKeyReused,
  ImportProblemSchema,
  InvalidTimeZone,
  PlanLimitReached,
  PostContentInvalid,
  PostNotFound,
  PostRefusalSchema,
  QueueHasNoRoom,
  QueueNotFound,
  ScheduleInPast,
  SignatureNotFound,
  UnknownChannels,
  UnknownMedia,
  UnknownTags,
} from "peal-contract";
import type { PostRefusal } from "peal-contract";

import { loadMessages } from "#i18n/messages.ts";
import type { Messages } from "#i18n/messages.ts";
import {
  cellWords,
  importRefusalWords,
  unreadableWords,
} from "#posts/import-refusal.ts";

const message = "A synthetic refusal";

const refusals: readonly [PostRefusal, string][] = [
  [
    new PostContentInvalid({ message, violations: [{ _tag: "noChannels" }] }),
    "Posts.Composer.errors.content",
  ],
  [
    new UnknownChannels({ channelIds: ["c9", "c8"], message }),
    "Posts.Import.refusal.unknownChannels",
  ],
  [
    new UnknownMedia({ mediaIds: ["m9"], message }),
    "Posts.Import.refusal.unknownMedia",
  ],
  [new ScheduleInPast({ message }), "Posts.Composer.errors.inPast"],
  [
    new InvalidTimeZone({ message, timeZone: "Mars/Olympus" }),
    "Posts.Import.refusal.timeZone",
  ],
  [
    new PlanLimitReached({
      allowed: 30,
      billingUrl: "https://peal.example/app/w/billing",
      limit: "scheduledPosts",
      message,
      plan: "free",
      planWithRoom: "starter",
      used: 30,
    }),
    "Billing.limitReached",
  ],
  [new IdempotencyKeyReused({ message }), "Posts.Import.refusal.keyReused"],
  [new PostNotFound({ message }), "Posts.Import.refusal.postGone"],
  [
    new DuplicatePost({ duplicates: [], message }),
    "Posts.Import.refusal.duplicateInFile",
  ],
  [
    new DuplicatePost({
      duplicates: [{ channelId: "c1", postId: "p1" }],
      message,
    }),
    "Posts.Import.refusal.duplicate",
  ],
  [
    new Forbidden({
      message,
      permission: "media:read",
      reason: "missingPermission",
    }),
    "Posts.Import.refusal.forbidden",
  ],
  [
    new UnknownTags({ message, tagIds: ["t9"] }),
    "Posts.Import.refusal.unknownTags",
  ],
  [new ChannelSetNotFound({ message }), "Posts.Import.refusal.unknownSet"],
  [new SignatureNotFound({ message }), "Posts.Import.refusal.unknownSignature"],
  [new QueueNotFound({ message }), "Posts.Composer.errors.queueNotFound"],
  [
    new QueueHasNoRoom({ message, queueId: "q1", reason: "full" }),
    "Posts.Composer.errors.queueNoRoom",
  ],
];

const isBranch = Schema.is(Schema.Record(Schema.String, Schema.Unknown));
const isMessage = Schema.is(Schema.String);

// Whether a catalogue holds a message at a dotted path.
const hasMessage = (catalogue: Messages, path: string): boolean => {
  let node: unknown = catalogue;

  for (const key of path.split(".")) {
    node = isBranch(node) ? node[key] : undefined;
  }

  return isMessage(node);
};

const locales: readonly Locale[] = ["en", "fr"];

describe(importRefusalWords, () => {
  it("has words for every refusal a row can come with", () => {
    expect(new Set(refusals.map(([refusal]) => refusal._tag)).size).toBe(
      PostRefusalSchema.members.length
    );
  });

  it.each(refusals)("explains %s", (refusal, key) => {
    expect(importRefusalWords(refusal).key).toBe(key);
  });

  it.each(locales)("finds each refusal's words in %s", async (locale) => {
    const catalogue = await loadMessages(locale);

    const missing = refusals.flatMap(([refusal]) => {
      const { key } = importRefusalWords(refusal);

      return hasMessage(catalogue, key) ? [] : [key];
    });

    expect(missing).toStrictEqual([]);
  });

  it("names the channels and media the workspace does not have", () => {
    expect(
      importRefusalWords(
        new UnknownChannels({ channelIds: ["c9", "c8"], message })
      )
    ).toStrictEqual({
      ids: "c9, c8",
      key: "Posts.Import.refusal.unknownChannels",
    });
  });

  it("never shows the server's English message", () => {
    const words = importRefusalWords(
      new DuplicatePost({ duplicates: [], message })
    );

    expect(JSON.stringify(words)).not.toContain(message);
  });
});

describe(unreadableWords, () => {
  const problems = ImportProblemSchema.literals;

  it.each(problems)("explains %s", (problem) => {
    expect(unreadableWords(problem, "title").key).toBe(
      `Posts.Import.unreadable.${problem}`
    );
  });

  it.each(locales)("finds each problem's words in %s", async (locale) => {
    const catalogue = await loadMessages(locale);

    expect(
      problems
        .map((problem) => unreadableWords(problem, null).key)
        .filter((key) => !hasMessage(catalogue, key))
    ).toStrictEqual([]);
  });

  it("names the column only when there is one", () => {
    expect(unreadableWords("unknownColumn", "title")).toMatchObject({
      column: "title",
      named: "yes",
    });
    expect(unreadableWords("unknownColumn", null)).toMatchObject({
      column: "",
      named: "no",
    });
  });
});

describe(cellWords, () => {
  it.each(locales)("finds each cell problem's words in %s", async (locale) => {
    const catalogue = await loadMessages(locale);

    const keys = [
      cellWords({ column: "at", problem: "missing" }).key,
      cellWords({ column: "at", problem: "invalid" }).key,
      cellWords({ expected: 3, found: 4 }).key,
    ];

    expect(new Set(keys).size).toBe(3);
    expect(keys.filter((key) => !hasMessage(catalogue, key))).toStrictEqual([]);
  });
});
