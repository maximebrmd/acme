import { Schema } from "effect";

/**
 * How a platform measures a post's text, as publishing counts it: graphemes
 * (what a reader sees as one character), Unicode code points, UTF-8 bytes,
 * code points with each emoji counted by its UTF-8 bytes, or X's weighted
 * count.
 */
export const TextUnitSchema = Schema.Literals([
  "graphemes",
  "codePoints",
  "utf8Bytes",
  "emojiBytes",
  "weighted",
]);

export type TextUnit = typeof TextUnitSchema.Type;

/** At most `maximum` of `unit`: one of a platform's limits on a post. */
export const TextLimitSchema = Schema.Struct({
  maximum: Schema.Int.check(Schema.isGreaterThan(0)),
  unit: TextUnitSchema,
});

export type TextLimit = typeof TextLimitSchema.Type;

// Each unit as the instructions explain it to the model, after the number.
const unitDescriptions: Readonly<Record<TextUnit, string>> = {
  codePoints: "characters",
  emojiBytes:
    "characters, where an emoji counts as the bytes it takes in UTF-8, 4 for most",
  graphemes: "characters, counting what a reader sees as one character",
  utf8Bytes: "bytes once encoded as UTF-8",
  weighted:
    "characters as X counts them: a link counts as 23 whatever its length, an emoji as 2, and a Chinese, Japanese or Korean character as 2",
};

/** A limit as the instructions state it: "at most 280 characters…". */
export const describeLimit = ({ maximum, unit }: TextLimit): string =>
  `at most ${maximum} ${unitDescriptions[unit]}`;
