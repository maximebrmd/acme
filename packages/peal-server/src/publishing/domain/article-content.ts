import { Schema } from "effect";

import { MediaAssetIdSchema } from "#shared/domain/ids.ts";

import { ArticleBodySchema } from "./article-body.ts";

/**
 * What the site makes of the article when Peal sends it: a post `publish`ed
 * at once, a `draft` for someone to finish on the site, or a post `future`
 * that the site itself publishes at the article's time, sent by Peal as
 * soon as it is scheduled.
 */
export const SiteStatusSchema = Schema.Literals(["publish", "draft", "future"]);

export type SiteStatus = typeof SiteStatusSchema.Type;

/** What an article says, and how it lands on the site. */
export class ArticleContent extends Schema.Class<ArticleContent>(
  "peal-server/publishing/domain/ArticleContent"
)({
  body: ArticleBodySchema,
  // Names, as the site shows them: found there, or made.
  categories: Schema.Array(Schema.String),
  // A file of the library, the site's featured image.
  coverMediaId: Schema.Option(MediaAssetIdSchema),
  excerpt: Schema.Option(Schema.String),
  siteStatus: SiteStatusSchema,
  tags: Schema.Array(Schema.String),
  title: Schema.String,
}) {}
