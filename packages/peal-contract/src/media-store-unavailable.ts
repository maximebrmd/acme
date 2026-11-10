import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The server cannot reach its media store, or the store refused it. */
export class MediaStoreUnavailable extends Schema.TaggedError<MediaStoreUnavailable>()(
  "MediaStoreUnavailable",
  { ...errorEnvelope },
  {
    description:
      "The server cannot reach its media store right now. Try again later.",
    httpApiStatus: 503,
  }
) {}
