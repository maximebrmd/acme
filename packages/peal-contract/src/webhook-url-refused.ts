import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why Peal will not deliver to an address:
 *
 * - `malformed`: it is not a URL.
 * - `notHttps`: it is not HTTPS, or names another port than 443.
 * - `credentials`: it carries a user name or a password.
 * - `tooLong`: it is longer than 2048 characters.
 * - `notPublic`: its host is, or resolves to, an address that is not
 *   public (loopback, private, link-local and the like).
 * - `unknownHost`: its host name does not resolve.
 */
export const WebhookUrlRefusalSchema = Schema.Literals([
  "malformed",
  "notHttps",
  "credentials",
  "tooLong",
  "notPublic",
  "unknownHost",
]).annotate({ identifier: "WebhookUrlRefusal" });

export type WebhookUrlRefusal = typeof WebhookUrlRefusalSchema.Type;

/** The endpoint's address is not one Peal delivers to. */
export class WebhookUrlRefused extends Schema.TaggedError<WebhookUrlRefused>()(
  "WebhookUrlRefused",
  { ...errorEnvelope, reason: WebhookUrlRefusalSchema },
  {
    description:
      "Peal does not deliver to this address; `reason` says why. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
