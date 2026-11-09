import { Context } from "effect";
import type { Effect } from "effect";

import type { MailDeliveryFailed } from "./mail-delivery-failed.ts";

/** One email to one address, rendered, as a mail transport takes it. */
export interface EmailMessage {
  readonly html: string;
  /**
   * The same for every attempt at sending one email, so a transport that
   * deduplicates (Resend keeps keys for a day) sends it once.
   */
  readonly idempotencyKey: string;
  readonly subject: string;
  readonly text: string;
  readonly to: string;
}

/**
 * Sends email from Acme's address: through Resend's API, or any SMTP server
 * (Mailpit in development).
 */
export class Mailer extends Context.Service<
  Mailer,
  {
    readonly send: (
      message: EmailMessage
    ) => Effect.Effect<void, MailDeliveryFailed>;
  }
>()("acme-server/notifications/application/Mailer") {}
