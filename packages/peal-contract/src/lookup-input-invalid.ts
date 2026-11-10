import { Schema } from "effect";

/**
 * The lookup refused its input: a field it does not take, or a value
 * outside what its description allows.
 */
export class LookupInputInvalid extends Schema.TaggedError<LookupInputInvalid>()(
  "LookupInputInvalid",
  {},
  {
    description:
      "The lookup refused its input: a field it does not take, or a value outside what the lookup's description allows.",
    httpApiStatus: 422,
  }
) {}
