import { clientErrorLimits } from "acme-contract";
import type { ClientErrorKind, ClientErrorReport } from "acme-contract";
import { Option, Schema } from "effect";

// What could name someone in an error's text, which the server replaces
// too: an email address, an id, an API key, a token (a JWT, such as an
// email confirmation's), and the query or fragment of a link, which can
// carry tokens (a password reset link's).
const emails = /[^\s@"'<>()[\]/]+@[^\s@"'<>()[\]/]+\.[a-z]{2,}/giu;

// Addresses and links are looked for word by word, in the words that may
// hold one, so a long text without any costs one pass.
const words = /\S+/gu;

const uuids =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/giu;

const apiKeys = /\bacme_[\w-]+/gu;

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

// A path segment that is an id: a UUID, or a long run of digits or of
// letters and digits, such as a token in a link.
const idSegment =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{6,}|[\w-]{24,})$/iu;

/** At most `limit` characters, the end cut off. */
export const cut = (text: string, limit: number): string =>
  text.length <= limit ? text : text.slice(0, limit);

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

// Text cut, then redacted, then cut again, as a replacement can be longer
// than what it replaced.
const redactedCut = (text: string, limit: number): string =>
  cut(redactText(cut(text, limit)), limit);

/**
 * A page's path, without its query or fragment, which can carry tokens, and
 * with its ids replaced by `:id`.
 */
export const pathOf = (url: string): string => {
  const [path = ""] = url.split(/[?#]/u);

  const redacted = path
    .split("/")
    .map((segment) => (idSegment.test(segment) ? ":id" : segment))
    .join("/");

  return cut(
    redacted.startsWith("/") ? redacted : `/${redacted}`,
    clientErrorLimits.path
  );
};

const decodeMessage = Schema.decodeUnknownOption(
  Schema.Struct({ message: Schema.String })
);

const decodeName = Schema.decodeUnknownOption(
  Schema.Struct({ name: Schema.String })
);

const decodeText = Schema.decodeUnknownOption(Schema.String);

const decodeStack = Schema.decodeUnknownOption(
  Schema.Struct({ stack: Schema.String })
);

const decodeDigest = Schema.decodeUnknownOption(
  Schema.Struct({ digest: Schema.String })
);

/** What a thrown value says about itself: an error's message, or text. */
export const messageOf = (cause: unknown): string =>
  decodeMessage(cause).pipe(
    Option.map(({ message }) => message),
    Option.filter((message) => message.trim() !== ""),
    Option.orElse(() => decodeName(cause).pipe(Option.map(({ name }) => name))),
    Option.orElse(() => decodeText(cause)),
    Option.getOrElse(() => "A value that is not an error was thrown")
  );

/** Where an error came from, if it says. */
export const stackOf = (cause: unknown): string | null =>
  decodeStack(cause).pipe(
    Option.map(({ stack }) => redactedCut(stack, clientErrorLimits.stack)),
    Option.getOrNull
  );

/** Next's digest of an error it rendered on the server, if any. */
export const digestOf = (cause: unknown): string | null =>
  decodeDigest(cause).pipe(
    Option.map(({ digest }) => cut(digest, clientErrorLimits.digest)),
    Option.getOrNull
  );

/** Where the error happened, and in which build. */
export interface ErrorPlace {
  readonly kind: ClientErrorKind;
  /** The page's address, or its path. */
  readonly page: string;
  readonly release: string;
  readonly route: string | null;
  readonly userAgent: string | null;
}

/**
 * The report of an error, as POST /api/client-errors takes it: nothing that
 * names who met it, each field cut to what the server reads.
 */
export const reportOf = (
  cause: unknown,
  place: ErrorPlace
): ClientErrorReport => ({
  digest: digestOf(cause),
  kind: place.kind,
  message: redactedCut(messageOf(cause), clientErrorLimits.message),
  path: pathOf(place.page),
  release: cut(place.release, clientErrorLimits.release),
  route:
    place.route === null ? null : cut(place.route, clientErrorLimits.route),
  stack: stackOf(cause),
  userAgent:
    place.userAgent === null
      ? null
      : cut(place.userAgent, clientErrorLimits.userAgent),
});
