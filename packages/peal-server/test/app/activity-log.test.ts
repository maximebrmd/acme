// A workspace's activity log, through the whole server: every request that
// asks to change something leaves one event, done, refused or failed, and
// its owners read them.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { ActivityPageSchema } from "peal-contract";

import {
  MigratedSqlLive,
  apiKeyOf,
  bodyOf,
  signedUp,
  TestApp,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import type { Person } from "#test/workspace/integration/harness.ts";

// The second test invites someone, which takes a confirmed address.
const Test = Layer.mergeAll(TestApp.layer, MigratedSqlLive);

const PageJsonSchema = Schema.toCodecJson(ActivityPageSchema);

const RefusalSchema = Schema.Struct({
  _tag: Schema.Literal("Forbidden"),
  code: Schema.Literal("forbidden"),
  permission: Schema.String,
  reason: Schema.String,
});

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
});

// The workspace's log as its owner reads it, with a filter.
const logOf = Effect.fn("logOf")(function* logOf(
  owner: Person,
  workspaceId: string,
  query = ""
) {
  const app = yield* TestApp;

  const reply = yield* app.request(
    `/api/workspaces/${workspaceId}/activity${query}`,
    { headers: { cookie: owner.cookies } }
  );

  assert.strictEqual(reply.status, 200);

  return yield* bodyOf(PageJsonSchema, reply);
});

const draft = {
  channelIds: [],
  content: { media: [], overrides: [], text: "A synthetic draft." },
};

