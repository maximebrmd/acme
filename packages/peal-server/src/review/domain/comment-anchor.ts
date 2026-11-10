import { Option, Schema } from "effect";

import { ChannelIdSchema } from "#shared/domain/ids.ts";

/**
 * Words of a post's text a comment is about: the words themselves, and
 * where they started when the comment was written.
 */
export const TextSelectionSchema = Schema.Struct({
  quote: Schema.NonEmptyString,
  start: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});

export type TextSelection = typeof TextSelectionSchema.Type;

/**
 * What a comment is about, when it is not the whole post: the post on one
 * channel, and possibly some words of its text there.
 *
 * A selection is kept as the words it quoted, not as positions alone, so it
 * still means something once the text changes (`locate`): while the text
 * holds the words, the comment points at them, wherever they moved; once it
 * does not, the comment keeps the quote and says the text has changed.
 *
 * Stored with comments as JSON: add fields, never rename or remove one.
 */
export const CommentAnchorSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  selection: Schema.Option(TextSelectionSchema),
});

export type CommentAnchor = typeof CommentAnchorSchema.Type;

/** Where a selection is in a text now. */
export interface LocatedSelection {
  readonly end: number;
  readonly start: number;
}

/**
 * Where the selection's words are in `text` now: the occurrence nearest to
 * where they were, or none when the text no longer holds them.
 */
export const locate = (
  { quote, start }: TextSelection,
  text: string
): Option.Option<LocatedSelection> => {
  const positions: number[] = [];

  for (
    let found = text.indexOf(quote);
    found !== -1;
    found = text.indexOf(quote, found + 1)
  ) {
    positions.push(found);
  }

  const [first, ...others] = positions;

  if (first === undefined) {
    return Option.none();
  }

  let nearest = first;

  for (const position of others) {
    if (Math.abs(position - start) < Math.abs(nearest - start)) {
      nearest = position;
    }
  }

  return Option.some({ end: nearest + quote.length, start: nearest });
};

/** Whether the selection quotes the text where it says. */
export const quotes = ({ quote, start }: TextSelection, text: string) =>
  text.slice(start, start + quote.length) === quote;
