import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * The workspace, or the server, already has as many requests under way to
 * workspaces' own text providers as it may: ask again in a moment.
 */
export class TextProviderBusy extends Schema.TaggedError<TextProviderBusy>()(
  "TextProviderBusy",
  { ...errorEnvelope },
  {
    description:
      "The workspace already has four requests under way to its own text provider, or the server runs as many such requests as it takes together: nothing was sent or counted. Ask again in a moment, once one has finished.",
    httpApiStatus: 429,
  }
) {}
