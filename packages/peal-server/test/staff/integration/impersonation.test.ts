// Staff acting as a member, through the whole server: every change they
// make is recorded in the audit log with who they are, whatever route it
// takes, and an impersonation ends, recorded too, when they stop it or are
// no longer staff. Accounts sign up through Better Auth and confirm from
// Mailpit.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import {
  AccountExportSchema,
  PostSchema,
  StaffAuditPageSchema,
} from "peal-contract";
import type { StaffAuditEvent } from "peal-contract";

import {
  bodyOf,
  confirmedAccount,
  cookiesOf,
  IntegrationLive,
  makeAdmin,
  signIn,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

// Answers as JSON carries them: instants as strings.
const json = <S extends Schema.Top>(schema: S) => Schema.toCodecJson(schema);

const reason = { reason: "Synthetic support ticket 7" };

const draftOf = (text: string) => ({
  channelIds: [],
  content: { media: [], overrides: [], text },
});

// A member with a workspace, a staff member signed in, and the cookies of
// the staff member acting as the member.
const impersonation = Effect.fn("impersonation")(function* impersonation(
  label: string
) {
  const app = yield* TestApp;
  const member = yield* signedUp(`${label}-member`);
  const staff = yield* confirmedAccount(`${label}-staff`);

  yield* makeAdmin(staff.id);

  const staffCookies = yield* signIn(staff.email);
  const workspaceId = yield* workspaceOf(member, label);

  const started = yield* app.request(
    `/api/admin/users/${member.id}/impersonate`,
    { body: reason, headers: { cookie: staffCookies } }
  );

  assert.strictEqual(started.status, 204);

  return {
    actingAs: cookiesOf(started),
    member,
    staff,
    staffCookies,
    workspaceId,
  };
});

// What staff did to the account, newest first, as other staff read it.
const auditOf = Effect.fn("auditOf")(function* auditOf(
  targetId: string,
  staffCookies: string
) {
  const app = yield* TestApp;

  const reply = yield* app.request(`/api/admin/audit?targetId=${targetId}`, {
    headers: { cookie: staffCookies },
  });

  return {
    page: yield* bodyOf(json(StaffAuditPageSchema), reply),
    text: JSON.stringify(reply.body),
  };
});

const ofAction =
  (action: StaffAuditEvent["action"]) => (event: StaffAuditEvent) =>
    event.action === action;

const openImpersonations = (staffId: string) =>
  Effect.gen(function* countOpen() {
    const sql = yield* SqlClient.SqlClient;

    return yield* sql`SELECT count(*)::int AS open FROM auth.session WHERE impersonated_by = ${staffId}`.pipe(
      Effect.flatMap(
        Schema.decodeUnknownEffect(
          Schema.Tuple([Schema.Struct({ open: Schema.Number })])
        )
      ),
      Effect.map(([{ open }]) => open),
      Effect.orDie
    );
  });

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "staff acting as a member",
  (it) => {
    it.effect(
      "records each change with the staff member behind it, never what they wrote",
      () =>
        Effect.gen(function* records() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;

          const { actingAs, member, staff, staffCookies, workspaceId } =
            yield* impersonation("acting");

          const secretText = `A synthetic draft staff wrote ${randomUUID()}`;
          const posts = `/api/workspaces/${workspaceId}/posts`;

          const created = yield* app.request(posts, {
            body: draftOf(secretText),
            headers: { cookie: actingAs },
          });

          assert.strictEqual(created.status, 201);

          const post = yield* bodyOf(json(PostSchema), created);

          // The post is the member's; the audit log says who wrote it.
          assert.strictEqual(post.authorId, member.id);

          const updated = yield* app.request(`${posts}/${post.id}`, {
            body: draftOf(`${secretText}, again`),
            headers: { cookie: actingAs },
            method: "PUT",
          });

          assert.strictEqual(updated.status, 200, JSON.stringify(updated.body));

          // Reading changes nothing, and is not recorded.
          const listed = yield* app.request(`${posts}/${post.id}`, {
            headers: { cookie: actingAs },
          });

          assert.strictEqual(listed.status, 200);

          // Better Auth's routes are recorded too.
          const activated = yield* app.request(
            "/api/auth/organization/set-active",
            {
              body: { organizationId: workspaceId },
              headers: { cookie: actingAs },
            }
          );

          assert.strictEqual(
            activated.status,
            200,
            JSON.stringify(activated.body)
          );

          // A change the handler then refuses is recorded all the same:
          // the record says what staff asked for.
          const refusedKey = yield* app.request(
            `/api/workspaces/${workspaceId}/api-keys`,
            {
              body: { name: "synthetic", permissions: ["post:read"] },
              headers: { cookie: actingAs },
            }
          );

          assert.strictEqual(refusedKey.status, 403);

          const [row] =
            yield* sql`SELECT author_id FROM publishing.posts WHERE id = ${post.id}`.pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  Schema.Array(Schema.Struct({ author_id: Schema.String }))
                )
              ),
              Effect.orDie
            );

          assert.strictEqual(row?.author_id, member.id);

          const { page, text } = yield* auditOf(member.id, staffCookies);

          assert.deepStrictEqual(
            page.items.filter(ofAction("impersonatedChange")).map((event) => ({
              objectIds: event.objectIds,
              operation: event.operation,
              staffId: event.staffId,
              targetId: event.targetId,
              workspaceId: event.workspaceId,
            })),
            [
              {
                objectIds: {},
                operation: "apiKeys.create",
                staffId: staff.id,
                targetId: member.id,
                workspaceId,
              },
              {
                objectIds: { organizationId: workspaceId },
                operation: "auth:/organization/set-active",
                staffId: staff.id,
                targetId: member.id,
                workspaceId,
              },
              {
                objectIds: { postId: post.id },
                operation: "posts.update",
                staffId: staff.id,
                targetId: member.id,
                workspaceId,
              },
              {
                objectIds: {},
                operation: "posts.create",
                staffId: staff.id,
                targetId: member.id,
                workspaceId,
              },
            ]
          );
          assert.notInclude(text, secretText);

          yield* sql`DELETE FROM publishing.posts WHERE workspace_id = ${workspaceId}`;

          // The member's copy of their data lists those changes, without
          // who made them.
          const exported = yield* app.request("/api/me/export", {
            headers: { cookie: member.cookies },
          });

          assert.strictEqual(exported.status, 200);

          const data = yield* bodyOf(json(AccountExportSchema), exported);

          assert.deepStrictEqual(
            data.staffActions
              .filter(({ action }) => action === "impersonatedChange")
              .map(({ objectIds, operation, workspaceId: workspace }) => ({
                objectIds,
                operation,
                workspace,
              })),
            [
              {
                objectIds: {},
                operation: "posts.create",
                workspace: workspaceId,
              },
              {
                objectIds: { postId: post.id },
                operation: "posts.update",
                workspace: workspaceId,
              },
              {
                objectIds: { organizationId: workspaceId },
                operation: "auth:/organization/set-active",
                workspace: workspaceId,
              },
              {
                objectIds: {},
                operation: "apiKeys.create",
                workspace: workspaceId,
              },
            ]
          );
          assert.notInclude(
            JSON.stringify(data.staffActions),
            staff.id,
            "the export does not say who staff were"
          );
        })
    );

    it.effect("records the end of an impersonation staff stop", () =>
      Effect.gen(function* stops() {
        const app = yield* TestApp;

        const { actingAs, member, staff, staffCookies } =
          yield* impersonation("stopping");

        const stopped = yield* app.request(
          "/api/auth/admin/stop-impersonating",
          { body: {}, headers: { cookie: actingAs } }
        );

        assert.strictEqual(stopped.status, 200);

        const { page } = yield* auditOf(member.id, staffCookies);

        assert.deepStrictEqual(
          page.items
            .filter(
              (event) =>
                event.action === "stopImpersonating" ||
                event.action === "impersonate"
            )
            .map(({ action, staffId }) => ({ action, staffId })),
          [
            { action: "stopImpersonating", staffId: staff.id },
            { action: "impersonate", staffId: staff.id },
          ]
        );
      })
    );

    it.effect(
      "ends the impersonations of someone no longer staff at once, and records it",
      () =>
        Effect.gen(function* ends() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;

          const { actingAs, member, staff, workspaceId } =
            yield* impersonation("demoted");

          const other = yield* confirmedAccount("demoted-other-staff");

          yield* makeAdmin(other.id);

          const otherCookies = yield* signIn(other.email);

          assert.strictEqual(yield* openImpersonations(staff.id), 1);

          yield* sql`UPDATE auth."user" SET role = NULL WHERE id = ${staff.id}`;

          // The very next request, a read through the cached session
          // included, is refused, and every impersonation of theirs ends.
          const read = yield* app.request("/api/me", {
            headers: { cookie: actingAs },
          });

          assert.strictEqual(read.status, 401);
          assert.strictEqual(yield* openImpersonations(staff.id), 0);

          const write = yield* app.request(
            `/api/workspaces/${workspaceId}/posts`,
            {
              body: draftOf("A synthetic draft"),
              headers: { cookie: actingAs },
            }
          );

          assert.strictEqual(write.status, 401);

          const viaAuth = yield* app.request(
            "/api/auth/organization/set-active",
            {
              body: { organizationId: workspaceId },
              headers: { cookie: actingAs },
            }
          );

          assert.strictEqual(viaAuth.status, 401);

          const { page } = yield* auditOf(member.id, otherCookies);

          assert.deepStrictEqual(
            page.items
              .filter(ofAction("impersonationEnded"))
              .map(({ staffId, targetId }) => ({ staffId, targetId })),
            [{ staffId: staff.id, targetId: member.id }]
          );
          assert.isFalse(page.items.some(ofAction("impersonatedChange")));
        })
    );

    it.effect(
      "records the impersonations a ban of their staff member ends",
      () =>
        Effect.gen(function* banned() {
          const app = yield* TestApp;
          const { member, staff } = yield* impersonation("banned");
          const other = yield* confirmedAccount("banned-other-staff");

          yield* makeAdmin(other.id);

          const otherCookies = yield* signIn(other.email);

          const ban = yield* app.request(`/api/admin/users/${staff.id}/ban`, {
            body: { ...reason, expiresAt: null },
            headers: { cookie: otherCookies },
          });

          assert.strictEqual(ban.status, 204);
          assert.strictEqual(yield* openImpersonations(staff.id), 0);

          const { page } = yield* auditOf(member.id, otherCookies);

          assert.deepStrictEqual(
            page.items
              .filter(ofAction("impersonationEnded"))
              .map(({ staffId, targetId }) => ({ staffId, targetId })),
            [{ staffId: staff.id, targetId: member.id }]
          );
        })
    );
  }
);
