import type { JSONContent } from "@tiptap/core";
import { Exit, Option, Schema } from "effect";
import type { DateTime } from "effect";
import { ArticleViolationSchema } from "peal-contract";
import type { Article, ArticleInput, ArticleSiteStatus } from "peal-contract";

import { instantOf, wallClockOf } from "#posts/zoned-time.ts";

// What the article's editor holds, and how it becomes a request.

/** The editor's fields, as the member fills them. */
export interface ArticleDraft {
  readonly body: JSONContent;
  /** Names separated by commas. */
  readonly categories: string;
  readonly channelId: string;
  readonly cover: string | null;
  readonly excerpt: string;
  readonly siteStatus: ArticleSiteStatus;
  /** Names separated by commas. */
  readonly tags: string;
  /** The wall-clock time, as a `datetime-local` input holds it, or "". */
  readonly time: string;
  readonly title: string;
}

const decodeBlocks = Schema.decodeUnknownOption(
  Schema.Array(Schema.Record(Schema.String, Schema.Json))
);

// The body the server answered, as the editor's document.
const documentOf = (article: Article | undefined): JSONContent => ({
  content: Option.getOrElse(
    decodeBlocks(article?.body.content ?? []),
    () => []
  ).map((block) => ({ ...block })),
  type: "doc",
});

const padded = (value: number, length = 2) =>
  String(value).padStart(length, "0");

// The wall-clock time an article is scheduled at, as the input holds it.
const timeOf = (article: Article | undefined, timeZone: string): string => {
  const state = article?.state;

  if (state === undefined || state._tag === "draft") {
    return "";
  }

  return wallClockOf(state.scheduledAt, timeZone).pipe(
    Option.map(
      ({ date, time }) =>
        `${padded(date.year, 4)}-${padded(date.month)}-${padded(date.day)}T${padded(time.hour)}:${padded(time.minute)}`
    ),
    Option.getOrElse(() => "")
  );
};

/** The editor's fields for the article, or for a new one on the first site. */
export const draftOf = (
  article: Article | undefined,
  firstSite: string,
  timeZone: string
): ArticleDraft => ({
  body: documentOf(article),
  categories: article?.categories.join(", ") ?? "",
  channelId: article?.channelId ?? firstSite,
  cover: article?.coverMediaId ?? null,
  excerpt: article?.excerpt ?? "",
  siteStatus: article?.siteStatus ?? "publish",
  tags: article?.tags.join(", ") ?? "",
  time: timeOf(article, timeZone),
  title: article?.title ?? "",
});

const namesOf = (written: string): string[] =>
  written
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");

/** What the article says, as the API takes it. */
export const inputOf = (draft: ArticleDraft): ArticleInput => ({
  body: { content: draft.body.content ?? [], type: "doc" },
  categories: namesOf(draft.categories),
  coverMediaId: draft.cover,
  excerpt: draft.excerpt.trim() === "" ? null : draft.excerpt,
  siteStatus: draft.siteStatus,
  tags: namesOf(draft.tags),
  title: draft.title,
});

const localPattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})$/u;

// The instant the input names in the zone, if it names one.
const instantFrom = (
  local: string,
  timeZone: string
): Option.Option<DateTime.Utc> => {
  const parts = localPattern.exec(local)?.groups;

  if (parts === undefined) {
    return Option.none();
  }

  return instantOf(
    {
      date: {
        day: Number(parts["day"]),
        month: Number(parts["month"]),
        year: Number(parts["year"]),
      },
      time: { hour: Number(parts["hour"]), minute: Number(parts["minute"]) },
    },
    timeZone
  );
};

/** When the article goes out, as the API takes it: at the time, or now. */
export const timeInputOf = (draft: ArticleDraft, timeZone: string) =>
  Option.match(instantFrom(draft.time, timeZone), {
    onNone: () => ({ timeZone }),
    onSome: (at) => ({ at, timeZone }),
  });

/** The errors the editor words, by tag; any other is unknown. */
export const ArticleErrorTagSchema = Schema.Literals([
  "ArticleChangeRefused",
  "ArticleNotFound",
  "ArticleStateConflict",
  "ChannelNotFound",
  "Forbidden",
  "InvalidTimeZone",
  "PlatformUnreachable",
  "UnknownMedia",
]);

export type ArticleErrorTag = typeof ArticleErrorTagSchema.Type;

const FailureSchema = Schema.Struct({
  _tag: Schema.String,
  code: Schema.optionalKey(Schema.String),
  violations: Schema.optionalKey(Schema.Array(ArticleViolationSchema)),
});

/** How a request about an article failed, as the editor tells it. */
export type ArticleFailure = typeof FailureSchema.Type;

const isFailure = Schema.is(FailureSchema);

const isErrorTag = Schema.is(ArticleErrorTagSchema);

/** The words the editor gives a failure: its tag's, or the unknown one. */
export const errorTagOf = (
  failure: ArticleFailure
): ArticleErrorTag | "unknown" =>
  isErrorTag(failure._tag) ? failure._tag : "unknown";

/** What the request ended with: none when it worked. */
export const articleFailureOf = <A, E>(
  exit: Exit.Exit<A, E>
): Option.Option<ArticleFailure> => {
  if (Exit.isSuccess(exit)) {
    return Option.none();
  }

  return Exit.findErrorOption(exit).pipe(
    Option.filter(isFailure),
    Option.orElse(() => Option.some<ArticleFailure>({ _tag: "unknown" }))
  );
};
