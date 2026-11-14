import { Schema } from "effect";

import { ArticleViolationSchema } from "./article-violation.ts";
import { errorEnvelope } from "./error-envelope.ts";

/** What the article says, or when it goes out, is refused. */
export class ArticleRejected extends Schema.TaggedError<ArticleRejected>()(
  "ArticleRejected",
  { ...errorEnvelope, violations: Schema.Array(ArticleViolationSchema) },
  {
    description:
      "The article was refused: `violations` lists every reason at once. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
