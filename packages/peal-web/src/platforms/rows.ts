import type { Platform, PlatformCapabilities, TextLimit } from "peal-contract";

/** One platform as the Console's Platforms page lists it. */
export interface PlatformRow {
  readonly platform: Platform;
  /** The workspace's channels on it, connected or not. */
  readonly channels: number;
  /** The platform's own limit on a post's text, the first one checked. */
  readonly textLimit: TextLimit | null;
  /** Images and videos a post takes. */
  readonly maxMedia: number;
  /** The parts a post may have after its first, or null for none. */
  readonly followUps: "comment" | "thread" | null;
  /** Whether this server reads each post's counts there. */
  readonly analytics: boolean;
  /** Whether Peal can delete a post from it once it is live. */
  readonly unpublish: boolean;
}

/**
 * The rows of the Platforms page, in the order the server lists the
 * platforms (Peal's), from what this server says a post may hold on each
 * and the workspace's channels.
 */
export const platformRowsOf = (
  capabilities: readonly PlatformCapabilities[],
  channels: readonly { readonly platform: Platform }[]
): readonly PlatformRow[] =>
  capabilities.map((each) => ({
    analytics: each.analytics.perPost,
    channels: channels.filter(({ platform }) => platform === each.platform)
      .length,
    followUps: each.followUps?.kind ?? null,
    maxMedia: each.media.maxCount,
    platform: each.platform,
    textLimit: each.text.limits[0] ?? null,
    unpublish: each.livePost.unpublish,
  }));

/**
 * Whether a row matches what is typed in the search: its name, its id, or
 * a capability's name, whatever the case.
 */
export const rowMatches = (
  row: PlatformRow,
  query: string,
  words: { readonly name: string; readonly capabilities: readonly string[] }
): boolean => {
  const needle = query.trim().toLocaleLowerCase();

  return (
    needle === "" ||
    [row.platform, words.name, ...words.capabilities].some((word) =>
      word.toLocaleLowerCase().includes(needle)
    )
  );
};
