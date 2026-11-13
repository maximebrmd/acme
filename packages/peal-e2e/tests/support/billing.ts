import { randomUUID } from "node:crypto";

import { Client } from "pg";

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
