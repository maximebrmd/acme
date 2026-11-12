// Billing as a server with a Stripe key runs it: checkout and the customer
// portal against stripe-mock (STRIPE_MOCK_URL, the development stack's by
// default), and webhook events recorded from Stripe, signed here with the
// test's own secret. Nothing reaches Stripe.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { assert, layer } from "@effect/vitest";
import { Config, DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { BillingSchema, ReductionSchema, StandingSchema } from "peal-contract";
import type { Standing } from "peal-contract";
import { Stripe } from "stripe";

import { SqlLive } from "#shared/infrastructure/database.ts";
import {
  apiKeyOf,
  bodyOf,
  newEmail,
  password,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import type { Person } from "#test/workspace/integration/harness.ts";
import { seedChannel } from "#test/workspace/integration/seed.ts";

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

const webhookSecret = "whsec_synthetic_billing_test_secret";

// The live subscription stripe-mock lists for any customer.
const stripeMockSubscription = "sub_1Pgc6rB7WZ01zgkWNy0Cn5nw";

// What the server runs with: billing on, against stripe-mock.
const billingApp = Layer.unwrap(
  Effect.gen(function* billingApp() {
    const apiUrl = yield* stripeMockUrl;

    return TestApp.layerWith({
      STRIPE_API_URL: apiUrl,
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

// A standing, but for the account, which each reader is told of.
const withoutAccount = ({ account: _account, ...rest }: Standing) => rest;

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

// The statuses of replies to requests sent together, smallest first.
const statusesOf = (replies: readonly { readonly status: number }[]) =>
  replies.map(({ status }) => status).toSorted((left, right) => left - right);

// The way out of a limit the sign-in service's refusals carry.
const upgradeFields = {
  billingUrl: Schema.String,
  code: Schema.String,
  plan: Schema.String,
  planWithRoom: Schema.NullOr(Schema.String),
};

const LimitErrorSchema = Schema.Struct({
  ...upgradeFields,
  allowed: Schema.Number,
  limit: Schema.String,
  used: Schema.Number,
});

const CreatedSchema = Schema.Struct({ id: Schema.String });

// The subscriptions a refused deletion lists, as JSON carries them.
const decodeSubscribed = Schema.decodeUnknownSync(
  Schema.Struct({
    subscriptions: Schema.Array(
      Schema.Struct({
        paidUntil: Schema.NullOr(Schema.String),
        plan: Schema.NullOr(Schema.String),
        workspaceId: Schema.String,
      })
    ),
  })
);

// What an account's export says of its workspaces' billing.
const ExportedBillingSchema = Schema.Struct({
  workspaces: Schema.Array(
    Schema.Struct({
      billing: Schema.Struct({
        plan: Schema.NullOr(Schema.String),
        subscriptions: Schema.Array(
          Schema.Struct({ plan: Schema.String, status: Schema.String })
        ),
      }),
    })
  ),
});

const CheckoutSchema = Schema.Struct({
  redirect: Schema.Boolean,
  url: Schema.String,
});

const OrderSchema = Schema.Struct({ id: Schema.String });

// An order on the billing page, the box ticked: what a checkout needs.
const ordered = Effect.fn("ordered")(function* ordered(
  person: Person,
  workspaceId: string,
  order: {
    readonly interval: "month" | "year";
    readonly plan: string;
    readonly trial: boolean;
  }
) {
  const app = yield* TestApp;

  const reply = yield* app.request(
    `/api/workspaces/${workspaceId}/billing/orders`,
    {
      body: { ...order, startNow: true },
      headers: { cookie: person.cookies },
    }
  );

  assert.strictEqual(reply.status, 200);

  return yield* bodyOf(OrderSchema, reply);
});

// The created event, starting `daysAgo` days ago, as Stripe dates it.
const startedDaysAgo = (payload: string, daysAgo: number) => {
  const start = nowInSeconds() - daysAgo * 86_400;

  return payload
    .replaceAll('"start_date": 1793268000', `"start_date": ${start}`)
    .replaceAll(
      '"current_period_start": 1793268000',
      `"current_period_start": ${start}`
    )
    .replaceAll(
      '"current_period_end": 1795860000',
      `"current_period_end": ${start + 30 * 86_400}`
    );
};

// The created event as a trial a member started, ending in `days` days.
const trialFor = (payload: string, userId: string, days: number) =>
  payload
    .replace('"status": "active"', '"status": "trialing"')
    .replace(
      '"trial_end": null',
      `"trial_end": ${nowInSeconds() + days * 86_400}`
    )
    .replace(
      /"metadata": \{\},(?<rest>\s+"schedule")/u,
      `"metadata": { "userId": "${userId}" },$<rest>`
    );

// A JSON body of plain values, as the billing endpoints take.
type JsonBody = Readonly<
  Record<string, boolean | number | string | readonly string[]>
>;

// A POST as the person, with a body or none.
const post = (person: Person, route: string, body?: JsonBody) =>
  TestApp.use((app) =>
    app.request(route, {
      body,
      headers: { cookie: person.cookies },
      method: "POST",
    })
  );

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
        assistantRequests: 3,
        channels: 3,
        mediaStorage: 500_000_000,
        members: 2,
        scheduledPosts: 30,
      });
      assert.strictEqual(billing.usage.members, 1);
      assert.strictEqual(billing.usage.channels, 0);
      assert.strictEqual(billing.usage.mediaStorage, 0);
      assert.deepStrictEqual(
        billing.plans.map(({ plan }) => plan),
        ["free", "starter", "pro", "business", "agency"]
      );
      // A new workspace of a new account may try the paid plan.
      assert.deepStrictEqual(billing.trial, {
        available: true,
        days: 14,
        plan: "pro",
      });
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
            readonly annual?: boolean;
            readonly customerType?: string;
            readonly metadata?: { readonly orderId: string };
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

        // Without an order, which records the consent, no checkout.
        const unordered = yield* upgrade(owner, {
          customerType: "organization",
          referenceId: workspaceId,
        });

        assert.strictEqual(unordered.status, 400);
        assert.strictEqual(
          (yield* bodyOf(ErrorSchema, unordered)).code,
          "CHECKOUT_ORDER_REQUIRED"
        );

        const order = yield* ordered(owner, workspaceId, {
          interval: "year",
          plan: "pro",
          trial: false,
        });

        // An order is for its plan and interval only.
        const otherInterval = yield* upgrade(owner, {
          customerType: "organization",
          metadata: { orderId: order.id },
          referenceId: workspaceId,
        });

        assert.strictEqual(otherInterval.status, 400);

        const started = yield* upgrade(owner, {
          annual: true,
          customerType: "organization",
          metadata: { orderId: order.id },
          referenceId: workspaceId,
        });

        assert.strictEqual(started.status, 200);
        assert.match((yield* bodyOf(CheckoutSchema, started)).url, /^https:/u);

        // An order is used once.
        const again = yield* upgrade(owner, {
          annual: true,
          customerType: "organization",
          metadata: { orderId: order.id },
          referenceId: workspaceId,
        });

        assert.strictEqual(again.status, 400);

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

        // A reference that is no workspace's id: refused before the plugin
        // reads it, as an id the two-step guard cannot read is.
        const nowhere = yield* upgrade(owner, {
          customerType: "organization",
          referenceId: "not-a-workspace",
        });

        assert.strictEqual(nowhere.status, 400);
        assert.deepInclude(nowhere.body, { code: "INVALID_ID" });

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
      assert.strictEqual(pro.subscription?.interval, "month");

      // The assistant's quota is the plan's.
      const app = yield* TestApp;

      const assistant = yield* app.request(
        `/api/workspaces/${workspaceId}/assistant`,
        { headers: { cookie: owner.cookies } }
      );

      assert.strictEqual(
        (yield* bodyOf(Schema.Struct({ dailyLimit: Schema.Int }), assistant))
          .dailyLimit,
        20
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

  // Unpaid, a subscription buys no plan, but Stripe still has it: neither
  // the workspace nor the account it is the only workspace of may go.
  it.effect.each(["active", "unpaid"])(
    "keeps a workspace a subscription %s is on, with its API keys, and its owner's account",
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

        const refused = yield* app.request(`/api/workspaces/${workspaceId}`, {
          body: { name: "deleting" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(refused.status, 409);
        assert.deepInclude(refused.body, { _tag: "WorkspaceSubscribed" });
        assert.deepInclude(decodeSubscribed(refused.body).subscriptions[0], {
          workspaceId,
        });

        const closing = yield* app.request("/api/me", {
          body: { password },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(closing.status, 409);
        assert.deepInclude(closing.body, { _tag: "WorkspaceSubscribed" });
        assert.deepInclude(decodeSubscribed(closing.body).subscriptions[0], {
          workspaceId,
        });

        const keys = yield* app.request(
          `/api/workspaces/${workspaceId}/api-keys`,
          { headers: { cookie: owner.cookies } }
        );

        assert.lengthOf(yield* bodyOf(Schema.Array(Schema.Unknown), keys), 1);

        // The sign-in service's own route stays off.
        const throughAuth = yield* app.request(
          "/api/auth/organization/delete",
          {
            body: { organizationId: workspaceId },
            headers: { cookie: owner.cookies },
          }
        );

        assert.strictEqual(throughAuth.status, 404);
      })
  );

  it.effect(
    "cancels the subscription at Stripe and deletes the workspace once the owner agrees",
    () =>
      Effect.gen(function* cancelling() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "cancelling",
          delivery.customerId
        );

        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.created", delivery)),
          200
        );

        const refused = yield* app.request(`/api/workspaces/${workspaceId}`, {
          body: { name: "cancelling" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        // What cancelling ends, for the owner to read before agreeing.
        assert.strictEqual(refused.status, 409);
        assert.deepInclude(refused.body, { _tag: "WorkspaceSubscribed" });
        assert.deepInclude(decodeSubscribed(refused.body).subscriptions[0], {
          plan: "pro",
          workspaceId,
        });

        const deleted = yield* app.request(`/api/workspaces/${workspaceId}`, {
          body: { cancelSubscriptions: true, name: "cancelling" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(deleted.status, 204);
        assert.deepStrictEqual(
          yield* sql`SELECT
            (SELECT count(*)::int FROM billing.subscriptions WHERE workspace_id = ${workspaceId}) AS subscriptions,
            (SELECT count(*)::int FROM auth.organization WHERE id = ${workspaceId}) AS workspaces`,
          [{ subscriptions: 0, workspaces: 0 }]
        );

        // Stripe's event for the cancellation finds no workspace, and is
        // left alone rather than failing for ever.
        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.deleted", delivery)),
          200
        );
      })
  );

  it.effect(
    "closes an account whose workspace is subscribed once its user agrees to cancel",
    () =>
      Effect.gen(function* closingSubscribed() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "closing",
          delivery.customerId
        );

        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.created", delivery)),
          200
        );

        const closed = yield* app.request("/api/me", {
          body: { cancelSubscriptions: true, password },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(closed.status, 204);
        assert.deepStrictEqual(
          yield* sql`SELECT count(*)::int AS count FROM billing.subscriptions WHERE workspace_id = ${workspaceId}`,
          [{ count: 0 }]
        );
      })
  );

  // Stripe sends the member back from checkout, and the sign-in service's
  // plugin records the subscription, before Stripe's own events reach
  // billing.
  it.effect(
    "keeps a workspace whose checkout completed before Stripe's events came",
    () =>
      Effect.gen(function* checkedOut() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "completed",
          delivery.customerId
        );

        yield* sql`INSERT INTO auth.subscription (plan, reference_id, stripe_customer_id, stripe_subscription_id, status)
          VALUES ('pro', ${workspaceId}, ${delivery.customerId}, ${delivery.subscriptionId}, 'active')`;

        const refused = yield* app.request(`/api/workspaces/${workspaceId}`, {
          body: { name: "completed" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(refused.status, 409);
        assert.deepInclude(refused.body, { _tag: "WorkspaceSubscribed" });
        assert.deepInclude(decodeSubscribed(refused.body).subscriptions[0], {
          workspaceId,
        });
      })
  );

  it.effect(
    "deletes a workspace once its subscription ended, with what billing recorded of it",
    () =>
      Effect.gen(function* deletingEnded() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "ended",
          delivery.customerId
        );

        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.created", delivery)),
          200
        );
        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.deleted", delivery)),
          200
        );

        // A copy of the account's data shows the plan and how its
        // subscription ended, and none of Stripe's ids.
        const exported = yield* app.request("/api/me/export", {
          headers: { cookie: owner.cookies },
        });

        assert.strictEqual(exported.status, 200);

        const { workspaces } = yield* bodyOf(ExportedBillingSchema, exported);

        assert.deepStrictEqual(
          workspaces.map(({ billing }) => billing),
          [
            {
              plan: "free",
              subscriptions: [{ plan: "pro", status: "canceled" }],
            },
          ]
        );

        const text = JSON.stringify(exported.body);

        assert.notInclude(text, delivery.customerId);
        assert.notInclude(text, delivery.subscriptionId);

        const deleted = yield* app.request(`/api/workspaces/${workspaceId}`, {
          body: { name: "ended" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(deleted.status, 204);
        assert.deepStrictEqual(
          yield* sql`SELECT count(*)::int AS count FROM billing.subscriptions WHERE workspace_id = ${workspaceId}`,
          [{ count: 0 }]
        );
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

      // With what a client needs to offer the way out.
      assert.deepStrictEqual(yield* bodyOf(LimitErrorSchema, second), {
        allowed: 2,
        billingUrl: `http://localhost:3001/app/${workspaceId}/billing`,
        code: "MEMBER_LIMIT_REACHED",
        limit: "members",
        plan: "free",
        planWithRoom: "starter",
        used: 2,
      });

      // Inviting the same person again replaces their invitation.
      assert.strictEqual((yield* invite(first)).status, 200);
    })
  );
  it.effect(
    "keeps a member when two owners each choose to keep only themselves, at once",
    () =>
      Effect.gen(function* together() {
        const sql = yield* SqlClient.SqlClient;
        const first = yield* signedUp("keeper-a");
        const second = yield* signedUp("keeper-b");
        const editor = yield* signedUp("keeper-c");

        const outcomes = yield* Effect.forEach(
          Array.from({ length: 8 }),
          Effect.fnUntraced(function* once() {
            // Over the free plan's two members, as after a trial: put
            // there directly, since no route lets a workspace get there.
            const workspaceId = randomUUID();

            yield* sql`INSERT INTO auth.organization (id, name, slug, created_at) VALUES (${workspaceId}, 'Keepers', ${`keepers-${workspaceId}`}, now())`;
            yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${workspaceId}, ${first.id}, 'owner', now()), (${workspaceId}, ${second.id}, 'owner', now()), (${workspaceId}, ${editor.id}, 'editor', now())`;

            const keepOnly = (who: typeof first) =>
              post(who, `/api/workspaces/${workspaceId}/billing/reduction`, {
                keepChannelIds: [],
                keepMemberIds: [who.id],
              });

            const answers = yield* Effect.all(
              [keepOnly(first), keepOnly(second)],
              { concurrency: 2 }
            );

            const left =
              yield* sql`SELECT count(*)::int AS count FROM auth.member WHERE organization_id = ${workspaceId} AND role = 'owner'`;

            return {
              left,
              served: answers.filter(({ status }) => status === 200).length,
            };
          })
        );

        // One choice is made, and the other finds its chooser gone: an
        // owner stays, whoever came first.
        assert.deepStrictEqual(
          outcomes,
          outcomes.map(() => ({ left: [{ count: 1 }], served: 1 }))
        );
      })
  );

  it.effect(
    "counts an invitation or a member whatever the case its ids are written in",
    () =>
      Effect.gen(function* written() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const owner = yield* signedUp("shouting");
        const guest = yield* signedUp("shouting-guest");
        const workspaceId = yield* workspaceOf(owner, "Shouting");

        const invite = (email: string, organizationId: string) =>
          app.request("/api/auth/organization/invite-member", {
            body: { email, organizationId, role: "editor" },
            headers: { cookie: owner.cookies },
          });

        // Postgres reads a UUID in any case: an id written in capitals
        // names the same workspace, and takes no way around its plan.
        const shouted = yield* Effect.forEach([1, 2, 3], (index) =>
          invite(
            newEmail(`shouted-${String(index)}`),
            workspaceId.toUpperCase()
          )
        );

        assert.deepStrictEqual(
          shouted.map(({ status }) => status),
          [400, 400, 400]
        );

        const invited = yield* invite(guest.email, workspaceId);

        assert.strictEqual(invited.status, 200);

        const { id } = yield* bodyOf(
          Schema.Struct({ id: Schema.String }),
          invited
        );

        const accept = (invitationId: string) =>
          app.request("/api/auth/organization/accept-invitation", {
            body: { invitationId },
            headers: { cookie: guest.cookies },
          });

        assert.strictEqual((yield* accept(id.toUpperCase())).status, 400);
        assert.strictEqual((yield* accept(id)).status, 200);

        const held =
          yield* sql`SELECT ((SELECT count(*) FROM auth.member WHERE organization_id = ${workspaceId}) + (SELECT count(*) FROM auth.invitation WHERE organization_id = ${workspaceId} AND status = 'pending'))::int AS count`;

        assert.deepStrictEqual(held, [{ count: 2 }]);
      })
  );

  it.effect(
    "takes an order only from a member who manages billing, in person, who asked to start now",
    () =>
      Effect.gen(function* orders() {
        const app = yield* TestApp;
        const owner = yield* signedUp("orderer");
        const workspaceId = yield* workspaceOf(owner, "Orders");
        const ordersRoute = `/api/workspaces/${workspaceId}/billing/orders`;

        // The box left unticked.
        const unticked = yield* post(owner, ordersRoute, {
          interval: "month",
          plan: "starter",
          startNow: false,
          trial: false,
        });

        assert.strictEqual(unticked.status, 400);

        const editor = yield* signedUp("order-editor");
        const sql = yield* SqlClient.SqlClient;

        yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${workspaceId}, ${editor.id}, 'editor', now())`;

        const byEditor = yield* post(editor, ordersRoute, {
          interval: "month",
          plan: "starter",
          startNow: true,
          trial: false,
        });

        assert.strictEqual(byEditor.status, 403);

        const { key } = yield* apiKeyOf(owner, workspaceId, ["billing:read"]);

        const byKey = yield* app.request(ordersRoute, {
          body: {
            interval: "month",
            plan: "starter",
            startNow: true,
            trial: false,
          },
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(byKey.status, 403);

        // The trial is the trial plan's, monthly.
        const otherTrial = yield* post(owner, ordersRoute, {
          interval: "year",
          plan: "agency",
          startNow: true,
          trial: true,
        });

        assert.strictEqual(otherTrial.status, 409);
        assert.deepInclude(otherTrial.body, {
          _tag: "TrialUnavailable",
          reason: "notOffered",
        });

        const consents =
          yield* sql`SELECT count(*)::int AS count FROM billing.orders WHERE workspace_id = ${workspaceId}`;

        assert.deepStrictEqual(consents, [{ count: 0 }]);
      })
  );

  it.effect(
    "starts one trial per account and per workspace, without a payment method, then falls back to the free plan",
    () =>
      Effect.gen(function* trial() {
        const app = yield* TestApp;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "trial",
          delivery.customerId
        );

        const order = yield* ordered(owner, workspaceId, {
          interval: "month",
          plan: "pro",
          trial: true,
        });

        const checkout = yield* app.request("/api/auth/subscription/upgrade", {
          body: {
            cancelUrl: `/app/${workspaceId}/billing`,
            customerType: "organization",
            disableRedirect: true,
            metadata: { orderId: order.id },
            plan: "pro",
            referenceId: workspaceId,
            successUrl: `/app/${workspaceId}/billing?checkout=done`,
          },
          headers: { cookie: owner.cookies },
        });

        assert.strictEqual(checkout.status, 200);

        assert.strictEqual(
          yield* deliver(
            trialFor(
              payloadOf("customer.subscription.created", delivery),
              owner.id,
              14
            )
          ),
          200
        );

        const trying = yield* billingOf(owner, workspaceId);

        assert.strictEqual(trying.plan, "pro");
        assert.strictEqual(trying.subscription?.status, "trialing");
        assert.isNotNull(trying.subscription?.trialEnd);
        assert.isFalse(trying.trial?.available);

        // Another workspace of the account is on the same account, and
        // shares the plan the trial gives.
        const another = yield* app.request("/api/auth/organization/create", {
          body: { name: "Another", slug: `another-${randomUUID()}` },
          headers: { cookie: owner.cookies },
        });

        assert.strictEqual(another.status, 200);

        const { id: anotherId } = yield* bodyOf(CreatedSchema, another);

        assert.strictEqual((yield* billingOf(owner, anotherId)).plan, "pro");

        // The same account, admin of another workspace: no second trial.
        const colleague = yield* signedUp("trial-colleague");
        const second = yield* workspaceOf(colleague, "Second");
        const sql = yield* SqlClient.SqlClient;

        yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${second}, ${owner.id}, 'admin', now())`;

        const refused = yield* post(
          owner,
          `/api/workspaces/${second}/billing/orders`,
          { interval: "month", plan: "pro", startNow: true, trial: true }
        );

        assert.strictEqual(refused.status, 409);
        assert.deepInclude(refused.body, {
          _tag: "TrialUnavailable",
          reason: "used",
        });

        // Ended without a payment method, Stripe cancels it.
        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.deleted", delivery)),
          200
        );

        const after = yield* billingOf(owner, workspaceId);

        assert.strictEqual(after.plan, "free");
        assert.isFalse(after.trial?.available);
      })
  );

  it.effect(
    "changes a workspace's subscription only for an order, and opens a checkout of its own for a paid plan during the trial",
    () =>
      Effect.gen(function* inPlace() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "in-place",
          delivery.customerId
        );

        // The workspace in its trial, as Better Auth's plugin holds it,
        // under the id of the live subscription stripe-mock lists for every
        // customer: the plugin would change it in place, without a
        // checkout.
        yield* sql`INSERT INTO auth.subscription (plan, reference_id, stripe_customer_id, stripe_subscription_id, status)
          VALUES ('pro', ${workspaceId}, ${delivery.customerId}, ${stripeMockSubscription}, 'trialing')`;

        const upgrade = (body: {
          readonly metadata?: { readonly orderId: string };
          readonly subscriptionId?: string;
        }) =>
          app.request("/api/auth/subscription/upgrade", {
            body: {
              cancelUrl: `/app/${workspaceId}/billing`,
              customerType: "organization",
              disableRedirect: true,
              plan: "agency",
              referenceId: workspaceId,
              successUrl: `/app/${workspaceId}/billing?checkout=done`,
              ...body,
            },
            headers: { cookie: owner.cookies },
          });

        // Agency for the trial's price, without an order: refused.
        const unordered = yield* upgrade({});

        assert.strictEqual(unordered.status, 400);
        assert.strictEqual(
          (yield* bodyOf(ErrorSchema, unordered)).code,
          "CHECKOUT_ORDER_REQUIRED"
        );

        const named = yield* upgrade({
          subscriptionId: stripeMockSubscription,
        });

        assert.strictEqual(named.status, 400);
        assert.strictEqual(
          (yield* bodyOf(ErrorSchema, named)).code,
          "SUBSCRIPTION_CHOICE_REFUSED"
        );

        const order = yield* ordered(owner, workspaceId, {
          interval: "month",
          plan: "agency",
          trial: false,
        });

        const checkout = yield* upgrade({ metadata: { orderId: order.id } });

        assert.strictEqual(checkout.status, 200);
        assert.match((yield* bodyOf(CheckoutSchema, checkout)).url, /^https:/u);

        // The order was taken: once.
        const again = yield* upgrade({ metadata: { orderId: order.id } });

        assert.strictEqual(again.status, 400);

        // A paid plan changes in place for an order only, too.
        yield* sql`UPDATE auth.subscription SET status = 'active' WHERE reference_id = ${workspaceId}`;

        const paidUnordered = yield* upgrade({});

        assert.strictEqual(paidUnordered.status, 400);
        assert.strictEqual(
          (yield* bodyOf(ErrorSchema, paidUnordered)).code,
          "CHECKOUT_ORDER_REQUIRED"
        );
      })
  );

  it.effect(
    "puts every workspace an account makes on its billing account, billed on the first",
    () =>
      Effect.gen(function* oneAccount() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const owner = yield* signedUp("one-account");

        const first = yield* workspaceOf(owner, "First");

        const made = yield* app.request("/api/auth/organization/create", {
          body: { name: "Second", slug: `second-${randomUUID()}` },
          headers: { cookie: owner.cookies },
        });

        assert.strictEqual(made.status, 200);

        const { id: second } = yield* bodyOf(CreatedSchema, made);

        const rows = yield* sql<{
          readonly holder: string;
          readonly payer: string;
          readonly workspaceId: string;
        }>`SELECT a.holder_workspace_id AS holder, a.payer_user_id AS payer, w.workspace_id AS "workspaceId"
          FROM billing.account_workspaces w JOIN billing.accounts a ON a.id = w.account_id
          WHERE w.workspace_id IN (${first}, ${second}) ORDER BY w.workspace_id = ${first} DESC`.pipe(
          Effect.orDie
        );

        assert.deepStrictEqual(rows, [
          { holder: first, payer: owner.id, workspaceId: first },
          { holder: first, payer: owner.id, workspaceId: second },
        ]);
      })
  );

  // Cancelling and withdrawing tell the members by notice and email, which
  // the app's engine without workers cannot send: the use cases' tests
  // cover what they do, these what the endpoints refuse and preview.
  it.effect(
    "refuses to cancel nothing, and to cancel or withdraw for a member who does not manage billing",
    () =>
      Effect.gen(function* refusesCancelling() {
        const sql = yield* SqlClient.SqlClient;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "canceller",
          delivery.customerId
        );

        const cancellation = `/api/workspaces/${workspaceId}/billing/cancellation`;
        const nothing = yield* post(owner, cancellation, {});

        assert.strictEqual(nothing.status, 409);
        assert.deepInclude(nothing.body, { _tag: "NothingToCancel" });

        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.created", delivery)),
          200
        );

        const editor = yield* signedUp("cancel-editor");

        yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${workspaceId}, ${editor.id}, 'editor', now())`;

        assert.strictEqual((yield* post(editor, cancellation, {})).status, 403);
        assert.strictEqual(
          (yield* post(
            editor,
            `/api/workspaces/${workspaceId}/billing/withdrawal`
          )).status,
          403
        );
      })
  );

  it.effect(
    "previews a consumer's withdrawal within 14 days, and refuses one after",
    () =>
      Effect.gen(function* withdrawal() {
        const app = yield* TestApp;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "withdrawing",
          delivery.customerId
        );

        assert.strictEqual(
          yield* deliver(
            startedDaysAgo(
              payloadOf("customer.subscription.created", delivery),
              2
            )
          ),
          200
        );

        const preview = yield* app.request(
          `/api/workspaces/${workspaceId}/billing/withdrawal`,
          { headers: { cookie: owner.cookies } }
        );

        // stripe-mock's invoices hold nothing paid: nothing to refund.
        assert.strictEqual(preview.status, 200);
        assert.deepInclude(preview.body, {
          plan: "pro",
          refund: { amount: 0, currency: "eur" },
        });
        assert.isNotNull(
          (yield* billingOf(owner, workspaceId)).withdrawableUntil
        );

        const late = newDelivery();

        const other = yield* billedWorkspace(
          "withdrawing-late",
          late.customerId
        );

        assert.strictEqual(
          yield* deliver(
            startedDaysAgo(payloadOf("customer.subscription.created", late), 20)
          ),
          200
        );

        const expired = yield* post(
          other.owner,
          `/api/workspaces/${other.workspaceId}/billing/withdrawal`
        );

        assert.strictEqual(expired.status, 409);
        assert.deepInclude(expired.body, {
          _tag: "WithdrawalUnavailable",
          reason: "expired",
        });
        assert.isNull(
          (yield* billingOf(other.owner, other.workspaceId)).withdrawableUntil
        );
      })
  );

  it.effect("refuses an upload the plan's storage has no room for", () =>
    Effect.gen(function* storage() {
      const owner = yield* signedUp("storage");
      const workspaceId = yield* workspaceOf(owner, "Storage");

      const refused = yield* post(
        owner,
        `/api/workspaces/${workspaceId}/media`,
        {
          byteSize: 600_000_000,
          contentType: "video/mp4",
        }
      );

      assert.strictEqual(refused.status, 402);
      assert.deepInclude(refused.body, {
        _tag: "PlanLimitReached",
        allowed: 500_000_000,
        billingUrl: `http://localhost:3001/app/${workspaceId}/billing`,
        code: "plan_limit_reached",
        limit: "mediaStorage",
        plan: "free",
        planWithRoom: "starter",
        used: 0,
      });
    })
  );
  // Requests sent together count in turn: none passes a limit because
  // another had not written yet.
  it.effect(
    "lets one of two invitations sent together take the last seat",
    () =>
      Effect.gen(function* invitedTogether() {
        const app = yield* TestApp;
        const owner = yield* signedUp("invited-together");
        const workspaceId = yield* workspaceOf(owner, "Together");

        const invite = (email: string) =>
          app.request("/api/auth/organization/invite-member", {
            body: { email, organizationId: workspaceId, role: "editor" },
            headers: { cookie: owner.cookies },
          });

        // The free plan has two members: the owner, and one invited.
        const replies = yield* Effect.all(
          [invite(newEmail("one")), invite(newEmail("two"))],
          { concurrency: "unbounded" }
        );

        assert.deepStrictEqual(statusesOf(replies), [200, 402]);
      })
  );

  it.effect(
    "lets one of two invitations accepted together take the last seat",
    () =>
      Effect.gen(function* acceptedTogether() {
        const app = yield* TestApp;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "accepted-together",
          delivery.customerId
        );

        // On a paid plan, which has room for both invitations.
        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.updated", delivery)),
          200
        );

        const guests = [
          yield* signedUp("guest-one"),
          yield* signedUp("guest-two"),
        ];

        const invitations = yield* Effect.all(
          guests.map((guest) =>
            app
              .request("/api/auth/organization/invite-member", {
                body: {
                  email: guest.email,
                  organizationId: workspaceId,
                  role: "editor",
                },
                headers: { cookie: owner.cookies },
              })
              .pipe(
                Effect.flatMap((reply) =>
                  bodyOf(Schema.Struct({ id: Schema.String }), reply)
                )
              )
          )
        );

        // Back on the free plan, which has one seat left.
        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.deleted", delivery)),
          200
        );

        const replies = yield* Effect.all(
          guests.map((guest, index) =>
            app.request("/api/auth/organization/accept-invitation", {
              body: { invitationId: invitations[index]?.id },
              headers: { cookie: guest.cookies },
            })
          ),
          { concurrency: "unbounded" }
        );

        assert.deepStrictEqual(statusesOf(replies), [200, 402]);
        assert.strictEqual(
          (yield* billingOf(owner, workspaceId)).usage.members,
          2
        );
      })
  );

  it.effect("puts two workspaces created together on one billing account", () =>
    Effect.gen(function* createdTogether() {
      const app = yield* TestApp;
      const owner = yield* signedUp("created-together");

      const create = (name: string) =>
        app.request("/api/auth/organization/create", {
          body: { name, slug: `${name}-${randomUUID()}` },
          headers: { cookie: owner.cookies },
        });

      const replies = yield* Effect.all([create("first"), create("second")], {
        concurrency: "unbounded",
      });

      assert.deepStrictEqual(statusesOf(replies), [200, 200]);

      const sql = yield* SqlClient.SqlClient;

      const accounts = yield* sql<{
        readonly workspaces: number;
      }>`SELECT count(w.workspace_id)::int AS workspaces FROM billing.accounts a JOIN billing.account_workspaces w ON w.account_id = a.id WHERE a.payer_user_id = ${owner.id} GROUP BY a.id`.pipe(
        Effect.orDie
      );

      assert.deepStrictEqual(accounts, [{ workspaces: 2 }]);
    })
  );
  it.effect(
    "keeps a workspace's payer among its owners until they hand it over",
    () =>
      Effect.gen(function* payerStays() {
        const app = yield* TestApp;
        const payer = yield* signedUp("payer");
        const other = yield* signedUp("other-owner");
        const workspaceId = yield* workspaceOf(payer, "Handed over");

        const invited = yield* app.request(
          "/api/auth/organization/invite-member",
          {
            body: {
              email: other.email,
              organizationId: workspaceId,
              role: "owner",
            },
            headers: { cookie: payer.cookies },
          }
        );

        const accepted = yield* app.request(
          "/api/auth/organization/accept-invitation",
          {
            body: {
              invitationId: (yield* bodyOf(CreatedSchema, invited)).id,
            },
            headers: { cookie: other.cookies },
          }
        );

        assert.strictEqual(accepted.status, 200);

        const sql = yield* SqlClient.SqlClient;

        const [payerMember] = yield* sql<{
          readonly id: string;
        }>`SELECT id FROM auth.member WHERE organization_id = ${workspaceId} AND user_id = ${payer.id}`.pipe(
          Effect.orDie
        );

        const refusals = [
          yield* post(payer, "/api/auth/organization/leave", {
            organizationId: workspaceId,
          }),
          yield* post(other, "/api/auth/organization/remove-member", {
            memberIdOrEmail: payer.email,
            organizationId: workspaceId,
          }),
          yield* post(other, "/api/auth/organization/update-member-role", {
            memberId: payerMember?.id ?? "",
            organizationId: workspaceId,
            role: "admin",
          }),
        ];

        assert.deepStrictEqual(statusesOf(refusals), [400, 400, 400]);

        for (const refused of refusals) {
          assert.strictEqual(
            (yield* bodyOf(ErrorSchema, refused)).code,
            "PAYER_MUST_STAY"
          );
        }

        // Handed over: the other owner pays, and the first may leave.
        const offered = yield* post(
          payer,
          `/api/workspaces/${workspaceId}/billing/transfer`,
          { toUserId: other.id }
        );

        assert.strictEqual(offered.status, 200);

        const taken = yield* post(
          other,
          `/api/workspaces/${workspaceId}/billing/transfer/acceptance`
        );

        assert.strictEqual(taken.status, 200);
        assert.deepInclude(taken.body, { payer: true });

        const left = yield* post(payer, "/api/auth/organization/leave", {
          organizationId: workspaceId,
        });

        assert.strictEqual(left.status, 200);
      })
  );

  // A plan that shrinks under a workspace deletes nothing: the workspace
  // says what it holds beyond the plan, and comes back within it by
  // keeping what a member who manages billing chose.
  it.effect(
    "has a workspace over its plan after its subscription ends choose what stays",
    () =>
      Effect.gen(function* overPlan() {
        const app = yield* TestApp;
        const delivery = newDelivery();

        const { owner, workspaceId } = yield* billedWorkspace(
          "over-plan",
          delivery.customerId
        );

        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.updated", delivery)),
          200
        );

        // On the paid plan: five channels, and three members.
        const channelIds = yield* Effect.all(
          ["one", "two", "three", "four", "five"].map((handle) =>
            seedChannel(workspaceId, `@${handle}@social.example`)
          )
        );

        const guests = [yield* signedUp("stays"), yield* signedUp("leaves")];

        for (const guest of guests) {
          const invited = yield* app.request(
            "/api/auth/organization/invite-member",
            {
              body: {
                email: guest.email,
                organizationId: workspaceId,
                role: "editor",
              },
              headers: { cookie: owner.cookies },
            }
          );

          const accepted = yield* app.request(
            "/api/auth/organization/accept-invitation",
            {
              body: {
                invitationId: (yield* bodyOf(
                  Schema.Struct({ id: Schema.String }),
                  invited
                )).id,
              },
              headers: { cookie: guest.cookies },
            }
          );

          assert.strictEqual(accepted.status, 200);
        }

        const standingWithAccount = (cookies: string) =>
          app
            .request(`/api/workspaces/${workspaceId}/billing/standing`, {
              headers: { cookie: cookies },
            })
            .pipe(
              Effect.flatMap((reply) =>
                bodyOf(Schema.toCodecJson(StandingSchema), reply)
              )
            );

        const standing = (cookies: string) =>
          standingWithAccount(cookies).pipe(Effect.map(withoutAccount));

        const within: Omit<Standing, "account"> = {
          mustReduce: false,
          over: [],
          plan: "pro",
          planWithRoom: null,
          scheduledPosts: 0,
        };

        assert.deepStrictEqual(yield* standing(owner.cookies), within);

        // The owner who made the workspace pays for it, alone in its
        // account; a guest is told whose account it is, not as its payer.
        assert.deepStrictEqual(
          (yield* standingWithAccount(owner.cookies)).account,
          {
            billingWorkspaceId: workspaceId,
            billingWorkspaceName: "over-plan",
            id: (yield* billingOf(owner, workspaceId)).account.id,
            otherWorkspaces: [],
            partner: false,
            payer: true,
            transfer: null,
            workspaces: 1,
          }
        );

        // The subscription ends: the workspace is on the free plan, with
        // everything it had.
        assert.strictEqual(
          yield* deliver(payloadOf("customer.subscription.deleted", delivery)),
          200
        );

        const over: Omit<Standing, "account"> = {
          mustReduce: true,
          over: [
            { allowed: 3, limit: "channels", used: 5 },
            { allowed: 2, limit: "members", used: 3 },
          ],
          plan: "free",
          // Starter holds five channels and three members.
          planWithRoom: "starter",
          scheduledPosts: 0,
        };

        // Every member is told, whatever their role.
        assert.deepStrictEqual(yield* standing(owner.cookies), over);
        assert.deepStrictEqual(yield* standing(guests[0]?.cookies ?? ""), over);

        const reduce = (
          person: Person,
          keep: {
            readonly channels: readonly string[];
            readonly members: readonly string[];
          }
        ) =>
          post(person, `/api/workspaces/${workspaceId}/billing/reduction`, {
            keepChannelIds: keep.channels,
            keepMemberIds: keep.members,
          });

        const kept = {
          channels: channelIds.slice(0, 3),
          members: [owner.id, guests[0]?.id ?? ""],
        };

        // Only those who manage billing choose.
        assert.strictEqual(
          (yield* reduce(guests[0] ?? owner, kept)).status,
          403
        );

        // A choice the plan cannot hold changes nothing.
        const tooMany = yield* reduce(owner, {
          ...kept,
          channels: channelIds.slice(0, 4),
        });

        assert.strictEqual(tooMany.status, 409);
        assert.deepInclude(tooMany.body, {
          _tag: "ReductionRefused",
          reason: "tooManyChannels",
        });
        assert.deepStrictEqual(yield* standing(owner.cookies), over);

        const reduced = yield* reduce(owner, kept);

        assert.strictEqual(reduced.status, 200);

        const { standing: after, ...done } = yield* bodyOf(
          Schema.toCodecJson(ReductionSchema),
          reduced
        );

        assert.deepStrictEqual(done, {
          disconnectedChannels: 2,
          removedMembers: 1,
          revokedInvitations: 0,
        });
        assert.deepStrictEqual(withoutAccount(after), {
          ...within,
          plan: "free",
        });

        const billing = yield* billingOf(owner, workspaceId);

        assert.strictEqual(billing.usage.channels, 3);
        assert.strictEqual(billing.usage.members, 2);

        // Whoever was removed no longer reaches the workspace.
        assert.strictEqual(
          (yield* app.request(
            `/api/workspaces/${workspaceId}/billing/standing`,
            { headers: { cookie: guests[1]?.cookies ?? "" } }
          )).status,
          404
        );
      })
  );
});
