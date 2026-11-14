import { Schema } from "effect";

/** What keeps an article from going out, each one at once. */
export const ArticleViolationSchema = Schema.Union([
  Schema.TaggedStruct("titleMissing", {}),
  Schema.TaggedStruct("titleTooLong", { maximum: Schema.Int }),
  Schema.TaggedStruct("bodyMissing", {}),
  Schema.TaggedStruct("bodyInvalid", {}),
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
]).annotate({ identifier: "ArticleViolation" });

export type ArticleViolation = typeof ArticleViolationSchema.Type;
