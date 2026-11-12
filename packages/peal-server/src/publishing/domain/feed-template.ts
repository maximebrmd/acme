import { Option, Result } from "effect";

import { maxFeedUrlLength } from "./feed-address.ts";
import type { FeedEntry } from "./feed-entry.ts";
import { FeedTemplateInvalid } from "./feed-template-invalid.ts";
import { maxFeedTitleLength, maxSummaryLength } from "./feed.ts";
import { maxPostTextLength } from "./post-text.ts";

/** The longest template a feed keeps, in characters. */
export const maxTemplateLength = 1000;

/** What a feed's posts say unless it is told otherwise. */
export const defaultTemplate = "{title}\n\n{link}";

/** The placeholders a template may name, each replaced by the item's. */
export const placeholders = ["title", "link", "summary"] as const;

export type Placeholder = (typeof placeholders)[number];

// A word in braces: a placeholder, known or not. Anything else in braces
// (a space, punctuation) is text.
const placeholderPattern = /\{(?<name>[A-Za-z_]\w*)\}/gu;

// How many characters a text holds: code points, a pair of surrogates
// counting one.
const codePointsIn = (text: string): number =>
  text.length - (text.match(/[\u{10000}-\u{10FFFF}]/gu)?.length ?? 0);

// The most each placeholder may write.
const longest: Readonly<Record<Placeholder, number>> = {
  link: maxFeedUrlLength,
  summary: maxSummaryLength,
  title: maxFeedTitleLength,
};

const isPlaceholder = (name: string): name is Placeholder =>
  placeholders.some((known) => known === name);

/**
 * The template as a feed keeps it, line breaks as line feeds: refused
 * when it names a placeholder it does not know, is too long or empty.
 */
export const parseTemplate = (
  input: string
): Result.Result<string, FeedTemplateInvalid> => {
  const template = input.replaceAll(/\r\n?/gu, "\n");

  if (template.trim().length === 0) {
    return Result.fail(new FeedTemplateInvalid({ reason: "empty" }));
  }

  if (codePointsIn(template) > maxTemplateLength) {
    return Result.fail(new FeedTemplateInvalid({ reason: "tooLong" }));
  }

  // What the template writes when every placeholder is filled to the most
  // an item may give: it must fit a post.
  let filled = template.length;

  for (const match of template.matchAll(placeholderPattern)) {
    const name = match.groups?.["name"] ?? "";

    if (!isPlaceholder(name)) {
      return Result.fail(
        new FeedTemplateInvalid({
          placeholder: name,
          reason: "unknownPlaceholder",
        })
      );
    }

    filled += longest[name] - match[0].length;
  }

  return filled > maxPostTextLength
    ? Result.fail(new FeedTemplateInvalid({ reason: "tooLong" }))
    : Result.succeed(template);
};

const valueOf = (entry: FeedEntry, name: Placeholder): string =>
  Option.getOrElse(entry[name], () => "");

// The template written from the entry, before it is made tidy.
const filledFrom = (template: string, entry: FeedEntry): string =>
  template.replaceAll(placeholderPattern, (whole, name: string) =>
    isPlaceholder(name) ? valueOf(entry, name) : whole
  );

/**
 * Whether what the template writes from `entry` is longer than a post
 * holds: such an item is refused alone, never cut.
 */
export const writtenTooLong = (template: string, entry: FeedEntry): boolean =>
  filledFrom(template, entry).length > maxPostTextLength;

/**
 * What a post made from `entry` says: the template with each placeholder
 * replaced by what the item gives (nothing when it gives none), trailing
 * spaces dropped from each line, runs of blank lines made one and the
 * ends trimmed, so a missing part leaves no gap. None when nothing is
 * left, or when it is longer than a post holds (`writtenTooLong`).
 */
export const writtenFrom = (
  template: string,
  entry: FeedEntry
): Option.Option<string> => {
  if (writtenTooLong(template, entry)) {
    return Option.none();
  }

  const text = filledFrom(template, entry)
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();

  return text.length === 0 ? Option.none() : Option.some(text);
};
