import { Context, Effect, Layer, Metric } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

import { AccountDayStore } from "./ports/account-day-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { MeterErrorEvents } from "./ports/meter-error-events.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/**
 * Meter events Stripe took and then reported it could not count (a meter
 * archived or missing, a customer unknown, a value it cannot read): usage
 * not billed. An alert rule reads it (peal-meter-errors).
 */
export const meterErrors = Metric.counter("peal.billing.meter_errors", {
  description:
    "Meter events Stripe took and then reported errors of, so did not count",
  incremental: true,
});

// The identifier of the reports a sample names: Stripe gives the
// request's, which may be the idempotency key, `<identifier>:<seconds>`.
const candidatesOf = (named: string): readonly string[] => {
  const key = /^(?<identifier>.+):\d{10}$/u.exec(named)?.groups?.["identifier"];

  return key === undefined ? [named] : [named, key];
};

/**
 * Receives Stripe's meter error events: checks and reads each through
 * `MeterErrorEvents`, counts its errors, logs their codes and keeps the
 * reports its samples name refused (`stripe:<code>`), sent or not, which
 * the reporter's refusal alert then reads. Stripe sends a sample of the
 * events an error hit, never all: the count is what alerts. An event not
 * signed is refused; one of another kind is ignored.
 */
export class ReceiveMeterErrors extends Context.Service<
  ReceiveMeterErrors,
  {
    readonly receive: (
      body: string,
      signature: string
    ) => Effect.Effect<
      "ignored" | "recorded" | "refused",
      DatabaseError | StripeUnreachable
    >;
  }
>()("peal-server/billing/application/ReceiveMeterErrors") {
  static readonly layer = Layer.effect(
    ReceiveMeterErrors,
    Effect.gen(function* ReceiveMeterErrorsLive() {
      const events = yield* MeterErrorEvents;
      const store = yield* AccountDayStore;
      const { enabled } = yield* BillingMode;

      // Born at 0 on a server that bills, so the first error is an
      // increase.
      if (enabled) {
        yield* Metric.update(meterErrors, 0);
      }

      const receive = Effect.fn("ReceiveMeterErrors.receive")(function* receive(
        body: string,
        signature: string
      ) {
        const reading = yield* events.read(body, signature);

        if (reading._tag !== "report") {
          return reading._tag;
        }

        const { errors, eventId } = reading.report;

        for (const { code, count, identifiers } of errors) {
          yield* Metric.update(meterErrors, count);

          const marked = yield* store.markDropped(
            identifiers.flatMap(candidatesOf),
            `stripe:${code}`
          );

          yield* Effect.logError(
            "Stripe reported meter events it could not count: their usage is not billed"
          ).pipe(Effect.annotateLogs({ code, count, eventId, marked }));
        }

        const recorded = "recorded" as const;

        return recorded;
      });

      return ReceiveMeterErrors.of({ receive });
    })
  );
}
