import { Config, Option, Redacted } from "effect";

import { requiredInProduction } from "#shared/infrastructure/environment.ts";

/** How email leaves Peal: Resend's API, or an SMTP server. */
export type MailTransport =
  | { readonly _tag: "Resend"; readonly apiKey: Redacted.Redacted }
  | { readonly _tag: "Smtp"; readonly url: Redacted.Redacted };

// SMTP_URL may hold a password, so it is redacted like a key. Outside
// production it defaults to Mailpit from the development stack.
const smtp = requiredInProduction(
  Config.Redacted("SMTP_URL"),
  Redacted.make("smtp://127.0.0.1:11025")
).pipe(Config.map((url): MailTransport => ({ _tag: "Smtp", url })));

const transport = Config.option(Config.Redacted("RESEND_API_KEY")).pipe(
  Config.flatMap(
    Option.match({
      onNone: () => smtp,
      onSome: (apiKey) =>
        Config.succeed<MailTransport>({ _tag: "Resend", apiKey }),
    })
  )
);

/**
 * The mail settings, read from the environment:
 *
 * - `RESEND_API_KEY` sends through Resend; otherwise `SMTP_URL` sends through
 *   that server (`smtp://user:password@host:587`, or `smtps://` for TLS).
 * - `MAIL_FROM` is the sender, as `Name <address>` or an address the
 *   transport may send from.
 *
 * Production needs MAIL_FROM and a transport: without them nobody could
 * confirm an email address or reset a password.
 */
export const mailSettingsConfig = Config.all({
  from: requiredInProduction(
    Config.NonEmptyString("MAIL_FROM"),
    "Peal <noreply@peal.localhost>"
  ),
  transport,
});

export type MailSettings = Config.Success<typeof mailSettingsConfig>;
