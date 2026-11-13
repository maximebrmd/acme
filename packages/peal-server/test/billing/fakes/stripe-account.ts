// A stand-in for a Stripe account's catalogue: its meters, products and
// prices, kept between requests, read and written the way Stripe's API
// does, so the catalogue command and the start check talk HTTP to it as to
// Stripe. Nothing leaves the machine.
import { Effect, Option } from "effect";

import type { CataloguePrice } from "#billing/domain/catalogue.ts";
import { catalogueTaxCode, meterEvents } from "#billing/domain/catalogue.ts";
import {
  json,
  platformServer,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

/** A meter the account holds. */
export interface FakeMeter {
  readonly customerKey: string | null;
  readonly displayName: string;
  readonly eventName: string;
  readonly formula: string;
  readonly id: string;
  readonly mapping: string;
  readonly status: string;
  readonly valueKey: string;
}

/** A product the account holds. */
export interface FakeProduct {
  readonly active: boolean;
  readonly id: string;
  /** Its `metadata.peal`. */
  readonly key: string | null;
  readonly name: string;
  readonly taxCode: string | null;
}

/** A tier of a price the account holds. */
export interface FakeTier {
  readonly flatAmountDecimal: string | null;
  readonly unitAmountDecimal: string | null;
  readonly upTo: number | null;
}

/** A price the account holds. */
export interface FakePrice {
  readonly active: boolean;
  readonly billingScheme: string;
  readonly currency: string;
  readonly id: string;
  readonly interval: string;
  readonly lookupKey: string | null;
  readonly meter: string | null;
  readonly product: string;
  readonly taxBehavior: string;
  readonly tiers: readonly FakeTier[] | null;
  readonly tiersMode: string | null;
  readonly unitAmountDecimal: string | null;
  readonly usageType: string;
}

/** What the account holds. */
export interface StripeAccountState {
  readonly meters: readonly FakeMeter[];
  readonly prices: readonly FakePrice[];
  readonly products: readonly FakeProduct[];
}

/** A meter for the catalogue's `price`, as it should be. */
export const meterFor = ({ lookupKey, name }: CataloguePrice): FakeMeter => ({
  customerKey: meterEvents.customerKey,
  displayName: name,
  eventName: lookupKey,
  formula: meterEvents.formula,
  id: `mtr_${lookupKey}`,
  mapping: "by_id",
  status: "active",
  valueKey: meterEvents.valueKey,
});

/** A product for the catalogue's `price`, as it should be. */
export const productFor = ({
  lookupKey,
  name,
}: CataloguePrice): FakeProduct => ({
  active: true,
  id: `prod_${lookupKey}`,
  key: lookupKey,
  name,
  taxCode: catalogueTaxCode,
});

/** The catalogue's `price`, as Stripe should hold it. */
export const priceFor = ({
  amount,
  currency,
  lookupKey,
}: CataloguePrice): FakePrice => ({
  active: true,
  billingScheme: amount._tag === "tiered" ? "tiered" : "per_unit",
  currency,
  id: `price_${lookupKey}`,
  interval: "month",
  lookupKey,
  meter: `mtr_${lookupKey}`,
  product: `prod_${lookupKey}`,
  taxBehavior: "exclusive",
  tiers:
    amount._tag === "tiered"
      ? amount.tiers.map(({ unitAmountDecimal, upTo }) => ({
          flatAmountDecimal: null,
          unitAmountDecimal,
          upTo,
        }))
      : null,
  tiersMode: amount._tag === "tiered" ? "graduated" : null,
  unitAmountDecimal:
    amount._tag === "perUnit" ? amount.unitAmountDecimal : null,
  usageType: "metered",
});

/** An account holding the whole catalogue as it should be. */
export const holding = (
  published: readonly CataloguePrice[]
): StripeAccountState => ({
  meters: published.map(meterFor),
  prices: published.map(priceFor),
  products: published.map(productFor),
});

export const emptyAccount: StripeAccountState = {
  meters: [],
  prices: [],
  products: [],
};

const meterJson = (meter: FakeMeter): JsonValue => ({
  customer_mapping: {
    event_payload_key: meter.customerKey,
    type: meter.mapping,
  },
  default_aggregation: { formula: meter.formula },
  display_name: meter.displayName,
  event_name: meter.eventName,
  id: meter.id,
  object: "billing.meter",
  status: meter.status,
  value_settings: { event_payload_key: meter.valueKey },
});

const productJson = (product: FakeProduct): JsonValue => ({
  active: product.active,
  id: product.id,
  metadata: product.key === null ? {} : { peal: product.key },
  name: product.name,
  object: "product",
  tax_code: product.taxCode,
});

const tierJson = (tier: FakeTier): JsonValue => ({
  flat_amount: null,
  flat_amount_decimal: tier.flatAmountDecimal,
  unit_amount: null,
  unit_amount_decimal: tier.unitAmountDecimal,
  up_to: tier.upTo,
});

// Stripe sends a price's tiers only when they are expanded.
const priceJson = (price: FakePrice, withTiers: boolean): JsonValue => {
  const listed = {
    active: price.active,
    billing_scheme: price.billingScheme,
    currency: price.currency,
    id: price.id,
    lookup_key: price.lookupKey,
    object: "price",
    product: price.product,
    recurring: {
      interval: price.interval,
      interval_count: 1,
      meter: price.meter,
      usage_type: price.usageType,
    },
    tax_behavior: price.taxBehavior,
    tiers_mode: price.tiersMode,
    transform_quantity: null,
    unit_amount: null,
    unit_amount_decimal: price.unitAmountDecimal,
  };

  return withTiers
    ? { ...listed, tiers: price.tiers?.map(tierJson) ?? null }
    : listed;
};

// Stripe lists 10 objects a page unless asked for more: the stand-in lists
// 2, so a reader that takes only the first page misses some.
const pageSize = 2;

const page = <A extends { readonly id: string }>(
  data: readonly A[],
  toJson: (item: A) => JsonValue,
  query: URLSearchParams,
  url: string
): PlatformAnswer => {
  const after = query.get("starting_after");

  const start =
    after === null ? 0 : data.findIndex(({ id }) => id === after) + 1;

  return json({
    data: data.slice(start, start + pageSize).map(toJson),
    has_more: start + pageSize < data.length,
    object: "list",
    url,
  });
};

const valuesNamed = (query: URLSearchParams, name: string): string[] =>
  [...query.entries()].flatMap(([key, value]) =>
    key.startsWith(name) ? [value] : []
  );

// The tiers of a price created, as Stripe's form encoding sends them:
// `tiers[0][up_to]`, `tiers[0][unit_amount_decimal]`…
const tiersOf = (form: URLSearchParams): readonly FakeTier[] | null => {
  const tiers = Array.from({ length: 10 }, (_, index) => index).flatMap(
    (index) => {
      const upTo = form.get(`tiers[${String(index)}][up_to]`);

      return upTo === null
        ? []
        : [
            {
              flatAmountDecimal: null,
              unitAmountDecimal: form.get(
                `tiers[${String(index)}][unit_amount_decimal]`
              ),
              upTo: upTo === "inf" ? null : Number(upTo),
            },
          ];
    }
  );

  return tiers.length === 0 ? null : tiers;
};

const refused = (message: string, status = 400): PlatformAnswer =>
  json({ error: { message, type: "invalid_request_error" } }, status);

/**
 * The stand-in, for the life of the scope, starting from `state`. It reads
 * and writes as Stripe does: active objects only where asked, prices'
 * tiers only when expanded, a new price taking its lookup key from another
 * only with `transfer_lookup_key`. `fail` answers a request otherwise
 * first, as Stripe failing or refusing.
 */
export const stripeAccount = (
  state: StripeAccountState,
  fail: (request: PlatformRequest) => Option.Option<PlatformAnswer> = () =>
    Option.none()
) =>
  Effect.gen(function* account() {
    let meters = [...state.meters];
    let products = [...state.products];
    let prices = [...state.prices];
    let created = 0;

    const nextId = (prefix: string) => {
      created += 1;

      return `${prefix}_synthetic_${String(created)}`;
    };

    const createMeter = (form: URLSearchParams): PlatformAnswer => {
      const meter: FakeMeter = {
        customerKey: form.get("customer_mapping[event_payload_key]"),
        displayName: form.get("display_name") ?? "",
        eventName: form.get("event_name") ?? "",
        formula: form.get("default_aggregation[formula]") ?? "",
        id: nextId("mtr"),
        mapping: form.get("customer_mapping[type]") ?? "",
        status: "active",
        valueKey: form.get("value_settings[event_payload_key]") ?? "",
      };

      meters = [...meters, meter];

      return json(meterJson(meter));
    };

    const createProduct = (form: URLSearchParams): PlatformAnswer => {
      const product: FakeProduct = {
        active: true,
        id: nextId("prod"),
        key: form.get("metadata[peal]"),
        name: form.get("name") ?? "",
        taxCode: form.get("tax_code"),
      };

      products = [...products, product];

      return json(productJson(product));
    };

    const updateProduct = (
      id: string,
      form: URLSearchParams
    ): PlatformAnswer => {
      const current = products.find((product) => product.id === id);

      if (current === undefined) {
        return refused("No such product", 404);
      }

      const product: FakeProduct = {
        ...current,
        name: form.get("name") ?? current.name,
        taxCode: form.get("tax_code") ?? current.taxCode,
      };

      products = products.map((held) => (held.id === id ? product : held));

      return json(productJson(product));
    };

    const createPrice = (form: URLSearchParams): PlatformAnswer => {
      const lookupKey = form.get("lookup_key");

      const taken = prices.some(
        (price) => lookupKey !== null && price.lookupKey === lookupKey
      );

      if (taken && form.get("transfer_lookup_key") !== "true") {
        return refused("A price exists with this lookup key");
      }

      const price: FakePrice = {
        active: true,
        billingScheme: form.get("billing_scheme") ?? "per_unit",
        currency: form.get("currency") ?? "",
        id: nextId("price"),
        interval: form.get("recurring[interval]") ?? "",
        lookupKey,
        meter: form.get("recurring[meter]"),
        product: form.get("product") ?? "",
        taxBehavior: form.get("tax_behavior") ?? "unspecified",
        tiers: tiersOf(form),
        tiersMode: form.get("tiers_mode"),
        unitAmountDecimal: form.get("unit_amount_decimal"),
        usageType: form.get("recurring[usage_type]") ?? "licensed",
      };

      prices = [
        ...prices.map((held) =>
          held.lookupKey === lookupKey ? { ...held, lookupKey: null } : held
        ),
        price,
      ];

      return json(priceJson(price, true));
    };

    const listPrices = (query: URLSearchParams): PlatformAnswer => {
      const keys = valuesNamed(query, "lookup_keys");
      const withTiers = valuesNamed(query, "expand").includes("data.tiers");

      return json({
        data: prices.flatMap((price) =>
          price.active && keys.includes(price.lookupKey ?? "")
            ? [priceJson(price, withTiers)]
            : []
        ),
        has_more: false,
        object: "list",
        url: "/v1/prices",
      });
    };

    const answer = (request: PlatformRequest): PlatformAnswer => {
      const form = new URLSearchParams(textOf(request));
      const { query } = request;
      const route = `${request.method} ${request.path}`;

      const productId = /^\/v1\/products\/(?<id>[^/]+)$/u.exec(request.path)
        ?.groups?.["id"];

      if (request.method === "POST" && productId !== undefined) {
        return updateProduct(productId, form);
      }

      switch (route) {
        case "GET /v1/billing/meters": {
          const status = query.get("status");

          return page(
            meters.filter(
              (meter) => status === null || meter.status === status
            ),
            meterJson,
            query,
            request.path
          );
        }

        case "GET /v1/products": {
          const active = query.get("active");

          return page(
            products.filter(
              (product) => active === null || `${product.active}` === active
            ),
            productJson,
            query,
            request.path
          );
        }

        case "GET /v1/prices": {
          return listPrices(query);
        }

        case "POST /v1/billing/meters": {
          return createMeter(form);
        }

        case "POST /v1/products": {
          return createProduct(form);
        }

        case "POST /v1/prices": {
          return createPrice(form);
        }

        default: {
          return refused("Unrecognized request URL", 404);
        }
      }
    };

    const server = yield* platformServer((request) =>
      Option.getOrElse(fail(request), () => answer(request))
    );

    return {
      ...server,
      /** What the account holds now. */
      held: (): StripeAccountState => ({ meters, prices, products }),
    };
  });
