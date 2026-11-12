import { Option } from "effect";
import type { DateTime } from "effect";

import { maxFeedUrlLength } from "#publishing/domain/feed-address.ts";
import {
  maxFeedTitleLength,
  maxItemsRead,
  maxSummaryLength,
} from "#publishing/domain/feed.ts";
import { textOfHtml } from "#shared/domain/html-text.ts";
import { storableLine, storableText } from "#shared/domain/platform-text.ts";

/**
 * An item as its format gives it, before it is made storable: its
 * identity, as text, and what it says of itself. A summary is HTML, or
 * text when `summaryIsText`.
 */
export interface RawItem {
  readonly identity: string;
  readonly link: Option.Option<string>;
  readonly picture: Option.Option<string>;
  readonly publishedAt: Option.Option<DateTime.Utc>;
  readonly summary: Option.Option<string>;
  readonly summaryIsText: boolean;
  readonly title: Option.Option<string>;
}

/** A feed as its format gives it. */
export interface RawFeed {
  readonly items: readonly RawItem[];
  readonly title: Option.Option<string>;
}

/** An item made storable, its identity still text. */
export interface CleanItem {
  readonly identity: string;
  readonly link: Option.Option<string>;
  readonly pictureUrl: Option.Option<string>;
  readonly publishedAt: Option.Option<DateTime.Utc>;
  readonly summary: Option.Option<string>;
  readonly title: Option.Option<string>;
}

// Where an identity of each kind starts, so a guid never takes the
// digest of a link that reads the same.
export const identityOf = (kind: string, value: string): string =>
  `${kind}\u0000${value}`;

const nonEmpty = (text: string): Option.Option<string> =>
  text.length === 0 ? Option.none() : Option.some(text);

/** A line of text Peal did not write, made storable; none when empty. */
export const lineOf = (text: string): Option.Option<string> =>
  nonEmpty(storableLine(text, maxFeedTitleLength));

/**
 * An address an item gives, absolute against the feed's own address,
 * kept only when it is HTTP or HTTPS and not too long.
 */
export const addressOf = (raw: string, base: string): Option.Option<string> => {
  const trimmed = raw.trim();

  if (trimmed.length === 0 || !URL.canParse(trimmed, base)) {
    return Option.none();
  }

  const url = new URL(trimmed, base);

  return (url.protocol === "https:" || url.protocol === "http:") &&
    url.href.length <= maxFeedUrlLength
    ? Option.some(url.href)
    : Option.none();
};

// Read no more of an HTML summary than this, before it becomes text: a
// summary is bounded far below it once it is text.
const maxSummaryHtml = 64 * 1024;

const summaryOf = (raw: string, isText: boolean): Option.Option<string> =>
  nonEmpty(
    storableText(
      (isText ? raw : textOfHtml(raw.slice(0, maxSummaryHtml)))
        .replaceAll(/[ \t]+/gu, " ")
        .replaceAll(/\n[ \t]*\n[\s]*/gu, "\n\n")
        .trim(),
      maxSummaryLength
    ).trim()
  );

/**
 * The feed's items made storable: titles on one line, summaries as plain
 * text, addresses absolute, the first `maxItemsRead` only, and none
 * without an identity.
 */
export const cleanItems = (feed: RawFeed, base: string): readonly CleanItem[] =>
  feed.items
    .filter(({ identity }) => identity.trim().length > 0)
    .slice(0, maxItemsRead)
    .map((item) => ({
      identity: item.identity,
      link: item.link.pipe(Option.flatMap((link) => addressOf(link, base))),
      pictureUrl: item.picture.pipe(
        Option.flatMap((picture) => addressOf(picture, base))
      ),
      publishedAt: item.publishedAt,
      summary: item.summary.pipe(
        Option.flatMap((summary) => summaryOf(summary, item.summaryIsText))
      ),
      title: item.title.pipe(Option.flatMap(lineOf)),
    }));
