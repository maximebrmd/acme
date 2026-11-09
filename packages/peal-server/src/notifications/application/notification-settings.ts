import { Context, DateTime, Effect, Layer } from "effect";

import type { InboxAccessDenied } from "#notifications/domain/inbox-access-denied.ts";
import type { InboxReader } from "#notifications/domain/inbox-reader.ts";
import { defaultPreferences } from "#notifications/domain/notification-preferences.ts";
import type {
  NotificationPreferences,
  PreferencesChange,
} from "#notifications/domain/notification-preferences.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { inboxOwner } from "./inbox-owner.ts";
import { PreferenceStore } from "./preference-store.ts";
import { ReaderStanding } from "./reader-standing.ts";

type Failure = DatabaseError | InboxAccessDenied;

/** Which notices a user also receives by email: reading and changing it. */
export class NotificationSettings extends Context.Service<
  NotificationSettings,
  {
    readonly get: (
      reader: InboxReader
    ) => Effect.Effect<NotificationPreferences, Failure>;
    readonly change: (
      reader: InboxReader,
      change: PreferencesChange
    ) => Effect.Effect<NotificationPreferences, Failure>;
  }
>()("peal-server/notifications/application/NotificationSettings") {
  static readonly layer = Layer.effect(
    NotificationSettings,
    Effect.gen(function* NotificationSettingsLive() {
      const store = yield* PreferenceStore;
      const owner = inboxOwner(yield* ReaderStanding);

      const get = Effect.fn("NotificationSettings.get")(function* get(
        reader: InboxReader
      ) {
        const userId = yield* owner(reader, "read");
        const stored = yield* store.forUsers([userId]);

        return stored.get(userId) ?? defaultPreferences;
      });

      const change = Effect.fn("NotificationSettings.change")(function* change(
        reader: InboxReader,
        requested: PreferencesChange
      ) {
        const userId = yield* owner(reader, "change");

        return yield* store.change(userId, requested, yield* DateTime.now);
      });

      return NotificationSettings.of({ change, get });
    })
  );
}
