import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

// The server runs but cannot reach its database, so it should not take traffic
// yet.
export class DatabaseUnavailable extends Schema.TaggedError<DatabaseUnavailable>()(
  "DatabaseUnavailable",
  { ...errorEnvelope },
  {
    description: "The server cannot reach its database.",
    httpApiStatus: 503,
  }
) {}
