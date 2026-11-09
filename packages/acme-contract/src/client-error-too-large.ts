import { Schema } from "effect";

/** An error report longer than the server reads. */
export class ClientErrorTooLarge extends Schema.TaggedError<ClientErrorTooLarge>()(
  "ClientErrorTooLarge",
  {},
  {
    description: "The report is longer than 16 KiB.",
    httpApiStatus: 413,
  }
) {}
