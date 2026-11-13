import { Array as Arr, Effect, Match, Option, Ref, Schema } from "effect";
import { Stripe } from "stripe";

import {
  catalogueInterval,
  catalogueTaxCode,
  meterEvents,
  planCatalogue,
  planLines,
} from "#billing/domain/catalogue.ts";
import type {
  CataloguePrice,
  CatalogueStep,
  HeldCatalogue,
  HeldMeter,
  HeldPrice,
  HeldProduct,
} from "#billing/domain/catalogue.ts";
import type { StripePrice } from "#billing/domain/price-check.ts";

import { StripeCatalogueDiffers } from "./stripe-catalogue-differs.ts";
import { StripeCatalogueUnread } from "./stripe-catalogue-unread.ts";

// What is read of a price. Stripe sends more; its tiers only when asked
// (`expand: ["data.tiers"]`).
const PriceSchema = Schema.Struct({
  billing_scheme: Schema.optionalKey(Schema.String),
  currency: Schema.String,
  id: Schema.String,
  lookup_key: Schema.optionalKey(Schema.NullOr(Schema.String)),
  recurring: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        interval: Schema.String,
        meter: Schema.optionalKey(Schema.NullOr(Schema.String)),
        usage_type: Schema.optionalKey(Schema.String),
      })
    )
  ),
  tax_behavior: Schema.optionalKey(Schema.NullOr(Schema.String)),
  tiers: Schema.optionalKey(
    Schema.NullOr(
      Schema.Array(
        Schema.Struct({
          flat_amount: Schema.optionalKey(Schema.NullOr(Schema.Int)),
          flat_amount_decimal: Schema.optionalKey(Schema.NullOr(Schema.String)),
          unit_amount: Schema.optionalKey(Schema.NullOr(Schema.Int)),
          unit_amount_decimal: Schema.optionalKey(Schema.NullOr(Schema.String)),
          up_to: Schema.NullOr(Schema.Int),
        })
      )
    )
  ),
  tiers_mode: Schema.optionalKey(Schema.NullOr(Schema.String)),
  transform_quantity: Schema.optionalKey(Schema.NullOr(Schema.Unknown)),
  unit_amount: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  unit_amount_decimal: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

type StripePriceObject = typeof PriceSchema.Type;

const MeterObjectSchema = Schema.Struct({
  customer_mapping: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        event_payload_key: Schema.optionalKey(Schema.NullOr(Schema.String)),
        type: Schema.String,
      })
    )
  ),
  default_aggregation: Schema.Struct({ formula: Schema.String }),
  display_name: Schema.String,
  event_name: Schema.String,
  id: Schema.String,
  value_settings: Schema.optionalKey(
    Schema.NullOr(Schema.Struct({ event_payload_key: Schema.String }))
  ),
});

