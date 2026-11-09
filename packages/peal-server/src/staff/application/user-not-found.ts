import { Schema } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";

/** No account has this id. */
export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  { userId: UserIdSchema }
) {}
