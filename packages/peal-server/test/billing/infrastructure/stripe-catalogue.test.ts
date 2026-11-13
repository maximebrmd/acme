// The catalogue command, against a stand-in for a Stripe account: what it
// creates in an empty account, that a second run changes nothing, how a
// price with other amounts is replaced, what --check says, and that it
// never prints the key.
import { assert, layer } from "@effect/vitest";
import { Config, Effect, Layer, Option, Redacted, Ref } from "effect";

import { catalogueOf } from "#billing/domain/catalogue.ts";
import { rateCard } from "#billing/domain/rate-card.ts";
import { runCatalogue } from "#billing/infrastructure/stripe-catalogue.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import { catalogueKeysOf } from "#shared/infrastructure/stripe-settings.ts";
import {
  emptyAccount,
  holding,
  meterFor,
  stripeAccount,
} from "#test/billing/fakes/stripe-account.ts";
import { json } from "#test/publishing/fakes/platform-server.ts";

// stripe-mock takes a key that looks like a test key, letters and digits.
const secretKey = "sk_test_0123456789syntheticcatalogue";

const published = catalogueOf(catalogueKeysOf("peal"), rateCard);

// The command run against `url`, with what it printed.
const run = (url: string, check = false) =>
  Effect.gen(function* command() {
    const printed = yield* Ref.make<readonly string[]>([]);

    const outcome = yield* runCatalogue({
      check,
      client: stripeClientOf(
        {
          apiUrl: Option.some(new URL(url)),
          secretKey: Redacted.make(secretKey),
        },
        { maxNetworkRetries: 0 }
      ),
      published,
      report: (line) => Ref.update(printed, (lines) => [...lines, line]),
    }).pipe(Effect.result);

    return { lines: yield* Ref.get(printed), outcome };
  });

const writes = (requests: readonly { readonly method: string }[]) =>
  requests.filter(({ method }) => method === "POST");

