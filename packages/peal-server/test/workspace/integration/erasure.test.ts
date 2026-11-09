// Every table the migrations create, and what deleting a workspace or closing
// an account does to its rows: each table either names a workspace or a user
// (then nothing of theirs is left, or the row stays without them), or names
// nobody and stays on purpose, for a reason given here. A new table fails the
// first test until it says which.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  apiKeyOf,
  bodyOf,
  IntegrationLive,
  password,
  signedUp,
  TestApp,
  workspaceOf,
} from "./harness.ts";
import type { Person } from "./harness.ts";
import {
  countOf,
  seedChannel,
  seedConnectChoice,
  seedNotice,
  seedOAuthGrant,
  seedPost,
  seedSubscription,
  seedTrackedPost,
  seedUsage,
} from "./seed.ts";

// How many rows of a table still name the workspace, or the user.
type Count = (
  sql: SqlClient.SqlClient,
  id: string
) => Effect.Effect<readonly object[], unknown>;

const count = (rows: ReturnType<Count>) =>
  rows.pipe(Effect.orDie, Effect.flatMap(countOf));

// The schemas the migrations create. Effect's cluster tables, in `public`,
// hold the jobs' payloads (ids), and are not the migrations'.
const schemas = [
  "analytics",
  "assistant",
  "auth",
  "billing",
  "channels",
  "legal",
  "media",
  "notifications",
  "publishing",
  "staff",
];

