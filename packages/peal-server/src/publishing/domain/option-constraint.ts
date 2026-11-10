/**
 * A rule between two of a platform's options, which no field says alone:
 *
 * - `needsOneOf`: when the yes-or-no `field` is true, one of `oneOf` must
 *   be true too (TikTok's commercial content says whose).
 * - `notWith`: the yes-or-no `field` cannot be true while `other` has
 *   `value` (TikTok's paid partnership, never seen by the creator alone).
 */
export type OptionConstraint<Field extends string = string> =
  | {
      readonly _tag: "needsOneOf";
      readonly field: Field;
      readonly oneOf: readonly Field[];
    }
  | {
      readonly _tag: "notWith";
      readonly field: Field;
      readonly other: Field;
      readonly value: string;
    };
