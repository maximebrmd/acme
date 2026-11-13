// The check a server that bills makes of Stripe's catalogue and plan
// prices when it starts, against a stand-in for a Stripe account, and
// against stripe-mock, whose one price is none of Peal's.
import { assert, layer } from "@effect/vitest";
import {
  Config,
  ConfigProvider,
  Effect,
  Layer,
  Logger,
  Metric,
  Option,
} from "effect";

import { LegacySubscriptions } from "#billing/application/ports/legacy-subscriptions.ts";
import { catalogueOf } from "#billing/domain/catalogue.ts";
import { priceOf } from "#billing/domain/prices.ts";
import { rateCard } from "#billing/domain/rate-card.ts";
import {
  catalogueProblemsAtStart,
  stripePricesChecked,
} from "#billing/infrastructure/stripe-prices-checked.ts";
import { LegacyPaidPlanSchema } from "#shared/domain/plan.ts";
import { catalogueKeysOf } from "#shared/infrastructure/stripe-settings.ts";
import { holding, stripeAccount } from "#test/billing/fakes/stripe-account.ts";
import type {
  FakePrice,
  StripeAccountState,
} from "#test/billing/fakes/stripe-account.ts";
import { empty, json } from "#test/publishing/fakes/platform-server.ts";
import type { PlatformRequest } from "#test/publishing/fakes/platform-server.ts";

const published = catalogueOf(catalogueKeysOf("peal"), rateCard);

// The legacy plans' prices as Stripe lists them: each plan's, monthly and
// yearly, in euros, tax-exclusive.
const legacyPrices: readonly FakePrice[] =
  LegacyPaidPlanSchema.literals.flatMap((plan) =>
    (["month", "year"] as const).map((interval) => ({
      active: true,
      billingScheme: "per_unit",
      currency: "eur",
      id: `price_${plan}_${interval}`,
      interval,
      intervalCount: 1,
      lookupKey: `peal_${plan}_${interval}ly`,
      meter: null,
      product: `prod_${plan}`,
      taxBehavior: "exclusive",
      tiers: null,
      tiersMode: null,
      unitAmountDecimal: String(priceOf(plan, interval)),
      usageType: "licensed",
    }))
  );

// A Stripe account holding all Peal publishes, as it should be.
const complete: StripeAccountState = {
  ...holding(published),
  prices: [...holding(published).prices, ...legacyPrices],
};

const changing = (
  lookupKey: string,
  change: (price: FakePrice) => FakePrice
): StripeAccountState => ({
  ...complete,
  prices: complete.prices.map((price) =>
    price.lookupKey === lookupKey ? change(price) : price
  ),
});

// The check the server runs, now per-account pricing is sold: a catalogue
// that differs stops the server.
const stopping = stripePricesChecked("stop");

// The check as it was before: a catalogue that differs only warns.
const warning = stripePricesChecked("warn");

// The server starting, as far as the check goes, while a legacy plan's
// subscription entitles a workspace (`legacy`) or none does.
const startingOn = (
  settings: Readonly<Record<string, string>>,
  check: typeof stopping = stopping,
  legacy = true
) =>
  Layer.build(
    check.pipe(
      Layer.provide(LegacySubscriptions.layerEntitling(legacy)),
      Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(settings)))
    )
  ).pipe(Effect.scoped, Effect.asVoid);

const billingOn = (
  apiUrl: string,
  check: typeof stopping = stopping,
  legacy = true
) =>
  startingOn(
    {
      STRIPE_API_URL: apiUrl,
      STRIPE_SECRET_KEY: "sk_test_0123456789syntheticprices",
      STRIPE_WEBHOOK_SECRET: "whsec_synthetic_prices",
    },
    check,
    legacy
  );

// The start, with the warnings it logged.
const warnedOn = (apiUrl: string) =>
  Effect.gen(function* warned() {
    const lines: string[] = [];

    const logs = Logger.layer([
      Logger.make(({ logLevel, message }) => {
        if (logLevel === "Warn") {
          lines.push(String(message));
        }
      }),
    ]);

    yield* billingOn(apiUrl, warning).pipe(Effect.provide(logs));

    return lines;
  });

const problemsCounted = Metric.value(catalogueProblemsAtStart).pipe(
  Effect.map(({ value }) => value)
);

// Legacy prices only: an account as it was before the catalogue.
const legacyOnly: StripeAccountState = {
  meters: [],
  prices: legacyPrices,
  products: [],
};

const lookupKeysAsked = (requests: readonly PlatformRequest[]) =>
  requests.flatMap(({ path, query }) =>
    path === "/v1/prices"
      ? [...query.entries()].flatMap(([name, value]) =>
          name.startsWith("lookup_keys") ? [value] : []
        )
      : []
  );

const mismatchHeader =
  "Stripe's prices are not the ones this server publishes (billing/domain/rate-card.ts and billing/domain/prices.ts), so it does not start:";