// The rows of each table that name a workspace: none may be left once it is
// deleted.
const workspaceRows = {
  "analytics.metric_snapshots": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM analytics.metric_snapshots s JOIN analytics.tracked_posts t ON t.target_id = s.target_id WHERE t.workspace_id = ${id}`,
  "analytics.tracked_posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM analytics.tracked_posts WHERE workspace_id = ${id}`,
  "assistant.daily_usage": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM assistant.daily_usage WHERE workspace_id = ${id}`,
  "auth.apikey": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.apikey WHERE reference_id = ${id}`,
  "auth.invitation": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.invitation WHERE organization_id = ${id}`,
  "auth.member": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.member WHERE organization_id = ${id}`,
  "auth.oauth_access_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_access_token WHERE reference_id = ${id}`,
  "auth.oauth_consent": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_consent WHERE reference_id = ${id}`,
  "auth.oauth_refresh_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_refresh_token WHERE reference_id = ${id}`,
  "auth.organization": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.organization WHERE id = ${id}`,
  // The workspace a session last opened; the session itself is its user's.
  "auth.session": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.session WHERE active_organization_id = ${id}`,
  "auth.subscription": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.subscription WHERE reference_id = ${id}`,
  "billing.metered_posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.metered_posts WHERE workspace_id = ${id}`,
  "billing.orders": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.orders WHERE workspace_id = ${id}`,
  "billing.subscriptions": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.subscriptions WHERE workspace_id = ${id}`,
  // A trial an account started stays, without the workspace, so the
  // account starts no second one.
  "billing.trials": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.trials WHERE workspace_id = ${id}`,
  "billing.withdrawals": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.withdrawals WHERE workspace_id = ${id}`,
  "channels.channels": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.channels WHERE workspace_id = ${id}`,
  "channels.connect_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_attempts WHERE workspace_id = ${id}`,
  "channels.connect_choices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_choices WHERE workspace_id = ${id}`,
  "media.media_assets": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM media.media_assets WHERE workspace_id = ${id}`,
  "notifications.notices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM notifications.notices WHERE workspace_id = ${id}`,
  "publishing.post_targets": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.post_targets t JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
  "publishing.posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${id}`,
  "publishing.publication_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.publication_attempts a JOIN publishing.post_targets t ON t.id = a.target_id JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
  "publishing.publication_calls": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.publication_calls c JOIN publishing.post_targets t ON t.id = c.target_id JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
  "publishing.upload_sessions": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.upload_sessions u JOIN publishing.publication_calls c ON c.idempotency_key = u.idempotency_key JOIN publishing.post_targets t ON t.id = c.target_id JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${id}`,
} satisfies Readonly<Record<string, Count>>;

// The rows of each table that name a user: none may be left once their
// account is closed. Posts stay with their workspaces, without an author.
const userRows = {
  "auth.account": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.account WHERE user_id = ${id}`,
  "auth.device_code": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.device_code WHERE user_id = ${id}`,
  "auth.invitation": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.invitation i WHERE i.inviter_id = ${id} OR lower(i.email) IN (SELECT lower(email) FROM auth."user" WHERE id = ${id})`,
  "auth.member": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.member WHERE user_id = ${id}`,
  "auth.oauth_access_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_access_token WHERE user_id = ${id}`,
  "auth.oauth_client": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_client WHERE user_id = ${id}`,
  "auth.oauth_consent": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_consent WHERE user_id = ${id}`,
  "auth.oauth_refresh_token": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.oauth_refresh_token WHERE user_id = ${id}`,
  // Their own sessions, and those they opened as staff to act as someone.
  "auth.session": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.session WHERE user_id = ${id} OR impersonated_by = ${id}`,
  "auth.subscription": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.subscription WHERE reference_id = ${id}`,
  "auth.user": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth."user" WHERE id = ${id}`,
  // Password reset tokens hold their user's id.
  "auth.verification": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM auth.verification WHERE value = ${id}`,
  // Orders, trials and withdrawals stay with their workspaces, without the
  // user.
  "billing.orders": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.orders WHERE user_id = ${id}`,
  "billing.trials": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.trials WHERE user_id = ${id}`,
  "billing.withdrawals": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM billing.withdrawals WHERE user_id = ${id}`,
  "channels.connect_attempts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_attempts WHERE started_by = ${`user:${id}`}`,
  "channels.connect_choices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM channels.connect_choices WHERE started_by = ${`user:${id}`}`,
  "notifications.notices": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM notifications.notices WHERE user_id = ${id}`,
  "notifications.notification_preferences": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM notifications.notification_preferences WHERE user_id = ${id}`,
  // Their posts stay with the workspace, without who wrote or scheduled
  // them.
  "publishing.posts": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM publishing.posts WHERE author_id = ${id} OR scheduled_by = ${id}`,
  // What staff did to them: the events stay, without them and without the
  // reason given about them. What they did as staff keeps their id (below).
  // An id the user is named by in a change staff made as someone else goes
  // too.
  "staff.audit_events": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM staff.audit_events
      WHERE target_id = ${id}
        OR EXISTS (SELECT 1 FROM jsonb_each_text(object_ids) AS named(name, value) WHERE value = ${id})`,
} satisfies Readonly<Record<string, Count>>;

