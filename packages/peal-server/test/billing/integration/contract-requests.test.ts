// The cancel and withdraw functions as the server answers them, without a
// session: the same answer whatever the address finds, an acknowledgement
// in the mail, the link that opens the holder's contracts, the address
// limit and Turnstile. Applying a request tells members through a workflow
// the app's engine does not run in tests: the use cases' tests cover it.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { SqlLive } from "#shared/infrastructure/database.ts";
import {
  appWithTurnstile,
  dummyToken,
  failingSecretKey,
  passingSecretKey,
  passingSiteKey,
} from "#test/workspace/fakes/fake-turnstile.ts";
import {
  bodyOf,
  emailTo,
  linkIn,
  makeAdmin,
  newEmail,
  signedUp,
  signIn,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

const BillingApp = Layer.mergeAll(
  TestApp.layerWith({
    STRIPE_SECRET_KEY: "sk_test_0123456789syntheticrequests",
    STRIPE_WEBHOOK_SECRET: "whsec_synthetic_requests_test_secret",
  }),
  SqlLive
);

const ReceiptSchema = Schema.Struct({ receivedAt: Schema.String });

const TaggedSchema = Schema.Struct({ _tag: Schema.String });

const OpenRequestsSchema = Schema.Array(
  Schema.Struct({
    email: Schema.NullOr(Schema.String),
    id: Schema.String,
    name: Schema.NullOr(Schema.String),
    status: Schema.String,
  })
);

const PreviewSchema = Schema.Struct({
  contracts: Schema.Array(
    Schema.Struct({
      plan: Schema.String,
      workspaceId: Schema.String,
      workspaceName: Schema.String,
    })
  ),
  kind: Schema.String,
});

// A request from the form, from a client address of the test's own, so
// tests never share the address limit.
const send = (
  address: string,
  fields: Readonly<Record<string, string | null>>,
  headers: Readonly<Record<string, string>> = {}
) =>
  TestApp.use((app) =>
    app.request("/api/contract-requests", {
      body: {
        contract: null,
        desiredOn: null,
        kind: "cancellation",
        locale: "en",
        name: "Camille Synthetic",
        ...fields,
      },
      headers: { "x-forwarded-for": address, ...headers },
    })
  );

const newAddress = () => `203.0.113.${randomUUID()}`;

// A workspace with a subscription, as Stripe's webhook records one.
const subscribed = Effect.fn("subscribed")(function* subscribed(label: string) {
  const owner = yield* signedUp(label);
  const workspaceId = yield* workspaceOf(owner, label);
  const sql = yield* SqlClient.SqlClient;
  const run = randomUUID().replaceAll("-", "");

  yield* sql`INSERT INTO billing.subscriptions (stripe_subscription_id, stripe_customer_id, workspace_id, plan, interval, status, cancel_at_period_end, started_at, current_period_start, current_period_end, last_event_at, last_event_id, updated_at)
    VALUES (${`sub_${run}`}, ${`cus_${run}`}, ${workspaceId}, 'starter', 'month', 'active', false, now() - interval '20 days', now() - interval '20 days', now() + interval '10 days', now(), ${`evt_${run}`}, now())`;

  return { owner, workspaceId };
});

const statusOf = Effect.fn("statusOf")(function* statusOf(email: string) {
  const sql = yield* SqlClient.SqlClient;

  const rows = yield* sql<{
    readonly status: string;
  }>`SELECT status FROM billing.contract_requests WHERE email = ${email} ORDER BY received_at`;

  return rows.map(({ status }) => status);
});

// Waits until the request sent with the address was looked at.
const lookedAt = (email: string, status: string) =>
  statusOf(email).pipe(
    Effect.filterOrFail((all) => all.includes(status)),
    Effect.retry({ times: 100 }),
    Effect.orDie
  );

layer(BillingApp, { excludeTestServices: true, timeout: "180 seconds" })(
  "the cancel and withdraw functions",
  (it) => {
    it.effect("say they exist, and need no captcha here", () =>
      Effect.gen(function* settings() {
        const app = yield* TestApp;
        const reply = yield* app.request("/api/contract-requests/functions");

        assert.deepStrictEqual(reply.body, {
          enabled: true,
          turnstileSiteKey: null,
        });
      })
    );

    it.effect(
      "answer the same whatever the address finds, and acknowledge each by email",
      () =>
        Effect.gen(function* sameAnswer() {
          const { owner, workspaceId } = yield* subscribed("holder");
          const stranger = newEmail("nobody");
          const address = newAddress();

          const known = yield* send(address, { email: owner.email });
          const unknown = yield* send(address, { email: stranger });

          for (const reply of [known, unknown]) {
            assert.strictEqual(reply.status, 200);
            assert.deepStrictEqual(
              Object.keys(yield* bodyOf(ReceiptSchema, reply)),
              ["receivedAt"]
            );
          }

          // The holder's waits for their link; nothing is cancelled.
          yield* lookedAt(owner.email, "awaitingConfirmation");
          yield* lookedAt(stranger, "unmatched");

          const sql = yield* SqlClient.SqlClient;

          assert.deepStrictEqual(
            yield* sql`SELECT cancel_at_period_end FROM billing.subscriptions WHERE workspace_id = ${workspaceId}`,
            [{ cancel_at_period_end: false }]
          );

          const toHolder = yield* emailTo(owner.email, /cancellation/u);
          const toStranger = yield* emailTo(stranger, /cancellation/u);

          assert.include(toHolder.Text, "Camille Synthetic");
          assert.include(toHolder.Text, "UTC");
          assert.include(toHolder.Text, "Apply my request");
          assert.include(toStranger.Text, "a person will look at it");
          assert.notInclude(toStranger.Text, "Apply my request");

          // The link opens the contracts the address manages, and no
          // other token does.
          const token = linkIn(toHolder).searchParams.get("token");
          const app = yield* TestApp;

          const preview = yield* app.request(
            "/api/contract-requests/confirmation/preview",
            { body: { token }, headers: { "x-forwarded-for": address } }
          );

          assert.strictEqual(preview.status, 200);
          assert.deepStrictEqual(yield* bodyOf(PreviewSchema, preview), {
            contracts: [
              { plan: "starter", workspaceId, workspaceName: "holder" },
            ],
            kind: "cancellation",
          });

          const wrong = yield* app.request(
            "/api/contract-requests/confirmation/preview",
            {
              body: { token: `${token}x` },
              headers: { "x-forwarded-for": address },
            }
          );

          assert.strictEqual(wrong.status, 404);
        })
    );

    it.effect(
      "shows staff alone the requests that wait, and records what they do with one, by its id",
      () =>
        Effect.gen(function* staff() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const stranger = newEmail("unmatched");

          yield* send(newAddress(), { email: stranger });
          yield* lookedAt(stranger, "unmatched");

          const member = yield* signedUp("requests-member");

          const hidden = yield* app.request("/api/admin/contract-requests", {
            headers: { cookie: member.cookies },
          });

          assert.strictEqual(hidden.status, 404);

          const account = yield* signedUp("requests-staff");

          yield* makeAdmin(account.id);

          const cookie = yield* signIn(account.email);

          const listed = yield* app.request("/api/admin/contract-requests", {
            headers: { cookie },
          });

          // The stranger's request, or one that matches nothing below.
          const waiting = (yield* bodyOf(OpenRequestsSchema, listed)).find(
            ({ email }) => email === stranger
          ) ?? { email: null, id: "", name: null, status: "missing" };

          assert.strictEqual(waiting.status, "unmatched");
          assert.strictEqual(waiting.name, "Camille Synthetic");

          const closed = yield* app.request(
            `/api/admin/contract-requests/${waiting.id}/close`,
            { body: { reason: "Holds no contract here" }, headers: { cookie } }
          );

          assert.strictEqual(closed.status, 200);
          assert.deepStrictEqual(yield* statusOf(stranger), ["closed"]);

          // The audit log names the request, never who sent it.
          const events = yield* sql<{
            readonly action: string;
            readonly object_ids: unknown;
            readonly reason: string | null;
          }>`SELECT action, object_ids, reason FROM staff.audit_events WHERE staff_id = ${account.id}`;

          assert.deepStrictEqual(events, [
            {
              action: "closeContractRequest",
              object_ids: { requestId: waiting.id },
              reason: "Holds no contract here",
            },
          ]);

          const again = yield* app.request(
            `/api/admin/contract-requests/${waiting.id}/close`,
            { body: { reason: "Again" }, headers: { cookie } }
          );

          assert.strictEqual(again.status, 409);
        })
    );

    it.effect("refuses what a link or an address is written with", () =>
      Effect.gen(function* refused() {
        const address = newAddress();

        const link = yield* send(address, {
          email: newEmail("nobody"),
          name: "Visit https://example.test/now",
        });

        assert.strictEqual(link.status, 400);

        const noEmail = yield* send(address, { email: "not an address" });

        assert.strictEqual(noEmail.status, 400);

        // A year mistyped would keep the plan renewing for decades.
        const farAhead = yield* send(address, {
          desiredOn: "2062-12-31",
          email: newEmail("far"),
        });

        assert.strictEqual(farAhead.status, 400);
        assert.deepInclude(farAhead.body, { _tag: "DesiredDayTooFar" });
      })
    );

    it.effect("takes five requests an hour from an address", () =>
      Effect.gen(function* limited() {
        const address = newAddress();
        const email = newEmail("flood");

        const replies = yield* Effect.forEach(
          [1, 2, 3, 4, 5, 6],
          () => send(address, { email }),
          { concurrency: 1 }
        );

        assert.deepStrictEqual(
          replies.map(({ status }) => status),
          [200, 200, 200, 200, 200, 429]
        );
        assert.deepStrictEqual(replies.map(({ body }) => body).at(-1), {
          _tag: "TooManyContractRequests",
        });

        // Another address is not held back.
        assert.strictEqual(
          (yield* send(newAddress(), { email: newEmail("other") })).status,
          200
        );
      })
    );
  }
);

