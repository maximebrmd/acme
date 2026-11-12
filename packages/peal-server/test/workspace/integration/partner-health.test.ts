// What needs attention in a partner's customers' workspaces, on the whole
// app: the partner key reads its own customers alone, each section where
// it holds the permission, the home workspace's people read the same, and
// a page costs the same number of statements whatever its size.
import { assert, layer } from "@effect/vitest";
import { Config, Effect, Layer, Schema, Tracer } from "effect";
import { SqlClient } from "effect/sql";
import { PartnerHealthSchema } from "peal-contract";

import { commandLineToken } from "#test/workspace/support.ts";

import {
  apiKeyOf,
  bodyOf,
  confirmedAccount,
  cookiesOf,
  makeAdmin,
  MigratedSqlLive,
  signedUpUnconfirmed,
  signIn,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "./harness.ts";
import { bearer, customerOf, keyOf, partnerOf } from "./partner-support.ts";
import { seedChannel } from "./seed.ts";

// The statements the app sends, as spans that carry their text.
const spans: Tracer.NativeSpan[] = [];

const tracer = Tracer.make({
  span: (options) => {
    const span = new Tracer.NativeSpan(options);

    spans.push(span);

    return span;
  },
});

const HealthLive = Layer.mergeAll(
  TestApp.layerWith(
    { ...unconfirmedEmails, PEAL_PARTNER_SELF_SERVICE: "true" },
    Layer.succeed(Tracer.Tracer, tracer)
  ),
  MigratedSqlLive
);

const HealthJsonSchema = Schema.toCodecJson(PartnerHealthSchema);

const ErrorSchema = Schema.Struct({ code: Schema.String });

// A post of the customer that finished an hour ago with a channel that
// failed, as publishing writes one.
const failedPost = (workspaceId: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`INSERT INTO publishing.posts (id, workspace_id, status, text, scheduled_at, schedule_zone, started_at, finished_at, outcome)
        VALUES (uuidv7(), ${workspaceId}, 'finished', 'A synthetic post that failed', now() - interval '2 hours', 'Europe/Paris', now() - interval '2 hours', now() - interval '1 hour', 'failed')`
  );

const statementsDuring = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* counted() {
    const before = spans.length;
    const result = yield* effect;

    return {
      result,
      statements: spans
        .slice(before)
        .filter((span) => span.attributes.has("db.query.text")).length,
    };
  });

