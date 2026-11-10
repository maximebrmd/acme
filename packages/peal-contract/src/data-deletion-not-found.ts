import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** No data deletion request has this confirmation code. */
export class DataDeletionNotFound extends Schema.TaggedError<DataDeletionNotFound>()(
  "DataDeletionNotFound",
  { ...errorEnvelope },
  {
    description: "No data deletion request has this confirmation code.",
    httpApiStatus: 404,
  }
) {}
