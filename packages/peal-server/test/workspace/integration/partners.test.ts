import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import {
  MigratedSqlLive,
  apiKeyOf,
  bodyOf,
  makeAdmin,
  signedUpUnconfirmed,
  signIn,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "./harness.ts";
import {
  bearer,
  customerOf,
  everyScope,
  keyOf,
  partnerOf,
  PartnerSchema,
  WorkspaceSchema,
} from "./partner-support.ts";
import { seedChannel, seedPost } from "./seed.ts";

const UsageSchema = Schema.Struct({
  channels: Schema.Number,
  workspaces: Schema.Number,
});

const StandingSchema = Schema.Struct({
  canOpen: Schema.Boolean,
  partner: Schema.NullOr(PartnerSchema),
  usage: Schema.NullOr(UsageSchema),
});

const PageSchema = Schema.Struct({
  next: Schema.NullOr(Schema.String),
  total: Schema.Number,
  workspaces: Schema.Array(WorkspaceSchema),
});

const TakenSchema = Schema.Struct({
  _tag: Schema.Literal("ExternalIdTaken"),
  workspaceId: Schema.String,
});

const OverviewSchema = Schema.Struct({
  partner: PartnerSchema,
  usage: UsageSchema,
});

const LinkSchema = Schema.Struct({
  channelIds: Schema.Array(Schema.String),
  failure: Schema.NullOr(Schema.String),
  id: Schema.String,
  status: Schema.String,
});

const CreatedLinkSchema = Schema.Struct({
  link: LinkSchema,
  url: Schema.String,
});

const HostedSchema = Schema.Struct({
  host: Schema.Struct({
    logoUrl: Schema.NullOr(Schema.String),
    name: Schema.String,
  }),
  input: Schema.String,
  platform: Schema.String,
  returnTo: Schema.NullOr(Schema.String),
  status: Schema.String,
});

const HostedFailureSchema = Schema.Struct({
  _tag: Schema.Literal("HostedConnectFailed"),
  reason: Schema.String,
});

const StaffPartnerSchema = Schema.Struct({
  account: Schema.NullOr(
    Schema.Struct({ name: Schema.String, workspaces: Schema.Number })
  ),
});

const AuditSchema = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      action: Schema.String,
      reason: Schema.NullOr(Schema.String),
      staffId: Schema.NullOr(Schema.String),
      targetId: Schema.NullOr(Schema.String),
      workspaceId: Schema.NullOr(Schema.String),
    })
  ),
});

const CountSchema = Schema.Array(Schema.Struct({ rows: Schema.Number }));

// What a credential may reach: each workspace endpoint a key calls, read
// with every kind of credential, in every kind of workspace.
const reads = (workspaceId: string) => [
  `/api/workspaces/${workspaceId}/channels`,
  `/api/workspaces/${workspaceId}/channels/platforms`,
  `/api/workspaces/${workspaceId}/posts?from=2026-11-01T00:00:00Z&to=2026-11-30T00:00:00Z`,
  `/api/workspaces/${workspaceId}/posts/drafts`,
  `/api/workspaces/${workspaceId}/media`,
  `/api/workspaces/${workspaceId}/webhooks`,
  `/api/workspaces/${workspaceId}/billing`,
  `/api/workspaces/${workspaceId}/assistant`,
  `/api/workspaces/${workspaceId}/analytics/summary?from=2026-11-01&to=2026-11-07&timeZone=Europe/Paris`,
];

const SelfServiceLive = Layer.mergeAll(
  TestApp.layerWith({
    ...unconfirmedEmails,
    PEAL_PARTNER_SELF_SERVICE: "true",
  }),
  MigratedSqlLive
);

const StaffOnlyLive = Layer.mergeAll(
  TestApp.layerWith({ ...unconfirmedEmails, PEAL_PARTNER_SELF_SERVICE: "" }),
  MigratedSqlLive
);

layer(StaffOnlyLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "partner accounts on a server whose staff open them",
  (it) => {
    it.effect("cannot be opened by a workspace's owner", () =>
      Effect.gen(function* closed() {
        const app = yield* TestApp;
        const owner = yield* signedUpUnconfirmed("closed");
        const home = yield* workspaceOf(owner, "Closed");

        const standing = yield* app.request(`/api/workspaces/${home}/partner`, {
          headers: { cookie: owner.cookies },
        });

        assert.deepStrictEqual(yield* bodyOf(StandingSchema, standing), {
          canOpen: false,
          partner: null,
          usage: null,
        });

        const opened = yield* app.request(`/api/workspaces/${home}/partner`, {
          body: { name: "Closed Suite" },
          headers: { cookie: owner.cookies },
        });

        assert.strictEqual(opened.status, 403);
        assert.deepInclude(opened.body, {
          _tag: "PartnerAccountsClosed",
          code: "partner_accounts_closed",
        });
      })
    );
  }
);