layer(HealthLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "a partner's customers' health",
  (it) => {
    it.effect(
      "tells a partner key what needs attention in each customer, newest first, the home left out",
      () =>
        Effect.gen(function* health() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const { home, owner } = yield* partnerOf("health");
          const { key } = yield* keyOf(owner, home);
          const older = yield* customerOf(key, "Older customer", "older");
          const newer = yield* customerOf(key, "Newer customer", "newer");

          yield* seedChannel(newer.id, "@ok@example.test");
          yield* seedChannel(newer.id, "@expired@example.test", {
            refreshNeeded: true,
          });
          yield* failedPost(newer.id);
          // The home workspace's own trouble is no customer's.
          yield* seedChannel(home, "@home@example.test", {
            refreshNeeded: true,
          });

          const answered = yield* bodyOf(
            HealthJsonSchema,
            yield* app.request("/api/partner/overview", {
              headers: bearer(key),
            })
          );

          assert.deepStrictEqual(
            answered.workspaces.map(({ id }) => id),
            [newer.id, older.id]
          );
          assert.deepStrictEqual(answered.workspaces[0], {
            channels: { connected: 2, off: 0, toReconnect: 1 },
            externalId: "newer",
            id: newer.id,
            inbox: { unanswered: 0 },
            name: "Newer customer",
            posts: {
              awaitingApproval: 0,
              failedLast7Days: 1,
              mayApprove: true,
              scheduledNext7Days: 0,
              unconfirmedLast7Days: 0,
            },
          });
          assert.deepStrictEqual(answered.workspaces[1]?.channels, {
            connected: 0,
            off: 0,
            toReconnect: 0,
          });
          assert.strictEqual(answered.total, 2);
          assert.isNull(answered.next);
          // The test server bills nothing: no plan to be over.
          assert.deepStrictEqual(answered.account, { overPlan: null });
          assert.notInclude(JSON.stringify(answered), home);

          // The home workspace's owner reads the same figures.
          const asMember = yield* bodyOf(
            HealthJsonSchema,
            yield* app.request(`/api/workspaces/${home}/partner/overview`, {
              headers: { cookie: owner.cookies },
            })
          );

          // The same, but that the owner approves nothing in a customer's
          // workspace, where they are no member.
          assert.deepStrictEqual(asMember, {
            ...answered,
            workspaces: answered.workspaces.map((customer) => ({
              ...customer,
              posts:
                customer.posts === null
                  ? null
                  : { ...customer.posts, mayApprove: false },
            })),
          });

          yield* sql`DELETE FROM publishing.posts WHERE workspace_id = ${newer.id}`;
        })
    );

    it.effect(
      "reads no section a key may not read, and leaves out a workspace offboarded between pages",
      () =>
        Effect.gen(function* withheld() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("withheld");
          const { key: everything } = yield* keyOf(owner, home);

          const { key: channelsOnly } = yield* keyOf(owner, home, {
            permissions: ["channel:read"],
          });

          const first = yield* customerOf(everything, "First", "first");
          const second = yield* customerOf(everything, "Second", "second");
          const third = yield* customerOf(everything, "Third", "third");

          const page = yield* bodyOf(
            HealthJsonSchema,
            yield* app.request("/api/partner/overview?limit=1", {
              headers: bearer(channelsOnly),
            })
          );

          assert.deepStrictEqual(
            page.workspaces.map(({ channels, id, inbox, posts }) => ({
              channels: channels === null,
              id,
              inbox,
              posts,
            })),
            [{ channels: false, id: third.id, inbox: null, posts: null }]
          );
          assert.isNotNull(page.next);

          // Offboarded meanwhile: the next pages go on without it.
          const offboarded = yield* app.request(
            `/api/partner/workspaces/${second.id}`,
            { headers: bearer(everything), method: "DELETE" }
          );

          assert.strictEqual(offboarded.status, 204);

          const next = yield* bodyOf(
            HealthJsonSchema,
            yield* app.request(
              `/api/partner/overview?limit=1&before=${encodeURIComponent(page.next ?? "")}`,
              { headers: bearer(channelsOnly) }
            )
          );

          assert.deepStrictEqual(
            next.workspaces.map(({ id }) => id),
            [first.id]
          );
          assert.isNull(next.account);

          const refused = yield* app.request(
            "/api/partner/overview?before=not-a-cursor",
            { headers: bearer(channelsOnly) }
          );

          assert.strictEqual(refused.status, 400);
        })
    );

    it.effect(
      "answers only a partner key, and only the home workspace's people",
      () =>
        Effect.gen(function* refused() {
          const app = yield* TestApp;
          const alpha = yield* partnerOf("alpha-health");
          const beta = yield* partnerOf("beta-health");
          const { key: alphaKey } = yield* keyOf(alpha.owner, alpha.home);
          const { key: betaKey } = yield* keyOf(beta.owner, beta.home);
          const ofAlpha = yield* customerOf(alphaKey, "Alpha's customer");
          const stranger = yield* signedUpUnconfirmed("health-stranger");
          const ordinary = yield* workspaceOf(stranger, "Ordinary studio");

          const apiKey = (yield* apiKeyOf(alpha.owner, alpha.home, [
            "partner:read",
            "channel:read",
          ])).key;

          const token = yield* commandLineToken(alpha.owner.cookies);

          // Another partner's key reads its own customers, none of alpha's.
          const ofBeta = yield* app.request("/api/partner/overview", {
            headers: bearer(betaKey),
          });

          assert.strictEqual(ofBeta.status, 200);
          assert.notInclude(JSON.stringify(ofBeta.body), ofAlpha.id);

          for (const headers of [
            bearer(apiKey),
            bearer(token),
            { cookie: alpha.owner.cookies },
          ]) {
            const reply = yield* app.request("/api/partner/overview", {
              headers,
            });

            assert.strictEqual(reply.status, 403);
          }

          // A member of a workspace that is no partner's home.
          const notHome = yield* app.request(
            `/api/workspaces/${ordinary}/partner/overview`,
            { headers: { cookie: stranger.cookies } }
          );

          assert.strictEqual(notHome.status, 404);
          assert.strictEqual(
            (yield* bodyOf(ErrorSchema, notHome)).code,
            "partner_not_found"
          );

          // Nor a stranger to the home workspace.
          const intruder = yield* app.request(
            `/api/workspaces/${alpha.home}/partner/overview`,
            { headers: { cookie: stranger.cookies } }
          );

          assert.strictEqual(intruder.status, 404);

          // Nor a partner key in a home workspace's own route.
          const keyAtHome = yield* app.request(
            `/api/workspaces/${alpha.home}/partner/overview`,
            { headers: bearer(alphaKey) }
          );

          assert.strictEqual(keyAtHome.status, 404);

          // A key without workspaces:read is told which scope it lacks.
          const { key: writeOnly } = yield* keyOf(alpha.owner, alpha.home, {
            scopes: ["workspaces:write"],
          });

          const unscoped = yield* app.request("/api/partner/overview", {
            headers: bearer(writeOnly),
          });

          assert.strictEqual(unscoped.status, 403);
        })
    );

    it.effect(
      "gives the home workspace's people only the sections they hold there, as the people's overview does",
      () =>
        Effect.gen(function* member() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("health-member");
          const { key } = yield* keyOf(owner, home);

          yield* customerOf(key, "Member's customer", "member");

          const path = `/api/workspaces/${home}/partner/overview`;

          const asOwner = yield* bodyOf(
            HealthJsonSchema,
            yield* app.request(path, { headers: { cookie: owner.cookies } })
          );

          assert.deepStrictEqual(asOwner.workspaces[0]?.inbox, {
            unanswered: 0,
          });
          // A member of no customer's workspace approves nothing there.
          assert.isFalse(asOwner.workspaces[0]?.posts?.mayApprove);

          // A key of the home workspace given partner:read alone.
          const narrowKey = (yield* apiKeyOf(owner, home, ["partner:read"]))
            .key;

          const asKey = yield* bodyOf(
            HealthJsonSchema,
            yield* app.request(path, { headers: bearer(narrowKey) })
          );

          assert.deepStrictEqual(
            asKey.workspaces.map(({ channels, inbox, posts }) => [
              channels,
              inbox,
              posts,
            ]),
            [[null, null, null]]
          );

          // Staff acting as the owner read no inbox, as on every page.
          const staff = yield* confirmedAccount("health-staff");

          yield* makeAdmin(staff.id);

          const started = yield* app.request(
            `/api/admin/users/${owner.id}/impersonate`,
            {
              body: { reason: "Synthetic support request" },
              headers: {
                cookie: yield* signIn(staff.email),
                "user-agent": "Synthetic browser",
              },
            }
          );

          assert.strictEqual(started.status, 204);

          const asStaff = yield* bodyOf(
            HealthJsonSchema,
            yield* app.request(path, {
              headers: { cookie: cookiesOf(started) },
            })
          );

          assert.isNull(asStaff.workspaces[0]?.inbox);
          assert.isNotNull(asStaff.workspaces[0]?.channels);
        })
    );

    it.effect(
      "reads a page of 100 customers in as many statements as a page of 10",
      () =>
        Effect.gen(function* bounded() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const { home, owner, partner } = yield* partnerOf("health-scale");
          const { key } = yield* keyOf(owner, home);

          // A hundred customers, as the partner API makes them.
          yield* sql`
            WITH made AS (
              INSERT INTO auth.organization (id, name, slug, created_at)
              SELECT id, 'Synthetic customer ' || n, id::text, now() - n * interval '1 second'
              FROM (SELECT gen_random_uuid() AS id, n FROM generate_series(1, 100) AS n) AS c
              RETURNING id, created_at
            )
            INSERT INTO workspace.partner_workspaces (workspace_id, partner_id, created_at)
            SELECT id, ${partner.id}, created_at FROM made`;

          const pageOf = (limit: number) =>
            statementsDuring(
              app.request(`/api/partner/overview?limit=${String(limit)}`, {
                headers: bearer(key),
              })
            );

          const ten = yield* pageOf(10);
          const hundred = yield* pageOf(100);

          assert.strictEqual(hundred.result.status, 200);
          assert.strictEqual(
            (yield* bodyOf(HealthJsonSchema, hundred.result)).workspaces.length,
            100
          );
          assert.strictEqual(hundred.statements, ten.statements);
          assert.isAtMost(hundred.statements, 15);
        })
    );
  }
);

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

