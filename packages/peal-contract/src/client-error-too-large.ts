import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** An error report longer than the server reads. */
export class ClientErrorTooLarge extends Schema.TaggedError<ClientErrorTooLarge>()(
  "ClientErrorTooLarge",
  { ...errorEnvelope },
  {
    description: "The report is longer than 16 KiB.",
    httpApiStatus: 413,
  }
) {}
