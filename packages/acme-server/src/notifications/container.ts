import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import { mailSettingsConfig } from "#notifications/infrastructure/mail-settings.ts";
import type { MailSettings } from "#notifications/infrastructure/mail-settings.ts";
import { resendMailer } from "#notifications/infrastructure/resend-mailer.ts";
import { smtpMailer } from "#notifications/infrastructure/smtp-mailer.ts";
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

/** The notifications context: account emails, sent through MailerLive. */
export const NotificationsLive = SendAuthEmail.layer.pipe(
  Layer.provide(MailerLive),
  Layer.provide(IdsLive)
);
