import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The channel cannot do this: its platform does not offer it to the account (`unsupported`), or the account must be connected again to allow it (`reconnect`). Nothing was asked of the platform. */
export class InboxActionUnavailable extends Schema.TaggedError<InboxActionUnavailable>()(
  "InboxActionUnavailable",
  {
    ...errorEnvelope,
    // read, reply, withdraw, like, hide or delete.
    ability: Schema.String,
    standing: Schema.Literals(["reconnect", "unsupported"]),
  },
  {
    description:
      "The channel cannot do this: its platform does not offer it to the account (`unsupported`), or the account must be connected again to allow it (`reconnect`). Nothing was asked of the platform.",
    httpApiStatus: 409,
  }
) {}
