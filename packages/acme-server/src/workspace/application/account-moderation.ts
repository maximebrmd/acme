import { Context } from "effect";
import type { DateTime, Effect, Option, Redacted } from "effect";

import type { UserId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import type { AuthUnavailable } from "./auth-unavailable.ts";

/** Staff acting on an account, with their own session's cookies. */
export interface ModerationRequest {
  /** The staff member's Cookie header, which Better Auth checks again. */
  readonly staffSession: Redacted.Redacted;
  readonly userId: UserId;
}

/**
 * What staff do to accounts, through Better Auth's admin plugin, whose own
 * routes are off: the staff console's use cases check and record each
 * action first.
 */
export class AccountModeration extends Context.Service<
  AccountModeration,
  {
    /** Bans the account and ends its sessions. */
    readonly ban: (
      request: ModerationRequest & {
        readonly expiresAt: Option.Option<DateTime.Utc>;
        readonly reason: string;
      }
    ) => Effect.Effect<void, AuthUnavailable>;
    readonly unban: (
      request: ModerationRequest
    ) => Effect.Effect<void, AuthUnavailable>;
    /** Ends every session of the account, staff's impersonations included. */
    readonly revokeSessions: (
      request: ModerationRequest
    ) => Effect.Effect<void, AuthUnavailable>;
    /**
     * Emails the account a new link to confirm its address, which opens the
     * confirmation page in its language.
     */
    readonly resendVerification: (account: {
      readonly email: string;
      readonly locale: Locale;
    }) => Effect.Effect<void, AuthUnavailable>;
    /**
     * Opens a session as the account for an hour, and answers with the
     * Set-Cookie headers that sign the staff member's browser in with it,
     * their own session kept aside to come back to.
     */
    readonly impersonate: (
      request: ModerationRequest
    ) => Effect.Effect<readonly string[], AuthUnavailable>;
  }
>()("acme-server/workspace/application/AccountModeration") {}
