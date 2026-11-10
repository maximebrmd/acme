import { Schema } from "effect";

/** A partner registers `limit` return origins at most. */
export class TooManyReturnOrigins extends Schema.TaggedError<TooManyReturnOrigins>()(
  "TooManyReturnOrigins",
  { limit: Schema.Int }
) {}
