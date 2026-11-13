import { Context } from "effect";
import type { Effect } from "effect";

import type { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";

/**
 * What Stripe reported of meter events it took and then could not count
 * (its `v1.billing.meter.error_report_triggered` and `no_meter_found`
 * events): each error's code, how many events it hit, and the identifiers
 * of the samples it names.
 */
export interface MeterErrorReport {
  readonly errors: readonly {
    readonly code: string;
    readonly count: number;
    readonly identifiers: readonly string[];
  }[];
  readonly eventId: string;
}

/**
 * An event delivered to the meter errors endpoint: a report, an event of
 * another kind (nothing to do), or one not to be trusted (no or a wrong
 * signature, or the endpoint not set up).
 */
export type MeterErrorReading =
  | { readonly _tag: "report"; readonly report: MeterErrorReport }
  | { readonly _tag: "ignored" }
  | { readonly _tag: "refused" };

/** Stripe's meter error events, as their destination receives them. */
export class MeterErrorEvents extends Context.Service<
  MeterErrorEvents,
  {
    /**
     * Checks the event's signature, then reads the full event from Stripe
     * (it is delivered thin): not answered, it is to be sent again.
     */
    readonly read: (
      body: string,
      signature: string
    ) => Effect.Effect<MeterErrorReading, StripeUnreachable>;
  }
>()("peal-server/billing/application/MeterErrorEvents") {}
