import { Schema } from "effect";

// The server runs but cannot reach its database, so it should not take traffic
// yet.
export class DatabaseUnavailable extends Schema.TaggedError<DatabaseUnavailable>()(
  "DatabaseUnavailable",
  {},
  {
    description: "The server cannot reach its database.",
    httpApiStatus: 503,
  }
) {}