const mismatchFooter =
  "Give Stripe the rate card's catalogue with the server's image (docker compose run --rm --no-deps server packages/peal-server/scripts/stripe-catalogue.ts; from the repository, bun nx run peal-server:stripe-catalogue), create or correct the plans' prices at Stripe (docs: self-hosting, Billing), or set STRIPE_LOOKUP_KEY_PREFIX to the prefix of the right ones.";

layer(Layer.empty)("Stripe's prices when the server starts", (it) => {
  it.effect(
    "lets a server start whose catalogue and plan prices match what Peal publishes",
    () =>
      Effect.gen(function* matching() {
        const stripe = yield* stripeAccount(complete);

        yield* billingOn(stripe.url);

        // Every page of the active meters and of the products, and the
        // catalogue's six keys and, while a legacy plan's subscription
        // entitles, the plans' eight, ten a call, with the tiers: read
        // together.
        assert.sameMembers(lookupKeysAsked(stripe.requests()), [
          ...published.map(({ lookupKey }) => lookupKey),
          ...LegacyPaidPlanSchema.literals.flatMap((plan) => [
            `peal_${plan}_monthly`,
            `peal_${plan}_yearly`,
          ]),
        ]);
        assert.sameMembers(
          [
            ...new Set(
              stripe.requests().map(({ method, path }) => `${method} ${path}`)
            ),
          ],
          ["GET /v1/billing/meters", "GET /v1/prices", "GET /v1/products"]
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "stops a server whose catalogue or plan prices are missing or differ, saying which",
    () =>
      Effect.gen(function* differing() {
        const account = changing("peal_outbound_messages", (price) => ({
          ...price,
          unitAmountDecimal: "0.02",
        }));

        const stripe = yield* stripeAccount({
          ...account,
          meters: account.meters.filter(
            ({ eventName }) => eventName !== "peal_managed_ads"
          ),
          prices: account.prices.flatMap((price) => {
            if (price.lookupKey === "peal_starter_monthly") {
              return [];
            }

            return price.lookupKey === "peal_pro_monthly"
              ? [
                  {
                    ...price,
                    taxBehavior: "inclusive",
                    unitAmountDecimal: "1500",
                  },
                ]
              : [price];
          }),
        });

        const stopped = yield* billingOn(stripe.url, stopping).pipe(
          Effect.flip
        );

        assert.strictEqual(stopped._tag, "StripePricesMismatch");
        assert.strictEqual(
          stopped.message,
          [
            mismatchHeader,
            "- peal_managed_ads: Stripe has no active meter with this event name",
            "- peal_outbound_messages: Stripe charges 0.02 cents a unit, the rate card 0.01",
            "- peal_starter_monthly: Stripe has no active price with this lookup key",
            "- peal_pro_monthly: Stripe charges 1500 eur, the pro plan costs 1250 eur excluding VAT",
            "- peal_pro_monthly: its tax behavior at Stripe is inclusive, not exclusive, so the VAT would not be added to it",
            mismatchFooter,
          ].join("\n")
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "stops a server whose ladder is not graduated on the rate card's tiers",
    () =>
      Effect.gen(function* ladder() {
        const stripe = yield* stripeAccount(
          changing("peal_accounts", (price) => ({
            ...price,
            tiersMode: "volume",
          }))
        );

        const stopped = yield* billingOn(stripe.url, stopping).pipe(
          Effect.flip
        );

        assert.strictEqual(stopped._tag, "StripePricesMismatch");
        assert.include(
          stopped.message,
          "- peal_accounts: Stripe prices its tiers by volume, not graduated"
        );
      }).pipe(Effect.scoped)
  );

  it.effect("stops on stripe-mock's catalogue, which is none of Peal's", () =>
    Effect.gen(function* mock() {
      const apiUrl = yield* Config.String("STRIPE_MOCK_URL").pipe(
        Config.withDefault("http://127.0.0.1:12111")
      );

      const stopped = yield* billingOn(apiUrl, stopping).pipe(Effect.flip);

      assert.strictEqual(stopped._tag, "StripePricesMismatch");
      assert.include(
        stopped.message,
        "peal_accounts: Stripe has no active meter with this event name"
      );
      assert.include(
        stopped.message,
        "peal_agency_yearly: Stripe has no active price with this lookup key"
      );
    })
  );

  it.effect("starts, with a warning, while Stripe does not answer", () =>
    Effect.gen(function* unreachable() {
      const prices = yield* stripeAccount(complete, () =>
        Option.some(empty(500))
      );

      yield* billingOn(prices.url);
      assert.isAbove(prices.requests().length, 0);

      // Nor when only its meters do not answer.
      const meters = yield* stripeAccount(complete, ({ path }) =>
        path === "/v1/billing/meters" ? Option.some(empty(503)) : Option.none()
      );

      yield* billingOn(meters.url);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "stops when Stripe refuses the key, or answers what the check cannot read: nothing was checked",
    () =>
      Effect.gen(function* refused() {
        const revoked = yield* stripeAccount(complete, () =>
          Option.some(
            json(
              {
                error: {
                  message: "Invalid API Key provided",
                  type: "invalid_request_error",
                },
              },
              401
            )
          )
        );

        const unreadablePrices = yield* stripeAccount(complete, ({ path }) =>
          path === "/v1/prices"
            ? Option.some(json({ object: "list", url: "/v1/prices" }))
            : Option.none()
        );

        const unreadableMeters = yield* stripeAccount(complete, ({ path }) =>
          path === "/v1/billing/meters"
            ? Option.some(
                json({
                  data: [{ id: "mtr_synthetic" }],
                  has_more: false,
                  object: "list",
                })
              )
            : Option.none()
        );

        const failures = yield* Effect.forEach(
          [revoked, unreadablePrices, unreadableMeters],
          (stripe) =>
            billingOn(stripe.url, stopping).pipe(
              Effect.flip,
              Effect.map(({ _tag, message }) => [_tag, message] as const)
            )
        );

        assert.deepStrictEqual(
          failures.map(([tag]) => tag),
          [
            "StripePricesUnchecked",
            "StripePricesUnchecked",
            "StripePricesUnchecked",
          ]
        );
        assert.include(failures[0]?.[1], "Stripe refused the request");
        assert.include(failures[1]?.[1], "its answer is not a list of prices");
        assert.include(failures[2]?.[1], "its answer is not a list of meters");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "needs no legacy price once no legacy plan's subscription entitles, and asks for none",
    () =>
      Effect.gen(function* fresh() {
        const stripe = yield* stripeAccount(holding(published));

        yield* billingOn(stripe.url, stopping, false);

        assert.sameMembers(
          lookupKeysAsked(stripe.requests()),
          published.map(({ lookupKey }) => lookupKey)
        );

        // While one entitles, the same account stops the server.
        const stopped = yield* billingOn(stripe.url, stopping, true).pipe(
          Effect.flip
        );

        assert.include(
          stopped.message,
          "peal_starter_monthly: Stripe has no active price with this lookup key"
        );
      }).pipe(Effect.scoped)
  );

  it.effect("stops on a price whose product is archived", () =>
    Effect.gen(function* archived() {
      const stripe = yield* stripeAccount({
        ...complete,
        products: complete.products.map((product) =>
          product.key === "peal_managed_ads"
            ? { ...product, active: false }
            : product
        ),
      });

      const stopped = yield* billingOn(stripe.url).pipe(Effect.flip);

      assert.strictEqual(stopped._tag, "StripePricesMismatch");
      assert.include(stopped.message, "peal_managed_ads");
    }).pipe(Effect.scoped)
  );

  it.effect(
    "starts with `warn` on an account without the catalogue, warning with the command that gives it",
    () =>
      Effect.gen(function* warns() {
        const stripe = yield* stripeAccount(legacyOnly);

        const warnings = yield* warnedOn(stripe.url);

        assert.lengthOf(warnings, 1);
        assert.include(
          warnings[0],
          "- peal_accounts: Stripe has no active meter with this event name"
        );
        assert.include(
          warnings[0],
          "docker compose run --rm --no-deps server packages/peal-server/scripts/stripe-catalogue.ts"
        );
        assert.strictEqual(yield* problemsCounted, 12);

        // Once Stripe holds it, nothing is said, and nothing counted.
        const complete_ = yield* stripeAccount(complete);

        assert.deepStrictEqual(yield* warnedOn(complete_.url), []);
        assert.strictEqual(yield* problemsCounted, 0);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "still stops with `warn` on plan prices that differ, naming only them",
    () =>
      Effect.gen(function* legacy() {
        const stripe = yield* stripeAccount({
          ...legacyOnly,
          prices: legacyPrices.filter(
            ({ lookupKey }) => lookupKey !== "peal_starter_monthly"
          ),
        });

        const stopped = yield* billingOn(stripe.url, warning).pipe(Effect.flip);

        assert.strictEqual(stopped._tag, "StripePricesMismatch");
        assert.strictEqual(
          stopped.message,
          [
            mismatchHeader,
            "- peal_starter_monthly: Stripe has no active price with this lookup key",
            mismatchFooter,
          ].join("\n")
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "starts with `warn` when Stripe refuses or garbles only the meters, warning",
    () =>
      Effect.gen(function* meters() {
        const stripe = yield* stripeAccount(complete, ({ path }) =>
          path === "/v1/billing/meters"
            ? Option.some(json({ data: [{ id: "mtr_synthetic" }] }))
            : Option.none()
        );

        const warnings = yield* warnedOn(stripe.url);

        assert.lengthOf(warnings, 1);
        assert.include(warnings[0], "its answer is not a list of meters");
        assert.strictEqual(yield* problemsCounted, 1);
      }).pipe(Effect.scoped)
  );

  it.effect("asks Stripe nothing on a server that does not bill", () =>
    startingOn({})
  );
});
