import { Schema } from "effect";

/**
 * Stripe's prices are not the ones this server publishes: it would charge
 * something else than every page shows, so it does not start.
 */
export class StripePricesMismatch extends Schema.TaggedError<StripePricesMismatch>()(
  "StripePricesMismatch",
  { problems: Schema.Array(Schema.String) }
) {
  override get message(): string {
    return [
      "Stripe's prices are not the ones this server publishes (billing/domain/prices.ts), so it does not start:",
      ...this.problems.map((problem) => `- ${problem}`),
      "Create or correct them at Stripe (docs: self-hosting, Stripe), or set STRIPE_LOOKUP_KEY_PREFIX to the prefix of the right ones.",
    ].join("\n");
  }
}
