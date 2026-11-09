// The staff console through the whole server: who it answers, what it shows
// of accounts and workspaces, and what staff do, each recorded in the audit
// log. Accounts sign up through Better Auth and confirm from Mailpit.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import {
  MeSchema,
  StaffAuditPageSchema,
  StaffSystemSchema,
  StaffUserPageSchema,
  StaffUserSchema,
  StaffWorkspacePageSchema,
  StaffWorkspaceSchema,
} from "acme-contract";
import { Config, Context, Effect, Layer, Schedule, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { SqlLive } from "#shared/infrastructure/database.ts";
import {
  apiKeyOf,
  bodyOf,
  confirmedAccount,
  cookiesOf,
  makeAdmin,
  newEmail,
  password,
  signIn,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import { seedChannel, seedPost } from "#test/workspace/integration/seed.ts";

// What staff must never see of a workspace: its posts' text, and what
// their options say.
const secretText = `A synthetic post only its members read ${randomUUID()}`;

const secretTitle = `A synthetic video title only members read ${randomUUID()}`;

const release = "synthetic-release-2026.11.0";

interface Fixture {
  readonly apiKey: string;
  readonly member: { readonly email: string; readonly id: string };
  readonly memberCookies: string;
  readonly otherStaff: { readonly email: string; readonly id: string };
  readonly scheduledPostId: string;
  readonly staff: { readonly email: string; readonly id: string };
  readonly staffCookies: string;
  readonly targetId: string;
  readonly tiktokTargetId: string;
  readonly workspaceId: string;
  readonly youtubeTargetId: string;
}

class Staffed extends Context.Service<Staffed, Fixture>()(
  "acme-server/test/Staffed"
) {}

const IdsSchema = Schema.Array(Schema.Struct({ id: Schema.String }));

// Answers as JSON carries them: instants as strings.
const json = <S extends Schema.Top>(schema: S) => Schema.toCodecJson(schema);

const StaffedLive = Layer.effect(
  Staffed,
  Effect.gen(function* staffed() {
    const sql = yield* SqlClient.SqlClient;

    const member = yield* signedUp("console-member");
    const staff = yield* confirmedAccount("console-staff");
    const otherStaff = yield* confirmedAccount("console-other-staff");

    yield* makeAdmin(staff.id);
    yield* makeAdmin(otherStaff.id);

    const workspaceId = yield* workspaceOf(member, "Console");
    const { key } = yield* apiKeyOf(member, workspaceId, ["post:read"]);

    const channelId = yield* seedChannel(
      workspaceId,
      "@console@social.example"
    );

    const postId = yield* seedPost(workspaceId, channelId, secretText);

    const [target] =
      yield* sql`UPDATE publishing.post_targets SET status = 'failed', failure_reason = 'mediaRejected', failure_code = 'synthetic_code', finished_at = now() WHERE post_id = ${postId} RETURNING id`.pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(IdsSchema)),
        Effect.orDie
      );

    // TikTok and YouTube channels, one to reconnect, whose posts failed for
    // their platform's own reasons; the YouTube one has a title of its own.
    const tiktokChannel = yield* seedChannel(workspaceId, "@console_tiktok", {
      platform: "tiktok",
      refreshNeeded: true,
    });

    const youtubeChannel = yield* seedChannel(workspaceId, "Console videos", {
      platform: "youtube",
    });

    const tiktokPost = yield* seedPost(workspaceId, tiktokChannel, secretText);

    const youtubePost = yield* seedPost(
      workspaceId,
      youtubeChannel,
      secretText,
      "draft",
      null,
      { madeForKids: false, platform: "youtube", title: secretTitle }
    );

    const failedOn = (postId: string, reason: string) =>
      sql`UPDATE publishing.post_targets SET status = 'failed', failure_reason = ${reason}, failure_code = ${reason}, finished_at = now() WHERE post_id = ${postId} RETURNING id`.pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(IdsSchema)),
        Effect.map(([row]) => row?.id ?? ""),
        Effect.orDie
      );

    const tiktokTargetId = yield* failedOn(tiktokPost, "appNotAudited");
    const youtubeTargetId = yield* failedOn(youtubePost, "quotaExceeded");

    // A post due within the hour, with no job behind it: the system page
    // reads the table, and the test deletes it after.
    const scheduledPostId = yield* seedPost(workspaceId, channelId, secretText);

    yield* sql`UPDATE publishing.posts SET status = 'scheduled', scheduled_at = now() + interval '30 minutes', schedule_zone = 'UTC' WHERE id = ${scheduledPostId}`;

    yield* Effect.addFinalizer(() =>
      sql`DELETE FROM publishing.posts WHERE workspace_id = ${workspaceId}`.pipe(
        Effect.orDie
      )
    );

    return {
      apiKey: key,
      member,
      memberCookies: member.cookies,
      otherStaff,
      scheduledPostId,
      staff,
      staffCookies: yield* signIn(staff.email),
      targetId: target?.id ?? "",
      tiktokTargetId,
      workspaceId,
      youtubeTargetId,
    };
  })
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      TestApp.layerWith({ OTEL_SERVICE_VERSION: release }),
      SqlLive
    )
  )
);

