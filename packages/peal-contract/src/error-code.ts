/**
 * An error's `code`: its tag in snake case (`PostNotFound` is
 * `post_not_found`, `OAuth` one word). A tag never changes once published, so neither does
 * its code.
 */
export const errorCodeOf = (tag: string): string =>
  tag
    .replaceAll("OAuth", "Oauth")
    .replaceAll(/(?<lower>[a-z\d])(?<upper>[A-Z])/gu, "$<lower>_$<upper>")
    .replaceAll(/(?<acronym>[A-Z]+)(?<word>[A-Z][a-z])/gu, "$<acronym>_$<word>")
    .toLowerCase();
