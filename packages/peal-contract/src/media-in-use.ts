import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Posts or articles scheduled or publishing show the media, so it may not
 * be deleted: take them back to draft, remove the media, then schedule
 * them again, or wait until they have gone out.
 */
export class MediaInUse extends Schema.TaggedError<MediaInUse>()(
  "MediaInUse",
  {
    ...errorEnvelope,
    postIds: Schema.Array(Schema.String),
    articleIds: Schema.Array(Schema.String),
  },
  {
    description:
      "Posts or articles that are scheduled or publishing show the media. `postIds` lists the posts, `articleIds` the articles.",
    httpApiStatus: 409,
  }
) {}
