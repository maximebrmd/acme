import { Config, Option, Redacted, Schema } from "effect";

import type { PaidPlan } from "#shared/domain/plan.ts";

/** The lookup keys of a plan's Stripe prices, monthly and yearly. */
export interface PlanLookupKeys {
  readonly month: string;
  readonly year: string;
}

/** How this server bills through Stripe. */
export interface StripeSettings {
  /**
   * Where the Stripe API is reached: Stripe's own unless STRIPE_API_URL
   * names another, such as stripe-mock in tests.
   */
  readonly apiUrl: Option.Option<URL>;
  /**
   * The lookup keys of the Stripe prices each paid plan is sold at, monthly
   * and yearly: `<prefix>_<plan>_monthly` and `<prefix>_<plan>_yearly`, the
   * prefix being STRIPE_LOOKUP_KEY_PREFIX (`peal` unless set). Lookup keys
   * rather than ids, so the same settings work in every Stripe account and
   * a price can be replaced at Stripe by moving its key.
   */
  readonly prices: Readonly<Record<PaidPlan, PlanLookupKeys>>;
  readonly secretKey: Redacted.Redacted;
  /** Checks that webhooks come from Stripe (their `stripe-signature`). */
  readonly webhookSecret: Redacted.Redacted;
}

// A secret that is set: unset and empty both read as none.
const optionalSecret = (name: string) =>
  Config.option(Config.Redacted(name)).pipe(
    Config.map(Option.filter((value) => Redacted.value(value).trim() !== ""))
  );

const requiredSecret = (name: string) =>
  Config.schema(Schema.Redacted(Schema.NonEmptyString), name);

// Letters, digits and underscores, as a lookup key is written in Stripe's
// dashboard; at most 200 characters with the plan and interval after it.
const LookupKeyPrefixSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9_]{1,160}$/u)
);

/** The lookup keys of each plan's prices, under `prefix`. */
export const lookupKeysOf = (
  prefix: string
): Readonly<Record<PaidPlan, PlanLookupKeys>> => {
  const keys = (plan: PaidPlan): PlanLookupKeys => ({
    month: `${prefix}_${plan}_monthly`,
    year: `${prefix}_${plan}_yearly`,
  });

  return {
    agency: keys("agency"),
    business: keys("business"),
    pro: keys("pro"),
    starter: keys("starter"),
  };
};

const billing = (secretKey: Redacted.Redacted) =>
  Config.all({
    apiUrl: Config.option(Config.URL("STRIPE_API_URL")),
    prices: Config.schema(
      LookupKeyPrefixSchema,
      "STRIPE_LOOKUP_KEY_PREFIX"
    ).pipe(Config.withDefault("peal"), Config.map(lookupKeysOf)),
    webhookSecret: requiredSecret("STRIPE_WEBHOOK_SECRET"),
  }).pipe(
    Config.map((settings): StripeSettings => ({ ...settings, secretKey }))
  );

/**
 * Billing, read from the environment. Off, with no plans and no limits, as
 * long as STRIPE_SECRET_KEY is unset or empty, which suits a self-hosted
 * server. With it, the server also needs:
 *
 * - `STRIPE_WEBHOOK_SECRET`: the signing secret of the webhook endpoint
 *   that sends `${PUBLIC_URL}/api/auth/stripe/webhook` the subscription
 *   events;
 *
 * and reads `STRIPE_LOOKUP_KEY_PREFIX` (the prices' lookup keys,
 * `peal_<plan>_monthly` and `peal_<plan>_yearly` unless set) and
 * `STRIPE_API_URL`. Checkout always has Stripe Tax compute the VAT, as the
 * prices are tax-exclusive and every page shows them VAT included: the
 * Stripe account needs Stripe Tax set up. A webhook secret without a key
 * stops the server: one of the two is a mistake.
 */
export const stripeSettingsConfig = Config.all({
  secretKey: optionalSecret("STRIPE_SECRET_KEY"),
  webhookSecret: optionalSecret("STRIPE_WEBHOOK_SECRET"),
}).pipe(
  Config.flatMap(({ secretKey, webhookSecret }) =>
    Option.match(secretKey, {
      onNone: () =>
        Option.isSome(webhookSecret)
          ? requiredSecret("STRIPE_SECRET_KEY").pipe(
              Config.map(() => Option.none<StripeSettings>())
            )
          : Config.succeed(Option.none<StripeSettings>()),
      onSome: (key) => billing(key).pipe(Config.map(Option.some)),
    })
  )
);