const ProductObjectSchema = Schema.Struct({
  id: Schema.String,
  metadata: Schema.optionalKey(
    Schema.NullOr(Schema.Record(Schema.String, Schema.String))
  ),
  name: Schema.String,
  // Its id: the field is not expanded.
  tax_code: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const listOf = <S extends Schema.Top>(item: S) =>
  Schema.Struct({ data: Schema.Array(item), has_more: Schema.Boolean });

const IdSchema = Schema.Struct({ id: Schema.String });

// Stripe refusing the request itself: the key, what it may do, or what was
// asked. Asking again changes nothing, unlike a timeout or a 5xx.
const RefusalSchema = Schema.Struct({
  code: Schema.optionalKey(Schema.String),
  type: Schema.Literals([
    "StripeAuthenticationError",
    "StripePermissionError",
    "StripeInvalidRequestError",
  ]),
});

const refusalOf = Schema.decodeUnknownOption(RefusalSchema);

// How many lookup keys Stripe lists prices by in one call.
const lookupKeysPerCall = 10;

// The most objects Stripe lists a page.
const pageSize = 100;

/**
 * One call to Stripe, its answer read with `schema`. The SDK turns decimal
 * amounts into objects of its own: the answer is read as the JSON Stripe
 * sent, where they are strings.
 */
const ask = <S extends Schema.Top & { readonly DecodingServices: never }, T>(
  during: string,
  schema: S,
  call: () => Promise<T>
): Effect.Effect<S["Type"], StripeCatalogueUnread> =>
  Effect.tryPromise({
    catch: (cause) =>
      Option.match(refusalOf(cause), {
        onNone: () =>
          new StripeCatalogueUnread({ during, reason: "unanswered" }),
        onSome: ({ code, type }) =>
          new StripeCatalogueUnread({
            during,
            reason: "refused",
            refusal: code === undefined ? type : `${type}, ${code}`,
          }),
      }),
    try: async () => JSON.stringify(await call()),
  }).pipe(
    Effect.flatMap((answer) =>
      Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(answer).pipe(
        Effect.mapError(
          () => new StripeCatalogueUnread({ during, reason: "unreadable" })
        )
      )
    )
  );

/** Every page of a list, read from the start, by the last id of each. */
const everyPage = <A extends { readonly id: string }>(
  page: (
    after: Option.Option<string>
  ) => Effect.Effect<
    { readonly data: readonly A[]; readonly has_more: boolean },
    StripeCatalogueUnread
  >
): Effect.Effect<readonly A[], StripeCatalogueUnread> => {
  const from = (
    after: Option.Option<string>,
    read: readonly A[]
  ): Effect.Effect<readonly A[], StripeCatalogueUnread> =>
    page(after).pipe(
      Effect.flatMap(({ data, has_more: more }) => {
        const all = [...read, ...data];

        return more && data.length > 0
          ? from(Option.fromNullishOr(data.at(-1)?.id), all)
          : Effect.succeed(all);
      })
    );

  return from(Option.none(), []);
};

const decimalOf = (
  decimal: string | null | undefined,
  whole: number | null | undefined
): Option.Option<string> =>
  Option.orElse(Option.fromNullishOr(decimal), () =>
    Option.fromNullishOr(whole).pipe(Option.map(String))
  );

const heldPriceOf = (price: StripePriceObject): HeldPrice => ({
  billingScheme: price.billing_scheme ?? "per_unit",
  currency: price.currency,
  id: price.id,
  interval: Option.fromNullishOr(price.recurring?.interval),
  lookupKey: price.lookup_key ?? "",
  meterId: Option.fromNullishOr(price.recurring?.meter),
  taxBehavior: Option.fromNullishOr(price.tax_behavior),
  tiers: (price.tiers ?? []).map((tier) => ({
    flatAmountDecimal: decimalOf(tier.flat_amount_decimal, tier.flat_amount),
    unitAmountDecimal: decimalOf(tier.unit_amount_decimal, tier.unit_amount),
    upTo: tier.up_to,
  })),
  tiersMode: Option.fromNullishOr(price.tiers_mode),
  transformed:
    price.transform_quantity !== undefined && price.transform_quantity !== null,
  unitAmountDecimal: decimalOf(price.unit_amount_decimal, price.unit_amount),
  usageType: Option.fromNullishOr(price.recurring?.usage_type),
});

/** A price as the legacy plans' check reads it. */
export const legacyPriceOf = (
  price: StripePriceObject
): Option.Option<StripePrice> =>
  Option.fromNullishOr(price.lookup_key).pipe(
    Option.map((lookupKey) => ({
      currency: price.currency,
      interval: Option.fromNullishOr(price.recurring?.interval),
      lookupKey,
      taxBehavior: Option.fromNullishOr(price.tax_behavior),
      unitAmount: Option.fromNullishOr(price.unit_amount),
    }))
  );

/**
 * The active prices Stripe holds under `lookupKeys`, with their tiers, ten
 * keys a call as Stripe takes them.
 */
export const readPrices = (
  client: Stripe,
  lookupKeys: readonly string[]
): Effect.Effect<readonly StripePriceObject[], StripeCatalogueUnread> =>
  Effect.forEach(Arr.chunksOf(lookupKeys, lookupKeysPerCall), (keys) =>
    ask(
      "listing the prices",
      listOf(PriceSchema),
      async () =>
        await client.prices.list({
          active: true,
          expand: ["data.tiers"],
          limit: pageSize,
          lookup_keys: [...keys],
        })
    )
  ).pipe(Effect.map((lists) => lists.flatMap(({ data }) => data)));

/** The active meters of the Stripe account, every page. */
export const readMeters = (
  client: Stripe
): Effect.Effect<readonly HeldMeter[], StripeCatalogueUnread> =>
  everyPage((after) =>
    ask(
      "listing the meters",
      listOf(MeterObjectSchema),
      async () =>
        await client.billing.meters.list({
          limit: pageSize,
          status: "active",
          ...Option.match(after, {
            onNone: () => ({}),
            onSome: (id) => ({ starting_after: id }),
          }),
        })
    )
  ).pipe(
    Effect.map((meters) =>
      meters.map((meter) => ({
        customerKey: Option.fromNullishOr(meter.customer_mapping).pipe(
          Option.filter(({ type }) => type === "by_id"),
          Option.flatMap(({ event_payload_key: key }) =>
            Option.fromNullishOr(key)
          )
        ),
        displayName: meter.display_name,
        eventName: meter.event_name,
        formula: meter.default_aggregation.formula,
        id: meter.id,
        valueKey: meter.value_settings?.event_payload_key ?? "",
      }))
    )
  );

/** The active products the catalogue made, by their `metadata.peal`. */
const readProducts = (
  client: Stripe
): Effect.Effect<readonly HeldProduct[], StripeCatalogueUnread> =>
  everyPage((after) =>
    ask(
      "listing the products",
      listOf(ProductObjectSchema),
      async () =>
        await client.products.list({
          active: true,
          limit: pageSize,
          ...Option.match(after, {
            onNone: () => ({}),
            onSome: (id) => ({ starting_after: id }),
          }),
        })
    )
  ).pipe(
    Effect.map((products) =>
      products.flatMap((product) =>
        Option.fromNullishOr(product.metadata?.["peal"]).pipe(
          Option.map((key) => ({
            id: product.id,
            key,
            name: product.name,
            taxCode: Option.fromNullishOr(product.tax_code),
          })),
          Option.toArray
        )
      )
    )
  );

/** What the Stripe account holds of the catalogue `published`. */
export const readCatalogue = (
  client: Stripe,
  published: readonly CataloguePrice[]
): Effect.Effect<HeldCatalogue, StripeCatalogueUnread> =>
  Effect.all({
    meters: readMeters(client),
    prices: readPrices(
      client,
      published.map(({ lookupKey }) => lookupKey)
    ).pipe(Effect.map((prices) => prices.map(heldPriceOf))),
    products: readProducts(client),
  });

/** What Stripe holds of the catalogue's prices, for the start check. */
export const heldPricesOf = (
  prices: readonly StripePriceObject[]
): readonly HeldPrice[] => prices.map(heldPriceOf);

// The ids the steps made so far, by lookup key, for the prices after them.
interface Made {
  readonly meters: ReadonlyMap<string, string>;
  readonly products: ReadonlyMap<string, string>;
}

const priceParams = (
  price: CataloguePrice,
  meterId: string,
  productId: string
): Stripe.PriceCreateParams => ({
  currency: price.currency,
  lookup_key: price.lookupKey,
  metadata: { peal: price.lookupKey },
  nickname: price.name,
  product: productId,
  recurring: {
    interval: catalogueInterval,
    meter: meterId,
    usage_type: "metered",
  },
  tax_behavior: "exclusive",
  // The lookup key moves from whichever price holds it, active or not.
  transfer_lookup_key: true,
  ...(price.amount._tag === "tiered"
    ? {
        billing_scheme: "tiered",
        tiers: price.amount.tiers.map(({ unitAmountDecimal, upTo }) => ({
          unit_amount_decimal: Stripe.Decimal.from(unitAmountDecimal),
          up_to: upTo ?? "inf",
        })),
        tiers_mode: "graduated",
      }
    : {
        billing_scheme: "per_unit",
        unit_amount_decimal: Stripe.Decimal.from(
          price.amount.unitAmountDecimal
        ),
      }),
});

const withId = (
  ids: ReadonlyMap<string, string>,
  lookupKey: string,
  id: string
): ReadonlyMap<string, string> => new Map([...ids, [lookupKey, id]]);

// One step made at Stripe: what to say of it, and the ids made so far.
const apply = (
  client: Stripe,
  step: CatalogueStep,
  made: Made
): Effect.Effect<
  { readonly line: string; readonly made: Made },
  StripeCatalogueUnread
> => {
  const { lookupKey, name } = step.price;

  return Match.valueTags(step, {
    createMeter: () =>
      ask(
        `creating the meter for ${lookupKey}`,
        IdSchema,
        async () =>
          await client.billing.meters.create({
            customer_mapping: {
              event_payload_key: meterEvents.customerKey,
              type: "by_id",
            },
            default_aggregation: { formula: meterEvents.formula },
            display_name: name,
            event_name: lookupKey,
            value_settings: { event_payload_key: meterEvents.valueKey },
          })
      ).pipe(
        Effect.map(({ id }) => ({
          line: `Created meter ${name} (${id}) for the events ${lookupKey}`,
          made: { ...made, meters: withId(made.meters, lookupKey, id) },
        }))
      ),
    createPrice: ({ meterId, price, productId, replacing }) =>
      ask(
        `creating the price ${lookupKey}`,
        IdSchema,
        async () =>
          await client.prices.create(
            priceParams(
              price,
              Option.getOrElse(meterId, () => made.meters.get(lookupKey) ?? ""),
              Option.getOrElse(
                productId,
                () => made.products.get(lookupKey) ?? ""
              )
            )
          )
      ).pipe(
        Effect.map(({ id }) => ({
          line: Option.match(replacing, {
            onNone: () => `Created price ${name} (${id}) under ${lookupKey}`,
            onSome: (old) =>
              `Created price ${name} (${id}) under ${lookupKey}, in place of ${old}, left active for the subscriptions on it`,
          }),
          made,
        }))
      ),
    createProduct: () =>
      ask(
        `creating the product for ${lookupKey}`,
        IdSchema,
        async () =>
          await client.products.create({
            metadata: { peal: lookupKey },
            name,
            tax_code: catalogueTaxCode,
          })
      ).pipe(
        Effect.map(({ id }) => ({
          line: `Created product ${name} (${id})`,
          made: { ...made, products: withId(made.products, lookupKey, id) },
        }))
      ),
    updateProduct: ({ productId }) =>
      ask(
        `updating the product for ${lookupKey}`,
        IdSchema,
        async () =>
          await client.products.update(productId, {
            name,
            tax_code: catalogueTaxCode,
          })
      ).pipe(
        Effect.map(({ id }) => ({
          line: `Updated product ${name} (${id}): its name and tax code ${catalogueTaxCode}`,
          made,
        }))
      ),
  });
};

/** What the catalogue command is given. */
export interface CatalogueRun {
  /** Only compare: change nothing, and fail on a difference. */
  readonly check: boolean;
  readonly client: Stripe;
  readonly published: readonly CataloguePrice[];
  /** Says one line to the operator: names and ids, never a key. */
  readonly report: (line: string) => Effect.Effect<void>;
}

/**
 * Gives the Stripe account the catalogue `published`: reads what it holds,
 * plans what is missing or bills otherwise (`planCatalogue`), then makes
 * it, meters and products before the prices that use them, saying each
 * change as it is made. A second run plans nothing. With `check`, it
 * changes nothing and fails with what it would change. A meter that
 * counts otherwise, which Stripe cannot change, stops it before any
 * change.
 */
export const runCatalogue = ({
  check,
  client,
  published,
  report,
}: CatalogueRun): Effect.Effect<
  void,
  StripeCatalogueDiffers | StripeCatalogueUnread
> =>
  Effect.gen(function* catalogue() {
    const held = yield* readCatalogue(client, published);
    const plan = planCatalogue(published, held);

    if (plan.blocked.length > 0) {
      return yield* new StripeCatalogueDiffers({ problems: plan.blocked });
    }

    if (check && plan.steps.length > 0) {
      return yield* new StripeCatalogueDiffers({ problems: planLines(plan) });
    }

    if (plan.steps.length === 0) {
      return yield* report(
        check
          ? "Stripe holds the catalogue the rate card gives."
          : "Stripe already holds the catalogue the rate card gives: nothing to change."
      );
    }

    // Meters and products first, so the prices after them read their ids.
    const made = yield* Ref.make<Made>({
      meters: new Map(),
      products: new Map(),
    });

    return yield* Effect.forEach(
      plan.steps,
      (step) =>
        Ref.get(made).pipe(
          Effect.flatMap((sofar) => apply(client, step, sofar)),
          Effect.tap((done) => Ref.set(made, done.made)),
          Effect.flatMap(({ line }) => report(line))
        ),
      { discard: true }
    );
  }).pipe(Effect.withSpan("Billing.stripeCatalogue"));
