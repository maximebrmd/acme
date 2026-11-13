// A stand-in for Stripe's API, for the server the end-to-end tests run:
// billing is on there, so plans limit workspaces as on Peal Cloud, and the
// server checks Stripe's catalogue and prices when it starts. It lists the
// meters and prices Peal publishes, as the contract holds them (the rate
// card's, and the legacy plans'), by lookup key when asked; makes each
// customer with an id of its own; opens a checkout whose page is the way
// back it was given, as if the card were taken at once; and answers
// anything else as an empty list or an object with a synthetic id. No test
// pays for anything: a test that needs the subscription a checkout makes
// posts its webhook event itself (tests/support/billing.ts), signed with
// `webhookSecret`. Nothing leaves the machine.
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import path from "node:path";

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

// The legacy plans' prices, which the server checks only while a legacy
// subscription entitles: none in a run, but listed as Stripe would.
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

/** The webhook signing secret the run's server checks events with. */
export const webhookSecret = "whsec_synthetic_end_to_end";

// The lookup keys a request filters prices by, as Stripe's client sends
// them: `lookup_keys[0]=…`.
const lookupKeysOf = (query: URLSearchParams): readonly string[] =>
  [...query.entries()].flatMap(([name, value]) =>
    name.startsWith("lookup_keys") ? [value] : []
  );

const LookedUpSchema = Schema.Struct({ lookup_key: Schema.String });

const isLookedUp = Schema.is(LookedUpSchema);

const listed = (url: URL): readonly unknown[] => {
  if (url.pathname === "/v1/prices") {
    const asked = lookupKeysOf(url.searchParams);
    const all: readonly unknown[] = [...catalogue, ...prices];

    return asked.length === 0
      ? all
      : all.filter(
          (price) => isLookedUp(price) && asked.includes(price.lookup_key)
        );
  }

  return url.pathname === "/v1/billing/meters" ? meters : [];
};

// A checkout read back after its way back: one that took no payment and
// names no subscription, so the way back goes straight to its page.
const retrieved = (pathname: string) => {
  const session = /^\/v1\/checkout\/sessions\/(?<id>cs_e2e_\w+)$/u.exec(
    pathname
  )?.groups?.["id"];

  return session === undefined
    ? undefined
    : {
        id: session,
        metadata: {},
        mode: "subscription",
        object: "checkout.session",
        payment_status: "unpaid",
      };
};

/**
 * Where the stand-in writes each checkout the server asks for, one JSON
 * object a line: what a test then builds Stripe's webhook event from, so
 * a checkout that lost a line or its metadata fails the journey.
 */
export const checkoutsFile = path.join(
  import.meta.dirname,
  "..",
  ".e2e",
  "stripe-checkouts.jsonl"
);

/** A checkout the server asked the stand-in for. */
export interface RecordedCheckout {
  readonly customer: string;
  readonly id: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly prices: readonly string[];
  readonly subscriptionMetadata: Readonly<Record<string, string>>;
}

// The fields of a form under `prefix[…]`, by the name in the brackets.
const fieldsUnder = (
  form: URLSearchParams,
  prefix: string
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    [...form.entries()].flatMap(([name, value]) => {
      const key = name.startsWith(`${prefix}[`)
        ? /^\[(?<key>[^\]]+)\]$/u.exec(name.slice(prefix.length))?.groups?.[
            "key"
          ]
        : undefined;

      return key === undefined ? [] : [[key, value]];
    })
  );

const recorded = (
  session: string,
  form: URLSearchParams
): RecordedCheckout => ({
  customer: form.get("customer") ?? "",
  id: session,
  metadata: fieldsUnder(form, "metadata"),
  prices: [...form.entries()].flatMap(([name, value]) =>
    /^line_items\[\d+\]\[price\]$/u.test(name) ? [value] : []
  ),
  subscriptionMetadata: fieldsUnder(form, "subscription_data[metadata]"),
});

// What a POST makes: a customer of its own, or a checkout whose page is
// its way back once paid, with the session's id where Stripe puts it.
const made = (pathname: string, form: URLSearchParams) => {
  const id = randomUUID().replaceAll("-", "");

  if (pathname === "/v1/customers") {
    return { id: `cus_e2e_${id}`, metadata: {}, object: "customer" };
  }

  if (pathname === "/v1/checkout/sessions") {
    const session = `cs_e2e_${id}`;

    appendFileSync(
      checkoutsFile,
      `${JSON.stringify(recorded(session, form))}\n`
    );

    return {
      id: session,
      object: "checkout.session",
      url: (form.get("success_url") ?? "").replaceAll(
        "{CHECKOUT_SESSION_ID}",
        session
      ),
    };
  }

  return { id: "e2e_synthetic", object: "synthetic" };
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
  mkdirSync(path.dirname(checkoutsFile), { recursive: true });
  writeFileSync(checkoutsFile, "");

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      const answer =
        request.method === "GET"
          ? (retrieved(url.pathname) ?? list(listed(url), url.pathname))
          : made(
              url.pathname,
              new URLSearchParams(Buffer.concat(chunks).toString("utf-8"))
            );

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(answer));
    });
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = Schema.decodeUnknownSync(PortSchema)(server.address());

  return { server, url: `http://127.0.0.1:${port}` };
};
