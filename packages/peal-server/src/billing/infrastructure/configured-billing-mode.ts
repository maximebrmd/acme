import { Config, Effect, Layer, Option, Schema } from "effect";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

// A day, as `2027-01-31`: the grace runs until its first instant, UTC.
const GraceDaySchema = Schema.String.check(
  Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u, {
    description: "a day, as YYYY-MM-DD",
  })
).pipe(Schema.decodeTo(Schema.DateTimeUtcFromString));

/**
 * PEAL_BILLING_GRACE_UNTIL, optional (unset or empty: no grace): the day
 * until which a workspace on the free tier over its free accounts still
 * schedules and publishes.
 */
export const graceUntilConfig = Config.option(
  Config.schema(GraceDaySchema, "PEAL_BILLING_GRACE_UNTIL")
);

/**
 * Billing is on when the server has a Stripe key (STRIPE_SECRET_KEY, see
 * `#shared/infrastructure/stripe-settings.ts`), with the grace
 * PEAL_BILLING_GRACE_UNTIL gives, read when it starts: a malformed setting
 * stops it there.
 */
export const ConfiguredBillingModeLive = Layer.effect(
  BillingMode,
  Effect.gen(function* ConfiguredBillingModeLive() {
    const stripe = yield* stripeSettingsConfig;
    const graceUntil = yield* graceUntilConfig;

    return BillingMode.of({ enabled: Option.isSome(stripe), graceUntil });
  })
);
