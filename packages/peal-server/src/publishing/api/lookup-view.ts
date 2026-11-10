import { Option } from "effect";
import type { LookupResult as LookupResultView } from "peal-contract";

import type { LookupResult } from "#publishing/domain/lookup.ts";

import { tiktokAccountView } from "./tiktok-account-view.ts";

/**
 * A page of a lookup's answer as the contract shows it, to the API and the
 * MCP tools alike: absent values null.
 */
export const lookupResultView = (result: LookupResult): LookupResultView => {
  const nextCursor = Option.getOrNull(result.nextCursor);

  if (result._tag === "youtubeVideoCategories") {
    return { _tag: result._tag, items: result.items, nextCursor };
  }

  if (result._tag === "youtubePlaylists") {
    return {
      _tag: result._tag,
      items: result.items.map(({ id, privacy, title }) => ({
        id,
        privacy: Option.getOrNull(privacy),
        title,
      })),
      nextCursor,
    };
  }

  if (result._tag === "pinterestBoards") {
    return {
      _tag: result._tag,
      items: result.items.map(({ id, name, privacy }) => ({
        id,
        name,
        privacy: Option.getOrNull(privacy),
      })),
      nextCursor,
    };
  }

  if (result._tag === "pinterestBoardSections") {
    return { _tag: result._tag, items: result.items, nextCursor };
  }

  return {
    _tag: result._tag,
    items: result.items.map(tiktokAccountView),
    nextCursor,
  };
};
