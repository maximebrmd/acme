import { createHmac, randomUUID } from "node:crypto";

import { catalogueLookupKeysOf } from "peal-contract/rate-card";
import { Client } from "pg";

import { webhookSecret } from "../../scripts/stripe.ts";

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

/**
 * Posts to the run's server the event Stripe sends once a per-account
 * checkout is paid: a subscription created on the workspace's customer,
 * with one item per line of the catalogue (the contract's lookup keys),
 * active, its period ending on the first of next month (UTC). Signed with
 * the run's webhook secret, as Stripe signs them. Nothing is charged.
 */
export const postPerAccountSubscription = async (
  baseUrl: string,
  workspaceId: string
): Promise<void> => {
  const customer = await customerOf(workspaceId);
  const run = randomUUID().replaceAll("-", "");
  const now = Math.floor(Date.now() / 1000);
  const today = new Date();

  const periodEnd = Math.floor(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1) / 1000
  );

  const subscription = `sub_e2e_${run}`;

  const items = Object.values(catalogueLookupKeysOf("peal")).map((key) => ({
    current_period_end: periodEnd,
    current_period_start: now,
    id: `si_e2e_${run}_${key}`,
    object: "subscription_item",
    price: {
      id: `price_e2e_${key}`,
      lookup_key: key,
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
        metadata: { referenceId: workspaceId },
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
