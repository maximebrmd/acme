import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Posts scheduled or publishing show the media, so it may not be deleted:
 * take it back to draft, remove the media, then schedule it again, or wait
 * until it has gone out.
 */
export class MediaInUse extends Schema.TaggedError<MediaInUse>()(
  "MediaInUse",
  { ...errorEnvelope, postIds: Schema.Array(Schema.String) },
  {
    description:
      "Posts that are scheduled or publishing show the media. `postIds` lists them.",
    httpApiStatus: 409,
  }
) {}
