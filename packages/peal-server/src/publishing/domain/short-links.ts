import type { Platform } from "#shared/domain/platform.ts";

import { xLinksIn } from "./x-links.ts";

/** What a server's short addresses look like: its base, then a code. */
export interface ShortAddresses {
  /** The base, ending in `/`, as `https://go.example.com/`. */
  readonly base: string;
  /** How many characters a code has. */
  readonly codeLength: number;
}

/** How long a short address is, in UTF-16 code units. */
export const shortLengthOf = (addresses: ShortAddresses): number =>
  addresses.base.length + addresses.codeLength;

/**
 * Whether a platform takes its links as written, never shortened:
 * Pinterest alone. Its help page "Blocked links and websites"
 * (https://help.pinterest.com/en/articles/blocked-links-and-websites,
 * read 2026-11-12) says "we don't allow certain redirects or URL
 * shorteners".
 */
export const keepsLinksAsWritten = (platform: Platform): boolean =>
  platform === "pinterest";

/** The longest address shortened, as the shortlinks context keeps it. */
const maxDestinationLength = 2048;

// What the shortlinks context takes as a destination (its own
// `domain/destination.ts`, kept equal): an absolute http or https address
// of 2,048 characters at most, naming no user or password, on another
// host than the short links' own.
const isShortenable = (address: string, addresses: ShortAddresses) => {
  const parsed = URL.parse(address);
  const base = URL.parse(addresses.base);

  // Written as its redirect writes it (`URL.href`: ASCII, as a header
  // takes it), of 2,048 characters at most.
  return (
    parsed !== null &&
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.host !== base?.host &&
    parsed.href.length <= maxDestinationLength &&
    /^[\u0021-\u007E]+$/u.test(parsed.href)
  );
};

/** Where a link stands in a text, in UTF-16 offsets. */
export interface LinkPlace {
  readonly end: number;
  readonly start: number;
}

/** A distinct address to shorten, and every place the text holds it. */
export interface LinkToShorten {
  readonly address: string;
  readonly places: readonly LinkPlace[];
}

const hasScheme = (address: string) => /^https?:\/\//iu.test(address);

/**
 * The links of `text` that go out shortened on `platform`: those written
 * with `http://` or `https://`, that may be shortened, and that are longer
 * than a short address, on a platform that does not keep links as
 * written. One entry per distinct address, in the order they first
 * appear. A link is never replaced by something longer, so the text sent
 * is never longer than the text written.
 */
export const linksToShorten = (
  text: string,
  platform: Platform,
  addresses: ShortAddresses
): readonly LinkToShorten[] => {
  if (keepsLinksAsWritten(platform)) {
    return [];
  }

  const shortLength = shortLengthOf(addresses);
  const found = new Map<string, LinkPlace[]>();

  for (const { end, start } of xLinksIn(text)) {
    const address = text.slice(start, end);

    if (
      hasScheme(address) &&
      address.length > shortLength &&
      isShortenable(address, addresses)
    ) {
      found.set(address, [...(found.get(address) ?? []), { end, start }]);
    }
  }

  return Array.from(found, ([address, places]) => ({ address, places }));
};

/** A link to shorten, with the short address it goes out as. */
export interface ShortenedLink extends LinkToShorten {
  readonly shortUrl: string;
}

/**
 * The text with each link's places holding its short address instead,
 * replaced from the end backwards, so earlier offsets stay true. A short
 * address longer than the link is left out: the link stays as written.
 */
export const withShortLinks = (
  text: string,
  shortened: readonly ShortenedLink[]
): string => {
  const places = shortened
    .filter(({ address, shortUrl }) => shortUrl.length <= address.length)
    .flatMap(({ places: held, shortUrl }) =>
      held.map((place) => ({ ...place, shortUrl }))
    )
    .toSorted((one, other) => other.start - one.start);

  let sent = text;

  for (const { end, shortUrl, start } of places) {
    sent = `${sent.slice(0, start)}${shortUrl}${sent.slice(end)}`;
  }

  return sent;
};
