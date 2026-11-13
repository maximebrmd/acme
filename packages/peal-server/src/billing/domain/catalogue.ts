import { Match, Option, Schema } from "effect";

import type { PriceCurrency, RateCard, StripeTier } from "./rate-card.ts";
import {
  MeterSchema,
  rateCard,
  stripeTiersOf,
  stripeUnitAmountOf,
} from "./rate-card.ts";

/**
 * A line of per-account pricing's invoice: the connected accounts, priced
 * on the ladder, then each meter of the rate card.
 */
export const CatalogueLineSchema = Schema.Literals([
  "accounts",
  ...MeterSchema.literals,
]);

export type CatalogueLine = typeof CatalogueLineSchema.Type;

/**
 * What a server that bills does when it starts on a Stripe catalogue that
 * is not the rate card's: `warn` while nothing sells per-account pricing,
 * so an upgrade or a rollback never stops a server for a catalogue it does
 * not use yet; `stop` once checkout sells it (T4 sets it, with its test),
 * as it then would bill something else than it shows. The legacy plans'
 * prices stop the server either way.
 */
export const CatalogueAtStartSchema = Schema.Literals(["warn", "stop"]);

export type CatalogueAtStart = typeof CatalogueAtStartSchema.Type;

export const catalogueAtStart: CatalogueAtStart = "stop";

/** What each line is called on the invoice: its product's and meter's name. */
const lineNames = {
  accounts: "Connected accounts",
  assistantImages: "Writing assistant images",
  assistantRequests: "Writing assistant requests",
  managedAds: "Managed ads",
  outboundMessages: "Inbox messages sent",
  xApi: "X API usage at X's rates",
} as const satisfies { readonly [L in CatalogueLine]: string };

/**
 * The product tax code of every line: software as a service, for business
 * use, as the self-hosting docs name it for Stripe Tax.
 */
export const catalogueTaxCode = "txcd_10103001";

/** Every price of the catalogue is billed each month, for the month past. */
export const catalogueInterval = "month";

/**
 * How each meter reads the events the server sends: the sum of their
 * `value`, for the customer whose id is in `stripe_customer_id`.
 */
export const meterEvents = {
  customerKey: "stripe_customer_id",
  formula: "sum",
  valueKey: "value",
} as const;

/** How a line is priced: on graduated tiers, or the same for every unit. */
export type CatalogueAmount =
  | { readonly _tag: "tiered"; readonly tiers: readonly StripeTier[] }
  | { readonly _tag: "perUnit"; readonly unitAmountDecimal: string };

/**
 * A price of the catalogue, as Stripe must hold it: metered, in `currency`,
 * monthly and tax-exclusive, under `lookupKey`, which is also the event
 * name of the meter it reads.
 */
export interface CataloguePrice {
  readonly amount: CatalogueAmount;
  readonly currency: PriceCurrency;
  readonly line: CatalogueLine;
  readonly lookupKey: string;
  /** The line's name on the invoice. */
  readonly name: string;
}

/**
 * The catalogue, derived from the rate card, never written: one metered
 * price per line, under the lookup keys the server reads. Dollars only:
 * Stripe converts at checkout, so no price has other currencies.
 */
export const catalogueOf = (
  keys: { readonly [L in CatalogueLine]: string },
  card: RateCard = rateCard,
  currency: PriceCurrency = "usd"
): readonly CataloguePrice[] =>
  CatalogueLineSchema.literals.map((line) => ({
    amount:
      line === "accounts"
        ? { _tag: "tiered", tiers: stripeTiersOf(card, currency) }
        : {
            _tag: "perUnit",
            unitAmountDecimal: stripeUnitAmountOf(line, card, currency),
          },
    currency,
    line,
    lookupKey: keys[line],
    name: lineNames[line],
  }));

/** A tier of a price Stripe holds, its amounts in cents as decimals. */
export interface HeldTier {
  readonly flatAmountDecimal: Option.Option<string>;
  readonly unitAmountDecimal: Option.Option<string>;
  readonly upTo: number | null;
}

