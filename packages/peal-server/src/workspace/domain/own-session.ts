import { Option, Result } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

import { isCommandLine } from "./oauth-grant.ts";
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

/**
 * The user, when the principal is them in person or Peal's command line
 * acting for them, to read what their account holds: a copy of their data,
 * the applications that act for them. They signed the command line in
 * themselves, at their terminal, and it saves what it reads in their files
 * only. Never another OAuth client, such as an MCP client, which would hand
 * all of it to an AI model or to whoever made it, nor staff impersonating
 * them.
 */
export const ownSessionOrCommandLine = (
  principal: UserPrincipal
): Result.Result<UserId, SessionRequired> =>
  Option.isNone(principal.impersonatedBy) &&
  Option.match(principal.oauth, { onNone: () => true, onSome: isCommandLine })
    ? Result.succeed(principal.userId)
    : Result.fail(new SessionRequired());
