import { Effect, Layer, Option } from "effect";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

/**
 * Billing is on when the server has a Stripe key (STRIPE_SECRET_KEY, see
 * `#shared/infrastructure/stripe-settings.ts`), read when it starts: a
 * malformed setting stops it there.
 */
export const ConfiguredBillingModeLive = Layer.effect(
  BillingMode,
  Effect.gen(function* ConfiguredBillingModeLive() {
    const stripe = yield* stripeSettingsConfig;

    return BillingMode.of({ enabled: Option.isSome(stripe) });
  })
);
