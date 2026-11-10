import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The assistant cannot work on this text: it is blank, or too long. */
export class AssistantInputRejected extends Schema.TaggedError<AssistantInputRejected>()(
  "AssistantInputRejected",
  {
    ...errorEnvelope,
    // The longest text the assistant takes, in UTF-16 code units.
    maxLength: Schema.Int,
    reason: Schema.Literals(["empty", "tooLong"]),
  },
  {
    description:
      "The text is blank, or longer than the assistant takes (`maxLength`).",
    httpApiStatus: 422,
  }
) {}
