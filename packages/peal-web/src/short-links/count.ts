import type { Platform } from "peal-contract";
import { keepsLinksAsWritten, linksToShorten } from "peal-contract/post-text";
import type { ShortAddresses } from "peal-contract/post-text";

/** What the composer says under a post that asks for short links. */
export interface ShortenedCount {
  /** The distinct links that go out shortened on some channel. */
  readonly links: number;
  /** Whether a Pinterest channel is chosen, which keeps links as written. */
  readonly pinterest: boolean;
}

// A platform that shortens, for a post with no channel chosen yet.
const anyShortening: Platform = "mastodon";

/**
 * How many distinct links of the post's texts go out shortened, as the
 * server decides it (`linksToShorten`, the contract's copy of its rule),
 * on the platforms chosen.
 */
export const shortenedCount = (
  texts: readonly string[],
  platforms: readonly Platform[],
  addresses: ShortAddresses
): ShortenedCount => {
  const shortening = platforms.filter(
    (platform) => !keepsLinksAsWritten(platform)
  );

  const on = platforms.length === 0 ? [anyShortening] : shortening;

  const links = new Set(
    on.flatMap((platform) =>
      texts.flatMap((text) =>
        linksToShorten(text, platform, addresses).map(({ address }) => address)
      )
    )
  );

  return { links: links.size, pinterest: platforms.some(keepsLinksAsWritten) };
};
