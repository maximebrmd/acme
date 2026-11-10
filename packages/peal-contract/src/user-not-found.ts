import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** No account has this id. */
export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  { ...errorEnvelope },
  { description: "No account has this id.", httpApiStatus: 404 }
) {}
