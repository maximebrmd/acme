import { Schema } from "effect";

/** The user gave no access to an application with this client id. */
export class ConnectedAppNotFound extends Schema.TaggedError<ConnectedAppNotFound>()(
  "ConnectedAppNotFound",
  {},
  {
    description:
      "No application with this client id has access to the account.",
    httpApiStatus: 404,
  }
) {}
