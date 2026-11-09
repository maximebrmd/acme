import { Config, Option, Redacted, Schema } from "effect";

import type { PaidPlan } from "#shared/domain/plan.ts";

/** How this server bills through Stripe. */
export interface StripeSettings {
  /**
   * Where the Stripe API is reached: Stripe's own unless STRIPE_API_URL
   * names another, such as stripe-mock in tests.
   */
  readonly apiUrl: Option.Option<URL>;
  /**
   * Whether checkout computes and collects tax (Stripe Tax), such as EU VAT
   * from the customer's address and VAT number.
   */
  readonly automaticTax: boolean;
  /** The Stripe price each paid plan is sold at, monthly. */
  readonly prices: Readonly<Record<PaidPlan, string>>;
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

const billing = (secretKey: Redacted.Redacted) =>
  Config.all({
    apiUrl: Config.option(Config.URL("STRIPE_API_URL")),
    automaticTax: Config.Boolean("STRIPE_AUTOMATIC_TAX").pipe(
      Config.withDefault(false)
    ),
    prices: Config.all({
      business: Config.NonEmptyString("STRIPE_PRICE_BUSINESS"),
      pro: Config.NonEmptyString("STRIPE_PRICE_PRO"),
    }),
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
 * - `STRIPE_PRICE_PRO` and `STRIPE_PRICE_BUSINESS`: the monthly price of
 *   each paid plan;
 *
 * and reads `STRIPE_AUTOMATIC_TAX` (`false` unless set: Stripe Tax must be
 * set up in the account first) and `STRIPE_API_URL`. A webhook secret
 * without a key stops the server: one of the two is a mistake.
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