const unknownPost = "0195d2c0-0000-7000-8000-00000000abcd";

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "the activity log",
  (it) => {
    it.effect(
      "keeps one event for each request that asks for a change, done, refused or failed, and none for a read",
      () =>
        Effect.gen(function* recorded() {
          const app = yield* TestApp;
          const owner = yield* signedUp("activity-owner");
          const workspaceId = yield* workspaceOf(owner, "Activity");
          const posts = `/api/workspaces/${workspaceId}/posts`;

          // The owner, in their session, creates two keys.
          const writer = yield* apiKeyOf(owner, workspaceId, [
            "post:create",
            "post:delete",
            "post:read",
            "channel:read",
          ]);

          const reader = yield* apiKeyOf(owner, workspaceId, ["post:read"]);
          const withKey = { authorization: `Bearer ${writer.key}` };

          // A write with a key, which succeeds.
          const created = yield* app.request(posts, {
            body: draft,
            headers: { ...withKey, "x-request-id": "activity-test-0001" },
          });

          assert.strictEqual(created.status, 201);

          // One the key may not make.
          const refused = yield* app.request(posts, {
            body: draft,
            headers: {
              authorization: `Bearer ${reader.key}`,
              "x-request-id": "activity-test-0002",
            },
          });

          assert.strictEqual(refused.status, 403);

          // One that fails: no such post.
          const failed = yield* app.request(`${posts}/${unknownPost}`, {
            headers: { ...withKey, "x-request-id": "activity-test-0003" },
            method: "DELETE",
          });

          assert.strictEqual(failed.status, 404);

          // One the API cannot read.
          const invalid = yield* app.request(posts, {
            body: { channelIds: "none" },
            headers: { ...withKey, "x-request-id": "activity-test-0004" },
          });

          assert.strictEqual(invalid.status, 400);

          // Reads leave nothing.
          const read = yield* app.request(`${posts}/drafts`, {
            headers: { ...withKey, "x-request-id": "activity-test-0005" },
          });

          assert.strictEqual(read.status, 200);

          const { items, nextCursor } = yield* logOf(owner, workspaceId);

          assert.isNull(nextCursor);
          assert.deepStrictEqual(
            items.map(({ id: _id, occurredAt: _at, requestId, ...event }) => ({
              ...event,
              // The server numbers the requests that came without an id.
              requestId:
                requestId !== null && requestId.startsWith("activity-test-")
                  ? requestId
                  : "issued",
            })),
            [
              {
                actor: { _tag: "apiKey", apiKeyId: writer.apiKey.id },
                application: { id: writer.apiKey.id, name: "ci" },
                errorCode: "invalid_request",
                impersonated: false,
                objectIds: {},
                operation: "posts.create",
                requestId: "activity-test-0004",
                status: 400,
                via: "apiKey",
              },
              {
                actor: { _tag: "apiKey", apiKeyId: writer.apiKey.id },
                application: { id: writer.apiKey.id, name: "ci" },
                errorCode: "post_not_found",
                impersonated: false,
                objectIds: { postId: unknownPost },
                operation: "posts.discard",
                requestId: "activity-test-0003",
                status: 404,
                via: "apiKey",
              },
              {
                actor: { _tag: "apiKey", apiKeyId: reader.apiKey.id },
                application: { id: reader.apiKey.id, name: "ci" },
                errorCode: "forbidden",
                impersonated: false,
                objectIds: {},
                operation: "posts.create",
                requestId: "activity-test-0002",
                status: 403,
                via: "apiKey",
              },
              {
                actor: { _tag: "apiKey", apiKeyId: writer.apiKey.id },
                application: { id: writer.apiKey.id, name: "ci" },
                errorCode: null,
                impersonated: false,
                objectIds: {},
                operation: "posts.create",
                requestId: "activity-test-0001",
                status: 201,
                via: "apiKey",
              },
              {
                actor: { _tag: "user", userId: owner.id },
                application: null,
                errorCode: null,
                impersonated: false,
                objectIds: {},
                operation: "apiKeys.create",
                requestId: "issued",
                status: 201,
                via: "session",
              },
              {
                actor: { _tag: "user", userId: owner.id },
                application: null,
                errorCode: null,
                impersonated: false,
                objectIds: {},
                operation: "apiKeys.create",
                requestId: "issued",
                status: 201,
                via: "session",
              },
            ]
          );

          // The filters: one operation, one key.
          const refusals = yield* logOf(
            owner,
            workspaceId,
            `?operation=posts.create&actor=${reader.apiKey.id}`
          );

          assert.deepStrictEqual(
            refusals.items.map(({ requestId }) => requestId),
            ["activity-test-0002"]
          );
        })
    );

    it.effect(
      "is read by owners, in person or with a key they gave the permission, and by no admin",
      () =>
        Effect.gen(function* readers() {
          const app = yield* TestApp;
          const owner = yield* signedUp("activity-owner");
          const admin = yield* signedUp("activity-admin");
          const workspaceId = yield* workspaceOf(owner, "Readers");
          const path = `/api/workspaces/${workspaceId}/activity`;

          yield* join(owner, workspaceId, admin, "admin");

          const asAdmin = yield* app.request(path, {
            headers: { cookie: admin.cookies },
          });

          assert.strictEqual(asAdmin.status, 403);

          const refusal = yield* bodyOf(RefusalSchema, asAdmin);

          assert.deepStrictEqual(
            [refusal.reason, refusal.permission],
            ["missingPermission", "activity:read"]
          );

          // A key reads the log only when its creator, an owner, said so.
          const auditor = yield* apiKeyOf(owner, workspaceId, [
            "activity:read",
          ]);

          const withKey = yield* app.request(path, {
            headers: { authorization: `Bearer ${auditor.key}` },
          });

          assert.strictEqual(withKey.status, 200);

          // An admin cannot give a key what they do not hold.
          const overreach = yield* app.request(
            `/api/workspaces/${workspaceId}/api-keys`,
            {
              body: { name: "ci", permissions: ["activity:read"] },
              headers: { cookie: admin.cookies },
            }
          );

          assert.isAtLeast(overreach.status, 400);

          // Reading the log is not itself kept; the keys' creations are,
          // and the admin's invitation, sent and accepted through the
          // sign-in service's routes.
          const log = yield* logOf(owner, workspaceId);

          assert.deepStrictEqual(
            log.items.map(({ operation, status }) => [operation, status]),
            [
              ["apiKeys.create", overreach.status],
              ["apiKeys.create", 201],
              ["auth:/organization/accept-invitation", 200],
              ["auth:/organization/invite-member", 200],
            ]
          );
        })
    );
  }
);
