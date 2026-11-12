import { Option } from "effect";

/**
 * The longest address a short link leads to, as written in its redirect:
 * ASCII, so as many bytes, which the table's unique index holds.
 */
export const maxDestinationLength = 2048;

// What a header value may hold: visible ASCII, no space or control.
const headerSafe = /^[!-~]+$/u;

/**
 * The address a short link of `address` leads to under `base`, as its
 * redirect writes it (`URL.href`: the host in punycode, the path and query
 * percent-encoded, so every letter fits a header): an absolute `http` or
 * `https` address, naming no user or password, on another host than the
 * short links' own (a short link to a short link would loop), of
 * `maxDestinationLength` at most once written so. Anything else is left
 * as written, never refused: none.
 */
export const destinationOf = (
  address: string,
  base: URL
): Option.Option<string> => {
  const parsed = URL.parse(address);

  return parsed !== null &&
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.host !== base.host &&
    parsed.href.length <= maxDestinationLength &&
    headerSafe.test(parsed.href)
    ? Option.some(parsed.href)
    : Option.none();
};

/** Whether `address` may be shortened under `base` (`destinationOf`). */
export const isShortenable = (address: string, base: URL): boolean =>
  Option.isSome(destinationOf(address, base));

/**
 * A stored destination as a redirect's `Location` carries it, written
 * again as an address; none when no header could carry it.
 */
export const locationOf = (destination: string): Option.Option<string> => {
  const href = URL.parse(destination)?.href;

  return href !== undefined && headerSafe.test(href)
    ? Option.some(href)
    : Option.none();
};
