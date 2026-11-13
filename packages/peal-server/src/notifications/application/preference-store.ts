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
     * A page of the users who turned the weekly digest on, by id, after
     * `after`: `limit` at most.
     */
    readonly digestReaders: (request: {
      readonly after: Option.Option<UserId>;
      readonly limit: number;
    }) => Effect.Effect<readonly UserId[], DatabaseError>;
    /**
     * Records that the user's digest of the week starting `week` goes out,
     * and says whether it may: only once a week, and only while they want
     * it.
     */
    readonly claimDigest: (
      userId: UserId,
      week: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/notifications/application/PreferenceStore") {}