/** What Stripe holds of an active price under one of the catalogue's keys. */
export interface HeldPrice {
  /** `per_unit` or `tiered`. */
  readonly billingScheme: string;
  readonly currency: string;
  readonly id: string;
  /** How often it is billed; none for a price paid once. */
  readonly interval: Option.Option<string>;
  /** How many intervals between two invoices. */
  readonly intervalCount: number;
  readonly lookupKey: string;
  /** The id of the meter it reads its usage from. */
  readonly meterId: Option.Option<string>;
  /** The id of the product it belongs to. */
  readonly productId: string;
  /** `exclusive`, `inclusive` or `unspecified`, as Stripe names them. */
  readonly taxBehavior: Option.Option<string>;
  readonly tiers: readonly HeldTier[];
  /** `graduated` or `volume`. */
  readonly tiersMode: Option.Option<string>;
  /** Whether Stripe divides the usage before pricing it. */
  readonly transformed: boolean;
  readonly unitAmountDecimal: Option.Option<string>;
  /** `metered` or `licensed`. */
  readonly usageType: Option.Option<string>;
}

/** What Stripe holds of an active meter. */
export interface HeldMeter {
  /** The event key it finds the customer's id in, when it maps by id. */
  readonly customerKey: Option.Option<string>;
  readonly displayName: string;
  readonly eventName: string;
  readonly formula: string;
  readonly id: string;
  readonly valueKey: string;
  /**
   * The window its events are pre-aggregated for (`day`, `hour`), if any:
   * Stripe then keeps only the last event of each window.
   */
  readonly window: Option.Option<string>;
}

/** What Stripe holds of a product the catalogue made, archived or not. */
export interface HeldProduct {
  readonly active: boolean;
  readonly id: string;
  /** Its `metadata.peal`: the lookup key of the line it is for. */
  readonly key: string;
  readonly name: string;
  readonly taxCode: Option.Option<string>;
}

/** What a Stripe account holds of the catalogue. */
export interface HeldCatalogue {
  readonly meters: readonly HeldMeter[];
  readonly prices: readonly HeldPrice[];
  readonly products: readonly HeldProduct[];
}

const decimalPattern = /^(?<whole>\d+)(?:\.(?<fraction>\d*))?$/u;

/** A decimal written without leading or trailing zeros, to compare values. */
const canonical = (decimal: string): string => {
  const groups = decimalPattern.exec(decimal.trim())?.groups;

  if (groups === undefined) {
    return decimal;
  }

  const whole = (groups["whole"] ?? "").replace(/^0+(?=\d)/u, "");
  const fraction = (groups["fraction"] ?? "").replace(/0+$/u, "");

  return fraction === "" ? whole : `${whole}.${fraction}`;
};

const sameDecimal = (held: Option.Option<string>, expected: string): boolean =>
  canonical(Option.getOrElse(held, () => "0")) === canonical(expected);

const tiersText = (
  tiers: readonly { readonly unit: string; readonly upTo: number | null }[]
): string =>
  tiers
    .map(({ unit, upTo }) =>
      upTo === null ? `then ${unit}` : `up to ${String(upTo)} at ${unit}`
    )
    .join(", ");

const sameTiers = (
  held: readonly HeldTier[],
  expected: readonly StripeTier[]
): boolean =>
  held.length === expected.length &&
  held.every(
    (tier, index) =>
      tier.upTo === expected[index]?.upTo &&
      sameDecimal(tier.unitAmountDecimal, expected[index].unitAmountDecimal) &&
      sameDecimal(tier.flatAmountDecimal, "0")
  );

