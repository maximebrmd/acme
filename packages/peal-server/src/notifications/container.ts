import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { DeliverNoticeEmails } from "#notifications/application/deliver-notice-emails.ts";
import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import { NotificationSettings } from "#notifications/application/notification-settings.ts";
import { Notify } from "#notifications/application/notify.ts";
import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { SendWeeklyDigests } from "#notifications/application/send-weekly-digests.ts";
import { UnsubscribeWeeklyDigest } from "#notifications/application/unsubscribe-weekly-digest.ts";
import { ContextDigestSources } from "#notifications/infrastructure/context-digest-sources.ts";
import { DrizzleNoticeLog } from "#notifications/infrastructure/drizzle-notice-log.ts";
import { DrizzleNoticeRecords } from "#notifications/infrastructure/drizzle-notice-records.ts";
import { DrizzleNoticeStore } from "#notifications/infrastructure/drizzle-notice-store.ts";
import { DrizzlePreferenceStore } from "#notifications/infrastructure/drizzle-preference-store.ts";
import { HmacDigestLinks } from "#notifications/infrastructure/hmac-digest-links.ts";
import { mailSettingsConfig } from "#notifications/infrastructure/mail-settings.ts";
import type { MailSettings } from "#notifications/infrastructure/mail-settings.ts";
import { PublicAppLinks } from "#notifications/infrastructure/public-app-links.ts";
import { resendMailer } from "#notifications/infrastructure/resend-mailer.ts";
import { smtpMailer } from "#notifications/infrastructure/smtp-mailer.ts";
import { WorkflowNoticeDelivery } from "#notifications/infrastructure/workflow-notice-delivery.ts";
import { WorkspaceNoticeRecipients } from "#notifications/infrastructure/workspace-notice-recipients.ts";
import { WorkspaceReaderStanding } from "#notifications/infrastructure/workspace-reader-standing.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";

const mailerFor = ({ from, transport }: MailSettings) =>
  transport._tag === "Resend"
    ? resendMailer({ apiKey: transport.apiKey, from }).pipe(
        Layer.provide(FetchHttpClient.layer)
      )
    : smtpMailer({ from, url: transport.url });

/** The mail transport the environment names. */
export const MailerLive = Layer.unwrap(
  Effect.gen(function* mailerLive() {
    return mailerFor(yield* mailSettingsConfig);
  })
);

/**
 * The notifications context: account emails, and those to the visitors of
 * review links, sent through MailerLive, which it shares with the notices
 * below.
 */
export const NotificationsLive = SendAuthEmail.layer.pipe(
  Layer.provideMerge(MailerLive),
  Layer.provide(IdsLive)
);

// The adapters behind the notices' ports.
const NoticeAdaptersLive = Layer.mergeAll(
  DrizzleNoticeLog,
  HmacDigestLinks,
  DrizzleNoticeStore,
  DrizzlePreferenceStore,
  PublicAppLinks,
  WorkflowNoticeDelivery,
  WorkspaceNoticeRecipients,
  WorkspaceReaderStanding
);

/**
 * Notices: what happened to posts and channels, told once per event to the
 * members of a workspace who can act on it, in the app and by email, each in
 * their language (Notify); each user's notices and preferences (NoticeInbox,
 * NotificationSettings); the emails' delivery (DeliverNoticeEmails), for
 * the workers; and NoticeRecords, for the workspace context's exports and
 * erasures. Needs the Mailer (from NotificationsLive), the database,
 * migrated, a TransactionRunner, Ids, the workflow engine, and the workspace
 * context's WorkspaceContacts and AccountStanding, which themselves need
 * NotificationsLive: build the two apart, notices last.
 */
export const NoticesLive = Layer.mergeAll(
  Notify.layer,
  DeliverNoticeEmails.layer,
  NoticeInbox.layer,
  NotificationSettings.layer,
  UnsubscribeWeeklyDigest.layer,
  DrizzleNoticeRecords
).pipe(Layer.provide(NoticeAdaptersLive));

/**
 * The weekly digest (SendWeeklyDigests), for its cron: the preferences
 * that say who wants it, and what it tells, read through the workspace
 * context's MemberDirectory and ActorsNow, publishing's PostAttention and
 * analytics' AnalyticsQueries, which the composition root brings with the
 * Mailer (from NotificationsLive) and the database.
 */
export const WeeklyDigestsLive = SendWeeklyDigests.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DrizzlePreferenceStore,
      PublicAppLinks,
      ContextDigestSources,
      HmacDigestLinks
    )
  )
);

/** Every Monday's weekly digest. Needs WeeklyDigestsLive and the cluster. */
export { WeeklyDigestCron as NotificationsCronsLive } from "#notifications/infrastructure/crons.ts";

/** Registers the workflow that sends notices' emails. Needs NoticesLive. */
export { DeliverNoticeV1Live as NotificationsWorkersLive } from "#notifications/infrastructure/workflows/deliver-notice.ts";

// The endpoints of the signed-in user's notices and preferences. They need
// the use cases NoticesLive provides, and the Authentication middleware of
// the workspace context, which the composition root brings.
export {
  NoticesHandlers as NoticesApiLive,
  NotificationPreferencesHandlers as NotificationPreferencesApiLive,
} from "#notifications/api/notices.ts";
