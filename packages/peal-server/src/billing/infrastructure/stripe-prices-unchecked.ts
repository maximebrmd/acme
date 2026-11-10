import { Schema } from "effect";

/**
 * Stripe answered the price check with a refusal, as for a key revoked or
 * without the right to read prices, or with something the check cannot
 * read: nothing was checked, and asking again would change nothing, so the
 * server does not start. Stripe not answering at all is another matter:
 * the server then starts, with a warning.
 */
export class StripePricesUnchecked extends Schema.TaggedError<StripePricesUnchecked>()(
  "StripePricesUnchecked",
  { reason: Schema.String }
) {
  override get message(): string {
    return `Stripe's prices could not be checked against the ones this server publishes, so it does not start: ${this.reason}. Check STRIPE_SECRET_KEY and what the key may read (docs: self-hosting, Stripe).`;
  }
}
