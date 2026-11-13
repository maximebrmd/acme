import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The text provider the workspace brought gave no answer with its
 * settings, and Peal's own model was not used instead:
 *
 * - `settingsRefused`: the provider refused the key, the account, the
 *   model or the address; `status` is its answer (401, 402, 403 or 404).
 * - `redirected`: the provider answered with a redirect (`status` 3xx),
 *   which Peal never follows: the address lacks the API's host or version.
 * - `addressRefused`: the address is one Peal sends nothing to (not
 *   public, or a name that does not resolve); `status` is null.
 * - `keyUnreadable`: the stored key can no longer be read; `status` is
 *   null. Type it again.
 */
export class TextProviderRefused extends Schema.TaggedError<TextProviderRefused>()(
  "TextProviderRefused",
  {
    ...errorEnvelope,
    reason: Schema.Literals([
      "settingsRefused",
      "redirected",
      "addressRefused",
      "keyUnreadable",
    ]),
    status: Schema.NullOr(Schema.Int),
  },
  {
    description:
      "The workspace's own text provider refused its key, its account, its model or its address, answered with a redirect, which Peal never follows (the address is not the API's), or its key must be typed again (`reason`, and the provider's `status` when it answered). Nothing was spent of Peal's assistant requests. Fix the settings in the workspace's assistant settings (`PUT /api/workspaces/{workspaceId}/assistant/text-provider`, which needs assistant:configure), or remove them to write with the server's model again.",
    httpApiStatus: 502,
  }
) {}
