import type { ClientErrorReport } from "acme-contract";

// What could name someone in an error's text: an email address, an id
// (users', workspaces' and posts' are UUIDs), an API key.
const emails = /[^\s@"'<>()[\]]+@[^\s@"'<>()[\]]+\.[a-z]{2,}/giu;

const uuids =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/giu;

const apiKeys = /\bacme_[\w-]+/gu;

// A path segment that is an id: a UUID, or a long run of digits or of
// letters and digits, such as a token in a link.
const idSegment =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{6,}|[\w-]{24,})$/iu;

/** Text with the addresses, ids and keys it quotes replaced. */
export const redactText = (text: string): string =>
  text
    .replaceAll(emails, "[email]")
    .replaceAll(uuids, "[id]")
    .replaceAll(apiKeys, "[key]");

/** A page's path with its ids replaced by `:id`. */
export const redactPath = (path: string): string =>
  path
    .split("/")
    .map((segment) => (idSegment.test(segment) ? ":id" : segment))
    .join("/");

/**
 * The report as it is logged: whatever a client sent, the server keeps no
 * address, id or key it quotes, should a client have missed one.
 */
export const redacted = (report: ClientErrorReport): ClientErrorReport => ({
  ...report,
  message: redactText(report.message),
  path: redactPath(report.path),
  stack: report.stack === null ? null : redactText(report.stack),
});
