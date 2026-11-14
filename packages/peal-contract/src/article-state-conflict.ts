import { Schema } from "effect";

import { ArticleStateNameSchema } from "./article-state-name.ts";
import { errorEnvelope } from "./error-envelope.ts";

/** The article's state does not allow this. */
export class ArticleStateConflict extends Schema.TaggedError<ArticleStateConflict>()(
  "ArticleStateConflict",
  { ...errorEnvelope, state: ArticleStateNameSchema },
  {
    description:
      "The article's state does not allow this; `state` is the one it has.",
    httpApiStatus: 409,
  }
) {}
