import { assert, layer } from "@effect/vitest";
import {
  AccountExportSchema,
  ConnectedAppSchema,
  MeSchema,
  PreparedUploadSchema,
} from "acme-contract";
import { Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { MediaStorage } from "#media/application/ports/media-storage.ts";
import { StorageKeySchema } from "#media/domain/storage-key.ts";
import { S3MediaStorageLive } from "#media/infrastructure/s3-media-storage.ts";
import {
  sendSigned,
  storageSettings,
  syntheticBytes,
} from "#test/media/support.ts";

import {
  apiKeyOf,
  bodyOf,
  emailTo,
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
  seedNotice,
  seedOAuthGrant,
  seedPost,
  seedSubscription,
  seedUsage,
} from "./seed.ts";

// Deleting a workspace and an account, and copying an account's data out,
// on the whole server and the stack's Postgres, Mailpit and SeaweedFS.

const InvitationSchema = Schema.Struct({ id: Schema.String });

const AcceptedSchema = Schema.Struct({
  member: Schema.Struct({ id: Schema.String }),
});

const decodeMe = Schema.decodeUnknownEffect(MeSchema);

// Bodies are JSON: dates come as strings.
const decodeJson = <S extends Schema.Top>(schema: S) =>
  Schema.decodeUnknownEffect(Schema.toCodecJson(schema));

const decodeExport = decodeJson(AccountExportSchema);

const decodeApps = decodeJson(Schema.Array(ConnectedAppSchema));

const decodeUpload = decodeJson(PreparedUploadSchema);

const StoreLive = S3MediaStorageLive.pipe(Layer.provide(storageSettings));

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
      body: { invitationId: (yield* bodyOf(InvitationSchema, invited)).id },
      headers: { cookie: guest.cookies },
    }
  );

  return (yield* bodyOf(AcceptedSchema, accepted)).member.id;
});

/** A file uploaded to the workspace's media library, not yet completed. */
const uploadedFile = Effect.fn("uploadedFile")(function* uploadedFile(
  owner: Person,
  workspaceId: string
) {
  const app = yield* TestApp;
  const bytes = syntheticBytes(128);

  const created = yield* app.request(`/api/workspaces/${workspaceId}/media`, {
    body: { byteSize: bytes.length, contentType: "image/png" },
    headers: { cookie: owner.cookies },
  });

  const { media, upload } = yield* decodeUpload(created.body);

  if (upload._tag !== "single") {
    return yield* Effect.die(new Error("A small file uploads in one request"));
  }

  const sent = yield* sendSigned(upload.request, bytes);

  assert.isTrue(sent.ok);

  return StorageKeySchema.make(`media/${workspaceId}/${media.id}.png`);
});

const rowsIn = Effect.fn("rowsIn")(function* rowsIn(workspaceId: string) {
  const sql = yield* SqlClient.SqlClient;

  return {
    apiKeys: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM auth.apikey WHERE reference_id = ${workspaceId}`
    ),
    channels: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM channels.channels WHERE workspace_id = ${workspaceId}`
    ),
    invitations: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM auth.invitation WHERE organization_id = ${workspaceId}`
    ),
    media: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM media.media_assets WHERE workspace_id = ${workspaceId}`
    ),
    members: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM auth.member WHERE organization_id = ${workspaceId}`
    ),
    notices: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM notifications.notices WHERE workspace_id = ${workspaceId}`
    ),
    posts: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${workspaceId}`
    ),
    subscriptions: yield* countOf(
      yield* sql`SELECT ((SELECT count(*) FROM billing.subscriptions WHERE workspace_id = ${workspaceId}) + (SELECT count(*) FROM auth.subscription WHERE reference_id = ${workspaceId}))::int AS count`
    ),
    targets: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM publishing.post_targets t JOIN publishing.posts p ON p.id = t.post_id WHERE p.workspace_id = ${workspaceId}`
    ),
    usage: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM assistant.daily_usage WHERE workspace_id = ${workspaceId}`
    ),
    workspaces: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM auth.organization WHERE id = ${workspaceId}`
    ),
  };
});

