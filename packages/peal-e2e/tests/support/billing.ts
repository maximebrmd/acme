import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { Schema } from "effect";
import { catalogueLookupKeysOf } from "peal-contract/rate-card";
import { Client } from "pg";

import { checkoutsFile, webhookSecret } from "../../scripts/stripe.ts";
import type { RecordedCheckout } from "../../scripts/stripe.ts";

/**
 * Puts the workspace on per-account pricing, straight in the database the
 * run's server uses, as its webhook would record a subscription: no run
 * pays, and a journey that needs more accounts than the free tier's two
 * (the composer's "Select all") holds them this way. The subscription is
 * synthetic: Stripe's stand-in has none, and nothing is ever charged.
 */
export const seedPerAccountSubscription = async (
  workspaceId: string
): Promise<void> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    const run = randomUUID();

    await client.query(
      `INSERT INTO billing.subscriptions (
        cancel_at_period_end, interval, last_event_at, last_event_id, plan,
        started_at, status, stripe_customer_id, stripe_subscription_id,
        updated_at, workspace_id
      ) VALUES (
        false, 'month', now(), $2, 'payAsYouGo', now(), 'active', $3, $4,
        now(), $1
      )`,
      [workspaceId, `evt_e2e_${run}`, `cus_e2e_${run}`, `sub_e2e_${run}`]
    );
  } finally {
    await client.end();
  }
};

// The workspace's Stripe customer, which the checkout made at the
// stand-in and Better Auth recorded on the workspace.
const customerOf = async (workspaceId: string): Promise<string> => {
  const client = new Client({
    connectionString: process.env["DATABASE_URL"],
  });

  await client.connect();

  try {
    const { rows } = await client.query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM auth.organization WHERE id = $1`,
      [workspaceId]
    );

    const customer = rows[0]?.stripe_customer_id ?? null;

    if (customer === null) {
      throw new Error("The workspace has no Stripe customer: no checkout ran");
    }

    return customer;
  } finally {
    await client.end();
  }
};

// Stripe's signature header over a payload, as its webhooks send it.
const signed = (payload: string, at: number): string =>
  `t=${at},v1=${createHmac("sha256", webhookSecret)
    .update(`${at}.${payload}`)
    .digest("hex")}`;

// The last checkout the server asked the stand-in for, for this customer.
const checkoutOf = (customer: string): RecordedCheckout => {
  const found = readFileSync(checkoutsFile, "utf-8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => decodeCheckout(JSON.parse(line)))
    .findLast((checkout) => checkout.customer === customer);

  if (found === undefined) {
    throw new Error("The server opened no checkout for the workspace");
  }

  return found;
};

const decodeCheckout = Schema.decodeUnknownSync(
  Schema.Struct({
    customer: Schema.String,
    id: Schema.String,
    metadata: Schema.Record(Schema.String, Schema.String),
    prices: Schema.Array(Schema.String),
    subscriptionMetadata: Schema.Record(Schema.String, Schema.String),
  })
);

// The catalogue's lookup keys, by the stand-in's price ids.
const lookupKeyOf = new Map(
  Object.values(catalogueLookupKeysOf("peal")).map((key) => [
    `price_e2e_${key}`,
    key,
  ])
);

/**
 * Posts to the run's server the event Stripe sends once a per-account
 * checkout is paid, built from the checkout the server opened at the
 * stand-in: a subscription created on its customer with one item per
 * price it asked for, and the metadata it gave the subscription, active,
 * its period ending on the first of next month (UTC). It refuses a
 * checkout that left out a line of the catalogue or the order. Signed
 * with the run's webhook secret, as Stripe signs them. Nothing is charged.
 */
export const postPerAccountSubscription = async (
  baseUrl: string,
  workspaceId: string
): Promise<void> => {
  const customer = await customerOf(workspaceId);
  const checkout = checkoutOf(customer);
  const keys = checkout.prices.map((price) => lookupKeyOf.get(price));

  if (keys.length !== lookupKeyOf.size || keys.includes(undefined)) {
    throw new Error(
      `The checkout asked for other prices than the catalogue's: ${checkout.prices.join(", ")}`
    );
  }

  const metadata = {
    ...checkout.metadata,
    ...checkout.subscriptionMetadata,
  };

  if (
    metadata["orderId"] === undefined ||
    metadata["referenceId"] !== workspaceId ||
    metadata["userId"] === undefined
  ) {
    throw new Error("The checkout carries no order, workspace or member");
  }

  const run = randomUUID().replaceAll("-", "");
  const now = Math.floor(Date.now() / 1000);
  const today = new Date();

  const periodEnd = Math.floor(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1) / 1000
  );

  const subscription = `sub_e2e_${run}`;

  const items = checkout.prices.map((price) => ({
    current_period_end: periodEnd,
    current_period_start: now,
    id: `si_e2e_${run}_${price}`,
    object: "subscription_item",
    price: {
      id: price,
      lookup_key: lookupKeyOf.get(price),
      object: "price",
      recurring: { interval: "month", usage_type: "metered" },
    },
    subscription,
  }));

  const payload = JSON.stringify({
    api_version: "2026-10-28.endive",
    created: now,
    data: {
      object: {
        billing_cycle_anchor: periodEnd,
        cancel_at: null,
        cancel_at_period_end: false,
        canceled_at: null,
        created: now,
        currency: "usd",
        customer,
        ended_at: null,
        id: subscription,
        items: { data: items, has_more: false, object: "list" },
        livemode: false,
        metadata,
        object: "subscription",
        start_date: now,
        status: "active",
        trial_end: null,
        trial_start: null,
      },
    },
    id: `evt_e2e_${run}`,
    livemode: false,
    object: "event",
    type: "customer.subscription.created",
  });

  const answered = await fetch(`${baseUrl}/api/auth/stripe/webhook`, {
    body: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": signed(payload, now),
    },
    method: "POST",
  });

  if (!answered.ok) {
    throw new Error(`The webhook answered ${answered.status}`);
  }
};