const mailpitUrl = Config.String("MAILPIT_URL").pipe(
  Config.withDefault("http://127.0.0.1:18025")
);

const MailpitCountSchema = Schema.Struct({ messages_count: Schema.Number });

// How many emails Mailpit holds for the address.
const emailsTo = Effect.fn("emailsTo")(function* emailsTo(address: string) {
  const base = yield* mailpitUrl;
  const query = new URLSearchParams({ query: `to:"${address}"` });

  const body = yield* Effect.promise(async () => {
    const response = await fetch(`${base}/api/v1/search?${query.toString()}`);
    const answer: unknown = await response.json();

    return answer;
  });

  return (yield* Schema.decodeUnknownEffect(MailpitCountSchema)(body))
    .messages_count;
});

const reason = { reason: "Synthetic support ticket 42" };

interface Case {
  readonly headers: (fixture: Fixture) => Record<string, string>;
  readonly method: "GET" | "POST";
  readonly name: string;
}

// Each answers 404 on every endpoint, as if the console were not there.
const refused: readonly Case[] = [
  { headers: () => ({}), method: "GET", name: "no credentials" },
  {
    headers: (fixture) => ({ cookie: fixture.memberCookies }),
    method: "GET",
    name: "a member's session",
  },
  {
    headers: (fixture) => ({ authorization: `Bearer ${fixture.apiKey}` }),
    method: "GET",
    name: "an API key",
  },
  {
    headers: () => ({
      authorization: "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.signature",
    }),
    method: "GET",
    name: "an OAuth access token",
  },
  {
    headers: (fixture) => ({
      cookie: fixture.staffCookies,
      origin: "https://elsewhere.example",
    }),
    method: "POST",
    name: "staff's session sent by another site",
  },
];

const consolePaths = (fixture: Fixture) => [
  "/api/admin/session",
  "/api/admin/system",
  "/api/admin/audit",
  "/api/admin/users",
  `/api/admin/users/${fixture.member.id}`,
  "/api/admin/workspaces",
  `/api/admin/workspaces/${fixture.workspaceId}`,
];

const actionPaths = (fixture: Fixture) =>
  ["ban", "unban", "revoke-sessions", "resend-verification", "impersonate"].map(
    (action) => `/api/admin/users/${fixture.member.id}/${action}`
  );

