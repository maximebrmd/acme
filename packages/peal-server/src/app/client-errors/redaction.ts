import type { ClientErrorReport } from "peal-contract";

// What could name someone in an error's text: an email address, an id
// (users', workspaces' and posts' are UUIDs), an API key, a token (a JWT,
// such as an email confirmation's), and the query or fragment of an address,
// which can carry tokens (a password reset link's).
const emails = /[^\s@"'<>()[\]/]+@[^\s@"'<>()[\]/]+\.[a-z]{2,}/giu;

// Addresses and links are looked for word by word, in the words that may
// hold one, so a long text without any costs one pass.
const words = /\S+/gu;

const uuids =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/giu;

const apiKeys = /\bpeal_[\w-]+/gu;

const jwts = /\beyJ[\w-]*\.[\w-]+\.[\w-]*/gu;

// A word that is, or holds, a link: an absolute address, or a path.
const isLink = (word: string): boolean =>
  word.includes("://") || /^[("'`[]?\//u.test(word);

// What follows a link's query in a stack frame or a sentence, and stays: a
// line and column, closing brackets and quotes, punctuation.
const linkTail = /(?::\d+){1,2}[)\]"'`]*$|[)\]"'`.,;:!]+$/u;

const withoutQuery = (word: string): string => {
  const start = word.search(/[?#]/u);

  if (start === -1) {
    return word;
  }

  const rest = word.slice(start + 1);
  const tail = linkTail.exec(rest)?.[0] ?? "";

  return rest.length === tail.length
    ? word
    : `${word.slice(0, start + 1)}[redacted]${tail}`;
};

// Control characters, which a terminal or a plain-text log would act on (a
// line break forging a log line, an escape sequence), and the marks that
// reorder text on screen. Messages and stacks keep their line breaks and
// tabs, which their structured attributes hold safely.
const controls = /[^\P{Cc}\t\n]|\p{Bidi_Control}/gu;

const lineControls = /\p{Cc}/gu;

/** Text with the addresses, ids, keys, tokens and queries it quotes replaced. */
export const redactText = (text: string): string =>
  text
    .replaceAll(words, (word) => {
      const unlinked = isLink(word) ? withoutQuery(word) : word;

      return unlinked.includes("@")
        ? unlinked.replaceAll(emails, "[email]")
        : unlinked;
    })
    .replaceAll(jwts, "[token]")
    .replaceAll(uuids, "[id]")
    .replaceAll(apiKeys, "[key]");

// A path segment that is an id: a UUID, or a long run of digits or of
// letters and digits, such as a token in a link.
const idSegment =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{6,}|[\w-]{24,})$/iu;

/** A page's path with its ids replaced by `:id`. */
export const redactPath = (path: string): string =>
  path
    .split("/")
    .map((segment) => (idSegment.test(segment) ? ":id" : segment))
    .join("/");

// Text of several lines, as a log attribute keeps it.
const lines = (text: string): string =>
  redactText(text.replaceAll(controls, ""));

// Text of one line.
const line = (text: string): string => lines(text.replaceAll(lineControls, ""));

const lineOrNull = (text: string | null): string | null =>
  text === null ? null : line(text);

/**
 * The report as it is logged: whatever a client sent, the server keeps no
 * address, id, key or token it quotes, should a client have missed one, and
 * no character that would forge or hide a log line.
 */
export const redacted = (report: ClientErrorReport): ClientErrorReport => ({
  digest: lineOrNull(report.digest),
  kind: report.kind,
  message: lines(report.message),
  path: line(redactPath(report.path)),
  release: line(report.release),
  route: lineOrNull(report.route),
  stack: report.stack === null ? null : lines(report.stack),
  userAgent: lineOrNull(report.userAgent),
});
