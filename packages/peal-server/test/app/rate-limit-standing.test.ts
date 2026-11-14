// The rate limit on a server that bills (against stripe-mock): a billing
// account without a payment method sends 60 requests a minute, one that
// pays the setting, and a workspace staff raised its own limit; each answer
// names the policy, and the free tier's refusal says what a payment method
// gives.
import { assert, layer } from "@effect/vitest";
import { Config, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  MigratedSqlLive,
  apiKeyOf,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

const BillingApp = Layer.unwrap(
  Effect.gen(function* billingApp() {
    const apiUrl = yield* stripeMockUrl;

    return TestApp.layerWith({
      ...unconfirmedEmails,
      STRIPE_API_URL: apiUrl,
      STRIPE_SECRET_KEY: "sk_test_0123456789syntheticratelimits",
      STRIPE_WEBHOOK_SECRET: "whsec_synthetic_rate_limit_test_secret",
    });
  })
);

const Test = Layer.mergeAll(BillingApp, MigratedSqlLive);

const FreeRefusalSchema = Schema.Struct({
  _tag: Schema.Literal("TooManyRequests"),
  limit: Schema.Literal(60),
  message: Schema.String,
  policy: Schema.Literal("free"),
  withPaymentMethod: Schema.Literal(600),
});

// What the `RateLimit` header says is left.
const left = /;r=(?<remaining>\d+);/u;

const paysFor = (workspaceId: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`INSERT INTO billing.subscriptions (cancel_at_period_end, interval, last_event_at, last_event_id, plan, status, stripe_customer_id, stripe_subscription_id, updated_at, workspace_id)
        VALUES (false, 'month', now(), ${`evt_synthetic_${workspaceId}`}, 'payAsYouGo', 'active', ${`cus_synthetic_${workspaceId}`}, ${`sub_synthetic_${workspaceId}`}, now(), ${workspaceId})`
  ).pipe(Effect.orDie);

const raisedFor = (workspaceId: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`INSERT INTO activity.request_limits (requests_per_minute, set_at, workspace_id) VALUES (1200, now(), ${workspaceId})`
  ).pipe(Effect.orDie);

// A workspace of its own owner, and a key of it.
const keyed = Effect.fn("keyed")(function* keyed(label: string) {
  const owner = yield* signedUpUnconfirmed(label);
  const workspaceId = yield* workspaceOf(owner, label);
  const { key } = yield* apiKeyOf(owner, workspaceId, ["channel:read"]);

  return { key, path: `/api/workspaces/${workspaceId}/channels`, workspaceId };
});

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "the rate limit by standing",
  (it) => {
    it.effect(
      "gives a free billing account 60 requests a minute, and says a payment method gives 600",
      () =>
        Effect.gen(function* free() {
          const app = yield* TestApp;
          const { key, path } = yield* keyed("limit-free");
          const headers = { authorization: `Bearer ${key}` };

          const replies = yield* Effect.forEach(
            Array.from({ length: 61 }, (_, index) => index),
            () => app.request(path, { headers }),
            { concurrency: 4 }
          );

          assert.strictEqual(
            replies[0]?.headers.get("ratelimit-policy"),
            '"free";q=60;w=60'
          );

          const refused = replies.filter(({ status }) => status === 429);

          // The window may turn while the test runs: the count then starts
          // again, and nothing is refused.
          if (refused.length === 0) {
            assert.include(
              replies.map((reply) =>
                Number(
                  left.exec(reply.headers.get("ratelimit") ?? "")?.groups?.[
                    "remaining"
                  ]
                )
              ),
              0
            );

            return;
          }

          assert.strictEqual(refused.length, 1);

          const body = Schema.decodeUnknownSync(FreeRefusalSchema)(
            refused[0]?.body
          );

          assert.include(body.message, "payment method");
          assert.include(body.message, "600");
        })
    );

    it.effect("gives a billing account that pays the setting", () =>
      Effect.gen(function* paying() {
        const app = yield* TestApp;
        const { key, path, workspaceId } = yield* keyed("limit-paying");

        yield* paysFor(workspaceId);

        const reply = yield* app.request(path, {
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(reply.status, 200);
        assert.strictEqual(
          reply.headers.get("ratelimit-policy"),
          '"default";q=600;w=60'
        );
      })
    );

    it.effect("gives a workspace staff raised its own limit", () =>
      Effect.gen(function* raised() {
        const app = yield* TestApp;
        const { key, path, workspaceId } = yield* keyed("limit-raised");

        yield* raisedFor(workspaceId);

        const reply = yield* app.request(path, {
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(
          reply.headers.get("ratelimit-policy"),
          '"override";q=1200;w=60'
        );
      })
    );
  }
);
