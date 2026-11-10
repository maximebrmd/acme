import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why a CSV file cannot be read as posts at all: it is `empty`; a quoted
 * cell never ends (`unterminatedQuote`); its first line names a column
 * Peal does not know (`unknownColumn`), or the same one twice
 * (`repeatedColumn`), or lacks one it needs (`missingColumn`); or it has
 * more rows than one import takes (`tooManyRows`).
 */
export const ImportProblemSchema = Schema.Literals([
  "empty",
  "unterminatedQuote",
  "unknownColumn",
  "repeatedColumn",
  "missingColumn",
  "tooManyRows",
]).annotate({ identifier: "ImportProblem" });

export type ImportProblem = typeof ImportProblemSchema.Type;

/** The CSV file cannot be read as posts. */
export class ImportUnreadable extends Schema.TaggedError<ImportUnreadable>()(
  "ImportUnreadable",
  {
    ...errorEnvelope,
    // The column the problem is about, as the file names it; null when it
    // is about no column.
    column: Schema.NullOr(Schema.String),
    problem: ImportProblemSchema,
  },
  {
    description:
      "The CSV file cannot be read as posts, and nothing was made: `problem` says why, and `column` which column when it is about one.",
    httpApiStatus: 422,
  }
) {}
