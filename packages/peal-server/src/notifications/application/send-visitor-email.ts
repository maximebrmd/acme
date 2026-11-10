import { Context, Effect, Layer, Schedule } from "effect";

import { renderReviewReply } from "#notifications/domain/render-visitor-email.ts";
import { Ids } from "#shared/application/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import { Mailer } from "./mailer.ts";

// A transport that is briefly down gets three more tries, over about four
// seconds. An email still not sent is logged and dropped.
const backoff = Schedule.exponential("500 millis");

const retries = 3;

/**
 * Emails people who have no account: the visitors of review links who left
 * an address to hear of answers. It never fails, and its caller does not
 * wait for it. The address stays out of the logs.
 */
export class SendVisitorEmail extends Context.Service<
  SendVisitorEmail,
  {
    /** Tells a visitor that someone answered their comment. */
    readonly reviewReply: (reader: {
      readonly locale: Locale;
      readonly to: string;
    }) => Effect.Effect<void>;
  }
>()("peal-server/notifications/application/SendVisitorEmail") {
  static readonly layer = Layer.effect(
    SendVisitorEmail,
    Effect.gen(function* sendVisitorEmail() {
      const mailer = yield* Mailer;
      const ids = yield* Ids;

      const reviewReply = Effect.fn("SendVisitorEmail.reviewReply")(
        function* reviewReply({
          locale,
          to,
        }: {
          readonly locale: Locale;
          readonly to: string;
        }) {
          const idempotencyKey = yield* ids.next;

          yield* mailer
            .send({ ...renderReviewReply(locale), idempotencyKey, to })
            .pipe(
              Effect.retry({
                schedule: backoff,
                times: retries,
                while: (failure) => failure.retryable,
              }),
              Effect.catchTag("MailDeliveryFailed", (failure) =>
                Effect.logError(
                  "An email to a reviewer was not sent",
                  failure.cause
                )
              )
            );
        }
      );

      return SendVisitorEmail.of({ reviewReply });
    })
  );
}