const nothing = {
  apiKeys: 0,
  channels: 0,
  invitations: 0,
  media: 0,
  members: 0,
  notices: 0,
  posts: 0,
  subscriptions: 0,
  targets: 0,
  usage: 0,
  workspaces: 0,
};

layer(Layer.mergeAll(IntegrationLive, StoreLive), {
  excludeTestServices: true,
  timeout: "180 seconds",
})("workspace and account settings", (it) => {
  it.effect(
    "delete a workspace with its channels, posts, media, notices, usage, subscriptions, members and keys",
    () =>
      Effect.gen(function* deletesWorkspace() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const store = yield* MediaStorage;
        const owner = yield* signedUp("ana");
        const editor = yield* signedUp("ben");
        const workspaceId = yield* workspaceOf(owner, "Harbour");
        const path = `/api/workspaces/${workspaceId}`;

        yield* join(owner, workspaceId, editor, "editor");

        const { key } = yield* apiKeyOf(owner, workspaceId, ["post:read"]);
        const file = yield* uploadedFile(owner, workspaceId);

        const channelId = yield* seedChannel(
          workspaceId,
          "@harbour@social.example"
        );

        yield* seedPost(workspaceId, channelId, "A synthetic draft.");
        yield* seedNotice(owner.id, workspaceId, "@harbour@social.example");
        yield* seedUsage(workspaceId, 3);
        // Ended: Stripe bills it no more.
        yield* seedSubscription(workspaceId, "canceled");

        yield* app.request("/api/auth/organization/invite-member", {
          body: {
            email: `pending+${workspaceId}@example.test`,
            organizationId: workspaceId,
            role: "viewer",
          },
          headers: { cookie: owner.cookies },
        });

        const before = yield* rowsIn(workspaceId);

        assert.deepStrictEqual(before, {
          apiKeys: 1,
          channels: 1,
          invitations: 2,
          media: 1,
          members: 2,
          notices: 1,
          posts: 1,
          subscriptions: 2,
          targets: 1,
          usage: 1,
          workspaces: 1,
        });

        // An editor may not; the name must be typed again.
        const byEditor = yield* app.request(path, {
          body: { name: "Harbour" },
          headers: { cookie: editor.cookies },
          method: "DELETE",
        });

        assert.strictEqual(byEditor.status, 403);

        const misnamed = yield* app.request(path, {
          body: { name: "Harbor" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(misnamed.status, 400);

        // Not while a post is going out.
        const publishing = yield* seedPost(
          workspaceId,
          channelId,
          "A synthetic post going out.",
          "publishing"
        );

        const busy = yield* app.request(path, {
          body: { name: "Harbour" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(busy.status, 409);
        assert.deepStrictEqual(yield* rowsIn(workspaceId), {
          ...before,
          posts: 2,
          targets: 2,
        });

        yield* sql`UPDATE publishing.posts SET status = 'finished' WHERE id = ${publishing}`;

        const deleted = yield* app.request(path, {
          body: { name: " Harbour " },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(deleted.status, 204);
        assert.deepStrictEqual(yield* rowsIn(workspaceId), nothing);
        assert.isTrue(Option.isNone(yield* store.head(file)));

        const withKey = yield* app.request(`${path}/api-keys`, {
          headers: { authorization: `Bearer ${key}` },
        });

        assert.strictEqual(withKey.status, 401);

        const me = yield* decodeMe(
          (yield* app.request("/api/me", {
            headers: { cookie: editor.cookies },
          })).body
        );

        assert.deepStrictEqual(me.workspaces, []);
      })
  );

  it.effect(
    "delete an account, with the workspaces it alone belongs to, once no workspace would be left without an owner",
    () =>
      Effect.gen(function* deletesAccount() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const alex = yield* signedUp("alex", "fr");
        const sam = yield* signedUp("sam");
        const solo = yield* workspaceOf(alex, "Solo");
        const shared = yield* workspaceOf(alex, "Shared");
        const team = yield* workspaceOf(sam, "Team");

        const channelId = yield* seedChannel(solo, "@solo@social.example");

        yield* seedPost(solo, channelId, "A synthetic draft of Solo.");
        yield* seedNotice(alex.id, solo, "@solo@social.example");
        yield* seedNotice(alex.id, team, "@team@social.example");
        yield* join(sam, team, alex, "editor");

        // Alex wrote a post in Team, which stays with Sam.
        const teamChannel = yield* seedChannel(team, "@team@social.example");

        const alexInTeam = yield* seedPost(
          team,
          teamChannel,
          "A synthetic post Alex wrote in Team.",
          "finished",
          alex.id
        );

        const samInShared = yield* join(alex, shared, sam, "viewer");

        yield* app.request("/api/me/notification-preferences", {
          body: { email: { postPublished: true }, everyPost: true },
          headers: { cookie: alex.cookies },
          method: "PATCH",
        });

        const asAlex = { cookie: alex.cookies };

        const wrongPassword = yield* app.request("/api/me", {
          body: { password: "not the password at all" },
          headers: asAlex,
          method: "DELETE",
        });

        assert.strictEqual(wrongPassword.status, 400);

        // Alex alone owns Shared, which Sam uses.
        const lastOwner = yield* app.request("/api/me", {
          body: { password },
          headers: asAlex,
          method: "DELETE",
        });

        assert.strictEqual(lastOwner.status, 409);
        assert.deepInclude(lastOwner.body, {
          _tag: "LastOwner",
          workspaces: [{ id: shared, name: "Shared" }],
        });

        yield* app.request("/api/auth/organization/update-member-role", {
          body: {
            memberId: samInShared,
            organizationId: shared,
            role: "owner",
          },
          headers: asAlex,
        });

        const deleted = yield* app.request("/api/me", {
          body: { password },
          headers: asAlex,
          method: "DELETE",
        });

        assert.strictEqual(deleted.status, 204);

        // Solo went with everything in it; Shared and Team stay, with Sam.
        assert.deepStrictEqual(yield* rowsIn(solo), nothing);

        const remaining =
          yield* sql`SELECT o.name, m.user_id AS member, m.role FROM auth.member m JOIN auth.organization o ON o.id = m.organization_id WHERE o.id IN (${shared}, ${team}) ORDER BY o.name`;

        assert.deepStrictEqual(remaining, [
          { member: sam.id, name: "Shared", role: "owner" },
          { member: sam.id, name: "Team", role: "owner" },
        ]);

        const traces = {
          notices: yield* countOf(
            yield* sql`SELECT count(*)::int AS count FROM notifications.notices WHERE user_id = ${alex.id}`
          ),
          preferences: yield* countOf(
            yield* sql`SELECT count(*)::int AS count FROM notifications.notification_preferences WHERE user_id = ${alex.id}`
          ),
          sessions: yield* countOf(
            yield* sql`SELECT count(*)::int AS count FROM auth.session WHERE user_id = ${alex.id}`
          ),
          users: yield* countOf(
            yield* sql`SELECT count(*)::int AS count FROM auth."user" WHERE id = ${alex.id}`
          ),
        };

        assert.deepStrictEqual(traces, {
          notices: 0,
          preferences: 0,
          sessions: 0,
          users: 0,
        });

        // The post stays in Team, without an author: nothing names Alex.
        assert.deepStrictEqual(
          yield* sql`SELECT text, author_id AS author FROM publishing.posts WHERE id = ${alexInTeam}`,
          [{ author: null, text: "A synthetic post Alex wrote in Team." }]
        );

        const afterwards = yield* app.request("/api/me", { headers: asAlex });

        assert.strictEqual(afterwards.status, 401);

        // In the account's language, to the address it had.
        const confirmation = yield* emailTo(alex.email, /supprimé/u);

        assert.strictEqual(
          confirmation.Subject,
          "Votre compte Acme est supprimé"
        );
      })
  );

  it.effect(
    "check an account's password no more often than signing in does",
    () =>
      Effect.gen(function* limitsTries() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const uma = yield* signedUp("uma");

        const close = (typed: string) =>
          app.request("/api/me", {
            body: { password: typed },
            headers: { cookie: uma.cookies },
            method: "DELETE",
          });

        for (const guess of ["first guess", "second guess", "third guess"]) {
          assert.strictEqual((yield* close(guess)).status, 400, guess);
        }

        // Even the right one waits now: guessing goes no faster than
        // through the sign-in form.
        const waited = yield* close(password);

        assert.strictEqual(waited.status, 429);
        assert.deepInclude(waited.body, { _tag: "TooManyPasswordAttempts" });
        assert.strictEqual(
          yield* countOf(
            yield* sql`SELECT count(*)::int AS count FROM auth."user" WHERE id = ${uma.id}`
          ),
          1
        );
      })
  );

  it.effect(
    "close one at a time the accounts of two owners who leave together",
    () =>
      Effect.gen(function* closesInTurn() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const ida = yield* signedUp("ida");
        const jon = yield* signedUp("jon");
        const kai = yield* signedUp("kai");
        const workspaceId = yield* workspaceOf(ida, "Co-owned");

        yield* join(ida, workspaceId, jon, "owner");
        yield* join(ida, workspaceId, kai, "viewer");

        const close = (person: Person) =>
          app.request("/api/me", {
            body: { password },
            headers: { cookie: person.cookies },
            method: "DELETE",
          });

        // Each would leave the workspace to the other: the second to go
        // finds itself its only owner.
        const replies = yield* Effect.all([close(ida), close(jon)], {
          concurrency: "unbounded",
        });

        assert.deepStrictEqual(
          replies.map(({ status }) => status).toSorted((a, b) => a - b),
          [204, 409]
        );

        const owners = yield* countOf(
          yield* sql`SELECT count(*)::int AS count FROM auth.member WHERE organization_id = ${workspaceId} AND role = 'owner'`
        );

        assert.strictEqual(owners, 1);
      })
  );

  it.effect(
    "export what is tied to the user, the posts they wrote, and the content of the workspaces they alone belong to",
    () =>
      Effect.gen(function* exportsData() {
        const app = yield* TestApp;
        const lee = yield* signedUp("lee", "fr");
        const kim = yield* signedUp("kim");
        const atelier = yield* workspaceOf(lee, "Atelier");
        const studio = yield* workspaceOf(kim, "Studio");

        yield* join(kim, studio, lee, "contributor");

        const { key } = yield* apiKeyOf(lee, atelier, ["post:read"]);

        const channelId = yield* seedChannel(
          atelier,
          "@atelier@social.example"
        );

        yield* seedPost(atelier, channelId, "A synthetic draft of Atelier.");
        yield* uploadedFile(lee, atelier);
        yield* seedUsage(atelier, 7);
        yield* seedNotice(lee.id, studio, "@studio@social.example");

        const studioChannel = yield* seedChannel(
          studio,
          "@studio@social.example"
        );

        yield* seedPost(
          studio,
          studioChannel,
          "A synthetic draft of Studio.",
          "draft",
          kim.id
        );

        // Lee's own post in Studio is Lee's to copy, though Studio is not.
        yield* seedPost(
          studio,
          studioChannel,
          "A synthetic post Lee wrote in Studio.",
          "finished",
          lee.id
        );

        const reply = yield* app.request("/api/me/export", {
          headers: { cookie: lee.cookies },
        });

        assert.strictEqual(reply.status, 200);
        assert.match(
          reply.headers.get("content-disposition") ?? "",
          /^attachment; filename="acme-data-\d{4}-\d{2}-\d{2}\.json"$/u
        );

        const exported = yield* decodeExport(reply.body);
        const text = JSON.stringify(reply.body);

        assert.strictEqual(exported.user.email, lee.email);
        assert.strictEqual(exported.user.locale, "fr");
        assert.deepStrictEqual(
          exported.signInMethods.map(({ provider }) => provider),
          ["credential"]
        );
        assert.isAtLeast(exported.sessions.length, 1);
        assert.deepStrictEqual(
          exported.memberships.map(({ role, workspaceName }) => ({
            role,
            workspaceName,
          })),
          [
            { role: "owner", workspaceName: "Atelier" },
            { role: "contributor", workspaceName: "Studio" },
          ]
        );
        assert.deepStrictEqual(
          exported.invitations.received.map(({ status, workspaceName }) => ({
            status,
            workspaceName,
          })),
          [{ status: "accepted", workspaceName: "Studio" }]
        );
        assert.deepStrictEqual(
          exported.notices.map(({ event }) => event._tag),
          ["ChannelReconnectRequired"]
        );
        assert.isFalse(exported.notificationPreferences.email.postPublished);

        // Atelier is Lee's alone; Studio's content is the team's.
        assert.deepStrictEqual(
          exported.workspaces.map(({ name }) => name),
          ["Atelier"]
        );

        const [own] = exported.workspaces;

        assert.deepStrictEqual(
          own?.channels.map(({ handle }) => handle),
          ["@atelier@social.example"]
        );
        assert.deepStrictEqual(
          own?.posts.map(({ targets, text: postText }) => ({
            channels: targets.map((target) => target.channelId),
            text: postText,
          })),
          [{ channels: [channelId], text: "A synthetic draft of Atelier." }]
        );
        assert.deepStrictEqual(
          own?.media.map(({ contentType, status }) => ({
            contentType,
            status,
          })),
          [{ contentType: "image/png", status: "pending" }]
        );
        assert.deepStrictEqual(
          own?.apiKeys.map(({ name }) => name),
          ["ci"]
        );
        assert.deepStrictEqual(own?.assistantUsage, [
          { day: "2026-11-09", requests: 7 },
        ]);
        // This server does not bill: no plan, no subscription.
        assert.deepStrictEqual(own?.billing, { plan: null, subscriptions: [] });
        assert.notInclude(text, "A synthetic draft of Studio.");
        assert.deepStrictEqual(
          exported.authoredPosts.map(({ text: postText, workspaceId }) => ({
            text: postText,
            workspaceId,
          })),
          [
            {
              text: "A synthetic post Lee wrote in Studio.",
              workspaceId: studio,
            },
          ]
        );

        // No secret: not the API key, nor the session's token.
        assert.notInclude(text, key);

        for (const cookie of lee.cookies.split("; ")) {
          assert.notInclude(text, cookie.split("=")[1]?.split(".")[0] ?? "");
        }
      })
  );

  it.effect("list and revoke the applications that act for the user", () =>
    Effect.gen(function* connectedApps() {
      const app = yield* TestApp;
      const sql = yield* SqlClient.SqlClient;
      const nora = yield* signedUp("nora");
      const workspaceId = yield* workspaceOf(nora, "Desk");

      const clientId = yield* seedOAuthGrant(
        nora.id,
        workspaceId,
        "Synthetic MCP"
      );

      const asNora = { cookie: nora.cookies };

      const listed = yield* decodeApps(
        (yield* app.request("/api/me/connected-apps", { headers: asNora })).body
      );

      assert.deepStrictEqual(
        listed.map(({ name, scopes, workspaces }) => ({
          name,
          scopes,
          workspaces,
        })),
        [
          {
            name: "Synthetic MCP",
            scopes: ["offline_access", "openid", "workspace:read"],
            workspaces: [{ id: workspaceId, name: "Desk" }],
          },
        ]
      );

      const revoked = yield* app.request(`/api/me/connected-apps/${clientId}`, {
        headers: asNora,
        method: "DELETE",
      });

      assert.strictEqual(revoked.status, 204);

      const left = {
        consents: yield* countOf(
          yield* sql`SELECT count(*)::int AS count FROM auth.oauth_consent WHERE user_id = ${nora.id}`
        ),
        tokens: yield* countOf(
          yield* sql`SELECT count(*)::int AS count FROM auth.oauth_refresh_token WHERE user_id = ${nora.id}`
        ),
      };

      assert.deepStrictEqual(left, { consents: 0, tokens: 0 });

      const again = yield* app.request(`/api/me/connected-apps/${clientId}`, {
        headers: asNora,
        method: "DELETE",
      });

      assert.strictEqual(again.status, 404);

      yield* sql`DELETE FROM auth.oauth_client WHERE client_id = ${clientId}`;
    })
  );
});
