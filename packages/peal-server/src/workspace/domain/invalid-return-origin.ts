import { Schema } from "effect";

/**
 * The address is not one a partner may send its customers back to: not a
 * URL, not HTTPS (plain HTTP is taken for this machine only), carrying
 * credentials, or more than an origin where an origin is asked.
 */
export class InvalidReturnOrigin extends Schema.TaggedError<InvalidReturnOrigin>()(
  "InvalidReturnOrigin",
  {
    reason: Schema.Literals([
      "malformed",
      "notHttps",
      "credentials",
      "notAnOrigin",
    ]),
  }
) {}
