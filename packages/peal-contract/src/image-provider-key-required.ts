import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Saving the workspace's image provider without `apiKey`, while it has no
 * key stored that opens, or with another address than the one the stored
 * key was typed for. Nothing was saved.
 */
export class ImageProviderKeyRequired extends Schema.TaggedError<ImageProviderKeyRequired>()(
  "ImageProviderKeyRequired",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no key stored for its image provider, its stored key can no longer be read, or the new `baseUrl` is not the address the key was typed for (any change of host or path counts): a key is never sent to another address. Send `apiKey` in the same request. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
