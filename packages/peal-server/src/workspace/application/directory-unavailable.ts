import { Schema } from "effect";

/** The members could not be read, as when the database is down. */
export class DirectoryUnavailable extends Schema.TaggedError<DirectoryUnavailable>()(
  "DirectoryUnavailable",
  { cause: Schema.Defect() }
) {}
