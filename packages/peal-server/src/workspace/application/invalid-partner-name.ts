import { Schema } from "effect";

/** The name is empty, too long, or holds characters nobody could read. */
export class InvalidPartnerName extends Schema.TaggedError<InvalidPartnerName>()(
  "InvalidPartnerName",
  {}
) {}
