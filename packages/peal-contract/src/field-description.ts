import { Schema } from "effect";

import { LookupNameSchema } from "./lookup-name.ts";

/**
 * What a field holds: a yes or no (`boolean`), a text, one of `values`
 * (`choice`), several texts (`textList`), a whole number (`integer`), or
 * the accounts a text names (`mentionList`: objects of a `name` and a
 * `urn`, as the field's lookup answers them).
 */
export const FieldTypeSchema = Schema.Literals([
  "boolean",
  "choice",
  "integer",
  "mentionList",
  "text",
  "textList",
]).annotate({ identifier: "FieldType" });

export type FieldType = typeof FieldTypeSchema.Type;

/** What a field has when it is left out. */
export const FieldDefaultSchema = Schema.Union([
  Schema.Boolean,
  Schema.Finite,
  Schema.String,
]).annotate({ identifier: "FieldDefault" });

/**
 * A field of a platform's options, or of a lookup's input. A property that
 * is null does not apply to the field.
 */
export const FieldDescriptionSchema = Schema.Struct({
  // Characters refused anywhere in a text.
  forbiddenCharacters: Schema.Array(Schema.String),
  // What the platform does when the field is left out.
  ifLeftOut: Schema.NullOr(FieldDefaultSchema),
  // The lookup that answers the values the field takes on an account.
  lookup: Schema.NullOr(LookupNameSchema),
  // The longest text, in code points; for a `textList`, of all its texts
  // together, as the platform counts them.
  maxLength: Schema.NullOr(Schema.Int),
  // The largest whole number; for a `mentionList`, the most accounts it
  // names.
  maximum: Schema.NullOr(Schema.Int),
  minimum: Schema.NullOr(Schema.Int),
  name: Schema.String,
  // A regular expression the whole text matches.
  pattern: Schema.NullOr(Schema.String),
  // An option: needed to schedule the post, though a draft may lack it. A
  // lookup's input: needed to run the lookup.
  required: Schema.Boolean,
  type: FieldTypeSchema,
  // The values a `choice` takes; empty for any other type.
  values: Schema.Array(Schema.String),
}).annotate({ identifier: "FieldDescription" });

export type FieldDescription = typeof FieldDescriptionSchema.Type;
