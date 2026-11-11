import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { authorize, registeredClient } from "#test/app/mcp-support.ts";
import { commandLineToken, enrolled, joined } from "#test/workspace/support.ts";

import {
  apiKeyOf,
  bodyOf,
  confirmedAccount,
  cookiesOf,
  makeAdmin,
  MigratedSqlLive,
  origin,
  signIn,
  signedUp,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "./harness.ts";
import type { Person, Reply } from "./harness.ts";
import { bearer, customerOf, keyOf, partnerOf } from "./partner-support.ts";

// A workspace's owners require two-step verification of every member:
// who may set it, and how every way a person reaches a workspace (a
// session, the command line, an MCP client) is refused while their
// account does not have it on, while the workspace's keys are not.

const RequirementLive = MigratedSqlLive.pipe(
  Layer.provideMerge(TestApp.layerWith({ MCP_DYNAMIC_REGISTRATION: "true" }))
);

const SecuritySchema = Schema.Struct({
  membersWithoutTwoStep: Schema.optionalKey(Schema.Int),
  twoStepRequired: Schema.Boolean,
});

const RefusalSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  reason: Schema.optionalKey(Schema.String),
});

const refusalOf = (reply: Reply) =>
  Schema.decodeUnknownEffect(RefusalSchema)(reply.body).pipe(Effect.orDie);

const security = (workspaceId: string) =>
  `/api/workspaces/${workspaceId}/security`;

const requiring = (
  workspaceId: string,
  headers: Readonly<Record<string, string>>,
  twoStepRequired = true
) =>
  TestApp.use((app) =>
    app.request(security(workspaceId), {
      body: { twoStepRequired },
      headers,
      method: "PUT",
    })
  );

const asPerson = (person: Person) => ({ cookie: person.cookies });

const draft = {
  channelIds: [],
  content: { media: [], overrides: [], text: "A synthetic draft" },
};

// What the MCP endpoint answers a token before any tool is called, sent as
// MCP clients send it: without an Origin header, which it refuses.
const mcpCall = (token: string) =>
  TestApp.use((app) =>
    Effect.promise(async () => {
      const response = await app.handler(
        new Request(`${origin}/api/mcp`, {
          body: JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "initialize",
            params: {
              capabilities: {},
              clientInfo: { name: "peal-test", version: "1.0.0" },
              protocolVersion: "2025-06-18",
            },
          }),
          headers: {
            accept: "application/json, text/event-stream",
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          method: "POST",
        })
      );

      return { status: response.status, text: await response.text() };
    })
  );

