import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid, missing } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// Pinterest's pins/create (API v5): `board_id`, `board_section_id`,
// `title`, `link`, `dominant_color` and, for a video,
// `media_source.cover_image_key_frame_time`. The Pin's description is the
// post's text on the channel, and its alt text the first file's.

/** The longest title Pinterest takes, in characters. */
export const maxPinterestTitleLength = 100;

/** The longest link Pinterest takes, in characters. */
export const maxPinterestLinkLength = 2048;

// A board's or a section's id: digits, as Pinterest's API gives them.
const pinterestId = /^\d+$/u;

// An address people open in a browser.
const webAddress = /^https?:\/\/\S+$/iu;

// A colour as Pinterest takes it: "#6E7874".
const hexColour = /^#[\dA-Fa-f]{6}$/u;

const characters = (text: string) => measureText(text, "codePoints");

const tooLong = (
  field: PinterestField,
  text: string | undefined,
  maximum: number
): readonly OptionProblem<PinterestField>[] => {
  const length = characters(text ?? "");

  return length > maximum ? [{ _tag: "tooLong", field, length, maximum }] : [];
};

const unlike = (
  field: PinterestField,
  text: string | undefined,
  pattern: RegExp
): readonly OptionProblem<PinterestField>[] =>
  text === undefined || pattern.test(text) ? [] : [invalid(field)];

// What Pinterest would refuse in a target's options.
const pinterestProblems = (
  options: PinterestOptions
): readonly OptionProblem<PinterestField>[] => [
  ...(options.boardId === undefined
    ? [missing("boardId")]
    : unlike("boardId", options.boardId, pinterestId)),
  ...unlike("boardSectionId", options.boardSectionId, pinterestId),
  ...unlike("dominantColor", options.dominantColor, hexColour),
  ...tooLong("link", options.link, maxPinterestLinkLength),
  ...unlike("link", options.link, webAddress),
  ...tooLong("title", options.title, maxPinterestTitleLength),
];

/**
 * How a post goes out on a Pinterest account, as a Pin. A draft may lack
 * any of them; scheduling needs `boardId`, the board the Pin is saved to.
 * `boardSectionId` files it under one of that board's sections, `link` is
 * where people land when they click it, and `dominantColor` the colour
 * Pinterest shows while its image loads. A video's cover is the frame at
 * `coverSecond` seconds: the first one when left out, the last when the
 * video is shorter.
 */
export class PinterestOptions extends Schema.Class<PinterestOptions>(
  "peal-server/publishing/domain/PinterestOptions"
)({
  boardId: Schema.optionalKey(PostTextSchema),
  boardSectionId: Schema.optionalKey(PostTextSchema),
  coverSecond: Schema.optionalKey(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
  ),
  dominantColor: Schema.optionalKey(PostTextSchema),
  link: Schema.optionalKey(PostTextSchema),
  platform: Schema.tag("pinterest"),
  title: Schema.optionalKey(PostTextSchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<PinterestField, FieldNotes<LookupName>>
  > = {
    boardId: { lookup: "pinterestBoards", pattern: pinterestId.source },
    boardSectionId: {
      lookup: "pinterestBoardSections",
      pattern: pinterestId.source,
    },
    coverSecond: { ifLeftOut: 0, minimum: 0 },
    dominantColor: { pattern: hexColour.source },
    link: { maxLength: maxPinterestLinkLength, pattern: webAddress.source },
    title: { maxLength: maxPinterestTitleLength },
  };

  /** No rule ties two of Pinterest's options together. */
  static readonly constraints: readonly OptionConstraint<PinterestField>[] = [];

  /** What Pinterest would refuse in them. */
  problems(): readonly OptionProblem<PinterestField>[] {
    return pinterestProblems(this);
  }
}

/** An option of Pinterest's. */
export type PinterestField = Exclude<
  keyof typeof PinterestOptions.fields,
  "platform"
>;
