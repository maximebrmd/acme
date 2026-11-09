import { Schema } from "effect";

/**
 * The database did not answer, or refused a statement it should have
 * accepted. Repositories report it so callers can retry, and log the cause:
 * statements carry no parameters, so no content reaches it.
 */
export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  "DatabaseError",
  { cause: Schema.Defect() }
) {}
