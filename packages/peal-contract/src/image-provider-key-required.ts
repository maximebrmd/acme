import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Saving the workspace's image provider without `apiKey`, while it has no
 * key stored that opens, or with an address on another origin than the
 * one the stored key was typed for. Nothing was saved.
 */
export class ImageProviderKeyRequired extends Schema.TaggedError<ImageProviderKeyRequired>()(
  "ImageProviderKeyRequired",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no key stored for its image provider, its stored key can no longer be read, or the new `baseUrl` is on another origin (scheme, host or port) than the one the key was typed for: a key is never sent to another origin. Send `apiKey` in the same request. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