layer(StaffOnlyLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "partner accounts that staff grant",
  (it) => {
    it.effect(
      "open for the workspace staff name, whose owner then runs them",
      () =>
        Effect.gen(function* granted() {
          const app = yield* TestApp;
          const owner = yield* signedUpUnconfirmed("granted");
          const home = yield* workspaceOf(owner, "Granted");
          const operator = yield* signedUpUnconfirmed("operator");

          yield* makeAdmin(operator.id);

          const staff = { cookie: yield* signIn(operator.email) };
          const path = `/api/admin/workspaces/${home}/partner`;

          // Anyone but staff finds nothing there.
          const hidden = yield* app.request(path, {
            body: { reason: "Synthetic partnership" },
            headers: { cookie: owner.cookies },
          });

          assert.strictEqual(hidden.status, 404);

          const before = yield* app.request(path, { headers: staff });

          assert.deepStrictEqual(before.body, { account: null, owner: null });

          const reply = yield* app.request(path, {
            body: { reason: "Synthetic partnership" },
            headers: staff,
          });

          assert.strictEqual(reply.status, 200);

          const { account } = yield* bodyOf(StaffPartnerSchema, reply);

          assert.deepStrictEqual(account, { name: "Granted", workspaces: 0 });

          // Recorded, with its reason and the workspace, naming nobody.
          const audit = yield* app.request("/api/admin/audit", {
            headers: staff,
          });

          // The log is every workspace's, and other suites write to it.
          const grants = (yield* bodyOf(AuditSchema, audit)).items.filter(
            (event) => event.workspaceId === home
          );

          assert.deepStrictEqual(grants, [
            {
              action: "grantPartner",
              reason: "Synthetic partnership",
              staffId: operator.id,
              targetId: null,
              workspaceId: home,
            },
          ]);

          // The owner names it and creates its keys; the key's workspaces
          // show, to staff, whose they are.
          const renamed = yield* app.request(
            `/api/workspaces/${home}/partner`,
            {
              body: { name: "Granted Suite" },
              headers: { cookie: owner.cookies },
              method: "PATCH",
            }
          );

          assert.strictEqual(renamed.status, 200);

          const { key } = yield* keyOf(owner, home);
          const customer = yield* customerOf(key, "Their customer", "cus_g1");

          const owned = yield* app.request(
            `/api/admin/workspaces/${customer.id}/partner`,
            { headers: staff }
          );

          assert.deepStrictEqual(owned.body, {
            account: null,
            owner: {
              externalId: "cus_g1",
              homeWorkspaceId: home,
              partnerId: (yield* bodyOf(PartnerSchema, renamed)).id,
            },
          });

          // A workspace a partner owns holds no account of its own.
          const nested = yield* app.request(
            `/api/admin/workspaces/${customer.id}/partner`,
            { body: { reason: "Synthetic partnership" }, headers: staff }
          );

          assert.strictEqual(nested.status, 404);
        })
    );
  }
);

