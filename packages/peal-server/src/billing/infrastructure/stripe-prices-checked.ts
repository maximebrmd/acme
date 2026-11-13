import { Effect, Layer, Match, Option } from "effect";

import { catalogueOf, catalogueProblems } from "#billing/domain/catalogue.ts";
import { priceProblems, publishedPrices } from "#billing/domain/price-check.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

import type { StripeCatalogueUnread } from "./stripe-catalogue-unread.ts";
import {
  heldPricesOf,
  legacyPriceOf,
  readMeters,
  readPrices,
} from "./stripe-catalogue.ts";
import { StripePricesMismatch } from "./stripe-prices-mismatch.ts";
import { StripePricesUnchecked } from "./stripe-prices-unchecked.ts";

// The server waits this long for Stripe before it starts without checking.
const requestTimeout = 10_000;

// Nothing was checked: Stripe refused, or answered what cannot be read.
const uncheckedBy = ({ during, reason }: StripeCatalogueUnread) =>
  new StripePricesUnchecked({
    reason:
      reason === "refused"
        ? "Stripe refused the request"
        : `its answer is not a list of ${during === "listing the meters" ? "meters" : "prices"}`,
  });

/**
 * On a server that bills, checks when it starts that Stripe holds the
 * catalogue the rate card gives (`billing/domain/catalogue.ts`): an active
 * meter summing the events of each line, and under each lookup key an
 * active metered price in dollars, monthly, tax-exclusive, on that meter,
 * at the rate card's tiers or unit amount. It also checks the legacy
 * plans' prices (`billing/domain/prices.ts`): their amount, currency and
 * interval, tax-exclusive. Those are the only plans sold until
 * per-account pricing is, so they are checked whatever the subscriptions.
 * A difference stops the server, saying each one (`StripePricesMismatch`):
 * it would otherwise charge something else than it shows. So does Stripe
 * refusing the request, as with a key revoked, or answering what the check
 * cannot read (`StripePricesUnchecked`): nothing was checked. Stripe not
 * answering at all is logged and the server starts: an outage at Stripe
 * must not keep Peal down, and checkout fails on its own until Stripe is
 * back. The composition root builds it with the server, not with the
 * routes tests serve against stripe-mock, whose one price is none of
 * Peal's.
 */
export const StripePricesCheckedLive = Layer.effectDiscard(
  Effect.gen(function* StripePricesChecked() {
    const settings = yield* stripeSettingsConfig;

    if (Option.isNone(settings)) {
      return;
    }

    const client = stripeClientOf(settings.value, {
      maxNetworkRetries: 1,
      timeout: requestTimeout,
    });

    const catalogue = catalogueOf(settings.value.catalogue);
    const legacy = publishedPrices(settings.value.prices);

    const found = yield* Effect.all({
      meters: readMeters(client),
      prices: readPrices(client, [
        ...catalogue.map(({ lookupKey }) => lookupKey),
        ...legacy.map(({ lookupKey }) => lookupKey),
      ]),
    }).pipe(
      Effect.map(Option.some),
      Effect.catch((error) =>
        Match.value(error.reason).pipe(
          Match.when("unanswered", () =>
            Effect.logWarning(
              "Stripe did not answer when the server started: its prices were not checked against the ones this server publishes"
            ).pipe(Effect.as(Option.none()))
          ),
          Match.orElse(() => Effect.fail(uncheckedBy(error)))
        )
      )
    );

    if (Option.isNone(found)) {
      return;
    }

    const { meters, prices } = found.value;

    const problems = [
      ...catalogueProblems(catalogue, {
        meters,
        prices: heldPricesOf(prices),
        products: [],
      }),
      ...priceProblems(
        legacy,
        prices.flatMap((price) => Option.toArray(legacyPriceOf(price)))
      ),
    ];

    yield* problems.length > 0
      ? Effect.fail(new StripePricesMismatch({ problems }))
      : Effect.logInfo("Stripe's prices match the ones this server publishes");
  }).pipe(Effect.withSpan("Billing.checkStripePrices"))
);
