import { Context, Effect, Layer, Schedule } from "effect";

import type { AuthEmail } from "#notifications/domain/auth-email.ts";
import { renderAuthEmail } from "#notifications/domain/render-auth-email.ts";
import { Ids } from "#shared/application/ids.ts";

import { Mailer } from "./mailer.ts";

// A transport that is briefly down gets three more tries, over about four
// seconds. An email still not sent is logged and dropped: its link is live,
// so it is not kept anywhere, and the reader can ask for another.
const backoff = Schedule.exponential("500 millis");

const retries = 3;

/**
 * Sends an account email in its reader's language. It never fails: Better
 * Auth does not wait for it, and a lost email is fixed by sending another.
 */
export class SendAuthEmail extends Context.Service<
  SendAuthEmail,
  { readonly send: (email: AuthEmail) => Effect.Effect<void> }
>()("peal-server/notifications/application/SendAuthEmail") {
  static readonly layer = Layer.effect(
    SendAuthEmail,
    Effect.gen(function* sendAuthEmail() {
      const mailer = yield* Mailer;
      const ids = yield* Ids;

      const send = Effect.fn("SendAuthEmail.send")(function* send(
        email: AuthEmail
      ) {
        const rendered = renderAuthEmail(email);
        const idempotencyKey = yield* ids.next;

        yield* mailer.send({ ...rendered, idempotencyKey, to: email.to }).pipe(
          Effect.retry({
            schedule: backoff,
            times: retries,
            while: (failure) => failure.retryable,
          }),
          // The link signs its reader in: it stays out of the logs.
          Effect.catchTag("MailDeliveryFailed", (failure) =>
            Effect.logError("An account email was not sent", failure.cause)
          ),
          Effect.annotateLogs("email", email._tag)
        );
      });

      return SendAuthEmail.of({ send });
    })
  );
}
