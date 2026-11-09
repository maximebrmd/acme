import { Effect, Option, Schema } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";

import { OAuthGrantSchema } from "./oauth-grant.ts";

/**
 * A person: signed in with a session, or reached through an OAuth client
 * acting on their behalf, which `oauth` describes. Staff impersonating them
 * act under their name, and `impersonatedBy` keeps who really acts.
 */
export class UserPrincipal extends Schema.TaggedClass<UserPrincipal>(
  "acme-server/workspace/domain/UserPrincipal"
)("UserPrincipal", {
  impersonatedBy: Schema.Option(UserIdSchema),
  oauth: Schema.Option(OAuthGrantSchema).pipe(
    Schema.withConstructorDefault(Effect.succeed(Option.none()))
  ),
  userId: UserIdSchema,
}) {}
