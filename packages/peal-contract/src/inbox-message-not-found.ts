import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace sent no such message from Peal, or it went with its conversation. */
export class InboxMessageNotFound extends Schema.TaggedError<InboxMessageNotFound>()(
  "InboxMessageNotFound",
  { ...errorEnvelope },
  {
    description:
      "The workspace sent no such message from Peal, or it went with its conversation.",
    httpApiStatus: 404,
  }
) {}
