import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The image provider the workspace brought gave no image with its
 * settings, and Peal's own model was not used instead:
 *
 * - `settingsRefused`: the provider refused the key, the account, the
 *   model or the address; `status` is its answer (401, 402, 403 or 404).
 * - `addressRefused`: the address is one Peal sends nothing to (not
 *   public, or a name that does not resolve); `status` is null.
 * - `keyUnreadable`: the stored key can no longer be read; `status` is
 *   null. Type it again.
 */
export class ImageProviderRefused extends Schema.TaggedError<ImageProviderRefused>()(
  "ImageProviderRefused",
  {
    ...errorEnvelope,
    reason: Schema.Literals([
      "settingsRefused",
      "addressRefused",
      "keyUnreadable",
    ]),
    status: Schema.NullOr(Schema.Int),
  },
  {
    description:
      "The workspace's own image provider refused its key, its account, its model or its address, or its key must be typed again (`reason`, and the provider's `status` when it answered). Nothing was spent of Peal's assistant requests. Fix the settings in the workspace's assistant settings (`PUT /api/workspaces/{workspaceId}/assistant/image-provider`, which needs assistant:configure), or remove them to make images with the server's model again.",
    httpApiStatus: 502,
  }
) {}
