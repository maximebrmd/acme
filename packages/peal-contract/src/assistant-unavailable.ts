import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The server has no language model configured: the assistant is off. */
export class AssistantUnavailable extends Schema.TaggedError<AssistantUnavailable>()(
  "AssistantUnavailable",
  { ...errorEnvelope },
  {
    description:
      "The writing assistant is off on this server: no language model is configured.",
    httpApiStatus: 503,
  }
) {}