// A server that bills, against stripe-mock: the account's standing is read.
const BillingHealthLive = Layer.mergeAll(
  Layer.unwrap(
    Effect.gen(function* billingApp() {
      return TestApp.layerWith({
        ...unconfirmedEmails,
        PEAL_PARTNER_SELF_SERVICE: "true",
        STRIPE_API_URL: yield* stripeMockUrl,
        STRIPE_SECRET_KEY: "sk_test_synthetic_partner_health",
        STRIPE_WEBHOOK_SECRET: "whsec_synthetic_partner_health",
      });
    })
  ),
  MigratedSqlLive
);

layer(BillingHealthLive, {
  excludeTestServices: true,
  timeout: "180 seconds",
})("a partner's customers' health on a server that bills", (it) => {
  it.effect(
    "says the account is over its plan when its pool holds more channels than the free plan, on the first page alone",
    () =>
      Effect.gen(function* overPlan() {
        const app = yield* TestApp;
        const { home, owner } = yield* partnerOf("health-billing");
        const { key } = yield* keyOf(owner, home);

        // No customer yet: the home workspace's own standing.
        yield* seedChannel(home, "@home-one@example.test");
        yield* seedChannel(home, "@home-two@example.test");

        const within = yield* bodyOf(
          HealthJsonSchema,
          yield* app.request("/api/partner/overview", { headers: bearer(key) })
        );

        assert.deepStrictEqual(within.account, { overPlan: false });

        yield* seedChannel(home, "@home-three@example.test");
        yield* seedChannel(home, "@home-four@example.test");

        const lonelyOver = yield* bodyOf(
          HealthJsonSchema,
          yield* app.request("/api/partner/overview", { headers: bearer(key) })
        );

        assert.deepStrictEqual(lonelyOver.account, { overPlan: true });

        // With customers, as one of them stands: the pool's four channels
        // against the free plan's three.
        const first = yield* customerOf(key, "First customer", "first");

        yield* customerOf(key, "Second customer", "second");

        const page = yield* bodyOf(
          HealthJsonSchema,
          yield* app.request("/api/partner/overview?limit=1", {
            headers: bearer(key),
          })
        );

        assert.deepStrictEqual(page.account, { overPlan: true });

        const next = yield* bodyOf(
          HealthJsonSchema,
          yield* app.request(
            `/api/partner/overview?limit=1&before=${encodeURIComponent(page.next ?? "")}`,
            { headers: bearer(key) }
          )
        );

        assert.isNull(next.account);
        assert.deepStrictEqual(
          next.workspaces.map(({ id }) => id),
          [first.id]
        );
      })
  );
});
