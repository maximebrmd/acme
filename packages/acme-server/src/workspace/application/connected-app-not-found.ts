import { Schema } from "effect";

/** No client with this id acts for the user. */
export class ConnectedAppNotFound extends Schema.TaggedError<ConnectedAppNotFound>()(
  "ConnectedAppNotFound",
  { clientId: Schema.String }
) {}
