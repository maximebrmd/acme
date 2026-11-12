/**
 * The code staff look a short link up by: what they typed, or the last
 * part of the short address they pasted, without its query.
 */
export const shortLinkCodeOf = (typed: string): string => {
  const trimmed = typed.trim();
  const address = URL.parse(trimmed);
  const path = address === null ? trimmed : address.pathname;

  return path.split("/").findLast((part) => part !== "") ?? "";
};
