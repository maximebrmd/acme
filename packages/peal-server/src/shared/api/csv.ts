import { Schema } from "effect";

// CSV as every export of the API writes it: the analytics export and the
// report across workspaces.

/** A cell: text, a number, or nothing where a platform gives none. */
export type Cell = number | string | null;

const isNumber = Schema.is(Schema.Number);

const needsQuotes = /[",\r\n]/u;

// A spreadsheet takes a cell that starts with one of these for a formula.
const startsFormula = /^[=+\-@\t\r]/u;

const cellText = (cell: Cell): string => {
  if (cell === null) {
    return "";
  }

  if (isNumber(cell)) {
    return String(cell);
  }

  const safe = startsFormula.test(cell) ? `'${cell}` : cell;

  return needsQuotes.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/**
 * A line of CSV as RFC 4180 writes it: cells between commas, one with a
 * comma, a quote or a line break in quotes with its quotes doubled, and
 * CRLF at the end. Text that would start a formula in a spreadsheet gets
 * an apostrophe first, so a file opened there runs nothing.
 */
export const csvLine = (cells: readonly Cell[]): string =>
  `${cells.map(cellText).join(",")}\r\n`;
