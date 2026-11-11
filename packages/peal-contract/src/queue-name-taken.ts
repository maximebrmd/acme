import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace already has a queue of this name. */
export class QueueNameTaken extends Schema.TaggedError<QueueNameTaken>()(
  "QueueNameTaken",
  { ...errorEnvelope },
  {
    description:
      "The workspace already has a queue of this name, whatever its case. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
