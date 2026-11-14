import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The site refused to change the article's post. */
export class ArticleChangeRefused extends Schema.TaggedError<ArticleChangeRefused>()(
  "ArticleChangeRefused",
  { ...errorEnvelope, code: Schema.String },
  {
    description:
      "The site refused to change the article's post: `code` is its own, or Peal's (`tokenExpired` when the website must be reconnected). Nothing changed.",
    httpApiStatus: 422,
  }
) {}
