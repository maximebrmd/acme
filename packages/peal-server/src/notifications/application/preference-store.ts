import { Context } from "effect";
import type { DateTime, Effect } from "effect";

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
  }
>()("peal-server/notifications/application/PreferenceStore") {}
