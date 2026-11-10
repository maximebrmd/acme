import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The user gave no access to an application with this client id. */
export class ConnectedAppNotFound extends Schema.TaggedError<ConnectedAppNotFound>()(
  "ConnectedAppNotFound",
  { ...errorEnvelope },
  {
    description:
      "No application with this client id has access to the account.",
    httpApiStatus: 404,
  }
) {}
