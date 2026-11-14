import { Schema } from "effect";

/** No credit problem has this key. */
export class CreditProblemNotFound extends Schema.TaggedError<CreditProblemNotFound>()(
  "CreditProblemNotFound",
  { key: Schema.String }
) {}
