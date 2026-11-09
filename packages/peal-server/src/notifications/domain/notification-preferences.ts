import { Schema } from "effect";

import { emailKindOf } from "./notice-event.ts";
import type { EmailKind, NoticeEvent } from "./notice-event.ts";

/**
 * Which notices a user also receives by email, and whether they hear about
 * every post of their workspaces or only those they wrote. Every notice
 * they receive reaches the app, whatever the email choices say.
 */
export class NotificationPreferences extends Schema.Class<NotificationPreferences>(
  "peal-server/notifications/domain/NotificationPreferences"
)({
  email: Schema.Struct({
    channelReconnect: Schema.Boolean,
    postFailed: Schema.Boolean,
    postPublished: Schema.Boolean,
    postUnconfirmed: Schema.Boolean,
  }),
  // How the posts others wrote went, for members who may schedule posts.
  everyPost: Schema.Boolean,
}) {}

/**
 * Until a user chooses: email for what needs them (a post that failed or may
 * not have gone out, a channel to reconnect), and not for posts that went
 * out as planned; and only the posts they wrote.
 */
export const defaultPreferences = new NotificationPreferences({
  email: {
    channelReconnect: true,
    postFailed: true,
    postPublished: false,
    postUnconfirmed: true,
  },
  everyPost: false,
});

/** Some preferences to change; the others stay as they are. */
export interface PreferencesChange {
  readonly email?: { readonly [K in EmailKind]?: boolean };
  readonly everyPost?: boolean;
}

export const changePreferences = (
  preferences: NotificationPreferences,
  change: PreferencesChange
): NotificationPreferences => {
  const { email } = preferences;
  const asked = change.email ?? {};

  return new NotificationPreferences({
    email: {
      channelReconnect: asked.channelReconnect ?? email.channelReconnect,
      postFailed: asked.postFailed ?? email.postFailed,
      postPublished: asked.postPublished ?? email.postPublished,
      postUnconfirmed: asked.postUnconfirmed ?? email.postUnconfirmed,
    },
    everyPost: change.everyPost ?? preferences.everyPost,
  });
};

/** Whether the user wants the event by email too. */
export const wantsEmail = (
  preferences: NotificationPreferences,
  event: NoticeEvent
): boolean => preferences.email[emailKindOf(event)];
