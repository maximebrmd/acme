// A stand-in for Stripe's API, for the server the end-to-end tests run:
// billing is on there, so plans limit workspaces as on Peal Cloud, and the
// server checks Stripe's catalogue and prices when it starts. It lists the
// meters and prices Peal publishes, as the contract holds them (the rate
// card's, and the legacy plans'), and answers anything else as an empty
// list or an object with a synthetic id: no test pays for anything.
// Nothing leaves the machine.
import { once } from "node:events";
import { createServer } from "node:http";
import type { Server } from "node:http";

import { Schema } from "effect";
import { billingCurrency, PaidPlanSchema, planCatalogue } from "peal-contract";
import type { LegacyPaidPlan } from "peal-contract";
import {
  catalogueLookupKeysOf,
  MeterSchema,
  rateCard,
  stripeTiersOf,
  stripeUnitAmountOf,
} from "peal-contract/rate-card";

const intervals = [
  { key: "monthly", name: "month" },
  { key: "yearly", name: "year" },
] as const;

// The legacy plans' prices: per-account pricing has none yet.
const legacyPlans = PaidPlanSchema.literals.filter(
  (plan): plan is LegacyPaidPlan => plan !== "payAsYouGo"
);

const prices = legacyPlans.flatMap((plan) =>
  intervals.map(({ key, name }) => ({
    active: true,
    currency: billingCurrency,
    id: `price_e2e_${plan}_${key}`,
    lookup_key: `peal_${plan}_${key}`,
    object: "price",
    recurring: { interval: name },
    tax_behavior: "exclusive",
    unit_amount: planCatalogue[plan].price?.[name] ?? 0,
  }))
);

// Per-account pricing's lines, under the lookup keys the server reads,
// each also its meter's event name: the contract's, which its tests keep
// equal to the server's.
const keys = catalogueLookupKeysOf("peal");

const lines = [
  { key: keys.accounts, meter: null },
  ...MeterSchema.literals.map((meter) => ({ key: keys[meter], meter })),
];

const meters = lines.map(({ key }) => ({
  customer_mapping: { event_payload_key: "stripe_customer_id", type: "by_id" },
  default_aggregation: { formula: "sum" },
  display_name: key,
  event_name: key,
  id: `mtr_e2e_${key}`,
  object: "billing.meter",
  status: "active",
  value_settings: { event_payload_key: "value" },
}));

const catalogue = lines.map(({ key, meter }) => ({
  active: true,
  billing_scheme: meter === null ? "tiered" : "per_unit",
  currency: "usd",
  id: `price_e2e_${key}`,
  lookup_key: key,
  object: "price",
  recurring: {
    interval: "month",
    meter: `mtr_e2e_${key}`,
    usage_type: "metered",
  },
  tax_behavior: "exclusive",
  tiers:
    meter === null
      ? stripeTiersOf(rateCard).map(({ unitAmountDecimal, upTo }) => ({
          unit_amount_decimal: unitAmountDecimal,
          up_to: upTo,
        }))
      : null,
  tiers_mode: meter === null ? "graduated" : null,
  unit_amount_decimal:
    meter === null ? null : stripeUnitAmountOf(meter, rateCard),
}));

const listed = (pathname: string): readonly unknown[] => {
  if (pathname === "/v1/prices") {
    return [...catalogue, ...prices];
  }

  return pathname === "/v1/billing/meters" ? meters : [];
};

const list = (data: readonly unknown[], url: string) => ({
  data,
  has_more: false,
  object: "list",
  url,
});

const PortSchema = Schema.Struct({ port: Schema.Int });

/** Starts the stand-in on a free loopback port, and says where it is. */
export const startStripe = async (): Promise<{
  readonly server: Server;
  readonly url: string;
}> => {
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");

    const answer =
      request.method === "GET"
        ? list(listed(pathname), pathname)
        : { id: "e2e_synthetic", object: "synthetic" };

    request.resume();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(answer));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = Schema.decodeUnknownSync(PortSchema)(server.address());

  return { server, url: `http://127.0.0.1:${port}` };
};
