import { Schema } from "effect";

/**
 * The address given for a workspace's image provider is not one Peal sends
 * a key to:
 *
 * - `notHttps`: it is not HTTPS (HTTP is taken outside production only).
 * - `credentials`: it carries a user name or a password.
 * - `queryOrFragment`: it has a query or a fragment, which the API's paths
 *   could not follow.
 * - `tooLong`: it is longer than `maxProviderAddressLength`.
 * - `malformed`: it is not an absolute address.
 */
export class ProviderAddressRejected extends Schema.TaggedError<ProviderAddressRejected>()(
  "ProviderAddressRejected",
  {
    reason: Schema.Literals([
      "notHttps",
      "credentials",
      "queryOrFragment",
      "tooLong",
      "malformed",
    ]),
  }
) {
  override get message(): string {
    return `The image provider's address is refused: ${this.reason}`;
  }
}
