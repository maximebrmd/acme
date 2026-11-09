import { assert, layer } from "@effect/vitest";
import { Config, Effect, Layer, Schema } from "effect";
import { InvitationSchema, WorkspaceMemberSchema } from "peal-contract";

import {
  apiKeyOf,
  bodyOf,
  emailTo,
  IntegrationLive,
  linkIn,
  newEmail,
  signedUp,
  TestApp,
  workspaceOf,
} from "./harness.ts";
import type { Person } from "./harness.ts";

// A workspace's members and invitations through Peal's API, which the
// command line and MCP clients use: who sees them, who invites, and how an
// invitation goes out, is replaced and is revoked.

// Replies are JSON, which writes instants as strings.
const MembersSchema = Schema.toCodecJson(Schema.Array(WorkspaceMemberSchema));

const SentSchema = Schema.toCodecJson(InvitationSchema);

const InvitationsSchema = Schema.toCodecJson(Schema.Array(InvitationSchema));

const ErrorSchema = Schema.Struct({ _tag: Schema.String });

const asPerson = (person: Person) => ({ cookie: person.cookies });

const invite = (
  person: Person,
  workspaceId: string,
  body: { readonly email: string; readonly role: string }
) =>
  TestApp.use((app) =>
    app.request(`/api/workspaces/${workspaceId}/invitations`, {
      body,
      headers: asPerson(person),
    })
  );

const invitations = (person: Person, workspaceId: string) =>
  TestApp.use((app) =>
    app.request(`/api/workspaces/${workspaceId}/invitations`, {
      headers: asPerson(person),
    })
  );

/** Someone the owner invites, who signs up and joins with `role`. */
const joined = Effect.fn("joined")(function* joined(
  owner: Person,
  workspaceId: string,
  label: string,
  role: string
) {
  const app = yield* TestApp;
  const person = yield* signedUp(label);

  const sent = yield* bodyOf(
    SentSchema,
    yield* invite(owner, workspaceId, { email: person.email, role })
  );

  const accepted = yield* app.request(
    "/api/auth/organization/accept-invitation",
    { body: { invitationId: sent.id }, headers: asPerson(person) }
  );

  assert.strictEqual(accepted.status, 200);

  return person;
});

