import { Schema } from "effect";

/** No account has this id. */
export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {},
  { description: "No account has this id.", httpApiStatus: 404 }
) {}
