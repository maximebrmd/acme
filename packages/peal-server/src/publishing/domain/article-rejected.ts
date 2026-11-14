import { Schema } from "effect";

/** What keeps an article from going out, all of it at once. */
export const ArticleViolationSchema = Schema.Union([
  Schema.TaggedStruct("titleMissing", {}),
  Schema.TaggedStruct("titleTooLong", { maximum: Schema.Int }),
  Schema.TaggedStruct("bodyMissing", {}),
  Schema.TaggedStruct("excerptTooLong", { maximum: Schema.Int }),
  Schema.TaggedStruct("tooManyTerms", {
    field: Schema.Literals(["categories", "tags"]),
    maximum: Schema.Int,
  }),
  Schema.TaggedStruct("termInvalid", {
    field: Schema.Literals(["categories", "tags"]),
  }),
  Schema.TaggedStruct("siteTimeInPast", {}),
  Schema.TaggedStruct("timeInPast", {}),
  Schema.TaggedStruct("coverNotImage", {}),
  // The workspace's posts wait for an approval, and articles have none
  // yet: someone whose posts go out without one sends it.
  Schema.TaggedStruct("approvalRequired", {}),
]);

/** The article was refused for what it says, or when it goes out. */
export class ArticleRejected extends Schema.TaggedError<ArticleRejected>()(
  "ArticleRejected",
  { violations: Schema.NonEmptyArray(ArticleViolationSchema) }
) {}
