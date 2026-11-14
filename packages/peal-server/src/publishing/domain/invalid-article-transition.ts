import { Schema } from "effect";

import { ArticleIdSchema } from "./article-id.ts";

/** The transitions of `./article.ts`, by name. */
export const ArticleActionSchema = Schema.Literals([
  "edit",
  "schedule",
  "unschedule",
  "retry",
  "unpublish",
  "updateOnSite",
  "delete",
]);

export type ArticleAction = typeof ArticleActionSchema.Type;

/** What an article's state is called, as its `_tag`. */
export const ArticleStateNameSchema = Schema.Literals([
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "unconfirmed",
]);

export type ArticleStateName = typeof ArticleStateNameSchema.Type;

/** A transition the article's state does not allow. */
export class InvalidArticleTransition extends Schema.TaggedError<InvalidArticleTransition>()(
  "InvalidArticleTransition",
  {
    action: ArticleActionSchema,
    articleId: ArticleIdSchema,
    from: ArticleStateNameSchema,
  }
) {
  override get message(): string {
    return `Cannot ${this.action} article ${this.articleId} while it is ${this.from}`;
  }
}
