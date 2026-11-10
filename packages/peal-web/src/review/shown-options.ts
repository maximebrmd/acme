import { Option, Schema } from "effect";
import { LinkedInMentionSchema } from "peal-contract";
import type { TargetOptions } from "peal-contract";

import { fieldOf, mentionsText } from "#posts/target-options.ts";
import type { OptionField, OptionsText } from "#posts/target-options.ts";

// The options a post has on a channel, as its reviewers read them: an
// approval covers them, so each is written out under the name the composer
// gives it, and none is left out.

/** What an option holds, as a reviewer reads it. */
export type ShownValue =
  | { readonly kind: "label"; readonly label: OptionsText }
  | { readonly kind: "no" }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "yes" };

/** One option of a post on a channel. */
export interface ShownOption {
  /** The composer's name for it; none for one it has no field for. */
  readonly label: OptionsText | null;
  /** Its name, as the API writes it. */
  readonly name: string;
  readonly value: ShownValue;
}

// The options as the API holds them: plain values under their names.
const decodeHeld = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Json)
);

const decodeText = Schema.decodeUnknownOption(Schema.String);

const decodeBoolean = Schema.decodeUnknownOption(Schema.Boolean);

const decodeNumber = Schema.decodeUnknownOption(Schema.Number);

const decodeTags = Schema.decodeUnknownOption(Schema.Array(Schema.String));

const decodeMentions = Schema.decodeUnknownOption(
  Schema.Array(LinkedInMentionSchema)
);

const text = (written: string): ShownValue => ({ kind: "text", text: written });

// A box as its label reads: "Allow comments" is yes while the option that
// turns comments off is false.
const ticked = (
  field: Option.Option<OptionField>,
  held: boolean
): ShownValue => {
  const inverted = field.pipe(
    Option.exists((known) => known.kind === "toggle" && known.inverted === true)
  );

  return { kind: held === inverted ? "no" : "yes" };
};

// A choice under the words the composer offers it with.
const chosen = (field: Option.Option<OptionField>, held: string): ShownValue =>
  field.pipe(
    Option.flatMap((known) =>
      known.kind === "choice"
        ? Option.fromUndefinedOr(
            known.choices.find(({ value }) => value === held)
          )
        : Option.none()
    ),
    Option.match({
      onNone: () => text(held),
      onSome: ({ label }): ShownValue => ({ kind: "label", label }),
    })
  );

const valueOf = (
  field: Option.Option<OptionField>,
  held: Schema.Json
): ShownValue =>
  decodeBoolean(held).pipe(
    Option.map((box) => ticked(field, box)),
    Option.orElse(() =>
      decodeText(held).pipe(Option.map((words) => chosen(field, words)))
    ),
    Option.orElse(() =>
      decodeNumber(held).pipe(Option.map((count) => text(String(count))))
    ),
    Option.orElse(() =>
      decodeTags(held).pipe(Option.map((tags) => text(tags.join(", "))))
    ),
    Option.orElse(() =>
      decodeMentions(held).pipe(
        Option.map((mentions) => text(mentionsText(mentions)))
      )
    ),
    // Nothing an approval covers is left out: what has no other reading
    // is written as the API holds it.
    Option.getOrElse(() => text(JSON.stringify(held)))
  );

/**
 * The options as a reviewer reads them, in the order the API holds them.
 * `platform` says only whose they are, and is left out.
 */
export const shownOptionsOf = (
  options: TargetOptions
): readonly ShownOption[] =>
  Object.entries(decodeHeld(options).pipe(Option.getOrElse(() => ({}))))
    .filter(([name]) => name !== "platform")
    .map(([name, held]): ShownOption => {
      const field = fieldOf(options.platform, name);

      return {
        label: field.pipe(
          Option.map(({ label }) => label),
          Option.getOrNull
        ),
        name,
        value: valueOf(field, held),
      };
    });
