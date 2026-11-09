import { Option, Result } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

import { SessionRequired } from "./session-required.ts";
import type { UserPrincipal } from "./user-principal.ts";

/**
 * The user, when the principal is them in person: signed in with a session
 * of their own, neither through an OAuth client nor impersonated by staff.
 */
export const ownSession = (
  principal: UserPrincipal
): Result.Result<UserId, SessionRequired> =>
  Option.isNone(principal.oauth) && Option.isNone(principal.impersonatedBy)
    ? Result.succeed(principal.userId)
    : Result.fail(new SessionRequired());
