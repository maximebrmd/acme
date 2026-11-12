import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** An address Peal does not read feeds at. */
export class FeedAddressRefused extends Schema.TaggedError<FeedAddressRefused>()(
  "FeedAddressRefused",
  {
    ...errorEnvelope,
    // Not an HTTPS address on the default port (`notHttps`), one with a
    // user name or a password (`credentials`), too long or not an address
    // (`malformed`), or one whose host is not on the public internet
    // (`notPublic`).
    reason: Schema.Literals([
      "credentials",
      "malformed",
      "notHttps",
      "notPublic",
    ]),
  },
  {
    description:
      "Peal reads feeds at public HTTPS addresses only, without a user name or a password, on the default port, at most 2048 characters long: `reason` says what this one is not. Nothing was read.",
    httpApiStatus: 422,
  }
) {}
