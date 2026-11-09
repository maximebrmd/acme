// A server without a Stripe key, as most self-hosted ones run: no plan and
// no limit, exactly as before billing existed.
import { assert, layer } from "@effect/vitest";
import { BillingSchema } from "acme-contract";
import { Effect, Schema } from "effect";

import {
  bodyOf,
  IntegrationLive,
  newEmail,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "a server that does not bill",
  (it) => {
    it.effect("shows no plan, and limits nothing", () =>
      Effect.gen(function* off() {
        const app = yield* TestApp;
        const owner = yield* signedUp("unbilled");
        const workspaceId = yield* workspaceOf(owner, "Unbilled");

        const reply = yield* app.request(
          `/api/workspaces/${workspaceId}/billing`,
          { headers: { cookie: owner.cookies } }
        );

        assert.strictEqual(reply.status, 200);

        const billing = yield* bodyOf(Schema.toCodecJson(BillingSchema), reply);

        assert.isFalse(billing.enabled);
        assert.isNull(billing.plan);
        assert.isNull(billing.subscription);
        assert.deepStrictEqual(billing.plans, []);
        assert.deepStrictEqual(billing.allowances, {
          assistantRequests: null,
          channels: null,
          members: null,
          scheduledPosts: null,
        });

        // More members than any plan's free tier.
        for (const label of ["one", "two", "three"]) {
          const invited = yield* app.request(
            "/api/auth/organization/invite-member",
            {
              body: {
                email: newEmail(label),
                organizationId: workspaceId,
                role: "viewer",
              },
              headers: { cookie: owner.cookies },
            }
          );

          assert.strictEqual(invited.status, 200);
        }

        // The assistant keeps the server's own daily quota.
        const assistant = yield* app.request(
          `/api/workspaces/${workspaceId}/assistant`,
          { headers: { cookie: owner.cookies } }
        );

        assert.strictEqual(
          (yield* bodyOf(Schema.Struct({ dailyLimit: Schema.Int }), assistant))
            .dailyLimit,
          100
        );
      })
    );

    it.effect("has no Stripe routes", () =>
      Effect.gen(function* routes() {
        const app = yield* TestApp;
        const owner = yield* signedUp("no-stripe");
        const workspaceId = yield* workspaceOf(owner, "NoStripe");

        const webhook = yield* app.request("/api/auth/stripe/webhook", {
          body: { type: "customer.subscription.created" },
          headers: { "stripe-signature": "t=1,v1=0" },
        });

        assert.strictEqual(webhook.status, 404);

        const upgrade = yield* app.request("/api/auth/subscription/upgrade", {
          body: {
            customerType: "organization",
            plan: "pro",
            referenceId: workspaceId,
          },
          headers: { cookie: owner.cookies },
        });

        assert.strictEqual(upgrade.status, 404);
      })
    );

    it.effect("needs billing:read to show billing", () =>
      Effect.gen(function* permission() {
        const app = yield* TestApp;
        const owner = yield* signedUp("billing-key");
        const workspaceId = yield* workspaceOf(owner, "BillingKey");

        const key = yield* app.request(
          `/api/workspaces/${workspaceId}/api-keys`,
          {
            body: { name: "posts only", permissions: ["post:read"] },
            headers: { cookie: owner.cookies },
          }
        );

        const { key: secret } = yield* bodyOf(
          Schema.Struct({ key: Schema.String }),
          key
        );

        const refused = yield* app.request(
          `/api/workspaces/${workspaceId}/billing`,
          { headers: { authorization: `Bearer ${secret}` } }
        );

        assert.strictEqual(refused.status, 403);
      })
    );
  }
);