// The rows of each table that the law has Peal keep about a user once
// their account closes, apart from everything else (loi n° 2004-575,
// art. 6, V, A; décret n° 2021-1362): who held the account, and each
// connection that made content, the workspace's included. Each is kept for
// its period, then purged (`#legal/domain/legal-retention.ts`).
const heldRows = {
  "legal.connections": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM legal.connections WHERE user_id = ${id}`,
  "legal.identification_holds": (sql, id) =>
    sql`SELECT count(*)::int AS count FROM legal.identification_holds WHERE user_id = ${id}`,
} satisfies Readonly<Record<string, Count>>;

// Tables that name neither a workspace nor a user, and why they stay.
const kept = {
  "analytics.erased_workspaces":
    "the ids of erased workspaces, so posts listed before are never followed after",
  "auth.jwks": "the server's keys that sign OAuth access tokens",
  "auth.oauth_client":
    "clients registered by the server or by themselves, which no user owns (those a user registered are theirs, above)",
  "auth.oauth_client_assertion":
    "the ids of client assertions already used, until they expire",
  "auth.oauth_client_resource": "which resources each client may ask for",
  "auth.oauth_resource": "the APIs the server issues tokens for",
  "auth.rate_limit":
    "request counts by address and path, which no account names, kept a minute",
  "auth.verification":
    "codes and tokens that expire within minutes (a password reset names its user, above)",
  "billing.stripe_events":
    "the ids of Stripe events already recorded, so none is recorded twice",
  "channels.data_deletions":
    "the codes and counts of Meta's deletion requests, which name nobody",
  "channels.mastodon_apps": "Peal's own app on each Mastodon instance",
  "legal.disclosures":
    "what staff handed over on legal requests, and on what grounds, kept 5 years",
  "notifications.sent_notices":
    "the keys of events already told, ids and instants only",
  "publishing.quota_usage":
    "the units of a platform's daily quota the server spent, by day",
} satisfies Readonly<Record<string, string>>;

const TablesSchema = Schema.Array(Schema.Struct({ name: Schema.String }));

// A random UUID with the version digit of v7 reads as one.
const uuid7 = (): string => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

const IdsSchema = Schema.Array(Schema.Struct({ id: Schema.String }));

/** Invites `guest` to the workspace with `role`; they accept. */
const join = Effect.fn("join")(function* join(
  owner: Person,
  workspaceId: string,
  guest: Person,
  role: string
) {
  const app = yield* TestApp;

  const invited = yield* app.request("/api/auth/organization/invite-member", {
    body: { email: guest.email, organizationId: workspaceId, role },
    headers: { cookie: owner.cookies },
  });

  yield* app.request("/api/auth/organization/accept-invitation", {
    body: {
      invitationId: (yield* bodyOf(
        Schema.Struct({ id: Schema.String }),
        invited
      )).id,
    },
    headers: { cookie: guest.cookies },
  });
});

/**
 * A row in every table a workspace's content and its people's records go
 * to, written as each context writes them: what a workspace holds besides
 * its members (`content`), and what a user does in it (`person`).
 */
const fill = Effect.fn("fill")(function* fill(
  workspaceId: string,
  person: Person
) {
  const app = yield* TestApp;
  const sql = yield* SqlClient.SqlClient;
  const channelId = yield* seedChannel(workspaceId, "@erasure@social.example");

  const postId = yield* seedPost(
    workspaceId,
    channelId,
    "A synthetic post of the erasure test.",
    "finished",
    person.id
  );

  // As a post the person scheduled in the web app keeps it.
  yield* sql`UPDATE publishing.posts SET created_via = '{"_tag":"web"}'::jsonb, scheduled_via = '{"_tag":"web"}'::jsonb, scheduled_by = ${person.id} WHERE id = ${postId}`;

  const [target] =
    yield* sql`SELECT id FROM publishing.post_targets WHERE post_id = ${postId}`.pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(IdsSchema)),
      Effect.orDie
    );

  const targetId = target?.id ?? "";

  yield* sql`INSERT INTO publishing.publication_attempts (target_id, round, attempt, decision, detail, outcome, started_at, finished_at)
    VALUES (${targetId}, 1, 1, 'settle', '{}'::jsonb, 'published', now(), now())`;

  const callKey = randomUUID();

  yield* sql`INSERT INTO publishing.publication_calls (idempotency_key, target_id, round, attempt, operation, started_at)
    VALUES (${callKey}, ${targetId}, 1, 1, 'publish', now())`;

  yield* sql`INSERT INTO publishing.upload_sessions (idempotency_key, byte_size, opened_at, video_id)
    VALUES (${callKey}, 2048, now(), 'synthetic-video')`;

  yield* seedTrackedPost(workspaceId, channelId, postId);
  yield* seedUsage(workspaceId, 2);
  yield* seedSubscription(workspaceId, "canceled");

  yield* sql`INSERT INTO billing.metered_posts (workspace_id, platform, month, posts, posts_with_links)
    VALUES (${workspaceId}, 'x', date_trunc('month', now())::date, 2, 1)`;
  // An order with its consent, a trial (one per account: the user's
  // first workspace has it) and a withdrawal.
  yield* sql`INSERT INTO billing.orders (id, workspace_id, user_id, plan, interval, trial, consent_version, created_at)
    VALUES (${uuid7()}, ${workspaceId}, ${person.id}, 'pro', 'month', true, '2026-11-09', now())`;

  yield* sql`INSERT INTO billing.trials (stripe_subscription_id, workspace_id, user_id, plan, started_at, reserved_at)
    VALUES (${`sub_${randomUUID()}`}, ${workspaceId}, (SELECT CASE WHEN EXISTS (SELECT 1 FROM billing.trials WHERE user_id = ${person.id}) THEN NULL ELSE ${person.id} END), 'pro', now(), now())`;

  yield* sql`INSERT INTO billing.withdrawals (stripe_subscription_id, workspace_id, user_id, refunded, currency, requested_at)
    VALUES (${`sub_${randomUUID()}`}, ${workspaceId}, ${person.id}, 0, 'eur', now())`;

  yield* sql`INSERT INTO media.media_assets (id, workspace_id, storage_key, content_type, byte_size, status, created_at, updated_at)
    VALUES (${randomUUID()}, ${workspaceId}, ${`media/${workspaceId}/${randomUUID()}.png`}, 'image/png', 128, 'pending', now(), now())`;

  yield* apiKeyOf(person, workspaceId, ["post:read"]);

  // A connection that made content in the workspace.
  yield* sql`INSERT INTO legal.connections (id, access, at, protocol, user_id, workspace_id)
    VALUES (${uuid7()}, 'session', now(), 'https', ${person.id}, ${workspaceId})`;
  yield* seedOAuthGrant(person.id, workspaceId, "Synthetic erasure client");
  yield* seedConnectChoice(workspaceId, person.id);
  yield* seedNotice(person.id, workspaceId, "@erasure@social.example");

  yield* sql`INSERT INTO channels.connect_attempts (state_hash, workspace_id, started_by, platform, secret, created_at, expires_at)
    VALUES (${randomUUID().replaceAll("-", "")}, ${workspaceId}, ${`user:${person.id}`}, 'mastodon', 'synthetic.iv.ciphertext', now(), now() + interval '15 minutes')`;

  yield* sql`INSERT INTO auth.oauth_access_token (token, client_id, user_id, reference_id, scopes, created_at, expires_at)
    SELECT ${`synthetic-${randomUUID()}`}, client_id, user_id, reference_id, ARRAY['workspace:read'], now(), now() + interval '15 minutes'
    FROM auth.oauth_consent WHERE user_id = ${person.id} AND reference_id = ${workspaceId}`;

  yield* app.request("/api/auth/organization/invite-member", {
    body: {
      email: `pending+${randomUUID()}@example.test`,
      organizationId: workspaceId,
      role: "viewer",
    },
    headers: { cookie: person.cookies },
  });

  yield* app.request("/api/auth/organization/set-active", {
    body: { organizationId: workspaceId },
    headers: { cookie: person.cookies },
  });
});

/** What only the user holds: their own records outside any workspace. */
const fillPerson = Effect.fn("fillPerson")(function* fillPerson(
  person: Person
) {
  const app = yield* TestApp;
  const sql = yield* SqlClient.SqlClient;

  yield* app.request("/api/me/notification-preferences", {
    body: { everyPost: true },
    headers: { cookie: person.cookies },
    method: "PATCH",
  });

  yield* sql`INSERT INTO auth.device_code (device_code, user_code, user_id, expires_at, status)
    VALUES (${randomUUID()}, ${randomUUID().slice(0, 8)}, ${person.id}, now() + interval '10 minutes', 'approved')`;

  yield* sql`INSERT INTO auth.verification (identifier, value, expires_at, created_at, updated_at)
    VALUES (${`reset-password:${randomUUID()}`}, ${person.id}, now() + interval '1 hour', now(), now())`;

  yield* sql`INSERT INTO auth.oauth_client (client_id, name, user_id, redirect_uris, created_at, updated_at)
    VALUES (${`synthetic-${randomUUID()}`}, 'Synthetic client of the user', ${person.id}, ARRAY['https://client.example.test/callback'], now(), now())`;

  // What staff did to the user, and what the user did as staff. Entries
  // have UUIDv7 ids.
  yield* sql`INSERT INTO staff.audit_events (id, action, at, reason, staff_id, target_id)
    VALUES (${uuid7()}, 'ban', now(), 'Synthetic reason naming the user', ${randomUUID()}, ${person.id}),
      (${uuid7()}, 'unban', now(), 'Synthetic reason', ${person.id}, ${randomUUID()})`;

  // Changes staff made as the user, in one of their workspaces, and as
  // someone else, removing the user from a workspace.
  yield* sql`INSERT INTO staff.audit_events (id, action, at, staff_id, target_id, workspace_id, operation, object_ids)
    VALUES (${uuid7()}, 'impersonatedChange', now(), ${randomUUID()}, ${person.id}, ${randomUUID()}, 'posts.create', ${JSON.stringify({ postId: randomUUID() })}::jsonb),
      (${uuid7()}, 'impersonatedChange', now(), ${randomUUID()}, ${randomUUID()}, ${randomUUID()}, 'auth:/organization/remove-member', ${JSON.stringify({ memberIdOrEmail: person.id, postId: randomUUID() })}::jsonb)`;

  // A subscription made for the user rather than a workspace, as Better
  // Auth's Stripe plugin would without Peal's guard.
  yield* sql`INSERT INTO auth.subscription (plan, reference_id, status)
    VALUES ('pro', ${person.id}, 'incomplete')`;
});

const countsOf = Effect.fn("countsOf")(function* countsOf(
  rows: Readonly<Record<string, Count>>,
  id: string
) {
  const sql = yield* SqlClient.SqlClient;

  const counted = yield* Effect.all(
    Object.entries(rows).map(([table, rowsOf]) =>
      count(rowsOf(sql, id)).pipe(Effect.map((left) => [table, left] as const))
    )
  );

  return Object.fromEntries(counted);
});

const none = (rows: Readonly<Record<string, Count>>) =>
  Object.fromEntries(Object.keys(rows).map((table) => [table, 0]));

layer(IntegrationLive, {
  excludeTestServices: true,
  timeout: "180 seconds",
})("erasing workspaces and accounts", (it) => {
  it.effect("says what becomes of every table the migrations create", () =>
    Effect.gen(function* everyTable() {
      const sql = yield* SqlClient.SqlClient;

      const tables =
        yield* sql`SELECT table_schema || '.' || table_name AS name FROM information_schema.tables WHERE table_schema IN ${sql.in(schemas)} AND table_type = 'BASE TABLE' ORDER BY 1`.pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(TablesSchema)),
          Effect.orDie
        );

      const accounted = new Set([
        ...Object.keys(workspaceRows),
        ...Object.keys(userRows),
        ...Object.keys(heldRows),
        ...Object.keys(kept),
      ]);

      assert.deepStrictEqual(
        tables.map(({ name }) => name),
        [...accounted].toSorted()
      );
    })
  );

  it.effect(
    "leave nothing of a deleted workspace in any table, and nothing of a closed account",
    () =>
      Effect.gen(function* erases() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const ana = yield* signedUp("ana");
        const ben = yield* signedUp("ben");
        const staff = yield* signedUp("cleo");
        const own = yield* workspaceOf(ana, "Alone");
        const shared = yield* workspaceOf(ben, "Together");

        yield* join(ben, shared, ana, "admin");
        // Own last: the session opens it.
        yield* fill(shared, ana);
        yield* fill(own, ana);
        yield* fillPerson(ana);

        // A session staff opened to act as Ben, as the admin plugin does.
        yield* sql`INSERT INTO auth.session (token, user_id, impersonated_by, expires_at, created_at, updated_at)
          VALUES (${randomUUID()}, ${ben.id}, ${staff.id}, now() + interval '1 hour', now(), now())`;

        // Everything was written: a count that stays at zero tests nothing.
        const filled = yield* countsOf(workspaceRows, own);

        for (const [table, rows] of Object.entries(filled)) {
          assert.isAbove(rows, 0, `${table} holds a row of the workspace`);
        }

        const deleted = yield* app.request(`/api/workspaces/${own}`, {
          body: { name: "Alone" },
          headers: { cookie: ana.cookies },
          method: "DELETE",
        });

        assert.strictEqual(deleted.status, 204);
        assert.deepStrictEqual(
          yield* countsOf(workspaceRows, own),
          none(workspaceRows)
        );

        // Ana still has her records in Together: closing the account takes
        // them, and leaves the workspace and its content to Ben.
        const before = yield* countsOf(userRows, ana.id);

        for (const [table, rows] of Object.entries(before)) {
          assert.isAbove(rows, 0, `${table} holds a row of the user`);
        }

        const closed = yield* app.request("/api/me", {
          body: { password },
          headers: { cookie: ana.cookies },
          method: "DELETE",
        });

        assert.strictEqual(closed.status, 204);
        assert.deepStrictEqual(
          yield* countsOf(userRows, ana.id),
          none(userRows)
        );

        // Only what the law has a host keep is left, apart: who held the
        // account, once, and the connections that made content.
        assert.deepStrictEqual(yield* countsOf(heldRows, ana.id), {
          "legal.connections": 2,
          "legal.identification_holds": 1,
        });

        const holds =
          yield* sql`SELECT email, sign_in_methods -> 0 ->> 'provider' AS sign_in FROM legal.identification_holds WHERE user_id = ${ana.id}`.pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(
                Schema.Array(
                  Schema.Struct({
                    email: Schema.String,
                    sign_in: Schema.String,
                  })
                )
              )
            ),
            Effect.orDie
          );

        assert.deepStrictEqual(holds, [
          {
            email: ana.email,
            sign_in: "credential",
          },
        ]);

        const posts = yield* count(
          sql`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${shared} AND author_id IS NULL AND scheduled_by IS NULL AND scheduled_via ->> '_tag' = 'web'`
        );

        assert.strictEqual(posts, 1);

        // The reason staff gave about her went with her id, but a ban's,
        // which stays with a keyed pseudonym of her address instead, so
        // Peal can show a court what it did and why.
        const reasons = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE target_id IS NULL AND reason IS NOT NULL AND action NOT IN ('ban', 'unban', 'legalDisclosure')`
        );

        assert.strictEqual(reasons, 0);

        const bans = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE target_id IS NULL AND action = 'ban' AND reason = 'Synthetic reason naming the user' AND target_pseudonym IS NOT NULL`
        );

        assert.isAbove(bans, 0);

        // Her trial stays, by the same pseudonym, so her address gets no
        // second one.
        const trials = yield* count(
          sql`SELECT count(*)::int AS count FROM billing.trials WHERE user_id IS NULL AND user_pseudonym IS NOT NULL AND forgotten_at IS NOT NULL`
        );

        assert.isAbove(trials, 0);

        // So did the workspace and the ids of what staff changed as her,
        // which would tie the events back to her.
        const linked = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE target_id IS NULL AND (workspace_id IS NOT NULL OR object_ids <> '{}'::jsonb)`
        );

        assert.strictEqual(linked, 0);

        // What she did as staff keeps her id: the server answers for what
        // staff did to other people's accounts, a legitimate interest.
        const actedAsStaff = yield* count(
          sql`SELECT count(*)::int AS count FROM staff.audit_events WHERE staff_id = ${ana.id}`
        );

        assert.strictEqual(actedAsStaff, 1);

        // A staff member closing theirs ends the sessions they act as
        // others in.
        const closedStaff = yield* app.request("/api/me", {
          body: { password },
          headers: { cookie: staff.cookies },
          method: "DELETE",
        });

        assert.strictEqual(closedStaff.status, 204);
        assert.deepStrictEqual(
          yield* countsOf(userRows, staff.id),
          none(userRows)
        );

        // Together goes too, to leave the shared database as it was.
        const together = yield* app.request(`/api/workspaces/${shared}`, {
          body: { name: "Together" },
          headers: { cookie: ben.cookies },
          method: "DELETE",
        });

        assert.strictEqual(together.status, 204);
      })
  );

  it.effect(
    "copy out of every table no secret, and nothing of another member",
    () =>
      Effect.gen(function* exports() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const lee = yield* signedUp("lee");
        const kim = yield* signedUp("kim");
        const own = yield* workspaceOf(lee, "Studio");
        const shared = yield* workspaceOf(kim, "Agency");

        yield* join(kim, shared, lee, "admin");
        yield* fill(shared, lee);
        yield* fill(own, lee);
        yield* fillPerson(lee);
        yield* seedNotice(kim.id, shared, "@kim@social.example");

        const secrets = yield* sql`
          SELECT access_token AS secret FROM channels.channels WHERE workspace_id IN (${own}, ${shared})
          UNION ALL SELECT secret FROM channels.connect_attempts WHERE workspace_id IN (${own}, ${shared})
          UNION ALL SELECT accounts FROM channels.connect_choices WHERE workspace_id IN (${own}, ${shared})
          UNION ALL SELECT key FROM auth.apikey WHERE reference_id IN (${own}, ${shared})
          UNION ALL SELECT token FROM auth.oauth_access_token WHERE user_id = ${lee.id}
          UNION ALL SELECT token FROM auth.oauth_refresh_token WHERE user_id = ${lee.id}
          UNION ALL SELECT token FROM auth.session WHERE user_id = ${lee.id}
          UNION ALL SELECT password FROM auth.account WHERE user_id = ${lee.id} AND password IS NOT NULL
          UNION ALL SELECT split_part(identifier, ':', 2) FROM auth.verification WHERE value = ${lee.id}
          UNION ALL SELECT device_code FROM auth.device_code WHERE user_id = ${lee.id}
          UNION ALL SELECT stripe_customer_id FROM billing.subscriptions WHERE workspace_id = ${own}
          UNION ALL SELECT stripe_subscription_id FROM billing.subscriptions WHERE workspace_id = ${own}`.pipe(
          Effect.flatMap(
            Schema.decodeUnknownEffect(
              Schema.Array(Schema.Struct({ secret: Schema.String }))
            )
          ),
          Effect.orDie
        );

        assert.isAtLeast(secrets.length, 14);

        const reply = yield* app.request("/api/me/export", {
          headers: { cookie: lee.cookies },
        });

        assert.strictEqual(reply.status, 200);

        const text = JSON.stringify(reply.body);

        for (const { secret } of secrets) {
          assert.notInclude(text, secret);
        }

        // Kim's address and notices are Kim's, though Lee works with Kim.
        assert.notInclude(text, kim.email);
        assert.notInclude(text, "@kim@social.example");
        assert.include(text, lee.email);

        for (const [person, workspaceId, name] of [
          [lee, own, "Studio"],
          [kim, shared, "Agency"],
        ] as const) {
          const deleted = yield* app.request(`/api/workspaces/${workspaceId}`, {
            body: { name },
            headers: { cookie: person.cookies },
            method: "DELETE",
          });

          assert.strictEqual(deleted.status, 204);
        }
      })
  );
});
