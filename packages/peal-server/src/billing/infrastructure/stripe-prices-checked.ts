import { Array as Arr, Effect, Layer, Option, Schema } from "effect";

import { priceProblems, publishedPrices } from "#billing/domain/price-check.ts";
import type { StripePrice } from "#billing/domain/price-check.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

import { StripePricesMismatch } from "./stripe-prices-mismatch.ts";
import { StripePricesUnchecked } from "./stripe-prices-unchecked.ts";

// The server waits this long for Stripe before it starts without checking.
const requestTimeout = 10_000;

// What the check reads of a price. Stripe sends more.
const PriceListSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      currency: Schema.String,
      lookup_key: Schema.optionalKey(Schema.NullOr(Schema.String)),
      recurring: Schema.optionalKey(
        Schema.NullOr(Schema.Struct({ interval: Schema.String }))
      ),
      tax_behavior: Schema.optionalKey(Schema.NullOr(Schema.String)),
      unit_amount: Schema.optionalKey(Schema.NullOr(Schema.Int)),
    })
  ),
});

const decodePriceList = Schema.decodeUnknownEffect(PriceListSchema);

// Stripe did not answer, or failed on its side: it may later.
const unanswered = "unanswered" as const;

// How many lookup keys Stripe lists prices by in one call.
const lookupKeysPerCall = 10;

// Stripe refusing the request itself: the key, what it may do, or what was
// asked. Asking again changes nothing, unlike a timeout or a 5xx.
const refusedBy = Schema.is(
  Schema.Struct({
    type: Schema.Literals([
      "StripeAuthenticationError",
      "StripePermissionError",
      "StripeInvalidRequestError",
    ]),
  })
);

const pricesOf = ({
  data,
}: typeof PriceListSchema.Type): readonly StripePrice[] =>
  data.flatMap((price) =>
    price.lookup_key === undefined || price.lookup_key === null
      ? []
      : [
          {
            currency: price.currency,
            interval: Option.fromNullishOr(price.recurring?.interval),
            lookupKey: price.lookup_key,
            taxBehavior: Option.fromNullishOr(price.tax_behavior),
            unitAmount: Option.fromNullishOr(price.unit_amount),
          },
        ]
  );

/**
 * On a server that bills, checks when it starts that Stripe holds an
 * active price under each plan's lookup keys, at the amount, currency and
 * interval this server publishes (`billing/domain/prices.ts`), and
 * tax-exclusive, as the VAT is added on top of what every page shows. A
 * difference stops the server, saying each one (`StripePricesMismatch`):
 * it would otherwise charge something else than it shows. So does Stripe
 * refusing the request, as with a key revoked, or answering what the check
 * cannot read (`StripePricesUnchecked`): nothing was checked. Stripe not
 * answering at all is logged and the server starts: an outage at Stripe
 * must not keep Peal down, and checkout fails on its own until Stripe is
 * back. The
 * composition root builds it with the server, not with the routes tests
 * serve against stripe-mock, whose one price is none of Peal's.
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

    const published = publishedPrices(settings.value.prices);

    // Stripe takes ten lookup keys a call.
    const found = yield* Effect.forEach(
      Arr.chunksOf(
        published.map(({ lookupKey }) => lookupKey),
        lookupKeysPerCall
      ),
      (keys) =>
        Effect.tryPromise({
          catch: (cause) =>
            refusedBy(cause)
              ? new StripePricesUnchecked({
                  reason: "Stripe refused the request",
                })
              : unanswered,
          try: async () =>
            await client.prices.list({
              active: true,
              limit: 100,
              lookup_keys: keys,
            }),
        }).pipe(
          Effect.flatMap((list) =>
            decodePriceList(list).pipe(
              Effect.mapError(
                () =>
                  new StripePricesUnchecked({
                    reason: "its answer is not a list of prices",
                  })
              )
            )
          ),
          Effect.map(pricesOf)
        )
    ).pipe(
      Effect.map((lists) => Option.some(lists.flat())),
      Effect.catchIf(
        (failure) => failure === unanswered,
        () =>
          Effect.logWarning(
            "Stripe did not answer when the server started: its prices were not checked against the ones this server publishes"
          ).pipe(Effect.as(Option.none<readonly StripePrice[]>()))
      )
    );

    if (Option.isNone(found)) {
      return;
    }

    const problems = priceProblems(published, found.value);

    yield* problems.length > 0
      ? Effect.fail(new StripePricesMismatch({ problems }))
      : Effect.logInfo("Stripe's prices match the ones this server publishes");
  }).pipe(Effect.withSpan("Billing.checkStripePrices"))
);
