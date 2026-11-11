import {
  Context,
  DateTime,
  Effect,
  Layer,
  Metric,
  Option,
  Result,
} from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { DeliveryAttempt } from "#webhooks/domain/delivery-attempt.ts";
import { isGone, isSuccess } from "#webhooks/domain/delivery-attempt.ts";
import { retryDelayAfter } from "#webhooks/domain/delivery-policy.ts";
import { bodyOf } from "#webhooks/domain/recorded-event.ts";
import type { RecordedEvent } from "#webhooks/domain/recorded-event.ts";
import { signedContent, signedHeaders } from "#webhooks/domain/signature.ts";
import type { WebhookDeliveryId } from "#webhooks/domain/webhook-delivery-id.ts";
import {
  abandonDelivery,
  recordAttempt,
} from "#webhooks/domain/webhook-delivery.ts";
import type { WebhookDelivery } from "#webhooks/domain/webhook-delivery.ts";
import {
  failedTooLong,
  previousSecretSigns,
} from "#webhooks/domain/webhook-endpoint.ts";
import type { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

import { DeliveryStore } from "./ports/delivery-store.ts";
import { EndpointNotices } from "./ports/endpoint-notices.ts";
import { EndpointSecrets } from "./ports/endpoint-secrets.ts";
import { EndpointStore } from "./ports/endpoint-store.ts";
import type { StoredSecrets } from "./ports/endpoint-store.ts";
import { WebhookTransport } from "./ports/webhook-transport.ts";

/**
 * Attempts made, by the event's type and how each ended: `delivered`,
 * `retry` (failed, another follows) or `failed` (for good). Never the
 * address, the workspace or the endpoint.
 */
export const webhookAttempts = Metric.counter("peal.webhook_attempts", {
  description: "Webhook delivery attempts, by event type and outcome",
  incremental: true,
});

// How the counter names what an attempt left of its delivery.
const outcomes = {
  failed: "failed",
  pending: "retry",
  succeeded: "delivered",
} as const;

/**
 * What an attempt left of its delivery: over, delivered or failed for
 * good (`settled`), or waiting for its next attempt (`retry`).
 */
export type AttemptResult = "retry" | "settled";

/**
 * Makes one attempt of a delivery: signs the event's body with the
 * endpoint's secrets, sends it, and records how it ended on the delivery
 * and on the endpoint. The job that runs it sleeps between attempts.
 *
 * An endpoint whose attempts fail for `turnOffAfterFailingFor`, or that
 * answers 410 Gone, is turned off, and the members who manage the
 * workspace's webhooks told, in the transaction that records the attempt;
 * a delivery that fails for good while its endpoint stays on is told to
 * them too, once a day per endpoint.
 * A delivery whose endpoint is off, or whose secret the server can no
 * longer read, fails without an attempt; one that is over, or gone with its
 * endpoint or its workspace, is left alone.
 *
 * An attempt made but not recorded, as when the server stops in between,
 * is made again: receivers deduplicate on the event's id.
 */
export class DeliverWebhook extends Context.Service<
  DeliverWebhook,
  {
    readonly attempt: (
      deliveryId: WebhookDeliveryId,
      attempt: number
    ) => Effect.Effect<AttemptResult, DatabaseError>;
  }
>()("peal-server/webhooks/application/DeliverWebhook") {
  static readonly layer = Layer.effect(
    DeliverWebhook,
    Effect.gen(function* DeliverWebhookLive() {
      const deliveries = yield* DeliveryStore;
      const endpoints = yield* EndpointStore;
      const secrets = yield* EndpointSecrets;
      const transport = yield* WebhookTransport;
      const notices = yield* EndpointNotices;
      const { transaction } = yield* TransactionRunner;

      // A delivery that failed for good, its endpoint still on once the
      // attempt was recorded: those who manage webhooks hear of it, once a
      // day. One the failure turned off has its own notice.
      const tellFailing = Effect.fn("DeliverWebhook.tellFailing")(
        function* tellFailing(endpoint: WebhookEndpoint, at: DateTime.Utc) {
          const now = yield* endpoints.get(endpoint.id);

          if (Option.exists(now, ({ status }) => status._tag === "enabled")) {
            yield* notices.failing(endpoint, at);
          }
        }
      );

      const abandon = Effect.fn("DeliverWebhook.abandon")(function* abandon(
        delivery: WebhookDelivery,
        reason: "endpointDisabled" | "notConfigured",
        endpoint: WebhookEndpoint
      ) {
        const now = yield* DateTime.now;
        const abandoned = abandonDelivery(delivery, reason, now);

        if (Result.isSuccess(abandoned)) {
          yield* transaction(
            deliveries
              .save(abandoned.success)
              .pipe(
                Effect.andThen(
                  reason === "notConfigured"
                    ? tellFailing(endpoint, now)
                    : Effect.void
                )
              )
          );
        }

        const settled: AttemptResult = "settled";

        return settled;
      });

      // Turns the endpoint off and tells its workspace, unless another
      // attempt already did.
      const turnOff = Effect.fn("DeliverWebhook.turnOff")(function* turnOff(
        endpoint: WebhookEndpoint,
        reason: "failing" | "gone",
        now: DateTime.Utc
      ) {
        if (yield* endpoints.disable(endpoint.id, reason, now)) {
          yield* notices.turnedOff(endpoint, reason, now);
          yield* Effect.logWarning("A webhook endpoint was turned off").pipe(
            Effect.annotateLogs({ reason })
          );
        }
      });

      // What the attempt says of the endpoint: working, gone, or failing,
      // perhaps for too long.
      const recordOnEndpoint = Effect.fn("DeliverWebhook.recordOnEndpoint")(
        function* recordOnEndpoint(
          endpoint: WebhookEndpoint,
          made: DeliveryAttempt
        ) {
          if (isSuccess(made.outcome)) {
            if (Option.isSome(endpoint.failingSince)) {
              yield* endpoints.clearFailing(endpoint.id);
            }

            return;
          }

          if (isGone(made.outcome)) {
            yield* turnOff(endpoint, "gone", made.at);

            return;
          }

          const since = yield* endpoints.markFailing(endpoint.id, made.at);

          if (Option.exists(since, (start) => failedTooLong(start, made.at))) {
            yield* turnOff(endpoint, "failing", made.at);
          }
        }
      );

      const send = Effect.fn("DeliverWebhook.send")(function* send(
        delivery: WebhookDelivery,
        attempt: number,
        endpoint: WebhookEndpoint,
        recorded: RecordedEvent,
        stored: StoredSecrets
      ) {
        const now = yield* DateTime.now;

        const message = {
          body: bodyOf(recorded),
          id: recorded.id,
          timestamp: Math.floor(DateTime.toEpochMillis(now) / 1000),
        };

        const macs = yield* secrets
          .sign(
            endpoint.id,
            [
              stored.current,
              ...(previousSecretSigns(endpoint, now)
                ? Option.toArray(stored.previous)
                : []),
            ],
            signedContent(message)
          )
          .pipe(Effect.option);

        if (Option.isNone(macs)) {
          yield* Effect.logWarning(
            "A webhook delivery could not be signed: the endpoint's secret no longer decrypts"
          );

          return yield* abandon(delivery, "notConfigured", endpoint);
        }

        const response = yield* transport.send({
          body: message.body,
          headers: {
            ...signedHeaders(message, macs.value),
            "content-type": "application/json",
            "user-agent": "Peal-Webhooks",
          },
          url: endpoint.url,
        });

        const made: DeliveryAttempt = {
          at: now,
          durationMs: response.durationMs,
          outcome: response.outcome,
        };

        const next = recordAttempt(
          delivery,
          attempt,
          made,
          retryDelayAfter(attempt)
        );

        // Over meanwhile, as when two runs of the job raced: leave it.
        if (Result.isFailure(next)) {
          const settled: AttemptResult = "settled";

          return settled;
        }

        yield* transaction(
          deliveries
            .save(next.success)
            .pipe(
              Effect.andThen(recordOnEndpoint(endpoint, made)),
              Effect.andThen(
                next.success.status._tag === "failed"
                  ? tellFailing(endpoint, made.at)
                  : Effect.void
              )
            )
        );

        const { status } = next.success;

        yield* Metric.update(
          Metric.withAttributes(webhookAttempts, {
            event: recorded.event.type,
            outcome: outcomes[status._tag],
          }),
          1
        );

        const result: AttemptResult =
          status._tag === "pending" ? "retry" : "settled";

        return result;
      });

      const attemptOnce = Effect.fn("DeliverWebhook.attempt")(
        function* attemptOnce(deliveryId: WebhookDeliveryId, attempt: number) {
          const settled: AttemptResult = "settled";
          const delivery = yield* deliveries.get(deliveryId);

          if (
            Option.isNone(delivery) ||
            delivery.value.status._tag !== "pending"
          ) {
            return settled;
          }

          const endpoint = yield* endpoints.get(delivery.value.endpointId);
          const recorded = yield* deliveries.event(delivery.value.eventId);
          const stored = yield* endpoints.secrets(delivery.value.endpointId);

          if (
            Option.isNone(endpoint) ||
            Option.isNone(recorded) ||
            Option.isNone(stored)
          ) {
            return settled;
          }

          if (endpoint.value.status._tag === "disabled") {
            return yield* abandon(
              delivery.value,
              "endpointDisabled",
              endpoint.value
            );
          }

          return yield* send(
            delivery.value,
            attempt,
            endpoint.value,
            recorded.value,
            stored.value
          ).pipe(
            Effect.annotateLogs({
              attempt,
              endpointId: endpoint.value.id,
              webhookEvent: recorded.value.event.type,
            })
          );
        }
      );

      return DeliverWebhook.of({
        attempt: (deliveryId, attempt) =>
          attemptOnce(deliveryId, attempt).pipe(
            Effect.annotateLogs({ deliveryId })
          ),
      });
    })
  );
}
