import { Schema } from "effect";

import { BoostViolationSchema } from "./boost-violation.ts";

/** A boost that breaks Peal's own rules: nothing was reserved or sent. */
export class InvalidBoost extends Schema.TaggedError<InvalidBoost>()(
  "InvalidBoost",
  { violations: Schema.NonEmptyArray(BoostViolationSchema) }
) {}
