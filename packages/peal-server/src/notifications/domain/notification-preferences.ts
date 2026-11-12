import { Option, Schema } from "effect";

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
    // New comments under the posts that went live.
    comments: Schema.Boolean,
    // A feed that stopped making posts.
    feedStopped: Schema.Boolean,
    postFailed: Schema.Boolean,
    postPublished: Schema.Boolean,
    // Comments on posts, and approvals asked for and decided.
    postReview: Schema.Boolean,
    postUnconfirmed: Schema.Boolean,
    // A recycling rule that stopped making the posts it repeats.
    recyclingEnded: Schema.Boolean,
    // Deliveries to a webhook endpoint that fail for good, for those who
    // manage webhooks.
    webhookFailing: Schema.Boolean,
  }),
  // How the posts others wrote went, for members who may schedule posts.
  everyPost: Schema.Boolean,
}) {}

/**
 * Until a user chooses: email for what needs them (a post that failed or may
 * not have gone out, a channel to reconnect, a post to approve or what its
 * review brought, a recycling rule that ended or a feed that stopped, as
 * either stops what they expect to go on, deliveries to a webhook endpoint failing for good), and not for posts that went out as planned nor for the
 * comments they receive, which the app shows; and only the posts they wrote.
 */
export const defaultPreferences = new NotificationPreferences({
  email: {
    channelReconnect: true,
    comments: false,
    feedStopped: true,
    postFailed: true,
    postPublished: false,
    postReview: true,
    postUnconfirmed: true,
    recyclingEnded: true,
    webhookFailing: true,
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
      comments: asked.comments ?? email.comments,
      feedStopped: asked.feedStopped ?? email.feedStopped,
      postFailed: asked.postFailed ?? email.postFailed,
      postPublished: asked.postPublished ?? email.postPublished,
      postReview: asked.postReview ?? email.postReview,
      postUnconfirmed: asked.postUnconfirmed ?? email.postUnconfirmed,
      recyclingEnded: asked.recyclingEnded ?? email.recyclingEnded,
      webhookFailing: asked.webhookFailing ?? email.webhookFailing,
    },
    everyPost: change.everyPost ?? preferences.everyPost,
  });
};

/**
 * Whether the user wants the event by email too: always for billing's,
 * which no preference covers.
 */
export const wantsEmail = (
  preferences: NotificationPreferences,
  event: NoticeEvent
): boolean =>
  Option.match(emailKindOf(event), {
    onNone: () => true,
    onSome: (kind) => preferences.email[kind],
  });