const amountProblems = (
  { amount, lookupKey }: CataloguePrice,
  held: HeldPrice
): readonly string[] => {
  if (amount._tag === "perUnit") {
    return held.billingScheme === "per_unit" &&
      sameDecimal(held.unitAmountDecimal, amount.unitAmountDecimal)
      ? []
      : [
          held.billingScheme === "per_unit"
            ? `${lookupKey}: Stripe charges ${canonical(Option.getOrElse(held.unitAmountDecimal, () => "0"))} cents a unit, the rate card ${amount.unitAmountDecimal}`
            : `${lookupKey}: Stripe prices it ${held.billingScheme}, not per_unit`,
        ];
  }

  if (held.billingScheme !== "tiered") {
    return [`${lookupKey}: Stripe prices it ${held.billingScheme}, not tiered`];
  }

  const mode = Option.getOrElse(held.tiersMode, () => "none");

  return [
    ...(mode === "graduated"
      ? []
      : [`${lookupKey}: Stripe prices its tiers by ${mode}, not graduated`]),
    ...(sameTiers(held.tiers, amount.tiers)
      ? []
      : [
          `${lookupKey}: Stripe's tiers are ${tiersText(
            held.tiers.map(
              ({ flatAmountDecimal, unitAmountDecimal, upTo }) => ({
                unit: Option.match(flatAmountDecimal, {
                  onNone: () =>
                    canonical(Option.getOrElse(unitAmountDecimal, () => "0")),
                  onSome: (flat) =>
                    `${canonical(Option.getOrElse(unitAmountDecimal, () => "0"))} plus ${canonical(flat)} flat`,
                }),
                upTo,
              })
            )
          )} cents a unit; the rate card's ${tiersText(
            amount.tiers.map(({ unitAmountDecimal, upTo }) => ({
              unit: unitAmountDecimal,
              upTo,
            }))
          )}`,
        ]),
  ];
};

/**
 * What differs between a price Stripe holds and the catalogue's: anything
 * that would bill something else than the rate card says.
 */
const priceDifferences = (
  price: CataloguePrice,
  held: HeldPrice,
  meter: Option.Option<HeldMeter>
): readonly string[] => {
  const { currency, lookupKey } = price;
  const interval = Option.getOrElse(held.interval, () => "once");

  const billed =
    held.intervalCount === 1
      ? `each ${interval}`
      : `every ${String(held.intervalCount)} ${interval}s`;

  const usage = Option.getOrElse(held.usageType, () => "none");
  const tax = Option.getOrElse(held.taxBehavior, () => "unspecified");
  const read = Option.getOrElse(held.meterId, () => "none");

  // Without its meter, which is said on its own, no price can read it.
  const sameMeter = Option.match(meter, {
    onNone: () => true,
    onSome: ({ id }) => id === read,
  });

  return [
    ...(held.currency === currency
      ? []
      : [
          `${lookupKey}: Stripe charges it in ${held.currency}, not ${currency}`,
        ]),
    ...(billed === `each ${catalogueInterval}`
      ? []
      : [
          `${lookupKey}: Stripe bills it ${billed}, not each ${catalogueInterval}`,
        ]),
    ...(usage === "metered"
      ? []
      : [
          `${lookupKey}: Stripe bills it by ${usage} quantity, not by metered usage`,
        ]),
    ...(sameMeter
      ? []
      : [
          `${lookupKey}: Stripe reads its usage from meter ${read}, not from the meter of event ${lookupKey}`,
        ]),
    ...(tax === "exclusive"
      ? []
      : [
          `${lookupKey}: its tax behavior at Stripe is ${tax}, not exclusive, so the VAT would not be added to it`,
        ]),
    ...(held.transformed
      ? [`${lookupKey}: Stripe divides or rounds its usage before pricing it`]
      : []),
    ...amountProblems(price, held),
  ];
};

/**
 * What is wrong with a meter for the events the server sends: it must sum
 * their values, for the customer they name by id. Stripe cannot change
 * these on a meter.
 */
const meterDifferences = (
  { lookupKey }: CataloguePrice,
  meter: HeldMeter
): readonly string[] => [
  ...(meter.formula === meterEvents.formula
    ? []
    : [
        `${lookupKey}: its meter aggregates by ${meter.formula}, not ${meterEvents.formula}`,
      ]),
  ...(Option.contains(meter.customerKey, meterEvents.customerKey)
    ? []
    : [
        `${lookupKey}: its meter finds the customer otherwise than by the id in ${meterEvents.customerKey}`,
      ]),
  ...(meter.valueKey === meterEvents.valueKey
    ? []
    : [
        `${lookupKey}: its meter reads the value from ${meter.valueKey}, not ${meterEvents.valueKey}`,
      ]),
  ...Option.match(meter.window, {
    onNone: () => [],
    onSome: (window) => [
      `${lookupKey}: its meter is pre-aggregated by ${window}, so Stripe keeps only the last event of each ${window}`,
    ],
  }),
];

