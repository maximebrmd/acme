import { Schema } from "effect";

/** The workspace has no article of this id. */
export class ArticleNotFound extends Schema.TaggedError<ArticleNotFound>()(
  "ArticleNotFound",
  { articleId: Schema.String }
) {
  override get message(): string {
    return `No article has the id ${this.articleId}`;
  }
}
