import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** No article of the workspace has this id. */
export class ArticleNotFound extends Schema.TaggedError<ArticleNotFound>()(
  "ArticleNotFound",
  { ...errorEnvelope },
  {
    description: "The workspace has no article with this id.",
    httpApiStatus: 404,
  }
) {}
