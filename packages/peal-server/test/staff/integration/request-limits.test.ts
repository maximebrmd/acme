// Staff giving a workspace a rate limit of its own (the rate card's 1,200
// a minute on request) through the console's routes: recorded in the audit
// log first, applied to its keys, removed again; refused on a server that
// does not bill, where the setting is everyone's.
import { assert, layer } from "@effect/vitest";
import { Config, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  apiKeyOf,
  confirmedAccount,
  makeAdmin,
  MigratedSqlLive,
  signedUpUnconfirmed,
  signIn,
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
      STRIPE_SECRET_KEY: "sk_test_0123456789syntheticstafflimits",
      STRIPE_WEBHOOK_SECRET: "whsec_synthetic_staff_limits_secret",
    });
  })
);

const LimitSchema = Schema.Struct({
  bills: Schema.Boolean,
  override: Schema.NullOr(
    Schema.Struct({ requestsPerMinute: Schema.Int, setAt: Schema.String })
  ),
  paying: Schema.Boolean,
  policy: Schema.String,
  requestsPerMinute: Schema.Int,
});

const AuditRowsSchema = Schema.Array(
  Schema.Struct({
    action: Schema.String,
    object_ids: Schema.Record(Schema.String, Schema.String),
    reason: Schema.NullOr(Schema.String),
  })
);

const reason = "Synthetic request for a higher limit";

// A workspace with a key, and staff signed in.
const setUp = Effect.fn("setUp")(function* setUp(label: string) {
  const owner = yield* signedUpUnconfirmed(`${label}-owner`);
  const workspaceId = yield* workspaceOf(owner, label);
  const { key } = yield* apiKeyOf(owner, workspaceId, ["channel:read"]);
  const staff = yield* confirmedAccount(`${label}-staff`);

  yield* makeAdmin(staff.id);

  return { cookie: yield* signIn(staff.email), key, workspaceId };
});

layer(Layer.mergeAll(BillingApp, MigratedSqlLive), {
  excludeTestServices: true,
  timeout: "180 seconds",
})("a workspace's own rate limit, on a server that bills", (it) => {
  it.effect("is set by staff, recorded, applied to its keys and removed", () =>
    Effect.gen(function* raised() {
      const app = yield* TestApp;
      const sql = yield* SqlClient.SqlClient;
      const { cookie, key, workspaceId } = yield* setUp("staff-limit");
      const path = `/api/admin/workspaces/${workspaceId}/request-limit`;

      const before = yield* app.request(path, { headers: { cookie } });

      assert.strictEqual(before.status, 200);
      assert.deepStrictEqual(
        Schema.decodeUnknownSync(LimitSchema)(before.body),
        {
          bills: true,
          override: null,
          paying: false,
          policy: "free",
          requestsPerMinute: 60,
        }
      );

      const set = yield* app.request(path, {
        body: { reason, requestsPerMinute: 1200 },
        headers: { cookie },
        method: "POST",
      });

      assert.strictEqual(set.status, 200);

      const after = Schema.decodeUnknownSync(LimitSchema)(set.body);

      assert.deepStrictEqual(
        [
          after.policy,
          after.requestsPerMinute,
          after.override?.requestsPerMinute,
        ],
        ["override", 1200, 1200]
      );

      // Its key's first request reads the new limit.
      const keyed = yield* app.request(
        `/api/workspaces/${workspaceId}/channels`,
        { headers: { authorization: `Bearer ${key}` } }
      );

      assert.strictEqual(
        keyed.headers.get("ratelimit-policy"),
        '"override";q=1200;w=60'
      );

      const removed = yield* app.request(path, {
        body: { reason, requestsPerMinute: null },
        headers: { cookie },
        method: "POST",
      });

      assert.deepStrictEqual(
        Schema.decodeUnknownSync(LimitSchema)(removed.body).override,
        null
      );

      const recorded =
        yield* sql`SELECT action, object_ids, reason FROM staff.audit_events WHERE workspace_id = ${workspaceId} ORDER BY at, id`.pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(AuditRowsSchema)),
          Effect.orDie
        );

      assert.deepStrictEqual(recorded, [
        {
          action: "setRequestLimit",
          object_ids: { requestsPerMinute: "1200" },
          reason,
        },
        {
          action: "setRequestLimit",
          object_ids: { requestsPerMinute: "standing" },
          reason,
        },
      ]);
    })
  );

  it.effect(
    "refuses a limit out of bounds, and a workspace that does not exist",
    () =>
      Effect.gen(function* bounds() {
        const app = yield* TestApp;
        const { cookie, workspaceId } = yield* setUp("staff-limit-bounds");

        const tooMany = yield* app.request(
          `/api/admin/workspaces/${workspaceId}/request-limit`,
          {
            body: { reason, requestsPerMinute: 10_001 },
            headers: { cookie },
            method: "POST",
          }
        );

        assert.strictEqual(tooMany.status, 400);

        const unknown = yield* app.request(
          "/api/admin/workspaces/00000000-0000-4000-8000-00000000dead/request-limit",
          {
            body: { reason, requestsPerMinute: 1200 },
            headers: { cookie },
            method: "POST",
          }
        );

        assert.strictEqual(unknown.status, 404);
      })
  );
});

layer(Layer.mergeAll(TestApp.layerWith(unconfirmedEmails), MigratedSqlLive), {
  excludeTestServices: true,
  timeout: "180 seconds",
})("a workspace's own rate limit, on a server that does not bill", (it) => {
  it.effect("is the setting, and cannot be set", () =>
    Effect.gen(function* unbilled() {
      const app = yield* TestApp;
      const sql = yield* SqlClient.SqlClient;
      const { cookie, workspaceId } = yield* setUp("staff-limit-unbilled");
      const path = `/api/admin/workspaces/${workspaceId}/request-limit`;

      const read = yield* app.request(path, { headers: { cookie } });

      assert.deepStrictEqual(Schema.decodeUnknownSync(LimitSchema)(read.body), {
        bills: false,
        override: null,
        paying: false,
        policy: "default",
        requestsPerMinute: 600,
      });

      const refused = yield* app.request(path, {
        body: { reason, requestsPerMinute: 1200 },
        headers: { cookie },
        method: "POST",
      });

      assert.strictEqual(refused.status, 404);
      assert.strictEqual(
        Schema.decodeUnknownSync(Schema.Struct({ code: Schema.String }))(
          refused.body
        ).code,
        "billing_not_enabled"
      );

      const recorded =
        yield* sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE workspace_id = ${workspaceId}`.pipe(
          Effect.orDie
        );

      assert.deepStrictEqual(recorded, [{ count: 0 }]);
    })
  );
});
