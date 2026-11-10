import { Schema } from "effect";

/**
 * An address Peal will not deliver to:
 *
 * - `malformed`: not a URL.
 * - `notHttps`: not HTTPS, or on another port than 443.
 * - `credentials`: it carries a user name or a password.
 * - `tooLong`: longer than 2048 characters.
 */
export class InvalidWebhookUrl extends Schema.TaggedError<InvalidWebhookUrl>()(
  "InvalidWebhookUrl",
  {
    reason: Schema.Literals([
      "malformed",
      "notHttps",
      "credentials",
      "tooLong",
    ]),
  }
) {}
