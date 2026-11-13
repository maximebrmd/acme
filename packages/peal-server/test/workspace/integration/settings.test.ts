import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";
import {
  AccountExportSchema,
  ConnectedAppSchema,
  MeSchema,
  PreparedUploadSchema,
} from "peal-contract";

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
  seedConnectChoice,
  seedNotice,
  seedOAuthGrant,
  seedPost,
  seedSubscription,
  seedTrackedPost,
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
    analytics: yield* countOf(
      yield* sql`SELECT ((SELECT count(*) FROM analytics.tracked_posts WHERE workspace_id = ${workspaceId}) + (SELECT count(*) FROM analytics.metric_snapshots s JOIN analytics.tracked_posts t ON t.target_id = s.target_id WHERE t.workspace_id = ${workspaceId}))::int AS count`
    ),
    apiKeys: yield* countOf(
      yield* sql`SELECT count(*)::int AS count FROM auth.apikey WHERE reference_id = ${workspaceId}`
    ),
    channels: yield* countOf(
      yield* sql`SELECT ((SELECT count(*) FROM channels.channels WHERE workspace_id = ${workspaceId}) + (SELECT count(*) FROM channels.connect_choices WHERE workspace_id = ${workspaceId}))::int AS count`
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
  analytics: 0,
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
    "delete a workspace with its channels, posts, analytics, media, notices, usage, subscriptions, members and keys",
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

        const published = yield* seedPost(
          workspaceId,
          channelId,
          "A synthetic post that went out.",
          "finished"
        );

        yield* seedTrackedPost(workspaceId, channelId, published);
        yield* seedConnectChoice(workspaceId, owner.id);
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
          analytics: 2,
          apiKeys: 1,
          channels: 2,
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

        // Not while a post is going out: a call to its platform was begun,
        // and has not ended.
        const publishing = yield* seedPost(
          workspaceId,
          channelId,
          "A synthetic post going out.",
          "publishing"
        );

        yield* sql`
          INSERT INTO publishing.publication_calls
            (idempotency_key, operation, attempt, round, part, started_at, target_id)
          SELECT 'synthetic-call-' || id, 'publish', 1, 1, 0, now(), id
          FROM publishing.post_targets WHERE post_id = ${publishing}`;

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

        // The call ended. The post is still publishing, as one that
        // waits between two parts of a thread is: that keeps nothing.
        yield* sql`
          UPDATE publishing.publication_calls SET finished_at = now()
          WHERE target_id IN (
            SELECT id FROM publishing.post_targets WHERE post_id = ${publishing}
          )`;

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

        // Alex wrote a post in Team, which stays with Sam, and was choosing
        // Pages to connect there.
        const teamChannel = yield* seedChannel(team, "@team@social.example");

        yield* seedConnectChoice(team, alex.id);

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

        assert.strictEqual(
          yield* countOf(
            yield* sql`SELECT count(*)::int AS count FROM channels.connect_choices WHERE started_by = ${`user:${alex.id}`}`
          ),
          0
        );

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
          "Votre compte Peal est supprimé"
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
        const sql = yield* SqlClient.SqlClient;
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

        const atelierPost = yield* seedPost(
          atelier,
          channelId,
          "A synthetic post of Atelier.",
          "finished"
        );

        // A video Atelier sent to YouTube with its options, which YouTube
        // kept private.
        const videos = yield* seedChannel(atelier, "Atelier videos", {
          platform: "youtube",
        });

        // The way in a channel came through is kept, and copied.
        yield* sql`UPDATE channels.channels SET connection = 'linkedinPage', platform = 'linkedin' WHERE id = ${channelId}`;

        const options = {
          madeForKids: false,
          platform: "youtube",
          privacy: "public",
          title: "A synthetic video title of Atelier",
        };

        const videoPost = yield* seedPost(
          atelier,
          videos,
          "A synthetic video of Atelier.",
          "finished",
          null,
          options
        );

        yield* sql`UPDATE publishing.post_targets SET kept_private = true WHERE post_id = ${videoPost}`;

        // What staff did to Lee's account, and what they did to another.
        yield* sql`INSERT INTO staff.audit_events (id, action, at, reason, staff_id, target_id)
          VALUES (uuidv7(), 'resendVerification', '2026-11-08T10:00:00Z', 'Synthetic: asked for it again', ${kim.id}, ${lee.id}),
            (uuidv7(), 'legalDisclosure', '2026-11-08T11:00:00Z', 'Synthetic public prosecutor: Synthetic requisition 2026-0042', ${kim.id}, ${lee.id}),
            (uuidv7(), 'ban', '2026-11-08T11:00:00Z', 'Synthetic reason about someone else', ${kim.id}, ${kim.id})`;

        yield* seedTrackedPost(atelier, channelId, atelierPost);
        yield* uploadedFile(lee, atelier);
        yield* seedUsage(atelier, 7);
        yield* seedNotice(lee.id, studio, "@studio@social.example");
        // A weekly digest went out for the week of 9 November.
        yield* sql`INSERT INTO notifications.notification_preferences (user_id, email_channel_reconnect, email_post_failed, email_post_published, email_post_unconfirmed, email_weekly_digest, weekly_digest_week, updated_at) VALUES (${lee.id}, true, true, false, true, true, '2026-11-09', now())`;

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
          /^attachment; filename="peal-data-\d{4}-\d{2}-\d{2}\.json"$/u
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
        assert.isTrue(exported.notificationPreferences.email.weeklyDigest);
        assert.strictEqual(
          exported.notificationPreferences.lastWeeklyDigest,
          "2026-11-09"
        );

        // Atelier is Lee's alone; Studio's content is the team's.
        assert.deepStrictEqual(
          exported.workspaces.map(({ name }) => name),
          ["Atelier"]
        );

        const [own] = exported.workspaces;

        assert.deepStrictEqual(
          own?.channels
            .map(({ connection, handle }) => [handle, connection])
            .toSorted(),
          [
            ["@atelier@social.example", "linkedinPage"],
            ["Atelier videos", null],
          ]
        );
        assert.deepStrictEqual(
          own?.posts
            .map(({ targets, text: postText }) => ({
              targets: targets.map((target) => ({
                channelId: target.channelId,
                keptPrivate: target.keptPrivate,
                options: target.options,
              })),
              text: postText,
            }))
            .toSorted((a, b) => a.text.localeCompare(b.text)),
          [
            {
              targets: [{ channelId, keptPrivate: false, options: null }],
              text: "A synthetic post of Atelier.",
            },
            {
              targets: [
                {
                  channelId: videos,
                  keptPrivate: true,
                  options: {
                    madeForKids: false,
                    platform: "youtube",
                    privacy: "public",
                    title: "A synthetic video title of Atelier",
                  },
                },
              ],
              text: "A synthetic video of Atelier.",
            },
          ]
        );
        // What staff did to Lee, without who did it; not what they did to
        // others.
        assert.deepStrictEqual(
          exported.staffActions.map(({ action, reason }) => ({
            action,
            reason,
          })),
          [
            {
              action: "resendVerification",
              reason: "Synthetic: asked for it again",
            },
          ]
        );
        assert.notInclude(text, "Synthetic reason about someone else");
        // Nor that an authority asked about Lee: telling the person a
        // request concerns can be forbidden, so the export never does.
        assert.notInclude(text, "Synthetic requisition");
        assert.deepStrictEqual(
          own?.media.map(
            ({ aiGenerated, contentType, downloadUrl, status }) => ({
              aiGenerated,
              contentType,
              downloadUrl,
              status,
            })
          ),
          [
            {
              aiGenerated: false,
              contentType: "image/png",
              downloadUrl: null,
              status: "pending",
            },
          ]
        );

        // Once the store holds the file, the copy links to it, as the
        // user provided it.
        yield* sql`UPDATE media.media_assets SET status = 'uploaded', probe_state = 'pending', page_count = 12 WHERE workspace_id = ${atelier}`;

        const withFile = yield* decodeExport(
          (yield* app.request("/api/me/export", {
            headers: { cookie: lee.cookies },
          })).body
        );

        const [file] =
          withFile.workspaces.find(({ id }) => id === atelier)?.media ?? [];

        const link = file?.downloadUrl ?? "";

        // What the probe counted of a document goes with it.
        assert.strictEqual(file?.pageCount, 12);
        assert.isNull(own?.media[0]?.pageCount);

        const downloaded = yield* Effect.promise(async () => {
          const response = await fetch(link);
          const body = await response.arrayBuffer();

          return body.byteLength;
        });

        assert.strictEqual(downloaded, 128);
        assert.deepStrictEqual(
          own?.apiKeys.map(({ name }) => name),
          ["ci"]
        );
        assert.deepStrictEqual(own?.assistantUsage, [
          { day: "2026-11-09", requests: 7 },
        ]);
        assert.deepStrictEqual(
          own?.analytics.map(({ postId, snapshots }) => ({
            likes: snapshots.map(({ likes }) => likes),
            postId,
          })),
          [{ likes: [4], postId: atelierPost }]
        );
        // This server does not bill: no plan, no subscription.
        assert.deepStrictEqual(own?.billing, {
          accountDays: [],
          meteredPosts: [],
          plan: null,
          subscriptions: [],
          usage: [],
          usageReports: [],
        });
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
