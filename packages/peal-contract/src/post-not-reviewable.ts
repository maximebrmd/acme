import { Schema } from "effect";

/** The post is past reviewing: it went out, is going out, or was cancelled. */
export class PostNotReviewable extends Schema.TaggedError<PostNotReviewable>()(
  "PostNotReviewable",
  { status: Schema.Literals(["published", "cancelled"]) },
  {
    description:
      "The post is past reviewing: it was published or is going out (`published`), or was cancelled.",
    httpApiStatus: 409,
  }
) {}
