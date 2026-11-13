import { Schema } from "effect";

/**
 * The address given for a workspace's image or text provider is not one
 * Peal sends a key to:
 *
 * - `notHttps`: it is not HTTPS, or names another port than 443.
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
    return `The provider's address is refused: ${this.reason}`;
  }
}
