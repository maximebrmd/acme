import { Schema } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";

/**
 * A person signed in with a session. Staff impersonating them act under their
 * name, and `impersonatedBy` keeps who really acts.
 */
export class UserPrincipal extends Schema.TaggedClass<UserPrincipal>(
  "acme-server/workspace/domain/UserPrincipal"
)("UserPrincipal", {
  impersonatedBy: Schema.Option(UserIdSchema),
  userId: UserIdSchema,
}) {}
