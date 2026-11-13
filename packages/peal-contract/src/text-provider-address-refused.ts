import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { ImageProviderAddressRefusalSchema } from "./image-provider-address-refused.ts";

/**
 * The text provider's address is not one Peal sends a key to, for the
 * reasons an image provider's is refused (`ImageProviderAddressRefusal`).
 */
export class TextProviderAddressRefused extends Schema.TaggedError<TextProviderAddressRefused>()(
  "TextProviderAddressRefused",
  { ...errorEnvelope, reason: ImageProviderAddressRefusalSchema },
  {
    description:
      "Peal sends a workspace's drafts and key only to a public HTTPS address on the default port, without a user name, a password, a query or a fragment, at most 2048 characters long: `reason` says what this one is not. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
