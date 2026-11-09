import { assert, layer } from "@effect/vitest";
import { MeSchema, PermissionSchema } from "acme-contract";
import { DateTime, Duration, Effect, Schema } from "effect";

import {
  apiKeyOf,
  bodyOf,
  confirmedAccount,
  emailTo,
  IntegrationLive,
  linkIn,
  signIn,
  signedUp,
  TestApp,
  workspaceOf,
} from "./harness.ts";

const InvitationSchema = Schema.Struct({ id: Schema.String });

const ApiKeySchema = Schema.Struct({
  createdAt: Schema.String,
  expiresAt: Schema.NullOr(Schema.String),
  id: Schema.String,
  name: Schema.String,
  permissions: Schema.Array(Schema.String),
  start: Schema.NullOr(Schema.String),
});

const CreatedSchema = Schema.Struct({
  apiKey: ApiKeySchema,
  key: Schema.String,
});

const ListSchema = Schema.Array(ApiKeySchema);

const decodeMe = Schema.decodeUnknownEffect(MeSchema);

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "workspaces",
  (it) => {
    it.effect(
      "list the signed-in user's workspaces on /api/me, with their role and permissions",
      () =>
        Effect.gen(function* me() {
          const app = yield* TestApp;
          const owner = yield* signedUp("marie", "fr");

          const studio = yield* workspaceOf(owner, "Studio");
          const atelier = yield* workspaceOf(owner, "Atelier");

          const reply = yield* app.request("/api/me", {
            headers: { cookie: owner.cookies },
          });

          assert.strictEqual(reply.status, 200);

          const { impersonatedBy, user, workspaces } = yield* decodeMe(
            reply.body
          );

          assert.isNull(impersonatedBy);
          assert.strictEqual(user.id, owner.id);
          assert.strictEqual(user.email, owner.email);
          assert.strictEqual(user.locale, "fr");
          assert.isTrue(user.emailVerified);
          assert.deepStrictEqual(
            workspaces.map(({ id, name, role }) => ({ id, name, role })),
            [
              { id: atelier, name: "Atelier", role: "owner" },
              { id: studio, name: "Studio", role: "owner" },
            ]
          );
          assert.deepStrictEqual(
            workspaces[0]?.permissions,
            PermissionSchema.literals
          );
        })
    );

    it.effect(
      "invite people by email, in the inviter's language, with a role",
      () =>
        Effect.gen(function* invites() {
          const app = yield* TestApp;
          const owner = yield* signedUp("camille", "fr");
          const workspaceId = yield* workspaceOf(owner, "Agence");
          const guest = yield* confirmedAccount("guest");

          const invited = yield* app.request(
            "/api/auth/organization/invite-member",
            {
              body: {
                email: guest.email,
                organizationId: workspaceId,
                role: "viewer",
              },
              headers: { cookie: owner.cookies },
            }
          );

          assert.strictEqual(invited.status, 200);

          const { id } = yield* bodyOf(InvitationSchema, invited);
          const message = yield* emailTo(guest.email, /vous invite/u);

          assert.strictEqual(
            message.Subject,
            "camille vous invite à rejoindre Agence sur Acme"
          );
          assert.include(message.Text, "sur Acme en tant que lecteur.");
          assert.strictEqual(linkIn(message).pathname, `/fr/invitations/${id}`);

          const cookies = yield* signIn(guest.email);

          const accepted = yield* app.request(
            "/api/auth/organization/accept-invitation",
            { body: { invitationId: id }, headers: { cookie: cookies } }
          );

          assert.strictEqual(accepted.status, 200);

          const me = yield* decodeMe(
            (yield* app.request("/api/me", { headers: { cookie: cookies } }))
              .body
          );

          assert.deepStrictEqual(
            me.workspaces.map(({ permissions, role }) => ({
              permissions,
              role,
            })),
            [
              {
                permissions: [
                  "analytics:read",
                  "channel:read",
                  "media:read",
                  "post:read",
                ],
                role: "viewer",
              },
            ]
          );

          // A viewer may not handle the workspace's API keys.
          const listed = yield* app.request(
            `/api/workspaces/${workspaceId}/api-keys`,
            { headers: { cookie: cookies } }
          );

          assert.strictEqual(listed.status, 403);

          const created = yield* app.request(
            `/api/workspaces/${workspaceId}/api-keys`,
            {
              body: { name: "mine", permissions: ["post:read"] },
              headers: { cookie: cookies },
            }
          );

          assert.strictEqual(created.status, 403);
        })
    );

    it.effect("create, list and revoke API keys", () =>
      Effect.gen(function* apiKeys() {
        const app = yield* TestApp;
        const owner = yield* signedUp("lin");
        const workspaceId = yield* workspaceOf(owner, "Lab");
        const path = `/api/workspaces/${workspaceId}/api-keys`;
        const asOwner = { cookie: owner.cookies };

        const created = yield* app.request(path, {
          body: {
            expiresInDays: 30,
            name: "deploy",
            permissions: ["apiKey:read", "post:read"],
          },
          headers: asOwner,
        });

        assert.strictEqual(created.status, 201);

        const { apiKey, key } = yield* bodyOf(CreatedSchema, created);

        assert.match(key, /^acme_/u);
        assert.strictEqual(apiKey.name, "deploy");
        assert.deepStrictEqual(apiKey.permissions, [
          "apiKey:read",
          "post:read",
        ]);
        assert.isTrue(key.startsWith(apiKey.start ?? "missing"));

        const expiresIn = DateTime.distance(
          DateTime.makeUnsafe(apiKey.createdAt),
          DateTime.makeUnsafe(apiKey.expiresAt ?? apiKey.createdAt)
        );

        assert.closeTo(
          Duration.toMillis(expiresIn),
          Duration.toMillis(Duration.days(30)),
          Duration.toMillis(Duration.minutes(1))
        );

        // The key works as a bearer token, and is never listed.
        const listed = yield* app.request(path, {
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(listed.status, 200);

        const keys = yield* bodyOf(ListSchema, listed);

        assert.deepStrictEqual(
          keys.map(({ id }) => id),
          [apiKey.id]
        );
        assert.notInclude(JSON.stringify(listed.body), key);

        // An API key cannot mint another.
        const minted = yield* app.request(path, {
          body: { name: "copy", permissions: ["post:read"] },
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(minted.status, 403);

        // Better Auth's own route would create a key without permissions.
        const direct = yield* app.request("/api/auth/api-key/create", {
          body: { name: "direct", organizationId: workspaceId },
          headers: asOwner,
        });

        assert.strictEqual(direct.status, 404);

        const revoked = yield* app.request(`${path}/${apiKey.id}`, {
          headers: asOwner,
          method: "DELETE",
        });

        assert.strictEqual(revoked.status, 204);

        const after = yield* app.request(path, {
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(after.status, 401);

        const again = yield* app.request(`${path}/${apiKey.id}`, {
          headers: asOwner,
          method: "DELETE",
        });

        assert.strictEqual(again.status, 404);

        const unknown = yield* app.request(`${path}/not-an-id`, {
          headers: asOwner,
          method: "DELETE",
        });

        assert.strictEqual(unknown.status, 404);
      })
    );

    it.effect("keep an API key to its own workspace's keys", () =>
      Effect.gen(function* ownKeys() {
        const app = yield* TestApp;
        const owner = yield* signedUp("noor");
        const first = yield* workspaceOf(owner, "First");
        const second = yield* workspaceOf(owner, "Second");

        const { apiKey } = yield* apiKeyOf(owner, second, ["post:read"]);

        // The owner revokes it through the wrong workspace: nothing happens.
        const revoked = yield* app.request(
          `/api/workspaces/${first}/api-keys/${apiKey.id}`,
          { headers: { cookie: owner.cookies }, method: "DELETE" }
        );

        assert.strictEqual(revoked.status, 404);

        const listed = yield* app.request(
          `/api/workspaces/${second}/api-keys`,
          { headers: { cookie: owner.cookies } }
        );

        assert.lengthOf(yield* bodyOf(ListSchema, listed), 1);
      })
    );
  }
);
