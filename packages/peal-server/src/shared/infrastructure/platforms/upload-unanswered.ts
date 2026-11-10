import { Schema } from "effect";

/**
 * A streamed upload got no answer: the connection failed, the file could
 * not be read to its end, or the host took too long. Whatever arrived
 * shows nowhere, so the upload may be made again.
 */
export class UploadUnanswered extends Schema.TaggedError<UploadUnanswered>()(
  "UploadUnanswered",
  {}
) {}
