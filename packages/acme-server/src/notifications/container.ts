import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { SendChannelNotice } from "#notifications/application/send-channel-notice.ts";
import { DrizzleNoticeLog } from "#notifications/infrastructure/drizzle-notice-log.ts";
import { mailSettingsConfig } from "#notifications/infrastructure/mail-settings.ts";
import type { MailSettings } from "#notifications/infrastructure/mail-settings.ts";
import { PublicAppLinks } from "#notifications/infrastructure/public-app-links.ts";
import { resendMailer } from "#notifications/infrastructure/resend-mailer.ts";
import { smtpMailer } from "#notifications/infrastructure/smtp-mailer.ts";
import { WorkspaceNoticeRecipients } from "#notifications/infrastructure/workspace-notice-recipients.ts";
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
 * The notifications context: account emails, sent through MailerLive, which
 * it shares with the notices below.
 */
export const NotificationsLive = SendAuthEmail.layer.pipe(
  Layer.provideMerge(MailerLive),
  Layer.provide(IdsLive)
);

/**
 * Channel notices, emailed once per event to the members who manage a
 * workspace's channels. Needs the Mailer (from NotificationsLive), the
 * database, migrated, and the workspace context's WorkspaceContacts, which
 * itself needs NotificationsLive: build the two apart, notices last.
 */
export const ChannelNoticesLive = SendChannelNotice.layer.pipe(
  Layer.provide(
    Layer.mergeAll(DrizzleNoticeLog, PublicAppLinks, WorkspaceNoticeRecipients)
  )
);