layer(SelfServiceLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "partner accounts",
  (it) => {
    it.effect(
      "are opened by an owner in person, once, and keep what their customers see",
      () =>
        Effect.gen(function* opens() {
          const app = yield* TestApp;
          const { home, owner, partner } = yield* partnerOf("opens");

          assert.strictEqual(partner.name, "opens Suite");
          assert.strictEqual(partner.workspaceId, home);

          // Opening again answers the same account.
          const again = yield* app.request(`/api/workspaces/${home}/partner`, {
            body: { name: "Another name" },
            headers: { cookie: owner.cookies },
          });

          assert.strictEqual(
            (yield* bodyOf(PartnerSchema, again)).id,
            partner.id
          );

          const changed = yield* app.request(
            `/api/workspaces/${home}/partner`,
            {
              body: {
                logoUrl: "https://cdn.example.test/logo.png",
                returnOrigins: [
                  "https://app.example.test",
                  "http://localhost:4000",
                  "https://app.example.test/",
                ],
              },
              headers: { cookie: owner.cookies },
              method: "PATCH",
            }
          );

          assert.strictEqual(changed.status, 200);

          const saved = yield* bodyOf(PartnerSchema, changed);

          assert.strictEqual(
            saved.logoUrl,
            "https://cdn.example.test/logo.png"
          );
          assert.deepStrictEqual(saved.returnOrigins, [
            "https://app.example.test",
            "http://localhost:4000",
          ]);

          // Not an origin: a path, plain HTTP on another machine, a logo
          // that is not HTTPS.
          for (const body of [
            { returnOrigins: ["https://app.example.test/callback"] },
            { returnOrigins: ["http://app.example.test"] },
            { returnOrigins: ["myapp://callback"] },
            { logoUrl: "http://cdn.example.test/logo.png" },
            { name: "  " },
          ]) {
            const refused = yield* app.request(
              `/api/workspaces/${home}/partner`,
              { body, headers: { cookie: owner.cookies }, method: "PATCH" }
            );

            assert.strictEqual(refused.status, 422, JSON.stringify(body));
          }

          // An API key of the workspace reads the account, and changes
          // nothing: only people manage it.
          const { key } = yield* apiKeyOf(owner, home, [
            "partner:read",
            "partner:manage",
          ]);

          const read = yield* app.request(`/api/workspaces/${home}/partner`, {
            headers: bearer(key),
          });

          assert.strictEqual(read.status, 200);

          const minted = yield* app.request(
            `/api/workspaces/${home}/partner/keys`,
            {
              body: { name: "minted", permissions: [], scopes: everyScope },
              headers: bearer(key),
            }
          );

          assert.strictEqual(minted.status, 403);
        })
    );

    it.effect(
      "give keys only what a product does for its customers, shown once",
      () =>
        Effect.gen(function* keys() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("keys");

          const created = yield* keyOf(owner, home, {
            permissions: ["post:read", "channel:read", "post:read"],
            scopes: ["workspaces:read"],
          });

          assert.isTrue(created.key.startsWith("peal_partner_"));
          assert.isTrue(created.key.startsWith(created.partnerKey.start));
          assert.isBelow(created.partnerKey.start.length, 20);
          assert.deepStrictEqual(created.partnerKey.permissions, [
            "channel:read",
            "post:read",
          ]);

          // What only people do is never given to a key.
          for (const permission of [
            "apiKey:create",
            "member:delete",
            "invitation:create",
            "billing:manage",
            "organization:delete",
            "partner:manage",
          ]) {
            const refused = yield* app.request(
              `/api/workspaces/${home}/partner/keys`,
              {
                body: { name: "wide", permissions: [permission], scopes: [] },
                headers: { cookie: owner.cookies },
              }
            );

            assert.strictEqual(refused.status, 422, permission);
          }

          // Only the key's digest is kept.
          const sql = yield* SqlClient.SqlClient;

          const stored =
            yield* sql`SELECT count(*)::int AS rows FROM workspace.partner_keys WHERE key_digest = ${created.key} OR start = ${created.key}`;

          assert.deepStrictEqual(
            yield* Schema.decodeUnknownEffect(CountSchema)(stored),
            [{ rows: 0 }]
          );

          const listed = yield* app.request(
            `/api/workspaces/${home}/partner/keys`,
            { headers: { cookie: owner.cookies } }
          );

          assert.notInclude(JSON.stringify(listed.body), created.key);

          // Revoked, it stops working at once.
          const before = yield* app.request("/api/partner", {
            headers: bearer(created.key),
          });

          assert.strictEqual(before.status, 200);

          const revoked = yield* app.request(
            `/api/workspaces/${home}/partner/keys/${created.partnerKey.id}`,
            { headers: { cookie: owner.cookies }, method: "DELETE" }
          );

          assert.strictEqual(revoked.status, 204);

          const after = yield* app.request("/api/partner", {
            headers: bearer(created.key),
          });

          assert.strictEqual(after.status, 401);
        })
    );

    it.effect(
      "create a workspace per customer once, by external id and by idempotency key",
      () =>
        Effect.gen(function* creates() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("creates");
          const { key } = yield* keyOf(owner, home);

          const first = yield* customerOf(key, "Boulangerie Martin", "cus_001");

          assert.strictEqual(first.externalId, "cus_001");
          assert.strictEqual(first.channels, 0);

          // The same external id again: the workspace that has it.
          const duplicate = yield* app.request("/api/partner/workspaces", {
            body: { externalId: "cus_001", name: "Boulangerie Martin" },
            headers: bearer(key),
          });

          assert.strictEqual(duplicate.status, 409);
          assert.deepStrictEqual(yield* bodyOf(TakenSchema, duplicate), {
            _tag: "ExternalIdTaken",
            workspaceId: first.id,
          });

          // The same request under the same key makes one workspace.
          const keyed = {
            body: { externalId: "cus_002", name: "Garage Dupont" },
            headers: { ...bearer(key), "idempotency-key": "signup-cus_002" },
          };

          const made = yield* app.request("/api/partner/workspaces", keyed);
          const replayed = yield* app.request("/api/partner/workspaces", keyed);

          assert.strictEqual(made.status, 201);
          assert.strictEqual(replayed.status, 201);
          assert.strictEqual(
            (yield* bodyOf(WorkspaceSchema, replayed)).id,
            (yield* bodyOf(WorkspaceSchema, made)).id
          );

          // The key with another request is refused, and makes nothing.
          const reused = yield* app.request("/api/partner/workspaces", {
            body: { externalId: "cus_003", name: "Another" },
            headers: keyed.headers,
          });

          assert.strictEqual(reused.status, 409);
          assert.deepInclude(reused.body, {
            _tag: "IdempotencyKeyReused",
            code: "idempotency_key_reused",
          });

          // Sent together, two requests under one key make one workspace.
          const together = {
            body: { name: "Fleuriste Petit" },
            headers: { ...bearer(key), "idempotency-key": "signup-together" },
          };

          const [left, right] = yield* Effect.all(
            [
              app.request("/api/partner/workspaces", together),
              app.request("/api/partner/workspaces", together),
            ],
            { concurrency: 2 }
          );

          assert.strictEqual(
            (yield* bodyOf(WorkspaceSchema, left)).id,
            (yield* bodyOf(WorkspaceSchema, right)).id
          );

          const listed = yield* app.request("/api/partner/workspaces", {
            headers: bearer(key),
          });

          const page = yield* bodyOf(PageSchema, listed);

          assert.strictEqual(page.total, 3);
          assert.isNull(page.next);
          assert.deepStrictEqual(
            page.workspaces.map(({ name }) => name).toSorted(),
            ["Boulangerie Martin", "Fleuriste Petit", "Garage Dupont"]
          );

          // Looked up by the partner's own id, and by name.
          const found = yield* app.request(
            "/api/partner/workspaces?externalId=cus_002",
            { headers: bearer(key) }
          );

          assert.deepStrictEqual(
            (yield* bodyOf(PageSchema, found)).workspaces.map(
              ({ name }) => name
            ),
            ["Garage Dupont"]
          );

          const named = yield* app.request(
            "/api/partner/workspaces?name=boulang",
            { headers: bearer(key) }
          );

          assert.strictEqual((yield* bodyOf(PageSchema, named)).total, 1);

          // Page by page, newest first, each workspace once.
          const one = yield* bodyOf(
            PageSchema,
            yield* app.request("/api/partner/workspaces?limit=2", {
              headers: bearer(key),
            })
          );

          assert.strictEqual(one.workspaces.length, 2);
          assert.isNotNull(one.next);

          const two = yield* bodyOf(
            PageSchema,
            yield* app.request(
              `/api/partner/workspaces?limit=2&before=${one.next ?? ""}`,
              { headers: bearer(key) }
            )
          );

          assert.strictEqual(two.workspaces.length, 1);
          assert.isNull(two.next);
          assert.strictEqual(
            new Set([...one.workspaces, ...two.workspaces].map(({ id }) => id))
              .size,
            3
          );

          // Changed: its name, and an external id no other workspace has.
          const taken = yield* app.request(
            `/api/partner/workspaces/${first.id}`,
            {
              body: { externalId: "cus_002" },
              headers: bearer(key),
              method: "PATCH",
            }
          );

          assert.strictEqual(taken.status, 409);

          const renamed = yield* app.request(
            `/api/partner/workspaces/${first.id}`,
            {
              body: { externalId: null, name: "Boulangerie Martin & fils" },
              headers: bearer(key),
              method: "PATCH",
            }
          );

          assert.deepStrictEqual(yield* bodyOf(WorkspaceSchema, renamed), {
            channels: 0,
            externalId: null,
            id: first.id,
            name: "Boulangerie Martin & fils",
          });

          // Counted for the account, with the channels across them.
          yield* seedChannel(first.id, "@martin@example.test");

          const overview = yield* bodyOf(
            OverviewSchema,
            yield* app.request("/api/partner", { headers: bearer(key) })
          );

          assert.deepStrictEqual(overview.usage, {
            channels: 1,
            workspaces: 3,
          });

          const one_ = yield* bodyOf(
            WorkspaceSchema,
            yield* app.request(`/api/partner/workspaces/${first.id}`, {
              headers: bearer(key),
            })
          );

          assert.strictEqual(one_.channels, 1);

          // The home workspace's people read the same list.
          const forPeople = yield* app.request(
            `/api/workspaces/${home}/partner/workspaces`,
            { headers: { cookie: owner.cookies } }
          );

          assert.strictEqual((yield* bodyOf(PageSchema, forPeople)).total, 3);
        })
    );

    it.effect(
      "let a partner key act in the workspaces its partner owns, and in no other",
      () =>
        Effect.gen(function* matrix() {
          const app = yield* TestApp;
          const alpha = yield* partnerOf("alpha");
          const beta = yield* partnerOf("beta");
          const alphaKey = (yield* keyOf(alpha.owner, alpha.home)).key;
          const betaKey = (yield* keyOf(beta.owner, beta.home)).key;

          const ofAlpha = yield* customerOf(alphaKey, "Alpha customer");
          const ofBeta = yield* customerOf(betaKey, "Beta customer");

          const stranger = yield* signedUpUnconfirmed("stranger");
          const ordinary = yield* workspaceOf(stranger, "Ordinary");

          const statusesOf = (
            workspaceId: string,
            headers: Readonly<Record<string, string>>
          ) =>
            Effect.forEach(reads(workspaceId), (path) =>
              app
                .request(path, { headers })
                .pipe(Effect.map(({ status }) => status))
            );

          // Its partner's workspace: everything a key was given.
          assert.deepStrictEqual(
            yield* statusesOf(ofAlpha.id, bearer(alphaKey)),
            reads(ofAlpha.id).map(() => 200)
          );

          // Another partner's workspace, an ordinary workspace, and its
          // own partner's home workspace: none exists for it.
          for (const workspaceId of [
            ofBeta.id,
            ordinary,
            alpha.home,
            beta.home,
          ]) {
            assert.deepStrictEqual(
              yield* statusesOf(workspaceId, bearer(alphaKey)),
              reads(workspaceId).map(() => 404),
              workspaceId
            );
          }

          // The partner API answers a partner's key only its own.
          for (const init of [
            { method: "GET" },
            { body: { name: "Taken over" }, method: "PATCH" },
            { method: "DELETE" },
          ]) {
            const reply = yield* app.request(
              `/api/partner/workspaces/${ofBeta.id}`,
              { ...init, headers: bearer(alphaKey) }
            );

            assert.strictEqual(reply.status, 404, init.method);
          }

          const stillThere = yield* app.request(
            `/api/partner/workspaces/${ofBeta.id}`,
            { headers: bearer(betaKey) }
          );

          assert.strictEqual(
            (yield* bodyOf(WorkspaceSchema, stillThere)).name,
            "Beta customer"
          );

          // A workspace's API key, and a member's session, never call the
          // partner API: of the home workspace or of any other.
          const homeKey = (yield* apiKeyOf(alpha.owner, alpha.home, [
            "partner:read",
            "channel:read",
          ])).key;

          for (const headers of [
            bearer(homeKey),
            { cookie: alpha.owner.cookies },
            { cookie: stranger.cookies },
          ]) {
            for (const path of [
              "/api/partner",
              "/api/partner/workspaces",
              `/api/partner/workspaces/${ofAlpha.id}`,
            ]) {
              const reply = yield* app.request(path, { headers });

              assert.strictEqual(reply.status, 403, path);
            }
          }

          // The home workspace's own key and its members stay out of the
          // partner's workspaces: they are not members of them.
          assert.deepStrictEqual(
            yield* statusesOf(ofAlpha.id, bearer(homeKey)),
            reads(ofAlpha.id).map(() => 403)
          );
          assert.deepStrictEqual(
            yield* statusesOf(ofAlpha.id, { cookie: alpha.owner.cookies }),
            reads(ofAlpha.id).map(() => 404)
          );

          // No credential at all, or a key nobody issued.
          for (const headers of [
            {},
            bearer("peal_partner_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
          ]) {
            const reply = yield* app.request("/api/partner", { headers });

            assert.strictEqual(reply.status, 401);
          }

          // What belongs to people stays theirs: a partner key reads no
          // member, no invitation, no API key, and is nobody on /api/me.
          for (const path of [
            `/api/workspaces/${ofAlpha.id}/members`,
            `/api/workspaces/${ofAlpha.id}/invitations`,
            `/api/workspaces/${ofAlpha.id}/api-keys`,
            `/api/workspaces/${ofAlpha.id}/partner`,
            "/api/me",
          ]) {
            const reply = yield* app.request(path, {
              headers: bearer(alphaKey),
            });

            assert.strictEqual(reply.status, 403, path);
          }

          const deleted = yield* app.request(`/api/workspaces/${ofAlpha.id}`, {
            body: { name: "Alpha customer" },
            headers: bearer(alphaKey),
            method: "DELETE",
          });

          assert.strictEqual(deleted.status, 403);
        })
    );

    it.effect("hold a partner key to its scopes and permissions", () =>
      Effect.gen(function* scopes() {
        const app = yield* TestApp;
        const { home, owner } = yield* partnerOf("scopes");
        const full = (yield* keyOf(owner, home)).key;
        const customer = yield* customerOf(full, "Scoped customer");

        const reading = (yield* keyOf(owner, home, {
          permissions: ["channel:read"],
          scopes: ["workspaces:read"],
        })).key;

        const created = yield* app.request("/api/partner/workspaces", {
          body: { name: "Not allowed" },
          headers: bearer(reading),
        });

        assert.strictEqual(created.status, 403);

        const removed = yield* app.request(
          `/api/partner/workspaces/${customer.id}`,
          { headers: bearer(reading), method: "DELETE" }
        );

        assert.strictEqual(removed.status, 403);

        const channels = yield* app.request(
          `/api/workspaces/${customer.id}/channels`,
          { headers: bearer(reading) }
        );

        assert.strictEqual(channels.status, 200);

        const media = yield* app.request(
          `/api/workspaces/${customer.id}/media`,
          { headers: bearer(reading) }
        );

        assert.strictEqual(media.status, 403);

        // Without workspaces:read, the key lists nothing.
        const blind = (yield* keyOf(owner, home, {
          permissions: ["channel:read"],
          scopes: [],
        })).key;

        const listed = yield* app.request("/api/partner/workspaces", {
          headers: bearer(blind),
        });

        assert.strictEqual(listed.status, 403);
      })
    );

    it.effect(
      "offboard a customer with everything its workspace held, and close only once they own none",
      () =>
        Effect.gen(function* offboards() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const { home, owner } = yield* partnerOf("offboards");
          const { key } = yield* keyOf(owner, home);
          const customer = yield* customerOf(key, "Leaving customer", "cus_9");

          const channelId = yield* seedChannel(
            customer.id,
            "@leaving@example.test"
          );

          yield* seedPost(customer.id, channelId, "Synthetic draft");

          // The home workspace, and the account, stay while it owns one.
          const homeDeletion = yield* app.request(`/api/workspaces/${home}`, {
            body: { name: "offboards" },
            headers: { cookie: owner.cookies },
            method: "DELETE",
          });

          assert.strictEqual(homeDeletion.status, 409);
          assert.deepInclude(homeDeletion.body, {
            _tag: "PartnerOwnsWorkspaces",
            code: "partner_owns_workspaces",
            owned: 1,
          });

          const closing = yield* app.request(
            `/api/workspaces/${home}/partner`,
            {
              headers: { cookie: owner.cookies },
              method: "DELETE",
            }
          );

          assert.strictEqual(closing.status, 409);

          const offboarded = yield* app.request(
            `/api/partner/workspaces/${customer.id}`,
            { headers: bearer(key), method: "DELETE" }
          );

          assert.strictEqual(offboarded.status, 204);

          const left = yield* sql`SELECT
            (SELECT count(*) FROM auth.organization WHERE id = ${customer.id})::int
            + (SELECT count(*) FROM workspace.partner_workspaces WHERE workspace_id = ${customer.id})::int
            + (SELECT count(*) FROM channels.channels WHERE workspace_id = ${customer.id})::int
            + (SELECT count(*) FROM publishing.posts WHERE workspace_id = ${customer.id})::int AS rows`;

          assert.deepStrictEqual(
            yield* Schema.decodeUnknownEffect(CountSchema)(left),
            [{ rows: 0 }]
          );

          // Gone for its key too, and offboarding again finds nothing.
          for (const [path, method] of [
            [`/api/workspaces/${customer.id}/channels`, "GET"],
            [`/api/partner/workspaces/${customer.id}`, "GET"],
            [`/api/partner/workspaces/${customer.id}`, "DELETE"],
          ] as const) {
            const reply = yield* app.request(path, {
              headers: bearer(key),
              method,
            });

            assert.strictEqual(reply.status, 404, `${method} ${path}`);
          }

          // Its external id is free again.
          const again = yield* customerOf(key, "Returning customer", "cus_9");

          yield* app.request(`/api/partner/workspaces/${again.id}`, {
            headers: bearer(key),
            method: "DELETE",
          });

          // Owning none, the account closes, and its keys with it.
          const closed = yield* app.request(`/api/workspaces/${home}/partner`, {
            headers: { cookie: owner.cookies },
            method: "DELETE",
          });

          assert.strictEqual(closed.status, 204);

          const after = yield* app.request("/api/partner", {
            headers: bearer(key),
          });

          assert.strictEqual(after.status, 401);
        })
    );

    it.effect(
      "hand a customer a hosted link, which returns only where the partner said",
      () =>
        Effect.gen(function* links() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("links");
          const { key } = yield* keyOf(owner, home);
          const customer = yield* customerOf(key, "Linked customer", "cus_l1");
          const base = `/api/workspaces/${customer.id}/connect-links`;

          yield* app.request(`/api/workspaces/${home}/partner`, {
            body: {
              logoUrl: "https://cdn.example.test/logo.png",
              returnOrigins: ["https://app.example.test"],
            },
            headers: { cookie: owner.cookies },
            method: "PATCH",
          });

          // Anywhere but an origin the partner registered is refused.
          for (const returnUrl of [
            "https://evil.example.test/social",
            "https://app.example.test.evil.example/social",
            "http://app.example.test/social",
          ]) {
            const refused = yield* app.request(base, {
              body: { platform: "mastodon", returnUrl },
              headers: bearer(key),
            });

            assert.strictEqual(refused.status, 422, returnUrl);
            assert.deepInclude(refused.body, {
              _tag: "ReturnUrlNotAllowed",
              code: "return_url_not_allowed",
            });
          }

          const created = yield* app.request(base, {
            body: {
              locale: "fr",
              platform: "mastodon",
              returnUrl: "https://app.example.test/social",
            },
            headers: bearer(key),
          });

          assert.strictEqual(created.status, 201);

          const { link, url } = yield* bodyOf(CreatedLinkSchema, created);
          const prefix = "http://localhost:3001/fr/connect/link/";

          assert.isTrue(url.startsWith(prefix));
          assert.strictEqual(link.status, "pending");

          const token = url.slice(prefix.length);
          const hosted = `/api/connect-links/${token}`;

          // Whoever holds the address opens it, without any credential,
          // and reads who asks: the partner, not Peal's workspace.
          const opened = yield* app.request(hosted);

          assert.strictEqual(opened.status, 200);
          assert.deepStrictEqual(yield* bodyOf(HostedSchema, opened), {
            host: {
              logoUrl: "https://cdn.example.test/logo.png",
              name: "links Suite",
            },
            input: "instance",
            platform: "mastodon",
            returnTo: `https://app.example.test/social?peal_link=${link.id}&peal_status=cancelled`,
            status: "pending",
          });

          // A token that opens nothing, whatever it looks like.
          const guessed = yield* app.request(`/api/connect-links/${link.id}`);

          assert.strictEqual(guessed.status, 404);

          // Its steps come from the web app's own pages only.
          const foreign = yield* app.request(`${hosted}/start`, {
            body: { instance: "social.example" },
            headers: { origin: "https://evil.example.test" },
          });

          assert.strictEqual(foreign.status, 403);

          // A server Peal may not call: told to the page, kept on the
          // link, which stays usable.
          const started = yield* app.request(`${hosted}/start`, {
            body: { instance: "localhost" },
          });

          assert.strictEqual(started.status, 422);

          const { reason } = yield* bodyOf(HostedFailureSchema, started);

          const read = yield* bodyOf(
            LinkSchema,
            yield* app.request(`${base}/${link.id}`, { headers: bearer(key) })
          );

          assert.deepStrictEqual(read, {
            channelIds: [],
            failure: reason,
            id: link.id,
            status: "pending",
          });

          // A callback without the browser that started completes nothing.
          const completed = yield* app.request(`${hosted}/complete`, {
            body: { code: "synthetic-code", state: "synthetic-state" },
          });

          assert.strictEqual(completed.status, 422);
          assert.strictEqual(
            (yield* bodyOf(HostedFailureSchema, completed)).reason,
            "invalidState"
          );

          // Another partner's key, and anyone without one, read no link.
          const other = yield* partnerOf("otherlinks");
          const otherKey = (yield* keyOf(other.owner, other.home)).key;

          for (const headers of [bearer(otherKey), {}]) {
            const reply = yield* app.request(`${base}/${link.id}`, { headers });

            assert.include([401, 404], reply.status);
          }

          // Taken back, it opens as revoked, and starts nothing.
          const revoked = yield* app.request(`${base}/${link.id}`, {
            headers: bearer(key),
            method: "DELETE",
          });

          assert.strictEqual(
            (yield* bodyOf(LinkSchema, revoked)).status,
            "revoked"
          );
          assert.strictEqual(
            (yield* bodyOf(HostedSchema, yield* app.request(hosted))).status,
            "revoked"
          );

          const afterRevoke = yield* app.request(`${hosted}/start`, {
            body: { instance: "localhost" },
          });

          assert.strictEqual(
            (yield* bodyOf(HostedFailureSchema, afterRevoke)).reason,
            "linkRevoked"
          );

          // Offboarded, the workspace's links open nothing at all.
          yield* app.request(`/api/partner/workspaces/${customer.id}`, {
            headers: bearer(key),
            method: "DELETE",
          });

          assert.strictEqual((yield* app.request(hosted)).status, 404);
        })
    );

    it.effect(
      "leave an ordinary workspace's links without a return address",
      () =>
        Effect.gen(function* ordinary() {
          const app = yield* TestApp;
          const member = yield* signedUpUnconfirmed("ordinary");
          const workspaceId = yield* workspaceOf(member, "Ordinary links");
          const base = `/api/workspaces/${workspaceId}/connect-links`;

          const refused = yield* app.request(base, {
            body: {
              platform: "mastodon",
              returnUrl: "https://app.example.test/social",
            },
            headers: { cookie: member.cookies },
          });

          assert.strictEqual(refused.status, 422);

          const created = yield* app.request(base, {
            body: { expiresInHours: 1, platform: "mastodon" },
            headers: { cookie: member.cookies },
          });

          assert.strictEqual(created.status, 201);

          const { url } = yield* bodyOf(CreatedLinkSchema, created);

          const opened = yield* bodyOf(
            HostedSchema,
            yield* app.request(
              `/api/connect-links/${url.slice(url.lastIndexOf("/") + 1)}`
            )
          );

          // Under the workspace's own name, and back to nowhere.
          assert.deepStrictEqual(opened, {
            host: { logoUrl: null, name: "Ordinary links" },
            input: "instance",
            platform: "mastodon",
            returnTo: null,
            status: "pending",
          });
        })
    );

    it.effect("go with their home workspace once they own none", () =>
      Effect.gen(function* goes() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const { home, owner, partner } = yield* partnerOf("goes");
        const { key } = yield* keyOf(owner, home);

        const deleted = yield* app.request(`/api/workspaces/${home}`, {
          body: { name: "goes" },
          headers: { cookie: owner.cookies },
          method: "DELETE",
        });

        assert.strictEqual(deleted.status, 204);

        const left = yield* sql`SELECT
          (SELECT count(*) FROM workspace.partners WHERE id = ${partner.id})::int
          + (SELECT count(*) FROM workspace.partner_keys WHERE partner_id = ${partner.id})::int AS rows`;

        assert.deepStrictEqual(
          yield* Schema.decodeUnknownEffect(CountSchema)(left),
          [{ rows: 0 }]
        );

        const after = yield* app.request("/api/partner", {
          headers: bearer(key),
        });

        assert.strictEqual(after.status, 401);
      })
    );
  }
);
