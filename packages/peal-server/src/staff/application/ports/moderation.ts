import { Context } from "effect";
import type { DateTime, Effect, Option, Redacted } from "effect";

import type { UserId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";
import type { ModerationFailed } from "#staff/application/moderation-failed.ts";
import type { StaffReason } from "#staff/domain/staff-reason.ts";

/** A staff member, with the cookies of their own session. */
export interface StaffMember {
  /** The Cookie header their request came with. */
  readonly session: Redacted.Redacted;
  readonly userId: UserId;
}

/** Staff acting on an account. */
export interface Act {
  readonly staff: StaffMember;
  readonly userId: UserId;
}

/** What staff do to accounts, once the use case checked and recorded it. */
export class Moderation extends Context.Service<
  Moderation,
  {
    /** Bans the account and ends its sessions. */
    readonly ban: (
      act: Act & {
        readonly expiresAt: Option.Option<DateTime.Utc>;
        readonly reason: StaffReason;
      }
    ) => Effect.Effect<void, ModerationFailed>;
    readonly unban: (act: Act) => Effect.Effect<void, ModerationFailed>;
    readonly revokeSessions: (
      act: Act
    ) => Effect.Effect<void, ModerationFailed>;
    readonly resendVerification: (account: {
      readonly email: string;
      readonly locale: Locale;
    }) => Effect.Effect<void, ModerationFailed>;
    /**
     * Signs the staff member's browser in as the account for an hour: the
     * Set-Cookie headers of the reply.
     */
    readonly impersonate: (
      act: Act
    ) => Effect.Effect<readonly string[], ModerationFailed>;
  }
>()("acme-server/staff/application/Moderation") {}
