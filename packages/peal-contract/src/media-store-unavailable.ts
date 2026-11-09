import { Schema } from "effect";

/** The server cannot reach its media store, or the store refused it. */
export class MediaStoreUnavailable extends Schema.TaggedError<MediaStoreUnavailable>()(
  "MediaStoreUnavailable",
  {},
  {
    description:
      "The server cannot reach its media store right now. Try again later.",
    httpApiStatus: 503,
  }
) {}