const heldMeterOf = (
  price: CataloguePrice,
  held: HeldCatalogue
): Option.Option<HeldMeter> =>
  Option.fromNullishOr(
    held.meters.find(({ eventName }) => eventName === price.lookupKey)
  );

const heldPriceOf = (
  price: CataloguePrice,
  held: HeldCatalogue
): Option.Option<HeldPrice> =>
  Option.fromNullishOr(
    held.prices.find(({ lookupKey }) => lookupKey === price.lookupKey)
  );

/**
 * What is wrong with a Stripe account's catalogue for the one the rate
 * card gives: a meter or a price that is missing, or would count or bill
 * something else, or a price on a product archived at Stripe. Meters
 * first, then prices, each in the catalogue's order.
 */
export const catalogueProblems = (
  published: readonly CataloguePrice[],
  held: HeldCatalogue
): readonly string[] => [
  ...published.flatMap((price) =>
    Option.match(heldMeterOf(price, held), {
      onNone: () => [
        `${price.lookupKey}: Stripe has no active meter with this event name`,
      ],
      onSome: (meter) => meterDifferences(price, meter),
    })
  ),
  ...published.flatMap((price) =>
    Option.match(heldPriceOf(price, held), {
      onNone: () => [
        `${price.lookupKey}: Stripe has no active price with this lookup key`,
      ],
      onSome: (found) =>
        priceDifferences(price, found, heldMeterOf(price, held)),
    })
  ),
  // Checkout refuses a price on an archived product.
  ...published.flatMap((price) =>
    Option.match(heldPriceOf(price, held), {
      onNone: () => [],
      onSome: ({ productId }) =>
        held.products.some(({ active, id }) => id === productId && !active)
          ? [
              `${price.lookupKey}: its product ${productId} is archived at Stripe, where checkout would refuse it`,
            ]
          : [],
    })
  ),
];

/** One change the catalogue makes at Stripe. */
export type CatalogueStep =
  | { readonly _tag: "createMeter"; readonly price: CataloguePrice }
  | { readonly _tag: "createProduct"; readonly price: CataloguePrice }
  | {
      readonly _tag: "createPrice";
      /** The meter it reads; none while the step before makes it. */
      readonly meterId: Option.Option<string>;
      readonly price: CataloguePrice;
      /** Its product; none while the step before makes it. */
      readonly productId: Option.Option<string>;
      /** Why: what differs from the price it replaces, if any. */
      readonly reasons: readonly string[];
      /** The price whose lookup key it takes, left active. */
      readonly replacing: Option.Option<string>;
    };

/**
 * What the catalogue command does: its steps, in order; what it cannot
 * fix, which stops it before any step; and what it leaves as the operator
 * set it, said for information.
 */
export interface CataloguePlan {
  readonly blocked: readonly string[];
  readonly notes: readonly string[];
  readonly steps: readonly CatalogueStep[];
}

// A product the operator renamed or gave another tax code: theirs to set.
const productNotes = (
  price: CataloguePrice,
  product: Option.Option<HeldProduct>
): readonly string[] =>
  Option.match(product, {
    onNone: () => [],
    onSome: ({ id, name, taxCode }) => {
      const code = Option.getOrElse(taxCode, () => "none");

      return name === price.name && code === catalogueTaxCode
        ? []
        : [
            `${price.name}: product ${id} is named ${name} at Stripe, with tax code ${code}; left as they are (the command gives a product it makes ${catalogueTaxCode})`,
          ];
    },
  });

/**
 * Why a meter that counts otherwise stops the command, and the way out.
 * Stripe's docs do not say whether a deactivated meter keeps its event
 * name: the sandbox runbook checks it.
 */
