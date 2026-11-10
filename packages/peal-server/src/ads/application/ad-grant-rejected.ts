import { Schema } from "effect";

/** The ad network refused the sign-in's token: the person who signed in signs in again. */
export class AdGrantRejected extends Schema.TaggedError<AdGrantRejected>()(
  "AdGrantRejected",
  {}
) {}
