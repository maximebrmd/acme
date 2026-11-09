import { Schema } from "effect";

import { emailKindOf } from "./notice-event.ts";
import type { EmailKind, NoticeEvent } from "./notice-event.ts";

/**
 * Which notices a user also receives by email. Every notice reaches the app,
 * whatever these say.
 */
export class NotificationPreferences extends Schema.Class<NotificationPreferences>(
  "acme-server/notifications/domain/NotificationPreferences"
)({
  email: Schema.Struct({
    channelReconnect: Schema.Boolean,
    postFailed: Schema.Boolean,
    postPublished: Schema.Boolean,
    postUnconfirmed: Schema.Boolean,
  }),
}) {}

/**
 * Until a user chooses: email for what needs them (a post that failed or may
 * not have gone out, a channel to reconnect), and not for posts that went
 * out as planned.
 */
export const defaultPreferences = new NotificationPreferences({
  email: {
    channelReconnect: true,
    postFailed: true,
    postPublished: false,
    postUnconfirmed: true,
  },
});

/** Some preferences to change; the others stay as they are. */
export interface PreferencesChange {
  readonly email: { readonly [K in EmailKind]?: boolean };
}

export const changePreferences = (
  preferences: NotificationPreferences,
  change: PreferencesChange
): NotificationPreferences => {
  const { email } = preferences;

  return new NotificationPreferences({
    email: {
      channelReconnect: change.email.channelReconnect ?? email.channelReconnect,
      postFailed: change.email.postFailed ?? email.postFailed,
      postPublished: change.email.postPublished ?? email.postPublished,
      postUnconfirmed: change.email.postUnconfirmed ?? email.postUnconfirmed,
    },
  });
};

/** Whether the user wants the event by email too. */
export const wantsEmail = (
  preferences: NotificationPreferences,
  event: NoticeEvent
): boolean => preferences.email[emailKindOf(event)];
