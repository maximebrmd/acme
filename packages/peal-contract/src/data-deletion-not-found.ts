import { Schema } from "effect";

/** No data deletion request has this confirmation code. */
export class DataDeletionNotFound extends Schema.TaggedError<DataDeletionNotFound>()(
  "DataDeletionNotFound",
  {},
  {
    description: "No data deletion request has this confirmation code.",
    httpApiStatus: 404,
  }
) {}
