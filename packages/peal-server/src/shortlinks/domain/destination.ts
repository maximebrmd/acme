/** The longest address a short link leads to, in UTF-16 code units. */
export const maxDestinationLength = 2048;

/**
 * Whether `address` may be shortened under `base`: an absolute `http` or
 * `https` address of `maxDestinationLength` at most, naming no user or
 * password, on another host than the short links' own (a short link to a
 * short link would loop). Anything else is left as written, never refused.
 */
export const isShortenable = (address: string, base: URL): boolean => {
  if (address.length > maxDestinationLength) {
    return false;
  }

  const parsed = URL.parse(address);

  return (
    parsed !== null &&
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.host !== base.host
  );
};
