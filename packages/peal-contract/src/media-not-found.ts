import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace has no media with this id. */
export class MediaNotFound extends Schema.TaggedError<MediaNotFound>()(
  "MediaNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no media with this id.",
    httpApiStatus: 404,
  }
) {}