layer(IntegrationLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "a workspace's members and invitations",
  (it) => {
    it.effect(
      "list the members to every member, in the order they joined, and to no API key",
      () =>
        Effect.gen(function* members() {
          const app = yield* TestApp;
          const owner = yield* signedUp("roster-owner");
          const workspaceId = yield* workspaceOf(owner, "Roster");
          const viewer = yield* joined(owner, workspaceId, "watcher", "viewer");

          for (const person of [owner, viewer]) {
            const reply = yield* app.request(
              `/api/workspaces/${workspaceId}/members`,
              { headers: asPerson(person) }
            );

            assert.strictEqual(reply.status, 200);

            const listed = yield* bodyOf(MembersSchema, reply);

            assert.deepStrictEqual(
              listed.map(({ email, role, userId }) => ({
                email,
                role,
                userId,
              })),
              [
                { email: owner.email, role: "owner", userId: owner.id },
                { email: viewer.email, role: "viewer", userId: viewer.id },
              ]
            );
          }

          const { key } = yield* apiKeyOf(owner, workspaceId, [
            "post:read",
            "invitation:create",
          ]);

          const byKey = yield* app.request(
            `/api/workspaces/${workspaceId}/members`,
            { headers: { authorization: `Bearer ${key}` } }
          );

          assert.strictEqual(byKey.status, 403);
        })
    );

    it.effect(
      "invite by email in the reader's language, list the invitation, and revoke it",
      () =>
        Effect.gen(function* invites() {
          const app = yield* TestApp;
          const owner = yield* signedUp("host", "fr");
          const workspaceId = yield* workspaceOf(owner, "Atelier");
          const email = newEmail("Guest");

          const reply = yield* invite(owner, workspaceId, {
            email,
            role: "editor",
          });

          assert.strictEqual(reply.status, 201);

          const sent = yield* bodyOf(SentSchema, reply);

          // Kept in lower case, as Better Auth keeps addresses.
          assert.strictEqual(sent.email, email.toLowerCase());
          assert.strictEqual(sent.role, "editor");
          assert.strictEqual(sent.inviterId, owner.id);

          // Someone without an account reads the inviter's language.
          const message = yield* emailTo(sent.email, /vous invite/u);

          assert.strictEqual(
            message.Subject,
            "host vous invite à rejoindre Atelier sur Peal"
          );
          assert.strictEqual(
            linkIn(message).pathname,
            `/fr/invitations/${sent.id}`
          );

          const listed = yield* bodyOf(
            InvitationsSchema,
            yield* invitations(owner, workspaceId)
          );

          assert.deepStrictEqual(
            listed.map(({ id }) => id),
            [sent.id]
          );

          const revoke = (invitationId: string) =>
            app.request(
              `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
              { headers: asPerson(owner), method: "DELETE" }
            );

          assert.strictEqual((yield* revoke(sent.id)).status, 204);
          assert.strictEqual((yield* revoke(sent.id)).status, 404);
          assert.strictEqual((yield* revoke("not-an-id")).status, 404);
          assert.deepStrictEqual(
            yield* bodyOf(
              InvitationsSchema,
              yield* invitations(owner, workspaceId)
            ),
            []
          );

          // A revoked invitation can no longer be accepted.
          const guest = yield* signedUp("late-guest");

          const accepted = yield* app.request(
            "/api/auth/organization/accept-invitation",
            { body: { invitationId: sent.id }, headers: asPerson(guest) }
          );

          assert.notStrictEqual(accepted.status, 200);
        })
    );

    it.effect(
      "replace a pending invitation to the same address, whose link stops working",
      () =>
        Effect.gen(function* replaces() {
          const owner = yield* signedUp("resender");
          const workspaceId = yield* workspaceOf(owner, "Resend");
          const email = newEmail("twice");

          const first = yield* bodyOf(
            SentSchema,
            yield* invite(owner, workspaceId, { email, role: "viewer" })
          );

          const second = yield* bodyOf(
            SentSchema,
            yield* invite(owner, workspaceId, { email, role: "editor" })
          );

          const listed = yield* bodyOf(
            InvitationsSchema,
            yield* invitations(owner, workspaceId)
          );

          assert.notStrictEqual(first.id, second.id);
          assert.deepStrictEqual(
            listed.map(({ id, role }) => ({ id, role })),
            [{ id: second.id, role: "editor" }]
          );
        })
    );

    it.effect(
      "refuse an invitation to a member, the owner role to an admin, and anything to those who may not invite",
      () =>
        Effect.gen(function* refuses() {
          const owner = yield* signedUp("gatekeeper");
          const workspaceId = yield* workspaceOf(owner, "Gate");
          const admin = yield* joined(owner, workspaceId, "deputy", "admin");
          const editor = yield* joined(owner, workspaceId, "writer", "editor");

          const toMember = yield* invite(owner, workspaceId, {
            email: editor.email,
            role: "viewer",
          });

          assert.strictEqual(toMember.status, 409);
          assert.strictEqual(
            (yield* bodyOf(ErrorSchema, toMember))._tag,
            "AlreadyMember"
          );

          const ownerByAdmin = yield* invite(admin, workspaceId, {
            email: newEmail("crown"),
            role: "owner",
          });

          assert.strictEqual(ownerByAdmin.status, 403);

          const byEditor = yield* invite(editor, workspaceId, {
            email: newEmail("friend"),
            role: "viewer",
          });

          assert.strictEqual(byEditor.status, 403);
          assert.strictEqual(
            (yield* invitations(editor, workspaceId)).status,
            403
          );

          const malformed = yield* invite(owner, workspaceId, {
            email: "not an address",
            role: "viewer",
          });

          assert.strictEqual(malformed.status, 400);

          const unknownRole = yield* invite(owner, workspaceId, {
            email: newEmail("nobody"),
            role: "member",
          });

          assert.strictEqual(unknownRole.status, 400);
        })
    );

    it.effect("list invitations to the owner role to owners only", () =>
      Effect.gen(function* hides() {
        const owner = yield* signedUp("founder");
        const workspaceId = yield* workspaceOf(owner, "Founders");
        const admin = yield* joined(owner, workspaceId, "manager", "admin");

        const toOwner = yield* bodyOf(
          SentSchema,
          yield* invite(owner, workspaceId, {
            email: newEmail("partner"),
            role: "owner",
          })
        );

        const toViewer = yield* bodyOf(
          SentSchema,
          yield* invite(admin, workspaceId, {
            email: newEmail("reader"),
            role: "viewer",
          })
        );

        const byOwner = yield* bodyOf(
          InvitationsSchema,
          yield* invitations(owner, workspaceId)
        );

        const byAdmin = yield* bodyOf(
          InvitationsSchema,
          yield* invitations(admin, workspaceId)
        );

        assert.deepStrictEqual(
          byOwner.map(({ id }) => id),
          [toOwner.id, toViewer.id]
        );
        assert.deepStrictEqual(
          byAdmin.map(({ id }) => id),
          [toViewer.id]
        );
      })
    );
  }
);

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

// A server that bills, against stripe-mock: every workspace starts on the
// free plan, with two members.
const BillingLive = Layer.unwrap(
  Effect.gen(function* billingApp() {
    const apiUrl = yield* stripeMockUrl;

    return TestApp.layerWith({
      STRIPE_API_URL: apiUrl,
      STRIPE_SECRET_KEY: "sk_test_0123456789syntheticmembers",
      STRIPE_WEBHOOK_SECRET: "whsec_synthetic_members_test_secret",
    });
  })
);

layer(BillingLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "invitations on a server that bills",
  (it) => {
    it.effect("refuse an invitation the plan has no room for", () =>
      Effect.gen(function* plan() {
        const owner = yield* signedUp("crowded-host");
        const workspaceId = yield* workspaceOf(owner, "Crowded");
        const first = newEmail("first");

        // The free plan has two members: the owner, and one invited.
        assert.strictEqual(
          (yield* invite(owner, workspaceId, { email: first, role: "editor" }))
            .status,
          201
        );

        const second = yield* invite(owner, workspaceId, {
          email: newEmail("second"),
          role: "editor",
        });

        assert.strictEqual(second.status, 402);
        assert.deepStrictEqual(
          yield* bodyOf(
            Schema.Struct({
              _tag: Schema.String,
              allowed: Schema.Int,
              limit: Schema.String,
            }),
            second
          ),
          { _tag: "PlanLimitReached", allowed: 2, limit: "members" }
        );

        // Inviting the same person again replaces their invitation.
        assert.strictEqual(
          (yield* invite(owner, workspaceId, { email: first, role: "viewer" }))
            .status,
          201
        );
      })
    );
  }
);
