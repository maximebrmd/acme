import { Effect, Layer, Redacted } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";

import { MailDeliveryFailed } from "#notifications/application/mail-delivery-failed.ts";
import { Mailer } from "#notifications/application/mailer.ts";

const endpoint = "https://api.resend.com/emails";

// Resend answers 429 when sending too fast and 5xx when it fails itself;
// other refusals (a bad sender, a malformed address) will fail again.
const isRetryableStatus = (status: number): boolean =>
  status === 429 || status >= 500;

/**
 * Sends through Resend's HTTP API. The idempotency key makes a retried
 * request send the email once.
 */
export const resendMailer = (options: {
  readonly apiKey: Redacted.Redacted;
  readonly from: string;
}) =>
  Layer.effect(
    Mailer,
    Effect.gen(function* makeResendMailer() {
      const client = yield* HttpClient.HttpClient;

      return Mailer.of({
        send: Effect.fn("Mailer.resend")(function* send(message) {
          const request = HttpClientRequest.post(endpoint).pipe(
            HttpClientRequest.bearerToken(Redacted.value(options.apiKey)),
            HttpClientRequest.setHeader(
              "Idempotency-Key",
              message.idempotencyKey
            ),
            HttpClientRequest.bodyJsonUnsafe({
              from: options.from,
              html: message.html,
              subject: message.subject,
              text: message.text,
              to: [message.to],
            })
          );

          const response = yield* client
            .execute(request)
            .pipe(
              Effect.mapError(
                (cause) => new MailDeliveryFailed({ cause, retryable: true })
              )
            );

          if (response.status >= 300) {
            const body = yield* response.text.pipe(
              Effect.orElseSucceed(() => "")
            );

            yield* new MailDeliveryFailed({
              cause: new Error(`Resend answered ${response.status}: ${body}`),
              retryable: isRetryableStatus(response.status),
            });
          }
        }),
      });
    })
  );
