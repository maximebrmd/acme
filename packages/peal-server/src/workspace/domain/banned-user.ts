import { Schema } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";

/**
 * Staff banned the user. Better Auth signs a banned user out, but a session
 * cached in a cookie or an API key could still reach the API, so each request
 * checks.
 */
export class BannedUser extends Schema.TaggedError<BannedUser>()("BannedUser", {
  userId: UserIdSchema,
}) {}
