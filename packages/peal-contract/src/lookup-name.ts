import { Schema } from "effect";

/**
 * The lookups Peal has: YouTube's video categories for a region
 * (`youtubeVideoCategories`, whose ids `categoryId` takes), a YouTube
 * channel's playlists (`youtubePlaylists`), a TikTok channel's creator
 * (`tiktokCreator`, whose audiences `privacyLevel` takes), a Pinterest
 * account's boards (`pinterestBoards`, whose ids `boardId` takes) and a
 * board's sections (`pinterestBoardSections`, for `boardSectionId`). The
 * server's list (src/publishing/domain/lookup.ts) is the source; a test keeps the
 * two equal.
 */
export const LookupNameSchema = Schema.Literals([
  "youtubeVideoCategories",
  "youtubePlaylists",
  "tiktokCreator",
  "pinterestBoards",
  "pinterestBoardSections",
]).annotate({ identifier: "LookupName" });

export type LookupName = typeof LookupNameSchema.Type;
