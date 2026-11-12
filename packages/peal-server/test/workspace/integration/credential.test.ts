// The credential check on the whole app: every kind of credential asks who
// it is and what it may do, and never reads back a key, a token or a
// secret, nor a customer's workspace.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { CredentialSchema } from "peal-contract";

import { authorize, registeredClient } from "#test/app/mcp-support.ts";
import { commandLineToken } from "#test/workspace/support.ts";

import {
  apiKeyOf,
  bodyOf,
  MigratedSqlLive,
  origin,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "./harness.ts";
import type { Reply } from "./harness.ts";
import { bearer, customerOf, keyOf, partnerOf } from "./partner-support.ts";

const CredentialLive = Layer.mergeAll(
  TestApp.layerWith({
    ...unconfirmedEmails,
    // An application that registers itself, to be bound to a workspace.
    MCP_DYNAMIC_REGISTRATION: "true",
    PEAL_PARTNER_SELF_SERVICE: "true",
  }),
  MigratedSqlLive
);

const CredentialJsonSchema = Schema.toCodecJson(CredentialSchema);

// A reply's body, as text: it must never hold `secret`.
const neverHolds = (reply: Reply, secret: string) => {
  assert.notInclude(JSON.stringify(reply.body), secret);
};

layer(CredentialLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "the credential check",
  (it) => {
    it.effect(
      "names a person in their session, and in the command line's token with its scopes",
      () =>
        Effect.gen(function* person() {
          const app = yield* TestApp;
          const owner = yield* signedUpUnconfirmed("credential-person");

          yield* workspaceOf(owner, "Credential studio");

          const inSession = yield* bodyOf(
            CredentialJsonSchema,
            yield* app.request("/api/credential", {
              headers: { cookie: owner.cookies },
            })
          );

          assert.deepStrictEqual(inSession, {
            _tag: "user",
            application: null,
            impersonatedBy: null,
            userId: owner.id,
          });

          const token = yield* commandLineToken(owner.cookies);

          const reply = yield* app.request("/api/credential", {
            headers: bearer(token),
          });

          const throughCli = yield* bodyOf(CredentialJsonSchema, reply);

          assert.strictEqual(throughCli._tag, "user");

          if (throughCli._tag === "user") {
            assert.strictEqual(throughCli.userId, owner.id);
            assert.strictEqual(throughCli.application?.clientId, "peal-cli");
            assert.includeMembers(
              [...(throughCli.application?.scopes ?? [])],
              ["workspace:read", "workspace:write", "workspace:publish"]
            );
            assert.deepStrictEqual(throughCli.application?.binding, {
              _tag: "unbound",
            });
          }

          neverHolds(reply, token);
          // A bearer credential is counted, as on every endpoint.
          assert.isNotNull(reply.headers.get("ratelimit"));

          // Suspended, the account is refused, as on every endpoint.
          const sql = yield* SqlClient.SqlClient;

          yield* sql`UPDATE auth."user" SET banned = true WHERE id = ${owner.id}`;

          const suspended = yield* app.request("/api/credential", {
            headers: bearer(token),
          });

          assert.strictEqual(suspended.status, 403);
        })
    );

    it.effect(
      "says what a token bound to a workspace may do there, and that a workspace requiring two-step verification refuses it",
      () =>
        Effect.gen(function* bound() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const owner = yield* signedUpUnconfirmed("credential-bound");
          const workspaceId = yield* workspaceOf(owner, "Bound studio");
          const clientId = yield* registeredClient;

          // An application the operator linked to the HTTP API, beside the
          // MCP endpoint it registered for.
          yield* sql`INSERT INTO auth.oauth_client_resource (client_id, resource_id, created_at) VALUES (${clientId}, ${`${origin}/api`}, now())`;

          const token = yield* authorize(
            owner,
            clientId,
            workspaceId,
            "workspace:read",
            `${origin}/api`
          );

          const first = yield* app.request("/api/credential", {
            headers: bearer(token),
          });

          const read = yield* bodyOf(CredentialJsonSchema, first);

          const binding =
            read._tag === "user" ? read.application?.binding : undefined;

          assert.strictEqual(binding?._tag, "bound");

          if (binding?._tag === "bound") {
            assert.strictEqual(binding.id, workspaceId);
            assert.strictEqual(binding.name, "Bound studio");
            assert.isNull(binding.refused);
            // Reading only: the owner's role, less what the scope leaves out.
            assert.include([...binding.permissions], "post:read");
            assert.notInclude([...binding.permissions], "post:create");
            assert.notInclude([...binding.permissions], "post:schedule");
          }

          yield* sql`INSERT INTO workspace.security_policies (workspace_id, two_step_required, updated_at) VALUES (${workspaceId}, true, now())`;

          const refused = yield* bodyOf(
            CredentialJsonSchema,
            yield* app.request("/api/credential", { headers: bearer(token) })
          );

          assert.deepStrictEqual(
            refused._tag === "user" ? refused.application?.binding : undefined,
            {
              _tag: "bound",
              id: workspaceId,
              name: "Bound studio",
              permissions: [],
              refused: "twoStepRequired",
            }
          );
        })
    );

    it.effect(
      "names a workspace's API key, its workspace and its permissions, never the key, and refuses it revoked or expired",
      () =>
        Effect.gen(function* apiKey() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const owner = yield* signedUpUnconfirmed("credential-key");
          const workspaceId = yield* workspaceOf(owner, "Keyed studio");

          const created = yield* apiKeyOf(owner, workspaceId, [
            "post:read",
            "channel:read",
          ]);

          const reply = yield* app.request("/api/credential", {
            headers: bearer(created.key),
          });

          assert.strictEqual(reply.status, 200);

          const answered = yield* bodyOf(CredentialJsonSchema, reply);

          assert.strictEqual(answered._tag, "apiKey");

          if (answered._tag === "apiKey") {
            assert.strictEqual(answered.id, created.apiKey.id);
            assert.strictEqual(answered.name, "ci");
            assert.deepStrictEqual(answered.workspace, {
              id: workspaceId,
              name: "Keyed studio",
            });
            assert.deepStrictEqual(answered.permissions, [
              "channel:read",
              "post:read",
            ]);
            assert.isNull(answered.expiresAt);
            assert.isTrue(created.key.startsWith(answered.start ?? "-"));
          }

          neverHolds(reply, created.key);

          const other = yield* apiKeyOf(owner, workspaceId, ["post:read"]);

          yield* sql`UPDATE auth.apikey SET expires_at = now() - interval '1 minute' WHERE id = ${other.apiKey.id}`;

          const expired = yield* app.request("/api/credential", {
            headers: bearer(other.key),
          });

          assert.strictEqual(expired.status, 401);

          const revoked = yield* app.request(
            `/api/workspaces/${workspaceId}/api-keys/${created.apiKey.id}`,
            { headers: { cookie: owner.cookies }, method: "DELETE" }
          );

          assert.strictEqual(revoked.status, 204);
          assert.strictEqual(
            (yield* app.request("/api/credential", {
              headers: bearer(created.key),
            })).status,
            401
          );
        })
    );

    it.effect(
      "names a partner key, its partner, scopes and permissions, never a customer's workspace, and refuses it revoked",
      () =>
        Effect.gen(function* partnerKey() {
          const app = yield* TestApp;
          const { home, owner, partner } = yield* partnerOf("credential");

          const created = yield* keyOf(owner, home, {
            permissions: ["post:read"],
            scopes: ["workspaces:read", "workspaces:write"],
          });

          const customer = yield* customerOf(
            created.key,
            "Synthetic customer",
            "synthetic-credential"
          );

          const reply = yield* app.request("/api/credential", {
            headers: bearer(created.key),
          });

          assert.strictEqual(reply.status, 200);

          const answered = yield* bodyOf(CredentialJsonSchema, reply);

          assert.deepStrictEqual(answered, {
            _tag: "partnerKey",
            expiresAt: null,
            id: created.partnerKey.id,
            name: "backend",
            partner: { id: partner.id, name: partner.name },
            permissions: ["post:read"],
            scopes: ["workspaces:read", "workspaces:write"],
            start: created.partnerKey.start,
          });

          neverHolds(reply, created.key);
          neverHolds(reply, customer.id);
          neverHolds(reply, home);

          const revoked = yield* app.request(
            `/api/workspaces/${home}/partner/keys/${created.partnerKey.id}`,
            { headers: { cookie: owner.cookies }, method: "DELETE" }
          );

          assert.strictEqual(revoked.status, 204);
          assert.strictEqual(
            (yield* app.request("/api/credential", {
              headers: bearer(created.key),
            })).status,
            401
          );
        })
    );

    it.effect("answers 401 without a credential", () =>
      Effect.gen(function* anonymous() {
        const app = yield* TestApp;

        assert.strictEqual((yield* app.request("/api/credential")).status, 401);
      })
    );
  }
);