layer(StaffedLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "the staff console",
  (it) => {
    it.effect.each(refused)("answers 404 to $name", ({ headers, method }) =>
      Effect.gen(function* answers() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;

        const paths =
          method === "GET" ? consolePaths(fixture) : actionPaths(fixture);

        for (const path of paths) {
          const reply = yield* app.request(path, {
            body: method === "POST" ? reason : undefined,
            headers: headers(fixture),
            method,
          });

          assert.strictEqual(reply.status, 404, path);
        }
      })
    );

    it.effect("answers staff in their own session", () =>
      Effect.gen(function* answers() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;

        for (const path of consolePaths(fixture)) {
          const reply = yield* app.request(path, {
            headers: { cookie: fixture.staffCookies },
          });

          assert.strictEqual(reply.status, 200, path);
        }
      })
    );

    it.effect("refuses staff while they impersonate someone", () =>
      Effect.gen(function* impersonating() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;
        const support = yield* confirmedAccount("console-impersonator");

        yield* makeAdmin(support.id);

        const started = yield* app.request(
          `/api/admin/users/${fixture.member.id}/impersonate`,
          { body: reason, headers: { cookie: yield* signIn(support.email) } }
        );

        assert.strictEqual(started.status, 204);

        const cookie = cookiesOf(started);

        const me = yield* bodyOf(
          MeSchema,
          yield* app.request("/api/me", { headers: { cookie } })
        );

        assert.strictEqual(me.impersonatedBy, support.id);

        for (const path of consolePaths(fixture)) {
          const reply = yield* app.request(path, { headers: { cookie } });

          assert.strictEqual(reply.status, 404, path);
        }

        const audit = yield* bodyOf(
          json(StaffAuditPageSchema),
          yield* app.request(`/api/admin/audit?targetId=${fixture.member.id}`, {
            headers: { cookie: fixture.staffCookies },
          })
        );

        assert.isTrue(
          audit.items.some(
            (event) =>
              event.action === "impersonate" && event.staffId === support.id
          )
        );
      })
    );

    it.effect("finds accounts by email and shows one", () =>
      Effect.gen(function* finds() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;
        const headers = { cookie: fixture.staffCookies };

        const found = yield* bodyOf(
          json(StaffUserPageSchema),
          yield* app.request(
            `/api/admin/users?query=${encodeURIComponent(fixture.member.email.toUpperCase())}`,
            { headers }
          )
        );

        assert.strictEqual(found.total, 1);
        assert.strictEqual(found.items[0]?.id, fixture.member.id);

        // Wildcards are taken literally.
        const none = yield* bodyOf(
          json(StaffUserPageSchema),
          yield* app.request("/api/admin/users?query=%25%25%25_", { headers })
        );

        assert.strictEqual(none.total, 0);

        const user = yield* bodyOf(
          json(StaffUserSchema),
          yield* app.request(`/api/admin/users/${fixture.member.id}`, {
            headers,
          })
        );

        assert.strictEqual(user.email, fixture.member.email);
        assert.isTrue(user.emailVerified);
        assert.isFalse(user.staff);
        assert.isNull(user.ban);
        assert.isAtLeast(user.sessions, 1);
        assert.isNotNull(user.lastSignInAt);
        assert.deepStrictEqual(
          user.workspaces.map(({ id, role }) => ({ id, role })),
          [{ id: fixture.workspaceId, role: "owner" }]
        );

        const unknown = yield* app.request(`/api/admin/users/${randomUUID()}`, {
          headers,
        });

        const malformed = yield* app.request("/api/admin/users/not-an-id", {
          headers,
        });

        assert.strictEqual(unknown.status, 404);
        assert.strictEqual(malformed.status, 404);
      })
    );

    it.effect("shows a workspace's health, never its posts' text", () =>
      Effect.gen(function* shows() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;
        const headers = { cookie: fixture.staffCookies };

        const found = yield* bodyOf(
          json(StaffWorkspacePageSchema),
          yield* app.request(
            `/api/admin/workspaces?query=${fixture.workspaceId}`,
            {
              headers,
            }
          )
        );

        assert.strictEqual(found.items[0]?.members, 1);

        const reply = yield* app.request(
          `/api/admin/workspaces/${fixture.workspaceId}`,
          { headers }
        );

        const workspace = yield* bodyOf(json(StaffWorkspaceSchema), reply);

        assert.notInclude(JSON.stringify(reply.body), secretText);
        assert.notInclude(JSON.stringify(reply.body), secretTitle);
        assert.deepStrictEqual(
          workspace.members.map(({ role, userId }) => ({ role, userId })),
          [{ role: "owner", userId: fixture.member.id }]
        );
        assert.deepStrictEqual(
          workspace.channels
            .map(({ handle, platform, status }) => ({
              handle,
              platform,
              status,
            }))
            .toSorted((a, b) => a.platform.localeCompare(b.platform)),
          [
            {
              handle: "@console@social.example",
              platform: "mastodon",
              status: { _tag: "active" },
            },
            {
              handle: "@console_tiktok",
              platform: "tiktok",
              status: { _tag: "refreshNeeded" },
            },
            {
              handle: "Console videos",
              platform: "youtube",
              status: { _tag: "active" },
            },
          ]
        );
        assert.deepStrictEqual(workspace.posts, {
          cancelled: 0,
          draft: 3,
          finished: 0,
          publishing: 0,
          scheduled: 1,
        });
        assert.deepStrictEqual(
          workspace.failures
            .map(({ code, platform, reason: why, status, targetId }) => ({
              code,
              platform,
              reason: why,
              status,
              targetId,
            }))
            .toSorted((a, b) => a.targetId.localeCompare(b.targetId)),
          [
            {
              code: "synthetic_code",
              platform: "mastodon",
              reason: "mediaRejected",
              status: "failed",
              targetId: fixture.targetId,
            },
            {
              code: "appNotAudited",
              platform: "tiktok",
              reason: "appNotAudited",
              status: "failed",
              targetId: fixture.tiktokTargetId,
            },
            {
              code: "quotaExceeded",
              platform: "youtube",
              reason: "quotaExceeded",
              status: "failed",
              targetId: fixture.youtubeTargetId,
            },
          ].toSorted((a, b) => a.targetId.localeCompare(b.targetId))
        );
        // Billing is off in tests: no plan, no limit.
        assert.deepStrictEqual(workspace.billing, {
          plan: null,
          subscription: null,
        });
      })
    );

    it.effect("shows the system's health and release", () =>
      Effect.gen(function* system() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;

        const reply = yield* app.request("/api/admin/system", {
          headers: { cookie: fixture.staffCookies },
        });

        const health = yield* bodyOf(json(StaffSystemSchema), reply);

        assert.isTrue(health.ready);
        assert.strictEqual(health.release, release);
        assert.isAtLeast(health.due.total, 1);
        assert.notInclude(JSON.stringify(reply.body), secretText);
      })
    );

    it.effect("bans an account with a reason, records it, and lifts it", () =>
      Effect.gen(function* bans() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;
        const headers = { cookie: fixture.staffCookies };
        const banned = yield* confirmedAccount("console-banned");
        const until = new Date(Date.now() + 86_400_000).toISOString();

        const ban = yield* app.request(`/api/admin/users/${banned.id}/ban`, {
          body: { expiresAt: until, reason: "  Synthetic spam report  " },
          headers,
        });

        assert.strictEqual(ban.status, 204);

        const signInWhileBanned = yield* app.request(
          "/api/auth/sign-in/email",
          {
            body: { email: banned.email, password },
          }
        );

        assert.strictEqual(signInWhileBanned.status, 403);

        const user = yield* bodyOf(
          json(StaffUserSchema),
          yield* app.request(`/api/admin/users/${banned.id}`, { headers })
        );

        assert.strictEqual(user.ban?.reason, "Synthetic spam report");
        assert.isNotNull(user.ban?.expiresAt);

        const actAs = yield* app.request(
          `/api/admin/users/${banned.id}/impersonate`,
          { body: { reason: "Synthetic check" }, headers }
        );

        assert.strictEqual(actAs.status, 409);
        assert.deepInclude(actAs.body, { reason: "banned" });

        const unban = yield* app.request(
          `/api/admin/users/${banned.id}/unban`,
          {
            body: { reason: "Synthetic appeal accepted" },
            headers,
          }
        );

        assert.strictEqual(unban.status, 204);

        const signInAfter = yield* app.request("/api/auth/sign-in/email", {
          body: { email: banned.email, password },
        });

        assert.strictEqual(signInAfter.status, 200);

        const audit = yield* bodyOf(
          json(StaffAuditPageSchema),
          yield* app.request(`/api/admin/audit?targetId=${banned.id}`, {
            headers,
          })
        );

        assert.deepStrictEqual(
          audit.items.map(
            ({ action, reason: why, staffEmail, targetEmail }) => ({
              action,
              reason: why,
              staffEmail,
              targetEmail,
            })
          ),
          [
            {
              action: "unban",
              reason: "Synthetic appeal accepted",
              staffEmail: fixture.staff.email,
              targetEmail: banned.email,
            },
            {
              action: "ban",
              reason: "Synthetic spam report",
              staffEmail: fixture.staff.email,
              targetEmail: banned.email,
            },
          ]
        );
        assert.isNotNull(audit.items[1]?.banExpiresAt);
      })
    );

    it.effect("refuses what does not apply, and records nothing", () =>
      Effect.gen(function* refuses() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;
        const headers = { cookie: fixture.staffCookies };

        const conflicts = [
          [
            `/api/admin/users/${fixture.staff.id}/ban`,
            { ...reason, expiresAt: null },
            "self",
          ],
          [
            `/api/admin/users/${fixture.member.id}/ban`,
            { ...reason, expiresAt: "2020-01-01T00:00:00.000Z" },
            "expired",
          ],
          [
            `/api/admin/users/${fixture.otherStaff.id}/impersonate`,
            reason,
            "staff",
          ],
          [
            `/api/admin/users/${fixture.member.id}/resend-verification`,
            reason,
            "verified",
          ],
          [
            `/api/admin/users/${fixture.staff.id}/revoke-sessions`,
            reason,
            "self",
          ],
        ] as const;

        for (const [path, body, why] of conflicts) {
          const reply = yield* app.request(path, { body, headers });

          assert.strictEqual(reply.status, 409, path);
          assert.deepInclude(reply.body, { reason: why }, path);
        }

        const blank = yield* app.request(
          `/api/admin/users/${fixture.member.id}/unban`,
          { body: { reason: "   " }, headers }
        );

        assert.strictEqual(blank.status, 400);

        const audit = yield* bodyOf(
          json(StaffAuditPageSchema),
          yield* app.request(
            `/api/admin/audit?targetId=${fixture.otherStaff.id}`,
            {
              headers,
            }
          )
        );

        assert.strictEqual(audit.total, 0);
      })
    );

    it.effect("signs an account out everywhere", () =>
      Effect.gen(function* revokes() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;
        const person = yield* signedUp("console-signed-out");

        const reply = yield* app.request(
          `/api/admin/users/${person.id}/revoke-sessions`,
          { body: reason, headers: { cookie: fixture.staffCookies } }
        );

        assert.strictEqual(reply.status, 204);

        // A write reads the session from the database.
        const after = yield* app.request("/api/me/notices/read-all", {
          headers: { cookie: person.cookies },
          method: "POST",
        });

        assert.strictEqual(after.status, 401);
      })
    );

    it.effect.each([
      { action: "ban", body: { ...reason, expiresAt: null } },
      { action: "revoke-sessions", body: reason },
    ])(
      "ends the sessions staff opened to act as someone when they get $action",
      ({ action, body }) =>
        Effect.gen(function* ends() {
          const app = yield* TestApp;
          const fixture = yield* Staffed;
          const rogue = yield* confirmedAccount(`console-rogue-${action}`);
          const person = yield* signedUp(`console-acted-on-${action}`);

          yield* makeAdmin(rogue.id);

          const started = yield* app.request(
            `/api/admin/users/${person.id}/impersonate`,
            { body: reason, headers: { cookie: yield* signIn(rogue.email) } }
          );

          assert.strictEqual(started.status, 204);

          const actingAs = cookiesOf(started);
          const sql = yield* SqlClient.SqlClient;

          const impersonations =
            sql`SELECT count(*)::int AS open FROM auth.session WHERE impersonated_by = ${rogue.id}`.pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  Schema.Tuple([Schema.Struct({ open: Schema.Number })])
                )
              ),
              Effect.map(([{ open }]) => open),
              Effect.orDie
            );

          assert.strictEqual(yield* impersonations, 1);

          const stopped = yield* app.request(
            `/api/admin/users/${rogue.id}/${action}`,
            { body, headers: { cookie: fixture.staffCookies } }
          );

          assert.strictEqual(stopped.status, 204);

          assert.strictEqual(yield* impersonations, 0);

          const after = yield* app.request(
            "/api/auth/get-session?disableCookieCache=true",
            { headers: { cookie: actingAs } }
          );

          assert.strictEqual(after.body, null);

          // The person's own session stays.
          const own = yield* app.request("/api/me/notices/read-all", {
            headers: { cookie: person.cookies },
            method: "POST",
          });

          assert.strictEqual(own.status, 200);
        })
    );

    it.effect("emails the confirmation again", () =>
      Effect.gen(function* resends() {
        const app = yield* TestApp;
        const fixture = yield* Staffed;
        const email = newEmail("console-unconfirmed");

        const created = yield* app.request("/api/auth/sign-up/email", {
          body: { email, locale: "fr", name: "Unconfirmed", password },
        });

        const { user } = yield* bodyOf(
          Schema.Struct({ user: Schema.Struct({ id: Schema.String }) }),
          created
        );

        const reply = yield* app.request(
          `/api/admin/users/${user.id}/resend-verification`,
          { body: reason, headers: { cookie: fixture.staffCookies } }
        );

        assert.strictEqual(reply.status, 204);

        // The sign-up's email, then staff's.
        const count = yield* emailsTo(email).pipe(
          Effect.flatMap((sent) =>
            sent >= 2 ? Effect.succeed(sent) : Effect.fail("not yet")
          ),
          Effect.retry({ schedule: Schedule.spaced("200 millis"), times: 300 }),
          Effect.orDie
        );

        assert.isAtLeast(count, 2);
      })
    );
  }
);