layer(appWithTurnstile(passingSecretKey), { timeout: "120 seconds" })(
  "the functions on a server with Turnstile, which does not bill",
  (it) => {
    it.effect("read a request only with the widget's token", () =>
      Effect.gen(function* captcha() {
        const app = yield* TestApp;
        const settings = yield* app.request("/api/contract-requests/functions");

        assert.deepStrictEqual(settings.body, {
          enabled: false,
          turnstileSiteKey: passingSiteKey,
        });

        const address = newAddress();
        const without = yield* send(address, { email: newEmail("captcha") });

        assert.strictEqual(without.status, 403);
        assert.deepStrictEqual(yield* bodyOf(TaggedSchema, without), {
          _tag: "CaptchaRefused",
        });

        // However the path is written: the router reads it in any case,
        // with any number of slashes, and so does the check.
        const app2 = yield* TestApp;

        const variants = yield* Effect.forEach(
          [
            "/api/Contract-Requests",
            "/api//contract-requests",
            "/API/contract-requests/",
          ],
          (path) =>
            app2.request(path, {
              body: {
                contract: null,
                desiredOn: null,
                email: newEmail("variant"),
                kind: "cancellation",
                locale: "en",
                name: "Camille Synthetic",
              },
              headers: { "x-forwarded-for": address },
            })
        );

        assert.notInclude(
          variants.map(({ body }) =>
            Schema.is(TaggedSchema)(body) ? body._tag : ""
          ),
          "BillingNotEnabled"
        );

        // Past the captcha, the server says it has no contract to end.
        const passed = yield* send(
          address,
          { email: newEmail("captcha") },
          { "x-captcha-response": dummyToken }
        );

        assert.strictEqual(passed.status, 404);
        assert.deepStrictEqual(yield* bodyOf(TaggedSchema, passed), {
          _tag: "BillingNotEnabled",
        });
      })
    );
  }
);

layer(appWithTurnstile(failingSecretKey), { timeout: "120 seconds" })(
  "the functions with a Turnstile key that always fails",
  (it) => {
    it.effect("refuse the request", () =>
      Effect.gen(function* fails() {
        const refused = yield* send(
          newAddress(),
          { email: newEmail("captcha") },
          { "x-captcha-response": dummyToken }
        );

        assert.strictEqual(refused.status, 403);
      })
    );
  }
);
