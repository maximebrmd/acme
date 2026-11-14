import { Schema } from "effect";

/** The name of an article's state, as its `_tag`. */
export const ArticleStateNameSchema = Schema.Literals([
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "unconfirmed",
]).annotate({ identifier: "ArticleStateName" });

export type ArticleStateName = typeof ArticleStateNameSchema.Type;
