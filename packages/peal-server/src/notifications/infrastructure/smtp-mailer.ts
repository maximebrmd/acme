import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { createTransport } from "nodemailer";

import { MailDeliveryFailed } from "#notifications/application/mail-delivery-failed.ts";
import { Mailer } from "#notifications/application/mailer.ts";

// SMTP replies 5xx for what will fail again (an unknown address, a refused
// sender) and 4xx for what may pass later. An error without a reply code is
// the connection failing, which may pass too.
const SmtpReplySchema = Schema.Struct({ responseCode: Schema.Number });

const decodeReply = Schema.decodeUnknownOption(SmtpReplySchema);

const isRetryable = (cause: unknown): boolean =>
  Option.match(decodeReply(cause), {
    onNone: () => true,
    onSome: ({ responseCode }) => responseCode < 500,
  });

/**
 * Sends through an SMTP server. The connection is pooled and kept open
 * between emails: some servers take seconds to greet a new connection.
 */
export const smtpMailer = (options: {
  readonly from: string;
  readonly url: Redacted.Redacted;
}) =>
  Layer.effect(
    Mailer,
    Effect.gen(function* makeSmtpMailer() {
      const transport = yield* Effect.acquireRelease(
        Effect.sync(() =>
          createTransport({ pool: true, url: Redacted.value(options.url) })
        ),
        (opened) =>
          Effect.sync(() => {
            opened.close();
          })
      );

      return Mailer.of({
        send: (message) =>
          Effect.tryPromise({
            catch: (cause) =>
              new MailDeliveryFailed({ cause, retryable: isRetryable(cause) }),
            try: async () =>
              await transport.sendMail({
                from: options.from,
                html: message.html,
                subject: message.subject,
                text: message.text,
                to: message.to,
              }),
          }).pipe(Effect.asVoid, Effect.withSpan("Mailer.smtp")),
      });
    })
  );
