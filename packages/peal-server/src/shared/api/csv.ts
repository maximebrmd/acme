import { Schema } from "effect";

// CSV as every export of the API writes it: the analytics export and the
// report across workspaces.

/** A cell: text, a number, or nothing where a platform gives none. */
export type Cell = number | string | null;

const isNumber = Schema.is(Schema.Number);

// What a spreadsheet takes for the start of a formula, as OWASP lists it:
// the signs, their full-width forms, and the controls before them.
const formulaStart = "[=+\\-@\\t\\r\\n\\uFF1D\\uFF0B\\uFF0D\\uFF20]";

// At the start of the cell, or after a semicolon, which a spreadsheet in a
// locale that separates cells with one (the French) splits at.
const startsFormula = new RegExp(`^${formulaStart}|;\\s*${formulaStart}`, "u");

const cellText = (cell: Cell): string => {
  if (cell === null) {
    return "";
  }

  if (isNumber(cell)) {
    return String(cell);
  }

  const safe = startsFormula.test(cell) ? `'${cell}` : cell;

  // Every text in quotes, so no separator inside it starts another cell.
  return `"${safe.replaceAll('"', '""')}"`;
};

/**
 * A line of CSV as RFC 4180 writes it: cells between commas, every text in
 * quotes with its quotes doubled, numbers as they are, nothing for null,
 * and CRLF at the end. Text a spreadsheet would take for a formula, at its
 * start or after a semicolon, gets an apostrophe first (OWASP's advice for
 * CSV injection), so a file opened there runs nothing.
 */
export const csvLine = (cells: readonly Cell[]): string =>
  `${cells.map(cellText).join(",")}\r\n`;
