// What in a post's text looks like a link but would not work as one: a
// scheme with a typo, a link without a host, a host that cannot be one.
// The check is conservative: it names only what no platform would turn
// into a working link, and never a mention, an email address, a hashtag
// or a link written correctly.

const schemes = ["http", "https"];

// Brackets and quotes a link is often written in, and the punctuation that
// ends a sentence after one: neither is part of it.
const opening = /^[("'<[{«“‘]+/u;

const closing = /[)"'>\]}»”’.,;:!?…]+$/u;

// Letters, then what stands where "://" would: the start of something
// written as a link.
const written =
  /^(?<scheme>[a-z]+)(?<separator>:\/*|;\/+|\/{2,})(?<rest>.*)$/iu;

// How many single edits (a letter added, dropped or replaced, or two
// swapped) turn one word into the other, counted up to two.
const distance = (from: string, to: string): number => {
  const rows = from.length + 1;
  const columns = to.length + 1;

  const table = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (__, column) => {
      if (row === 0) {
        return column;
      }

      return column === 0 ? row : 0;
    })
  );

  const at = (row: number, column: number) => table[row]?.[column] ?? 0;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const same = from[row - 1] === to[column - 1];

      const swapped =
        row > 1 &&
        column > 1 &&
        from[row - 1] === to[column - 2] &&
        from[row - 2] === to[column - 1];

      const edited = Math.min(
        at(row - 1, column) + 1,
        at(row, column - 1) + 1,
        at(row - 1, column - 1) + (same ? 0 : 1)
      );

      const cells = table[row];

      if (cells !== undefined) {
        cells[column] = swapped
          ? Math.min(edited, at(row - 2, column - 2) + 1)
          : edited;
      }
    }
  }

  return at(rows - 1, columns - 1);
};

// A scheme one edit away from http or https, such as "htp" or "htps".
const isMistyped = (scheme: string) =>
  !schemes.includes(scheme) &&
  schemes.some((known) => distance(scheme, known) === 1);

// Underscores are not allowed in host names, yet some resolve: they pass.
const label = /^[\p{L}\p{N}_](?:[\p{L}\p{N}_-]*[\p{L}\p{N}_])?$/u;

// Whether a link's host can be one: names with a dot between them, an
// IPv4 or bracketed IPv6 address, or this machine's own name.
const isHost = (host: string): boolean => {
  if (host.startsWith("[")) {
    return host.endsWith("]");
  }

  if (host.toLowerCase() === "localhost") {
    return true;
  }

  const labels = host.split(".");

  return labels.length > 1 && labels.every((part) => label.test(part));
};

// The host of what follows "://": up to the path, without the sign-in
// before an @ or the port.
const hostOf = (rest: string): string => {
  const [authority = ""] = rest.split(/[/?#]/u);
  const withoutUser = authority.slice(authority.lastIndexOf("@") + 1);

  return withoutUser.startsWith("[")
    ? withoutUser.replace(/\]:\d*$/u, "]")
    : withoutUser.replace(/:\d*$/u, "");
};

const isSuspicious = (piece: string): boolean => {
  const groups = written.exec(piece)?.groups;

  if (groups === undefined) {
    return false;
  }

  const scheme = (groups["scheme"] ?? "").toLowerCase();
  const separator = groups["separator"] ?? "";
  const rest = groups["rest"] ?? "";

  if (!schemes.includes(scheme)) {
    // "htp://example.com": a typo only when written as a link.
    return isMistyped(scheme) && separator.includes("/");
  }

  if (separator === "://") {
    // "http://", "http://example", "http://exa mple.com".
    return !isHost(hostOf(rest));
  }

  // "https//example.com", "http:/example.com", "http;//example.com",
  // "http:///example.com", "https:example.com". A bare "http:" in a
  // sentence is no link at all.
  return separator.includes("/") || rest.includes(".");
};

/**
 * The pieces of the text that look like a link and would not work as one,
 * each once, in the order written.
 */
export const suspiciousLinks = (text: string): readonly string[] => {
  const pieces = text
    .split(/\s+/u)
    .map((piece) => piece.replace(opening, "").replace(closing, ""))
    .filter(isSuspicious);

  return [...new Set(pieces)];
};
