import { Schema } from "effect";

/** The claim of the media folder was shown, and not confirmed (`--yes`). */
export class ClaimNotConfirmed extends Schema.TaggedError<ClaimNotConfirmed>()(
  "ClaimNotConfirmed",
  {}
) {}
