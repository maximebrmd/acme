import { Effect, Layer, Match, Metric, Option, Result } from "effect";

import { LegacySubscriptions } from "#billing/application/ports/legacy-subscriptions.ts";
import {
  catalogueAtStart,
  catalogueOf,
  catalogueProblems,
} from "#billing/domain/catalogue.ts";
import type { CatalogueAtStart, HeldMeter } from "#billing/domain/catalogue.ts";
import { priceProblems, publishedPrices } from "#billing/domain/price-check.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

import { DrizzleLegacySubscriptionsLive } from "./drizzle-legacy-subscriptions.ts";
import { catalogueCommand } from "./stripe-catalogue-command.ts";
import type { StripeCatalogueUnread } from "./stripe-catalogue-unread.ts";
import {
  heldPricesOf,
  legacyPriceOf,
  readMeters,
  readPrices,
  readProducts,
} from "./stripe-catalogue.ts";
import { StripePricesMismatch } from "./stripe-prices-mismatch.ts";
import { StripePricesUnchecked } from "./stripe-prices-unchecked.ts";

// The server waits this long for Stripe before it starts without checking.
const requestTimeout = 10_000;

/**
 * How many differences the server found between Stripe's catalogue and
 * the rate card's when it started, 0 when none: while they only warn, an
 * alert rule reads it (peal-stripe-catalogue).
 */
export const catalogueProblemsAtStart = Metric.gauge(
  "peal.billing.stripe_catalogue.problems",
  {
    description:
      "Differences between Stripe's catalogue and the rate card's found when the server started",
  }
);

// Nothing was checked: Stripe refused, or answered what cannot be read.
const uncheckedReason = ({ during, reason }: StripeCatalogueUnread): string =>
  reason === "refused"
    ? "Stripe refused the request"
    : `its answer is not a list of ${during === "listing the meters" ? "meters" : "prices"}`;

/** The warning a server that starts on a catalogue that differs logs. */
export const catalogueWarning = (problems: readonly string[]): string =>
  [
    "Stripe does not hold the rate card's catalogue (billing/domain/rate-card.ts), which per-account pricing bills with. The server starts, as its check only warns:",
    ...problems.map((problem) => `- ${problem}`),
    `Give Stripe the catalogue with the server's image: ${catalogueCommand}.`,
  ].join("\n");

const unanswered = (
  unread: StripeCatalogueUnread
): Effect.Effect<Option.Option<never>, StripePricesUnchecked> =>
  Match.value(unread.reason).pipe(
    Match.when("unanswered", () =>
      Effect.logWarning(
        "Stripe did not answer when the server started: its prices were not checked against the ones this server publishes"
      ).pipe(Effect.as(Option.none()))
    ),
    Match.orElse(() =>
      Effect.fail(
        new StripePricesUnchecked({ reason: uncheckedReason(unread) })
      )
    )
  );

/**
 * On a server that bills, checks when it starts that Stripe holds the
 * catalogue the rate card gives (`billing/domain/catalogue.ts`): an active
 * meter summing the events of each line, and under each lookup key an
 * active metered price in dollars, monthly, tax-exclusive, on that meter,
 * at the rate card's tiers or unit amount, on a product that is not
 * archived (checkout refuses one). While a subscription to a legacy plan
 * still entitles a workspace (`LegacySubscriptions`), it also checks the
 * legacy plans' prices (`billing/domain/prices.ts`): their amount,
 * currency and interval, tax-exclusive; once none does, a Stripe account
 * needs none of them. A difference stops the server, saying each one
 * (`StripePricesMismatch`): it would otherwise charge something else than
 * it shows. So does Stripe refusing a request, as with a key revoked, or
 * answering what the check cannot read (`StripePricesUnchecked`): nothing
 * was checked. Stripe not answering at all is logged and the server
 * starts: an outage at Stripe must not keep Peal down, and checkout fails
 * on its own until Stripe is back. The meters, prices and products are
 * read together, so an outage costs one wait, not three.
 *
 * What the catalogue does follows `atStart`: with `stop`, which the
 * server runs now per-account pricing is sold, it stops the server as a
 * plan price does; with `warn`, a catalogue that differs, or meters
 * Stripe refuses or garbles, is a warning naming the command that gives
 * it, counted in `catalogueProblemsAtStart`, which an alert reads. The
 * composition root builds it with the server, not with the routes tests
 * serve against stripe-mock, whose one price is none of Peal's.
 */
export const stripePricesChecked = (atStart: CatalogueAtStart) =>
  Layer.effectDiscard(
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

      const legacy = (yield* LegacySubscriptions.use(
        ({ entitling }) => entitling
      ).pipe(Effect.orDie))
        ? publishedPrices(settings.value.prices)
        : [];

      // Meters Stripe refused or garbled only warn while the catalogue
      // does: what Stripe said of them is the problem then.
      const meterProblem = (
        unread: StripeCatalogueUnread
      ): Effect.Effect<
        Option.Option<Result.Result<readonly HeldMeter[], string>>,
        StripePricesUnchecked
      > =>
        atStart === "warn" && unread.reason !== "unanswered"
          ? Effect.succeed(
              Option.some(
                Result.fail(
                  `the meters could not be read: ${uncheckedReason(unread)}`
                )
              )
            )
          : unanswered(unread);

      const meterReading = readMeters(client).pipe(
        Effect.map((found) => Option.some(Result.succeed(found))),
        Effect.catch(meterProblem)
      );

      const [meters, prices, products] = yield* Effect.all(
        [
          meterReading,
          readPrices(client, [
            ...catalogue.map(({ lookupKey }) => lookupKey),
            ...legacy.map(({ lookupKey }) => lookupKey),
          ]).pipe(Effect.map(Option.some), Effect.catch(unanswered)),
          readProducts(client).pipe(
            Effect.map(Option.some),
            Effect.catch(unanswered)
          ),
        ],
        { concurrency: "unbounded" }
      );

      if (
        Option.isNone(meters) ||
        Option.isNone(prices) ||
        Option.isNone(products)
      ) {
        return;
      }

      const ofCatalogue = Result.match(meters.value, {
        onFailure: (problem) => [problem],
        onSuccess: (found) =>
          catalogueProblems(catalogue, {
            meters: found,
            prices: heldPricesOf(prices.value),
            products: products.value,
          }),
      });

      const ofPlans = priceProblems(
        legacy,
        prices.value.flatMap((price) => Option.toArray(legacyPriceOf(price)))
      );

      yield* Metric.update(catalogueProblemsAtStart, ofCatalogue.length);

      const stopping = atStart === "stop" ? ofCatalogue : [];

      if (atStart === "warn" && ofCatalogue.length > 0) {
        yield* Effect.logWarning(catalogueWarning(ofCatalogue));
      }

      const problems = [...stopping, ...ofPlans];

      yield* problems.length > 0
        ? Effect.fail(new StripePricesMismatch({ problems }))
        : Effect.logInfo(
            "Stripe's prices match the ones this server publishes"
          );
    }).pipe(Effect.withSpan("Billing.checkStripePrices"))
  );

/**
 * The check the server runs (see `catalogueAtStart`), reading the legacy
 * subscriptions from the database, migrated before it.
 */
export const StripePricesCheckedLive = stripePricesChecked(
  catalogueAtStart
).pipe(Layer.provide(DrizzleLegacySubscriptionsLive));
