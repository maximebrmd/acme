import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Context, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { Checkouts } from "#billing/application/ports/checkouts.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import {
  empty,
  json,
  platformServer,
} from "#test/publishing/fakes/platform-server.ts";
import type { PlatformAnswer } from "#test/publishing/fakes/platform-server.ts";
import { StripeCheckoutsLive } from "#workspace/infrastructure/auth/stripe-checkouts.ts";

// Stripe's API as the adapter calls it: each customer has two Checkout
// Sessions open, and expiring one answers it expired. `failing` answers
// every request a server error.
const fakeStripe = (options: { readonly failing?: boolean } = {}) =>
  platformServer((request): PlatformAnswer => {
    if (options.failing === true) {
      return empty(500);
    }

    if (request.method === "GET" && request.path === "/v1/checkout/sessions") {
      const customer = request.query.get("customer") ?? "";

      return json({
        data: [1, 2].map((index) => ({
          customer,
          id: `cs_test_${customer}_${index}`,
          object: "checkout.session",
          status: "open",
        })),
        has_more: false,
        object: "list",
        url: "/v1/checkout/sessions",
      });
    }

    const expiring = /^\/v1\/checkout\/sessions\/(?<id>[^/]+)\/expire$/u.exec(
      request.path
    )?.groups?.["id"];

    return request.method === "POST" && expiring !== undefined
      ? json({ id: expiring, object: "checkout.session", status: "expired" })
      : json({ error: { message: "Unrecognized request URL" } }, 404);
  });

// The adapter, on a server whose Stripe API is `apiUrl`, or without a key.
const checkoutsOn = (apiUrl: string | undefined) =>
  Layer.build(
    StripeCheckoutsLive.pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown(
            apiUrl === undefined
              ? {}
              : {
                  STRIPE_API_URL: apiUrl,
                  STRIPE_PRICE_BUSINESS: "price_synthetic_business",
                  STRIPE_PRICE_PRO: "price_synthetic_pro",
                  STRIPE_SECRET_KEY: "sk_test_0123456789syntheticcheckouts",
                  STRIPE_WEBHOOK_SECRET: "whsec_synthetic_checkouts",
                }
          )
        )
      )
    )
  ).pipe(Effect.map(Context.get(Checkouts)));

// A workspace whose Stripe customer is `cus_<run>`, with a subscription a
// checkout started for another customer of its, and one the plugin wrote
// without a status. Removed when the test ends.
const seeded = Effect.acquireRelease(
  Effect.gen(function* seed() {
    const sql = yield* SqlClient.SqlClient;
    const run = randomUUID();
    const workspaceId = WorkspaceIdSchema.make(run);
    const customer = `cus_${run.replaceAll("-", "")}`;

    yield* sql`INSERT INTO auth.organization (id, name, slug, created_at, stripe_customer_id)
      VALUES (${run}, 'Synthetic checkouts', ${`checkouts-${run}`}, now(), ${customer})`;
    yield* sql`INSERT INTO auth.subscription (plan, reference_id, stripe_customer_id, status)
      VALUES ('pro', ${run}, ${`${customer}b`}, 'active')`;
    yield* sql`INSERT INTO auth.subscription (plan, reference_id, stripe_customer_id, status)
      VALUES ('pro', ${run}, ${customer}, NULL)`;

    return { customer, workspaceId };
  }),
  ({ workspaceId }) =>
    SqlClient.SqlClient.use((sql) =>
      Effect.all([
        sql`DELETE FROM auth.subscription WHERE reference_id = ${workspaceId}`,
        sql`DELETE FROM auth.organization WHERE id = ${workspaceId}`,
      ])
    ).pipe(Effect.orDie)
);

layer(DatabaseTest)("the Stripe plugin's checkouts", (it) => {
  it.effect(
    "list what the plugin holds of a workspace's subscriptions, and expire every open session of its customers",
    () =>
      Effect.gen(function* expires() {
        const stripe = yield* fakeStripe();
        const checkouts = yield* checkoutsOn(stripe.url);
        const { customer, workspaceId } = yield* seeded;

        assert.sameMembers(
          [...(yield* checkouts.statuses(workspaceId))],
          ["active", "incomplete"]
        );

        assert.strictEqual(yield* checkouts.expireOpen(workspaceId), 4);

        const listed = stripe
          .requests()
          .filter(({ method }) => method === "GET")
          .map(({ query }) => [query.get("customer"), query.get("status")]);

        assert.sameDeepMembers(listed, [
          [customer, "open"],
          [`${customer}b`, "open"],
        ]);

        assert.sameMembers(
          stripe
            .requests()
            .filter(({ method }) => method === "POST")
            .map(({ path }) => path),
          [customer, `${customer}b`].flatMap((owner) =>
            [1, 2].map(
              (index) => `/v1/checkout/sessions/cs_test_${owner}_${index}/expire`
            )
          )
        );
      }).pipe(Effect.scoped)
  );

  it.effect("say Stripe is unreachable when it fails", () =>
    Effect.gen(function* unreachable() {
      const stripe = yield* fakeStripe({ failing: true });
      const checkouts = yield* checkoutsOn(stripe.url);
      const { workspaceId } = yield* seeded;

      const failure = yield* Effect.flip(checkouts.expireOpen(workspaceId));

      assert.strictEqual(failure._tag, "StripeUnreachable");
    }).pipe(Effect.scoped)
  );

  it.effect("expire nothing, and call no Stripe, on a server that does not bill", () =>
    Effect.gen(function* off() {
      const checkouts = yield* checkoutsOn(undefined);
      const { workspaceId } = yield* seeded;

      assert.strictEqual(yield* checkouts.expireOpen(workspaceId), 0);
    }).pipe(Effect.scoped)
  );
});
