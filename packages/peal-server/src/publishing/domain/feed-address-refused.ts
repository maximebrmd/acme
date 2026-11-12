import { Schema } from "effect";

/**
 * A feed's address Peal does not read: not an HTTPS address on the
 * default port (`notHttps`), one with a user name or a password
 * (`credentials`), too long or not an address at all (`malformed`), or
 * one whose host is not public (`notPublic`), which the outbound guard
 * says before every request.
 */
export class FeedAddressRefused extends Schema.TaggedError<FeedAddressRefused>()(
  "FeedAddressRefused",
  {
    reason: Schema.Literals([
      "credentials",
      "malformed",
      "notHttps",
      "notPublic",
    ]),
  }
) {
  override get message(): string {
    return `Peal does not read this feed's address (${this.reason})`;
  }
}
