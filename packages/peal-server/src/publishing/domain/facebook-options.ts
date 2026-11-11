import { Schema } from "effect";

import type { FieldNotes } from "./field-description.ts";
import type { LookupName } from "./lookup.ts";
import type { OptionConstraint } from "./option-constraint.ts";
import { invalid } from "./option-problem.ts";
import type { OptionProblem } from "./option-problem.ts";
import { PostTextSchema } from "./post-text.ts";
import { measureText } from "./text-length.ts";

// A Page's video, POST /{page-id}/videos (the Graph API's Page Videos
// reference, read 2026-11-11): `title`, "The title of the video.", beside
// the `description` that is the post's text. Meta names no limit.

/**
 * The longest title Peal gives a Page's video: Peal's ceiling, as Meta
 * names none.
 */
export const maxFacebookVideoTitleLength = 255;

// A title is one line.
const titleForbidden = ["\n", "\r"] as const;

// What Facebook would refuse in a target's options. A title on a post
// without a video is refused where the media is known (`content-rules.ts`).
const facebookProblems = (
  options: FacebookOptions
): readonly OptionProblem<FacebookField>[] => {
  const title = options.videoTitle;
  const length = measureText(title ?? "", "codePoints");

  return [
    ...(title !== undefined &&
    (title.trim() === "" ||
      titleForbidden.some((character) => title.includes(character)))
      ? [invalid("videoTitle")]
      : []),
    ...(length > maxFacebookVideoTitleLength
      ? [
          {
            _tag: "tooLong" as const,
            field: "videoTitle" as const,
            length,
            maximum: maxFacebookVideoTitleLength,
          },
        ]
      : []),
  ];
};

/**
 * How a post goes out on a Facebook Page. Nothing is needed: a video's
 * title is `videoTitle` (none when left out), for a post of a video only.
 */
export class FacebookOptions extends Schema.Class<FacebookOptions>(
  "peal-server/publishing/domain/FacebookOptions"
)({
  platform: Schema.tag("facebook"),
  videoTitle: Schema.optionalKey(PostTextSchema),
}) {
  /**
   * What the fields' schemas do not say, for the description clients read
   * (`optionFieldsOn`): every field has an entry.
   */
  static readonly notes: Readonly<
    Record<FacebookField, FieldNotes<LookupName>>
  > = {
    videoTitle: {
      forbiddenCharacters: titleForbidden,
      maxLength: maxFacebookVideoTitleLength,
    },
  };

  /** No rule ties two of Facebook's options together. */
  static readonly constraints: readonly OptionConstraint<FacebookField>[] = [];

  /** What Facebook would refuse in them. */
  problems(): readonly OptionProblem<FacebookField>[] {
    return facebookProblems(this);
  }
}

/** An option of Facebook's. */
export type FacebookField = Exclude<
  keyof typeof FacebookOptions.fields,
  "platform"
>;
