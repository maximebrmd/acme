import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why Peal will not send a workspace's prompts and key to an address:
 *
 * - `malformed`: it is not an absolute address.
 * - `notHttps`: it is not HTTPS, or names another port than 443.
 * - `credentials`: it carries a user name or a password.
 * - `queryOrFragment`: it has a query or a fragment.
 * - `tooLong`: it is longer than 2048 characters.
 * - `notPublic`: its host is, or resolves to, an address that is not
 *   public (loopback, private, link-local and the like).
 * - `unknownHost`: its host name does not resolve.
 */
export const ImageProviderAddressRefusalSchema = Schema.Literals([
  "malformed",
  "notHttps",
  "credentials",
  "queryOrFragment",
  "tooLong",
  "notPublic",
  "unknownHost",
]).annotate({ identifier: "ImageProviderAddressRefusal" });

export type ImageProviderAddressRefusal =
  typeof ImageProviderAddressRefusalSchema.Type;

/** The image provider's address is not one Peal sends a key to. */
export class ImageProviderAddressRefused extends Schema.TaggedError<ImageProviderAddressRefused>()(
  "ImageProviderAddressRefused",
  { ...errorEnvelope, reason: ImageProviderAddressRefusalSchema },
  {
    description:
      "Peal sends a workspace's prompts and key only to a public HTTPS address on the default port, without a user name, a password, a query or a fragment, at most 2048 characters long: `reason` says what this one is not. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
