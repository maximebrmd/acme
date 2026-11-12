import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  apiKeyOf,
  bodyOf,
  MigratedSqlLive,
  TestApp,
  unconfirmedEmails,
} from "./harness.ts";
import {
  bearer,
  customerOf,
  keyOf,
  partnerOf,
  WorkspaceSchema,
} from "./partner-support.ts";
import { seedChannel } from "./seed.ts";

// A partner's usage per customer, on Postgres, through the API: the same
// answer for its key and its home workspace's people, the home workspace
// first, the pages of the list of its workspaces, the channels its plan
// counts, and a customer offboarded during the period.

const TenantSchema = Schema.Struct({
  channelDays: Schema.Number,
  channels: Schema.Number,
  externalId: Schema.NullOr(Schema.String),
  home: Schema.Boolean,
  name: Schema.String,
  publishedPosts: Schema.Number,
  workspaceId: Schema.String,
});

// The account as a whole comes with the first page only.
const ReportSchema = Schema.Struct({
  current: Schema.NullOr(
    Schema.Struct({
      channels: Schema.Number,
      workspaces: Schema.Number,
    })
  ),
  days: Schema.NullOr(
    Schema.Array(
      Schema.Struct({
        channels: Schema.NullOr(Schema.Number),
        day: Schema.String,
        publishedPosts: Schema.Number,
        workspaces: Schema.NullOr(Schema.Number),
      })
    )
  ),
  totals: Schema.NullOr(
    Schema.Struct({
      channelDays: Schema.Number,
      publishedPosts: Schema.Number,
    })
  ),
  workspaces: Schema.Struct({
    next: Schema.NullOr(Schema.String),
    total: Schema.Number,
    workspaces: Schema.Array(TenantSchema),
  }),
});

const PageSchema = Schema.Struct({
  next: Schema.NullOr(Schema.String),
  workspaces: Schema.Array(WorkspaceSchema),
});

const WorkspaceUsageSchema = Schema.Struct({
  current: Schema.Struct({ channels: Schema.Number }),
});

const dayOf = (instant: DateTime.Utc) => DateTime.formatIsoDateUtc(instant);

const SelfServiceLive = Layer.mergeAll(
  TestApp.layerWith({
    ...unconfirmedEmails,
    PEAL_PARTNER_SELF_SERVICE: "true",
  }),
  MigratedSqlLive
);

