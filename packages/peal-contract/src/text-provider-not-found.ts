import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace brought no text provider: there is nothing to test. */
export class TextProviderNotFound extends Schema.TaggedError<TextProviderNotFound>()(
  "TextProviderNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace has no text provider of its own to test: set one first (`PUT /api/workspaces/{workspaceId}/assistant/text-provider`).",
    httpApiStatus: 404,
  }
) {}
