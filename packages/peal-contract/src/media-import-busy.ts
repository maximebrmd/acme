import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Too many imports, or images the assistant makes, are under way: ask
 * again in a moment.
 */
export class MediaImportBusy extends Schema.TaggedError<MediaImportBusy>()(
  "MediaImportBusy",
  { ...errorEnvelope },
  {
    description:
      "The workspace already imports two files at once (or has the assistant make two images at once), or the server runs as many as it takes together: nothing was fetched, made, stored or counted. Ask again in a moment, once one has finished.",
    httpApiStatus: 429,
  }
) {}
