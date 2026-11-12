import { Effect, Option, Schema } from "effect";

import { rfc3339Date } from "./feed-dates.ts";
import { identityOf } from "./raw-feed.ts";
import type { RawFeed, RawItem } from "./raw-feed.ts";

/** Where every JSON Feed's `version` starts (https://www.jsonfeed.org/version/1.1/). */
export const jsonFeedVersionPrefix = "https://jsonfeed.org/version/";

// A field of a type other than its own is read as absent: a feed is
// other people's, and one odd field never refuses the rest.
const lenient = <S extends Schema.Top>(schema: S) =>
  Schema.optionalKey(
    schema.pipe(Schema.catchDecoding(() => Effect.succeed(Option.none())))
  );

const lenientString = lenient(Schema.String);

const JsonFeedItemSchema = Schema.Struct({
  content_html: lenientString,
  content_text: lenientString,
  date_published: lenientString,
  // A string; a number is read as one, as the specification asks.
  id: lenient(Schema.Union([Schema.String, Schema.Finite])),
  image: lenientString,
  summary: lenientString,
  title: lenientString,
  url: lenientString,
});

type JsonFeedItem = typeof JsonFeedItemSchema.Type;

const JsonFeedSchema = Schema.Struct({
  items: lenient(Schema.Array(Schema.Unknown)),
  title: lenientString,
  version: Schema.String,
});

const decodeFeed = Schema.decodeUnknownOption(
  Schema.fromJsonString(JsonFeedSchema)
);

const decodeItem = Schema.decodeUnknownOption(JsonFeedItemSchema);

const filled = (value: string | undefined): Option.Option<string> =>
  Option.fromUndefinedOr(value?.trim()).pipe(
    Option.filter((trimmed) => trimmed.length > 0)
  );

const itemOf = (item: JsonFeedItem): RawItem => {
  const plain = filled(item.summary).pipe(
    Option.orElse(() => filled(item.content_text))
  );

  return {
    identity: filled(item.id === undefined ? undefined : String(item.id)).pipe(
      Option.map((id) => identityOf("id", id)),
      Option.getOrElse(() => "")
    ),
    link: filled(item.url),
    picture: filled(item.image),
    publishedAt: filled(item.date_published).pipe(Option.flatMap(rfc3339Date)),
    summary: plain.pipe(Option.orElse(() => filled(item.content_html))),
    summaryIsText: Option.isSome(plain),
    title: filled(item.title),
  };
};

/**
 * A JSON Feed's title and items, when the text is one: an object whose
 * `version` starts with JSON Feed's address. An item that is not an
 * object is left out.
 */
export const jsonFeed = (text: string): Option.Option<RawFeed> =>
  decodeFeed(text).pipe(
    Option.filter(({ version }) => version.startsWith(jsonFeedVersionPrefix)),
    Option.map((feed) => ({
      items: (feed.items ?? []).flatMap((item) =>
        Option.toArray(decodeItem(item).pipe(Option.map(itemOf)))
      ),
      title: filled(feed.title),
    }))
  );
