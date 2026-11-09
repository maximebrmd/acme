import { Schema } from "effect";

/** The workspace has no media with this id. */
export class MediaNotFound extends Schema.TaggedError<MediaNotFound>()(
  "MediaNotFound",
  {},
  {
    description: "The workspace has no media with this id.",
    httpApiStatus: 404,
  }
) {}
