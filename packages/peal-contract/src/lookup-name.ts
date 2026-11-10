import { Schema } from "effect";

/**
 * The lookups Peal has: YouTube's video categories for a region
 * (`youtubeVideoCategories`, whose ids `categoryId` takes), a YouTube
 * channel's playlists (`youtubePlaylists`), and a TikTok channel's creator
 * (`tiktokCreator`, whose audiences `privacyLevel` takes), and the LinkedIn
 * page of a vanity name (`linkedinOrganizations`, which `mentions` take;
 * company page channels only). The server's
 * list (src/publishing/domain/lookup.ts) is the source; a test keeps the
 * two equal.
 */
export const LookupNameSchema = Schema.Literals([
  "youtubeVideoCategories",
  "youtubePlaylists",
  "tiktokCreator",
  "linkedinOrganizations",
]).annotate({ identifier: "LookupName" });

export type LookupName = typeof LookupNameSchema.Type;