layer(RequirementLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "a workspace that requires two-step verification",
  (it) => {
    it.effect(
      "is required by an owner in person with it on, and by nobody else",
      () =>
        Effect.gen(function* whoRequires() {
          const app = yield* TestApp;
          const owner = yield* signedUp("require-owner");
          const workspaceId = yield* workspaceOf(owner, "Guarded");

          const admin = yield* joined(
            owner,
            workspaceId,
            "require-admin",
            "admin"
          );

          // Nobody required it yet.
          const unset = yield* bodyOf(
            SecuritySchema,
            yield* app.request(security(workspaceId), {
              headers: asPerson(admin),
            })
          );

          assert.deepStrictEqual(unset, {
            membersWithoutTwoStep: 2,
            twoStepRequired: false,
          });

          const byAdmin = yield* requiring(workspaceId, asPerson(admin));

          assert.strictEqual(byAdmin.status, 403);
          assert.deepInclude(yield* refusalOf(byAdmin), {
            reason: "missingPermission",
          });

          const { key } = yield* apiKeyOf(owner, workspaceId, ["post:read"]);
          const byKey = yield* requiring(workspaceId, bearer(key));

          assert.strictEqual(byKey.status, 403);
          assert.deepInclude(yield* refusalOf(byKey), {
            reason: "personRequired",
          });

          const token = yield* commandLineToken(owner.cookies);
          const byApplication = yield* requiring(workspaceId, bearer(token));

          assert.strictEqual(byApplication.status, 403);
          assert.deepInclude(yield* refusalOf(byApplication), {
            reason: "personRequired",
          });

          const withoutItself = yield* requiring(workspaceId, asPerson(owner));

          assert.strictEqual(withoutItself.status, 403);
          assert.deepInclude(yield* refusalOf(withoutItself), {
            reason: "twoStepRequired",
          });

          const { cookies } = yield* enrolled(owner);

          // Staff acting as the owner, whose account has it on.
          const staff = yield* confirmedAccount("require-staff");

          yield* makeAdmin(staff.id);

          const started = yield* app.request(
            `/api/admin/users/${owner.id}/impersonate`,
            {
              body: { reason: "Synthetic support ticket 11" },
              headers: { cookie: yield* signIn(staff.email) },
            }
          );

          assert.strictEqual(started.status, 204);

          const byStaff = yield* requiring(workspaceId, {
            cookie: cookiesOf(started),
          });

          assert.strictEqual(byStaff.status, 403);
          assert.deepInclude(yield* refusalOf(byStaff), {
            reason: "personRequired",
          });

          const set = yield* requiring(workspaceId, { cookie: cookies });

          assert.strictEqual(set.status, 200, JSON.stringify(set.body));
          assert.deepStrictEqual(yield* bodyOf(SecuritySchema, set), {
            membersWithoutTwoStep: 1,
            twoStepRequired: true,
          });

          // The activity log keeps who required it.
          const log = yield* app.request(
            `/api/workspaces/${workspaceId}/activity`,
            { headers: { cookie: cookies } }
          );

          assert.include(JSON.stringify(log.body), "workspaces.secure");

          // A key reads the policy, as any member does.
          const read = yield* bodyOf(
            SecuritySchema,
            yield* app.request(security(workspaceId), {
              headers: bearer(key),
            })
          );

          assert.deepStrictEqual(read, { twoStepRequired: true });
        })
    );

    it.effect(
      "refuses a member without it everywhere they reach it, until they turn it on",
      () =>
        Effect.gen(function* refusedEverywhere() {
          const app = yield* TestApp;
          const owner = yield* signedUp("guard-owner");
          const workspaceId = yield* workspaceOf(owner, "Locked");

          const member = yield* joined(
            owner,
            workspaceId,
            "guard-editor",
            "editor"
          );

          const ownWorkspace = yield* workspaceOf(member, "Elsewhere");

          // Their sign-ins, made before the requirement.
          const token = yield* commandLineToken(member.cookies);
          const clientId = yield* registeredClient;

          const mcpToken = yield* authorize(
            member,
            clientId,
            workspaceId,
            "openid offline_access workspace:write"
          );

          const { key } = yield* apiKeyOf(owner, workspaceId, [
            "channel:read",
            "post:read",
            "post:create",
          ]);

          // Whether each member has it on, to who manages members only.
          const listedToEditor = yield* app.request(
            `/api/workspaces/${workspaceId}/members`,
            { headers: asPerson(member) }
          );

          assert.notInclude(
            JSON.stringify(listedToEditor.body),
            "twoStepEnabled"
          );

          const ownerSession = (yield* enrolled(owner)).cookies;

          const listedToOwner = yield* app.request(
            `/api/workspaces/${workspaceId}/members`,
            { headers: { cookie: ownerSession } }
          );

          assert.include(
            JSON.stringify(listedToOwner.body),
            '"twoStepEnabled":false'
          );
          assert.include(
            JSON.stringify(listedToOwner.body),
            '"twoStepEnabled":true'
          );

          assert.strictEqual(
            (yield* requiring(workspaceId, { cookie: ownerSession })).status,
            200
          );

          const posts = `/api/workspaces/${workspaceId}/posts`;

          const channels = `/api/workspaces/${workspaceId}/channels`;

          const read = yield* app.request(channels, {
            headers: asPerson(member),
          });

          const written = yield* app.request(posts, {
            body: draft,
            headers: asPerson(member),
          });

          const byCommandLine = yield* app.request(channels, {
            headers: bearer(token),
          });

          for (const refused of [read, written, byCommandLine]) {
            assert.strictEqual(refused.status, 403);
            assert.deepStrictEqual(yield* refusalOf(refused), {
              code: "forbidden",
              message:
                "This workspace requires two-step verification. Turn it on in your Peal account settings, then try again.",
              reason: "twoStepRequired",
            });
          }

          const byMcp = yield* mcpCall(mcpToken);

          assert.strictEqual(byMcp.status, 403);
          assert.include(
            byMcp.text,
            "This workspace requires two-step verification. Turn it on in your Peal account settings, then try again."
          );

          // Elsewhere they are not refused, nor is the workspace's key.
          assert.strictEqual(
            (yield* app.request(`/api/workspaces/${ownWorkspace}/channels`, {
              headers: asPerson(member),
            })).status,
            200
          );
          assert.strictEqual(
            (yield* app.request(channels, { headers: bearer(key) })).status,
            200
          );

          const created = yield* app.request(posts, {
            body: draft,
            headers: bearer(key),
          });

          assert.strictEqual(created.status, 201);

          // Once it is on, every sign-in they had works again, renewed or
          // not.
          const { cookies } = yield* enrolled(member);

          assert.strictEqual(
            (yield* app.request(channels, { headers: { cookie: cookies } }))
              .status,
            200
          );
          assert.strictEqual(
            (yield* app.request(channels, { headers: bearer(token) })).status,
            200
          );
          const again = yield* mcpCall(mcpToken);

          assert.strictEqual(again.status, 200, again.text);
        })
    );
  }
);

layer(
  MigratedSqlLive.pipe(
    Layer.provideMerge(
      TestApp.layerWith({
        ...unconfirmedEmails,
        PEAL_PARTNER_SELF_SERVICE: "true",
      })
    )
  ),
  { excludeTestServices: true, timeout: "180 seconds" }
)("a partner's customer workspace that requires it", (it) => {
  it.effect("answers the partner's key as before", () =>
    Effect.gen(function* partnerKey() {
      const app = yield* TestApp;
      const sql = yield* SqlClient.SqlClient;
      const { home, owner } = yield* partnerOf("require-partner");
      const { key } = yield* keyOf(owner, home);
      const customer = yield* customerOf(key, "Synthetic customer");

      // A customer's workspace has no member: whatever it requires, its
      // partner's key acts in it.
      yield* sql`INSERT INTO workspace.security_policies (workspace_id, two_step_required, updated_at)
        VALUES (${customer.id}, true, now())`.pipe(Effect.orDie);

      const channels = yield* app.request(
        `/api/workspaces/${customer.id}/channels`,
        { headers: bearer(key) }
      );

      assert.strictEqual(channels.status, 200);
    })
  );
});
