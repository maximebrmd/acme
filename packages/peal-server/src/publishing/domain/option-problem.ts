/**
 * What a platform refuses in the options a post has on one of its channels,
 * field by field. `field` names the option, never its value; content
 * violations add the channel (`#publishing/domain/content-rules.ts`).
 */
export type OptionProblem<Field extends string = string> =
  // The platform needs the option, and the target has none.
  | { readonly _tag: "missing"; readonly field: Field }
  // Longer than the platform takes, in code points.
  | {
      readonly _tag: "tooLong";
      readonly field: Field;
      readonly length: number;
      readonly maximum: number;
    }
  // A value the platform refuses: the field's description says why.
  | { readonly _tag: "invalid"; readonly field: Field };

/** The option is missing. */
export const missing = <Field extends string>(
  field: Field
): OptionProblem<Field> => ({ _tag: "missing", field });

/** The option has a value the platform refuses. */
export const invalid = <Field extends string>(
  field: Field
): OptionProblem<Field> => ({ _tag: "invalid", field });
