// X answers with a post's text as it shows it: links replaced with its own
// short ones, a link to the media added at the end, and `&`, `<` and `>`
// written as HTML entities. Two texts are the same post's when they match
// once links are left out, entities read back, and spaces collapsed.

const links = /https?:\/\/\S+/gu;

const entities: ReadonlyMap<string, string> = new Map([
  ["&amp;", "&"],
  ["&gt;", ">"],
  ["&lt;", "<"],
]);

const entityPattern = /&(?:amp|gt|lt);/gu;

const spaces = /\s+/gu;

/** A post's text, as compared with what X shows of it. */
export const comparableText = (text: string): string =>
  text
    .replaceAll(entityPattern, (entity) => entities.get(entity) ?? entity)
    .replaceAll(links, " ")
    .normalize("NFC")
    .replaceAll(spaces, " ")
    .trim();

/** Whether X's text is the one Acme sent. */
export const isSameText = (sent: string, shown: string): boolean =>
  comparableText(sent) === comparableText(shown);
