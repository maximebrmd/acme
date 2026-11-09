// Billing as a server with a Stripe key runs it: checkout and the customer
// portal against stripe-mock (STRIPE_MOCK_URL, the development stack's by
// default), and webhook events recorded from Stripe, signed here with the
// test's own secret. Nothing reaches Stripe.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { assert, layer } from "@effect/vitest";
import { BillingSchema } from "acme-contract";
import { Config, DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { Stripe } from "stripe";

import { SqlLive } from "#shared/infrastructure/database.ts";
import {
  apiKeyOf,
  bodyOf,
  newEmail,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import type { Person } from "#test/workspace/integration/harness.ts";

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

const webhookSecret = "whsec_synthetic_billing_test_secret";

// What the server runs with: billing on, against stripe-mock, with Stripe
// Tax on checkout.
const billingApp = Layer.unwrap(
  Effect.gen(function* billingApp() {
    const apiUrl = yield* stripeMockUrl;

    return TestApp.layerWith({
      STRIPE_API_URL: apiUrl,
      STRIPE_AUTOMATIC_TAX: "true",
      STRIPE_PRICE_BUSINESS: "price_synthetic_business",
      STRIPE_PRICE_PRO: "price_synthetic_pro",
      STRIPE_SECRET_KEY: "sk_test_0123456789syntheticbilling",
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    });
  })
);

const BillingIntegration = Layer.mergeAll(billingApp, SqlLive);

const signer = new Stripe("sk_test_synthetic_signer").webhooks;

const fixture = (name: string) =>
  readFileSync(
    path.join(
      import.meta.dirname,
      "..",
      "fixtures",
      "webhooks",
      `${name}.json`
    ),
    "utf-8"
  );

/** A recorded event, for this test's own customer, subscription and event. */
interface Delivery {
  readonly customerId: string;
  readonly eventId: (name: string) => string;
  readonly subscriptionId: string;
}

const newDelivery = (): Delivery => {
  const run = randomUUID().replaceAll("-", "");

  return {
    customerId: `cus_${run}`,
    eventId: (name) => `evt_${name}_${run}`,
    subscriptionId: `sub_${run}`,
  };
};

const payloadOf = (name: string, delivery: Delivery) =>
  fixture(name)
    .replaceAll("cus_synthetic", delivery.customerId)
    .replaceAll("sub_synthetic", delivery.subscriptionId)
    .replaceAll(
      /"evt_synthetic_(?<kind>[a-z]+)"/gu,
      (_match, kind: string) => `"${delivery.eventId(kind)}"`
    );

const nowInSeconds = () => Math.floor(Date.now() / 1000);

// Sends a payload to the webhook as Stripe would, signed with `secret` at
// `timestamp`.
const deliver = Effect.fn("deliver")(function* deliver(
  payload: string,
  signing: { readonly secret?: string; readonly timestamp?: number } = {}
) {
  const app = yield* TestApp;
  const secret = signing.secret ?? webhookSecret;
  const timestamp = signing.timestamp ?? nowInSeconds();

  const signature = yield* Effect.promise(
    async () =>
      await signer.generateTestHeaderStringAsync({
        payload,
        secret,
        timestamp,
      })
  );

  return yield* Effect.promise(async () => {
    const response = await app.handler(
      new Request("http://localhost:3001/api/auth/stripe/webhook", {
        body: payload,
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        method: "POST",
      })
    );

    await response.body?.cancel();

    return response.status;
  });
});

const billingOf = Effect.fn("billingOf")(function* billingOf(
  owner: Person,
  workspaceId: string
) {
  const app = yield* TestApp;

  const reply = yield* app.request(`/api/workspaces/${workspaceId}/billing`, {
    headers: { cookie: owner.cookies },
  });

  assert.strictEqual(reply.status, 200);

  return yield* bodyOf(Schema.toCodecJson(BillingSchema), reply);
});

// A workspace whose Stripe customer is `customerId`, as Better Auth records
// it before the first checkout.
const billedWorkspace = Effect.fn("billedWorkspace")(function* billedWorkspace(
  label: string,
  customerId: string
) {
  const owner = yield* signedUp(label);
  const workspaceId = yield* workspaceOf(owner, label);
  const sql = yield* SqlClient.SqlClient;

  yield* sql`UPDATE auth.organization SET stripe_customer_id = ${customerId} WHERE id = ${workspaceId}`;

  return { owner, workspaceId };
});

const recordedEvents = Effect.fn("recordedEvents")(function* recordedEvents(
  eventId: string
) {
  const sql = yield* SqlClient.SqlClient;

  const rows =
    yield* sql`SELECT id FROM billing.stripe_events WHERE id = ${eventId}`;

  return rows.length;
});

const ErrorSchema = Schema.Struct({ code: Schema.String });

const CheckoutSchema = Schema.Struct({
  redirect: Schema.Boolean,
  url: Schema.String,
});

layer(BillingIntegration, {
  excludeTestServices: true,
  timeout: "180 seconds",
})("billing through Stripe", (it) => {
  it.effect("puts a new workspace on the free plan, with its limits", () =>
    Effect.gen(function* free() {
      const owner = yield* signedUp("free");
      const workspaceId = yield* workspaceOf(owner, "Free");
      const billing = yield* billingOf(owner, workspaceId);

      assert.isTrue(billing.enabled);
      assert.strictEqual(billing.plan, "free");
      assert.isNull(billing.subscription);
      assert.deepStrictEqual(billing.allowances, {
        assistantRequests: 10,
        channels: 3,
        members: 2,
        scheduledPosts: 30,
      });
      assert.strictEqual(billing.usage.members, 1);
      assert.strictEqual(billing.usage.channels, 0);
      assert.deepStrictEqual(
        billing.plans.map(({ plan }) => plan),
        ["free", "pro", "business"]
      );
    })
  );

  it.effect(
    "opens checkout, with Stripe Tax, and the portal, for members who manage billing",
    () =>
      Effect.gen(function* checkout() {
        const app = yield* TestApp;
        const owner = yield* signedUp("checkout");
        const workspaceId = yield* workspaceOf(owner, "Checkout");

        const upgrade = (
          person: Person,
          body: {
            readonly customerType?: string;
            readonly referenceId?: string;
          }
        ) =>
          app.request("/api/auth/subscription/upgrade", {
            body: {
              cancelUrl: `/app/${workspaceId}/billing`,
              disableRedirect: true,
              locale: "fr",
              plan: "pro",
              successUrl: `/app/${workspaceId}/billing?checkout=done`,
              ...body,
            },
            headers: { cookie: person.cookies },
          });

        const started = yield* upgrade(owner, {
          customerType: "organization",
          referenceId: workspaceId,
        });

        assert.strictEqual(started.status, 200);
        assert.match((yield* bodyOf(CheckoutSchema, started)).url, /^https:/u);

        const portal = yield* app.request(
          "/api/auth/subscription/billing-portal",
          {
            body: {
              customerType: "organization",
              disableRedirect: true,
              referenceId: workspaceId,
              returnUrl: `/app/${workspaceId}/billing`,
            },
            headers: { cookie: owner.cookies },
          }
        );

        assert.strictEqual(portal.status, 200);
        assert.match((yield* bodyOf(CheckoutSchema, portal)).url, /^https:/u);

        // Someone outside the workspace, and a subscription of one's own.
        const stranger = yield* signedUp("stranger");

        const refused = yield* upgrade(stranger, {
          customerType: "organization",
          referenceId: workspaceId,
        });

        assert.strictEqual(refused.status, 401);

        // A member who does not manage billing.
        const editor = yield* signedUp("editor");
        const sql = yield* SqlClient.SqlClient;

        yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${workspaceId}, ${editor.id}, 'editor', now())`;

        const notManaging = yield* upgrade(editor, {
          customerType: "organization",
          referenceId: workspaceId,
        });

        assert.strictEqual(notManaging.status, 401);

        // A reference that is no workspace's id.
        const nowhere = yield* upgrade(owner, {
          customerType: "organization",
          referenceId: "not-a-workspace",
        });

        assert.strictEqual(nowhere.status, 401);

        const personal = yield* upgrade(owner, {});

        assert.strictEqual(personal.status, 400);
        assert.strictEqual(
          (yield* bodyOf(ErrorSchema, personal)).code,
          "WORKSPACE_SUBSCRIPTIONS_ONLY"
        );

        // Stripe's plugin reads the body's customer type before the query's.
        const mixed = yield* app.request(
          "/api/auth/subscription/upgrade?customerType=organization",
          {
            body: {
              cancelUrl: `/app/${workspaceId}/billing`,
              customerType: "user",
              disableRedirect: true,
              plan: "pro",
              successUrl: `/app/${workspaceId}/billing`,
            },
            headers: { cookie: owner.cookies },
          }
        );

        assert.strictEqual(mixed.status, 400);
        assert.strictEqual(
          (yield* bodyOf(ErrorSchema, mixed)).code,
          "WORKSPACE_SUBSCRIPTIONS_ONLY"
        );
      })
  );

  it.effect("records a subscription from a signed webhook event", () =>
    Effect.gen(function* subscribes() {
      const delivery = newDelivery();

      const { owner, workspaceId } = yield* billedWorkspace(
        "subscriber",
        delivery.customerId
      );

      assert.strictEqual(
        yield* deliver(payloadOf("customer.subscription.created", delivery)),
        200
      );

      const pro = yield* billingOf(owner, workspaceId);

      assert.strictEqual(pro.plan, "pro");
      assert.strictEqual(pro.subscription?.status, "active");
      assert.strictEqual(pro.subscription?.plan, "pro");
      assert.isFalse(pro.subscription?.cancelAtPeriodEnd);
      assert.deepStrictEqual(
        pro.subscription?.currentPeriodEnd,
        DateTime.makeUnsafe(1_795_860_000_000)
      );
      assert.strictEqual(pro.allowances.channels, 10);

      // The assistant's quota is the plan's.
      const app = yield* TestApp;

      const assistant = yield* app.request(
        `/api/workspaces/${workspaceId}/assistant`,
        { headers: { cookie: owner.cookies } }
      );

      assert.strictEqual(
        (yield* bodyOf(Schema.Struct({ dailyLimit: Schema.Int }), assistant))
          .dailyLimit,
        100
      );

      // Cancelled at the end of the period, then ended.
      assert.strictEqual(
        yield* deliver(payloadOf("customer.subscription.updated", delivery)),
        200
      );

      assert.isTrue(
        (yield* billingOf(owner, workspaceId)).subscription?.cancelAtPeriodEnd
      );

      assert.strictEqual(
        yield* deliver(payloadOf("customer.subscription.deleted", delivery)),
        200
      );

      const ended = yield* billingOf(owner, workspaceId);

      assert.strictEqual(ended.plan, "free");
      assert.isNull(ended.subscription);
    })
  );

  // Unpaid, a subscription buys no plan, but Stripe still has it.
  it.effect.each(["active", "unpaid"])(
    "keeps a workspace a subscription %s is on, with its API keys",
    (status) =>
      Effect.gen(function* deleting() {
        const app = yield* TestApp;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "deleting",
          delivery.customerId
        );

        yield* apiKeyOf(owner, workspaceId, ["post:read"]);

        const created = payloadOf(
          "customer.subscription.created",
          delivery
        ).replace('"status": "active"', `"status": "${status}"`);

        assert.strictEqual(yield* deliver(created), 200);

        const refused = yield* app.request("/api/auth/organization/delete", {
          body: { organizationId: workspaceId },
          headers: { cookie: owner.cookies },
        });

        assert.strictEqual(refused.status, 400);
        assert.strictEqual(
          (yield* bodyOf(ErrorSchema, refused)).code,
          "ORGANIZATION_HAS_ACTIVE_SUBSCRIPTION"
        );

        const keys = yield* app.request(
          `/api/workspaces/${workspaceId}/api-keys`,
          { headers: { cookie: owner.cookies } }
        );

        assert.lengthOf(yield* bodyOf(Schema.Array(Schema.Unknown), keys), 1);
      })
  );

  it.effect("refuses an event signed with another secret", () =>
    Effect.gen(function* forged() {
      const delivery = newDelivery();

      const { owner, workspaceId } = yield* billedWorkspace(
        "forged",
        delivery.customerId
      );

      const status = yield* deliver(
        payloadOf("customer.subscription.created", delivery),
        { secret: "whsec_someone_else" }
      );

      assert.strictEqual(status, 400);
      assert.strictEqual(yield* recordedEvents(delivery.eventId("created")), 0);
      assert.strictEqual((yield* billingOf(owner, workspaceId)).plan, "free");
    })
  );

  it.effect(
    "refuses a signed event replayed later, and records one delivered twice once",
    () =>
      Effect.gen(function* replays() {
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "replayed",
          delivery.customerId
        );

        const created = payloadOf("customer.subscription.created", delivery);

        // Signed ten minutes ago: past Stripe's five-minute tolerance.
        assert.strictEqual(
          yield* deliver(created, { timestamp: nowInSeconds() - 600 }),
          400
        );
        assert.strictEqual((yield* billingOf(owner, workspaceId)).plan, "free");

        // Stripe delivers an event again when it heard no answer.
        assert.strictEqual(yield* deliver(created), 200);
        assert.strictEqual(yield* deliver(created), 200);
        assert.strictEqual(
          yield* recordedEvents(delivery.eventId("created")),
          1
        );

        // An older event arriving after the cancellation changes nothing.
        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.deleted", delivery)),
          200
        );

        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.updated", delivery)),
          200
        );

        assert.strictEqual((yield* billingOf(owner, workspaceId)).plan, "free");
      })
  );

  it.effect("leaves a subscription of no workspace alone", () =>
    Effect.gen(function* stranger() {
      const delivery = newDelivery();

      assert.strictEqual(
        yield* deliver(payloadOf("customer.subscription.created", delivery)),
        200
      );
      assert.strictEqual(yield* recordedEvents(delivery.eventId("created")), 0);
    })
  );

  it.effect("refuses an invitation the plan's members have no room for", () =>
    Effect.gen(function* members() {
      const app = yield* TestApp;
      const owner = yield* signedUp("crowded");
      const workspaceId = yield* workspaceOf(owner, "Crowded");

      const invite = (email: string) =>
        app.request("/api/auth/organization/invite-member", {
          body: { email, organizationId: workspaceId, role: "editor" },
          headers: { cookie: owner.cookies },
        });

      const first = newEmail("first");

      // The free plan has two members: the owner, and one invited.
      assert.strictEqual((yield* invite(first)).status, 200);

      const second = yield* invite(newEmail("second"));

      assert.strictEqual(second.status, 402);
      assert.strictEqual(
        (yield* bodyOf(ErrorSchema, second)).code,
        "MEMBER_LIMIT_REACHED"
      );

      // Inviting the same person again replaces their invitation.
      assert.strictEqual((yield* invite(first)).status, 200);
    })
  );
});
