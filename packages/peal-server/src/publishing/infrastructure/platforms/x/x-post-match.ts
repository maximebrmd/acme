// X answers with a post's text as it shows it: links replaced with its own
// short ones, a link to the media at the end, and `&`, `<` and `>` written
// as HTML entities. Two texts are the same post's when they match once
// links are left out, X's entities read back, and spaces collapsed, and
// when they link to the same addresses, in order. Only X's text has
// entities: one typed in the text sent stays as typed, since X writes its
// ampersand as an entity in turn. Links are found as X finds them
// (`#publishing/domain/x-links.ts`), with or without a scheme.

import { xLinksIn } from "#publishing/domain/x-links.ts";

const scheme = /^https?:\/\//iu;

const trailingSlashes = /\/+$/u;

const entities: ReadonlyMap<string, string> = new Map([
  ["&amp;", "&"],
  ["&gt;", ">"],
  ["&lt;", "<"],
]);

const entityPattern = /&(?:amp|gt|lt);/gu;

const spaces = /\s+/gu;

/** A post's text, as compared with what X shows of it. */
export const comparableText = (text: string): string => {
  const normalized = text.normalize("NFC");
  let kept = "";
  let from = 0;

  for (const link of xLinksIn(normalized)) {
    kept += `${normalized.slice(from, link.start)} `;
    from = link.end;
  }

  return (kept + normalized.slice(from)).replaceAll(spaces, " ").trim();
};

/** X's text with its entities read back, as it was sent. */
export const unescapedText = (shown: string): string =>
  shown.replaceAll(entityPattern, (entity) => entities.get(entity) ?? entity);

/** Whether X's text is the one Peal sent. */
export const isSameText = (sent: string, shown: string): boolean =>
  comparableText(sent) === comparableText(unescapedText(shown));

// An address as two links to it compare: without its scheme, its host in
// lower case, and no slash at the end of its path.
const addressOf = (link: string): string => {
  const url = URL.parse(scheme.test(link) ? link : `http://${link}`);

  return url === null
    ? link.toLowerCase()
    : `${url.host}${url.pathname.replace(trailingSlashes, "")}${url.search}${url.hash}`;
};

/** The addresses a text sent links to, in order. */
export const addressesIn = (sent: string): readonly string[] =>
  xLinksIn(sent.normalize("NFC")).map(({ url }) => addressOf(url));

/**
 * Whether a post X lists is the one Peal sent: the same text, and links to
 * the same addresses, which X gives as it expanded its short links (the
 * media's left out).
 */
export const isSamePost = (
  sent: string,
  shown: { readonly linksTo: readonly string[]; readonly text: string }
): boolean => {
  const sentAddresses = addressesIn(sent);
  const shownAddresses = shown.linksTo.map(addressOf);

  return (
    isSameText(sent, shown.text) &&
    sentAddresses.length === shownAddresses.length &&
    sentAddresses.every((address, index) => address === shownAddresses[index])
  );
};
