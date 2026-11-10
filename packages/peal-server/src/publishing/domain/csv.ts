import { Result } from "effect";

const quote = '"';

const byteOrderMark = String.fromCodePoint(0xfe_ff);

// A line with nothing on it is no row: files end with a line break, and
// some have blank lines between rows.
const isBlank = (row: readonly string[]): boolean =>
  row.length === 1 && row[0] === "";

/** Why a file is not CSV as RFC 4180 writes it. */
export type CsvFault = "strayQuote" | "unterminatedQuote";

/**
 * The rows of a CSV file as RFC 4180 writes them: cells separated by
 * commas, rows by line breaks (CRLF, LF or CR); a cell between double
 * quotes may hold commas, line breaks, and quotes written twice. A leading
 * byte order mark and blank lines are left out. Fails when a quoted cell
 * never ends, and when a quote stands where the RFC has none: inside a
 * cell that did not start with one, or after a quoted cell closed. Such a
 * file is not guessed at: where its cells end is no longer known.
 */
export const parseCsv = (
  file: string
): Result.Result<readonly (readonly string[])[], CsvFault> => {
  const text = file.startsWith(byteOrderMark) ? file.slice(1) : file;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  // The cell was written between quotes, which have closed: only its end
  // may follow.
  let closed = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
    closed = false;
  };

  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  for (let at = 0; at < text.length; at += 1) {
    const character = text.charAt(at);
    const next = text.charAt(at + 1);

    if (quoted) {
      if (character === quote && next === quote) {
        cell += quote;
        at += 1;
      } else if (character === quote) {
        quoted = false;
        closed = true;
      } else {
        cell += character;
      }
    } else if (character === quote) {
      if (closed || cell !== "") {
        return Result.fail("strayQuote");
      }

      quoted = true;
    } else if (character === ",") {
      endCell();
    } else if (character === "\r" || character === "\n") {
      endRow();

      if (character === "\r" && next === "\n") {
        at += 1;
      }
    } else if (closed) {
      return Result.fail("strayQuote");
    } else {
      cell += character;
    }
  }

  if (quoted) {
    return Result.fail("unterminatedQuote");
  }

  endRow();

  return Result.succeed(rows.filter((read) => !isBlank(read)));
};
