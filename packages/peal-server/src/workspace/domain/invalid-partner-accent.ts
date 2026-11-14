import { Schema } from "effect";

/**
 * The accent colour is not six hexadecimal digits (`#RRGGBB`), or a line
 * of it would not be seen on Peal's light pages.
 */
export class InvalidPartnerAccent extends Schema.TaggedError<InvalidPartnerAccent>()(
  "InvalidPartnerAccent",
  { reason: Schema.Literals(["malformed", "lowContrast"]) }
) {}
