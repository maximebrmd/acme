import { Config, Option, Redacted, Schema } from "effect";

import type { LegacyPaidPlan } from "#shared/domain/plan.ts";

/** The lookup keys of a plan's Stripe prices, monthly and yearly. */
export interface PlanLookupKeys {
  readonly month: string;
  readonly year: string;
}

/**
 * The lookup keys of per-account pricing's prices at Stripe, one per line
 * of the invoice: the connected accounts' ladder and each meter of the rate
 * card (`billing/domain/rate-card.ts`). Each is also the event name of the
 * line's Stripe meter.
 */
export interface CatalogueLookupKeys {
  readonly accounts: string;
  readonly assistantImages: string;
  readonly assistantRequests: string;
  readonly managedAds: string;
  readonly outboundMessages: string;
  readonly xApi: string;
}

/** How this server bills through Stripe. */
export interface StripeSettings {
  /**
   * Where the Stripe API is reached: Stripe's own unless STRIPE_API_URL
   * names another, such as stripe-mock in tests.
   */
  readonly apiUrl: Option.Option<URL>;
  /**
   * The lookup keys of per-account pricing's prices, `<prefix>_accounts`,
   * `<prefix>_outbound_messages`…, the prefix being the plans' below.
   */
  readonly catalogue: CatalogueLookupKeys;
  /**
   * The lookup keys of the Stripe prices each paid plan is sold at, monthly
   * and yearly: `<prefix>_<plan>_monthly` and `<prefix>_<plan>_yearly`, the
   * prefix being STRIPE_LOOKUP_KEY_PREFIX (`peal` unless set). Lookup keys
   * rather than ids, so the same settings work in every Stripe account and
   * a price can be replaced at Stripe by moving its key.
   */
  readonly prices: Readonly<Record<LegacyPaidPlan, PlanLookupKeys>>;
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

/**
 * STRIPE_LOOKUP_KEY_PREFIX, `peal` unless set: the start of every lookup
 * key and meter event name this server reads at Stripe.
 */
export const lookupKeyPrefixConfig = Config.schema(
  LookupKeyPrefixSchema,
  "STRIPE_LOOKUP_KEY_PREFIX"
).pipe(Config.withDefault("peal"));

/** The lookup keys of per-account pricing's prices, under `prefix`. */
export const catalogueKeysOf = (prefix: string): CatalogueLookupKeys => ({
  accounts: `${prefix}_accounts`,
  assistantImages: `${prefix}_assistant_images`,
  assistantRequests: `${prefix}_assistant_requests`,
  managedAds: `${prefix}_managed_ads`,
  outboundMessages: `${prefix}_outbound_messages`,
  xApi: `${prefix}_x_api`,
});

/** The lookup keys of each legacy plan's prices, under `prefix`. */
export const lookupKeysOf = (
  prefix: string
): Readonly<Record<LegacyPaidPlan, PlanLookupKeys>> => {
  const keys = (plan: LegacyPaidPlan): PlanLookupKeys => ({
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
    prefix: lookupKeyPrefixConfig,
    webhookSecret: requiredSecret("STRIPE_WEBHOOK_SECRET"),
  }).pipe(
    Config.map(({ apiUrl, prefix, webhookSecret }): StripeSettings => ({
      apiUrl,
      catalogue: catalogueKeysOf(prefix),
      prices: lookupKeysOf(prefix),
      secretKey,
      webhookSecret,
    }))
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
 * `peal_accounts`… and `peal_<plan>_monthly`, `peal_<plan>_yearly` unless
 * set) and
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