layer(SelfServiceLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "a partner's usage per customer",
  (it) => {
    it.effect(
      "answers its key and its people the same, its home workspace first, a customer offboarded gone from the list and the sums",
      () =>
        Effect.gen(function* report() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const { home, owner, partner } = yield* partnerOf("usage");
          const { key } = yield* keyOf(owner, home);

          const first = yield* customerOf(key, "First customer", "customer-1");
          const second = yield* customerOf(key, "Second customer");
          const third = yield* customerOf(key, "Third customer", "customer-3");

          yield* seedChannel(home, "home");
          yield* seedChannel(first.id, "first-a");
          yield* seedChannel(first.id, "first-b");
          yield* seedChannel(third.id, "third");

          // Another partner, whose customer's counts never come in.
          const other = yield* partnerOf("usage-other");
          const otherKey = (yield* keyOf(other.owner, other.home)).key;
          const stranger = yield* customerOf(otherKey, "Stranger");

          const today = DateTime.startOf(yield* DateTime.now, "day");
          const yesterday = DateTime.subtract(today, { days: 1 });

          // Yesterday's posts in each workspace, and the partner's count
          // of the day, when it held three customers.
          for (const [workspaceId, posts] of [
            [home, 1],
            [first.id, 2],
            [second.id, 3],
            [third.id, 4],
            [stranger.id, 50],
          ] as const) {
            yield* sql`INSERT INTO billing.usage_days (workspace_id, day, meter, dimension, quantity)
              VALUES (${workspaceId}, ${dayOf(yesterday)}, 'publishedPosts', 'mastodon', ${posts})`;
          }

          yield* sql`INSERT INTO workspace.partner_usage_days (partner_id, day, workspaces, channels)
            VALUES (${partner.id}, ${dayOf(yesterday)}, 3, 4)`;

          const period = `from=${dayOf(yesterday)}&to=${dayOf(today)}`;

          const byKey = yield* bodyOf(
            ReportSchema,
            yield* app.request(`/api/partner/usage?${period}`, {
              headers: bearer(key),
            })
          );

          const byMember = yield* bodyOf(
            ReportSchema,
            yield* app.request(
              `/api/workspaces/${home}/usage/partner?${period}`,
              { headers: { cookie: owner.cookies } }
            )
          );

          assert.deepStrictEqual(byMember, byKey);
          assert.deepStrictEqual(
            byKey.workspaces.workspaces.map(
              ({
                channels,
                externalId,
                home: isHome,
                publishedPosts,
                workspaceId,
              }) => ({
                channels,
                externalId,
                home: isHome,
                publishedPosts,
                workspaceId,
              })
            ),
            [
              {
                channels: 1,
                externalId: null,
                home: true,
                publishedPosts: 1,
                workspaceId: home,
              },
              {
                channels: 1,
                externalId: "customer-3",
                home: false,
                publishedPosts: 4,
                workspaceId: third.id,
              },
              {
                channels: 0,
                externalId: null,
                home: false,
                publishedPosts: 3,
                workspaceId: second.id,
              },
              {
                channels: 2,
                externalId: "customer-1",
                home: false,
                publishedPosts: 2,
                workspaceId: first.id,
              },
            ]
          );
          assert.strictEqual(byKey.workspaces.total, 3);
          assert.deepStrictEqual(byKey.totals, {
            channelDays: 4,
            publishedPosts: 10,
          });
          assert.deepStrictEqual(byKey.days, [
            {
              channels: 4,
              day: dayOf(yesterday),
              publishedPosts: 10,
              workspaces: 3,
            },
            {
              channels: null,
              day: dayOf(today),
              publishedPosts: 0,
              workspaces: null,
            },
          ]);

          // The channels its plan counts: those of the home workspace's
          // usage, which the channel allowance counts.
          const homeUsage = yield* bodyOf(
            WorkspaceUsageSchema,
            yield* app.request(`/api/workspaces/${home}/usage`, {
              headers: { cookie: owner.cookies },
            })
          );

          assert.deepStrictEqual(byKey.current, {
            channels: homeUsage.current.channels,
            workspaces: 3,
          });
          assert.strictEqual(homeUsage.current.channels, 4);

          // Pages of two follow the list of the partner's workspaces, the
          // home workspace one more on the first.
          const listed = yield* bodyOf(
            PageSchema,
            yield* app.request("/api/partner/workspaces?limit=2", {
              headers: bearer(key),
            })
          );

          const paged = yield* bodyOf(
            ReportSchema,
            yield* app.request(`/api/partner/usage?${period}&limit=2`, {
              headers: bearer(key),
            })
          );

          assert.deepStrictEqual(
            paged.workspaces.workspaces.map(({ workspaceId }) => workspaceId),
            [home, ...listed.workspaces.map(({ id }) => id)]
          );
          assert.strictEqual(paged.workspaces.next, listed.next);

          const rest = yield* bodyOf(
            ReportSchema,
            yield* app.request(
              `/api/partner/usage?${period}&limit=2&before=${paged.workspaces.next ?? ""}`,
              { headers: bearer(key) }
            )
          );

          assert.deepStrictEqual(
            rest.workspaces.workspaces.map(({ workspaceId }) => workspaceId),
            [first.id]
          );
          assert.isNull(rest.workspaces.next);
          assert.deepStrictEqual(
            [rest.current, rest.days, rest.totals],
            [null, null, null]
          );

          // Offboarded: gone from the list and the sums, while the day's
          // count still holds it.
          const deleted = yield* app.request(
            `/api/partner/workspaces/${third.id}`,
            { headers: bearer(key), method: "DELETE" }
          );

          assert.strictEqual(deleted.status, 204);

          const after = yield* bodyOf(
            ReportSchema,
            yield* app.request(`/api/partner/usage?${period}`, {
              headers: bearer(key),
            })
          );

          assert.deepStrictEqual(
            after.workspaces.workspaces.map(({ workspaceId }) => workspaceId),
            [home, second.id, first.id]
          );
          assert.strictEqual(after.totals?.publishedPosts, 6);
          assert.deepStrictEqual(after.days?.[0], {
            channels: 4,
            day: dayOf(yesterday),
            publishedPosts: 6,
            workspaces: 3,
          });
          assert.deepStrictEqual(after.current, { channels: 3, workspaces: 2 });

          for (const workspaceId of [home, first.id, second.id, stranger.id]) {
            yield* sql`DELETE FROM billing.usage_days WHERE workspace_id = ${workspaceId}`;
          }
        })
    );

    it.effect(
      "refuses a key without workspaces:read, a session and a workspace key on the partner API, and members without partner:read",
      () =>
        Effect.gen(function* refuses() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("usage-refused");

          const unscoped = yield* keyOf(owner, home, {
            scopes: ["workspaces:write"],
          });

          const missing = yield* app.request("/api/partner/usage", {
            headers: bearer(unscoped.key),
          });

          assert.strictEqual(missing.status, 403);
          assert.deepInclude(missing.body, {
            reason: "missingScope",
            scope: "workspaces:read",
          });

          const reader = (yield* apiKeyOf(owner, home, ["partner:read"])).key;

          const billingOnly = (yield* apiKeyOf(owner, home, ["billing:read"]))
            .key;

          for (const headers of [{ cookie: owner.cookies }, bearer(reader)]) {
            const reply = yield* app.request("/api/partner/usage", { headers });

            assert.strictEqual(reply.status, 403);
          }

          // The home workspace's route: a key given partner:read reads it,
          // one without is told which permission it lacks.
          const allowed = yield* app.request(
            `/api/workspaces/${home}/usage/partner`,
            { headers: bearer(reader) }
          );

          assert.strictEqual(allowed.status, 200);

          const refused = yield* app.request(
            `/api/workspaces/${home}/usage/partner`,
            { headers: bearer(billingOnly) }
          );

          assert.strictEqual(refused.status, 403);
          assert.deepInclude(refused.body, { permission: "partner:read" });
        })
    );
  }
);
