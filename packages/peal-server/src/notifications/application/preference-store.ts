import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type {
  NotificationPreferences,
  PreferencesChange,
} from "#notifications/domain/notification-preferences.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

/** The preferences users chose. Those who never chose have none stored. */
export class PreferenceStore extends Context.Service<
  PreferenceStore,
  {
    /** The preferences stored for those of the users who chose some. */
    readonly forUsers: (
      userIds: readonly UserId[]
    ) => Effect.Effect<
      ReadonlyMap<UserId, NotificationPreferences>,
      DatabaseError
    >;
    /**
     * Applies the change to the user's preferences, or to the defaults if
     * they have none, at once: two changes made together both count.
     */
    readonly change: (
      userId: UserId,
      change: PreferencesChange,
      at: DateTime.Utc
    ) => Effect.Effect<NotificationPreferences, DatabaseError>;
    /**
     * A page of the users who turned the weekly digest on and have not had
     * the digest of the week starting `week`, by id, after `after`:
     * `limit` at most.
     */
    readonly digestReaders: (request: {
      readonly after: Option.Option<UserId>;
      readonly limit: number;
      readonly week: DateTime.Utc;
    }) => Effect.Effect<readonly UserId[], DatabaseError>;
    /**
     * Takes the user's digest of the week starting `week` for a send, at
     * `lease.at`, and answers the generation of their unsubscribe links;
     * none once that week's went, while another send took it after
     * `lease.staleBefore`, or once they no longer want it.
     */
    readonly claimDigest: (
      userId: UserId,
      week: DateTime.Utc,
      lease: { readonly at: DateTime.Utc; readonly staleBefore: DateTime.Utc }
    ) => Effect.Effect<Option.Option<number>, DatabaseError>;
    /** The week's digest went, or will never go: done for that week. */
    readonly digestSent: (
      userId: UserId,
      week: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Gives a claim back, for a later run to send it. */
    readonly releaseDigest: (
      userId: UserId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Turns the user's weekly digest off, and that alone, when `links` is
     * their links' generation now; says whether it did.
     */
    readonly unsubscribeDigest: (
      userId: UserId,
      links: number,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/notifications/application/PreferenceStore") {}