layer(Layer.empty)("the Stripe catalogue command", (it) => {
  it.effect(
    "gives an empty account six meters, six products and six prices, then changes nothing",
    () =>
      Effect.gen(function* empty() {
        const stripe = yield* stripeAccount(emptyAccount);

        const first = yield* run(stripe.url);

        assert.isTrue(first.outcome._tag === "Success");

        const held = stripe.held();

        assert.lengthOf(held.meters, 6);
        assert.lengthOf(held.products, 6);
        assert.lengthOf(held.prices, 6);
        assert.deepStrictEqual(
          held.meters.map(({ eventName }) => eventName),
          published.map(({ lookupKey }) => lookupKey)
        );
        assert.deepStrictEqual(
          held.products.map(({ key, taxCode }) => [key, taxCode]),
          published.map(({ lookupKey }) => [lookupKey, "txcd_10103001"])
        );

        // Each price is in dollars only, metered, monthly, tax-exclusive,
        // on its own meter and product.
        for (const [index, price] of held.prices.entries()) {
          assert.strictEqual(price.currency, "usd");
          assert.strictEqual(price.taxBehavior, "exclusive");
          assert.strictEqual(price.lookupKey, published[index]?.lookupKey);
          assert.strictEqual(price.interval, "month");
          assert.strictEqual(price.usageType, "metered");
          assert.strictEqual(price.meter, held.meters[index]?.id);
          assert.strictEqual(price.product, held.products[index]?.id);
        }

        assert.deepStrictEqual(held.prices[0]?.tiers, [
          { flatAmountDecimal: null, unitAmountDecimal: "0", upTo: 60 },
          {
            flatAmountDecimal: null,
            unitAmountDecimal: "16.666666666667",
            upTo: 300,
          },
          { flatAmountDecimal: null, unitAmountDecimal: "10", upTo: 3000 },
          {
            flatAmountDecimal: null,
            unitAmountDecimal: "3.333333333333",
            upTo: null,
          },
        ]);
        assert.strictEqual(held.prices[0]?.tiersMode, "graduated");
        assert.strictEqual(
          held.prices.find(
            ({ lookupKey }) => lookupKey === "peal_outbound_messages"
          )?.unitAmountDecimal,
          "0.01"
        );

        assert.include(
          first.lines,
          "Created meter Connected accounts (mtr_synthetic_1) for the events peal_accounts"
        );

        const before = writes(stripe.requests()).length;
        const second = yield* run(stripe.url);

        assert.isTrue(second.outcome._tag === "Success");
        assert.strictEqual(writes(stripe.requests()).length, before);
        assert.deepStrictEqual(second.lines, [
          "Stripe already holds the catalogue the rate card gives: nothing to change.",
        ]);
      }).pipe(Effect.scoped)
  );

  it.effect(
    "replaces a price with other amounts by a new one that takes its lookup key, leaving the old one active",
    () =>
      Effect.gen(function* replaced() {
        const account = holding(published);

        const stripe = yield* stripeAccount({
          ...account,
          prices: account.prices.map((price) =>
            price.lookupKey === "peal_managed_ads"
              ? { ...price, unitAmountDecimal: "2" }
              : price
          ),
        });

        const { lines, outcome } = yield* run(stripe.url);

        assert.isTrue(outcome._tag === "Success");

        assert.deepStrictEqual(
          stripe
            .held()
            .prices.flatMap((price) =>
              price.product === "prod_peal_managed_ads"
                ? [
                    [
                      price.id,
                      price.active,
                      price.lookupKey,
                      price.unitAmountDecimal,
                    ],
                  ]
                : []
            ),
          [
            ["price_peal_managed_ads", true, null, "2"],
            ["price_synthetic_1", true, "peal_managed_ads", "1"],
          ]
        );
        assert.deepStrictEqual(lines, [
          "Created price Managed ads (price_synthetic_1) under peal_managed_ads, in place of price_peal_managed_ads, left active for the subscriptions on it",
        ]);
        assert.lengthOf(writes(stripe.requests()), 1);
      }).pipe(Effect.scoped)
  );

  it.effect("with --check, says what differs and changes nothing", () =>
    Effect.gen(function* checked() {
      const account = holding(published);

      const stripe = yield* stripeAccount({
        ...account,
        meters: account.meters.filter(
          ({ eventName }) => eventName !== "peal_x_api"
        ),
      });

      const { lines, outcome } = yield* run(stripe.url, true);

      assert.isTrue(outcome._tag === "Failure");

      if (outcome._tag === "Failure") {
        assert.strictEqual(outcome.failure._tag, "StripeCatalogueDiffers");
        assert.deepStrictEqual(
          outcome.failure._tag === "StripeCatalogueDiffers"
            ? outcome.failure.problems
            : [],
          [
            "X API usage at X's rates: a new meter for the events peal_x_api",
            "X API usage at X's rates: a new price under peal_x_api, which replaces price_peal_x_api (left active for the subscriptions on it): it must read the new meter",
          ]
        );
      }

      assert.deepStrictEqual(lines, []);
      assert.lengthOf(writes(stripe.requests()), 0);

      const matching = yield* stripeAccount(holding(published));
      const clean = yield* run(matching.url, true);

      assert.isTrue(clean.outcome._tag === "Success");
      assert.deepStrictEqual(clean.lines, [
        "Stripe holds the catalogue the rate card gives.",
      ]);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "changes nothing when a meter counts otherwise, as Stripe cannot change one",
    () =>
      Effect.gen(function* blocked() {
        const account = holding(published);
        const [accounts] = published;

        assert.isDefined(accounts);

        const stripe = yield* stripeAccount({
          ...account,
          meters: [
            { ...meterFor(accounts), formula: "count" },
            ...account.meters.slice(1),
          ],
          prices: account.prices.slice(1),
        });

        const { outcome } = yield* run(stripe.url);

        assert.isTrue(outcome._tag === "Failure");

        if (outcome._tag === "Failure") {
          assert.include(
            outcome.failure.message,
            "peal_accounts: its meter aggregates by count, not sum. Stripe cannot change it: deactivate meter mtr_peal_accounts at Stripe, then run this again."
          );
        }

        assert.lengthOf(writes(stripe.requests()), 0);
      }).pipe(Effect.scoped)
  );

  // stripe-mock checks each request against Stripe's API, and answers
  // canned objects: none is Peal's, so every line is made.
  it.effect("asks Stripe what its API takes", () =>
    Effect.gen(function* mock() {
      const apiUrl = yield* Config.String("STRIPE_MOCK_URL").pipe(
        Config.withDefault("http://127.0.0.1:12111")
      );

      const { lines, outcome } = yield* run(apiUrl);

      assert.isTrue(outcome._tag === "Success");
      assert.lengthOf(lines, 18);
    })
  );

  it.effect("never prints the key, even when Stripe refuses it", () =>
    Effect.gen(function* secret() {
      const refusing = yield* stripeAccount(emptyAccount, () =>
        Option.some(
          json(
            {
              error: {
                message: `Invalid API Key provided: ${secretKey}`,
                type: "invalid_request_error",
              },
            },
            401
          )
        )
      );

      const refused = yield* run(refusing.url);

      assert.isTrue(refused.outcome._tag === "Failure");

      if (refused.outcome._tag === "Failure") {
        assert.strictEqual(
          refused.outcome.failure._tag,
          "StripeCatalogueUnread"
        );
        assert.include(
          refused.outcome.failure.message,
          "Stripe refused it (StripeAuthenticationError)"
        );
        assert.notInclude(refused.outcome.failure.message, secretKey);
        assert.notInclude(refused.outcome.failure.message, "sk_");
      }

      const stripe = yield* stripeAccount(emptyAccount);
      const made = yield* run(stripe.url);

      assert.isAbove(made.lines.length, 0);

      for (const line of made.lines) {
        assert.notInclude(line, secretKey);
        assert.notInclude(line, "sk_");
      }
    }).pipe(Effect.scoped)
  );
});