const unchangeableMeter = (problem: string, meterId: string): string =>
  `${problem}. Stripe cannot change a meter: deactivate meter ${meterId} at Stripe, then run this again. Subscriptions on a price that reads it stop counting from then until they move to the new price. If Stripe refuses the new meter its event name, set STRIPE_LOOKUP_KEY_PREFIX to a new prefix and give Stripe the catalogue and the plans' prices under it.`;

const lineSteps = (
  price: CataloguePrice,
  held: HeldCatalogue
): CataloguePlan => {
  const meter = heldMeterOf(price, held);

  const unfixable = Option.match(meter, {
    onNone: () => [],
    onSome: (found) =>
      meterDifferences(price, found).map((problem) =>
        unchangeableMeter(problem, found.id)
      ),
  });

  // Only an active product takes a new price.
  const product = Option.fromNullishOr(
    held.products.find(({ active, key }) => active && key === price.lookupKey)
  );

  const current = heldPriceOf(price, held);

  const archived = Option.match(current, {
    onNone: () => [],
    onSome: ({ id, productId }) =>
      held.products.some((found) => found.id === productId && !found.active)
        ? [
            `${price.lookupKey}: price ${id} is on product ${productId}, which is archived at Stripe, where checkout would refuse it. Restore the product at Stripe, then run this again.`,
          ]
        : [],
  });

  const reasons = Option.match(current, {
    onNone: () => [],
    onSome: (found) => [
      ...priceDifferences(price, found, meter),
      ...(Option.isNone(meter)
        ? [`${price.lookupKey}: it must read the new meter`]
        : []),
    ],
  });

  const priced = Option.isSome(current) && reasons.length === 0;

  return {
    blocked: [...unfixable, ...archived],
    notes: productNotes(price, product),
    steps: [
      ...(Option.isNone(meter)
        ? [{ _tag: "createMeter", price } as const]
        : []),
      ...(Option.isNone(product) && !priced
        ? [{ _tag: "createProduct", price } as const]
        : []),
      ...(priced
        ? []
        : [
            {
              _tag: "createPrice",
              meterId: meter.pipe(Option.map(({ id }) => id)),
              price,
              productId: product.pipe(Option.map(({ id }) => id)),
              reasons,
              replacing: current.pipe(Option.map(({ id }) => id)),
            } as const,
          ]),
    ],
  };
};

/**
 * What to change at Stripe so it holds the catalogue: a meter, product or
 * price that is missing is made, a product with its name and tax code,
 * which the operator may change afterwards (said in `notes`, never
 * reset); a price that would bill otherwise is replaced by a new one,
 * which takes its lookup key, the old one left active for the
 * subscriptions that still use it. A meter that counts otherwise cannot be
 * changed at Stripe, nor checkout use a price whose product is archived:
 * either blocks the plan. A catalogue as the rate card
 * gives it plans nothing.
 */
export const planCatalogue = (
  published: readonly CataloguePrice[],
  held: HeldCatalogue
): CataloguePlan => {
  const lines = published.map((price) => lineSteps(price, held));

  return {
    blocked: lines.flatMap(({ blocked }) => blocked),
    notes: lines.flatMap(({ notes }) => notes),
    steps: lines.flatMap(({ steps }) => steps),
  };
};

const stepLine = (step: CatalogueStep): string => {
  const { lookupKey, name } = step.price;

  return Match.valueTags(step, {
    createMeter: () => `${name}: a new meter for the events ${lookupKey}`,
    createPrice: ({ reasons, replacing }) =>
      Option.match(replacing, {
        onNone: () => `${name}: a new price under ${lookupKey}`,
        onSome: (id) =>
          `${name}: a new price under ${lookupKey}, which replaces ${id} (left active for the subscriptions on it): ${reasons
            .map((reason) => reason.slice(`${lookupKey}: `.length))
            .join("; ")}`,
      }),
    createProduct: () =>
      `${name}: a new product, with tax code ${catalogueTaxCode}`,
  });
};

/** The plan, one line a step, for the operator: names and ids, no key. */
export const planLines = (plan: CataloguePlan): readonly string[] =>
  plan.steps.map(stepLine);
