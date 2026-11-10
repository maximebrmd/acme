// What a partner key meets across the server, where partner accounts cross
// the API's conventions, the posting API and the activity log: the request
// id and the rate limit, posts checked, sent several at once, imported and
// searched in a workspace its partner owns and in none other, and a log of
// what it asked to change.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { ActivityPageSchema } from "peal-contract";

import { SqlLive } from "#shared/infrastructure/database.ts";
import {
  bodyOf,
  TestApp,
  unconfirmedEmails,
} from "#test/workspace/integration/harness.ts";
import {
  bearer,
  customerOf,
  everyPermission,
  keyOf,
  partnerOf,
} from "#test/workspace/integration/partner-support.ts";
import { seedChannel } from "#test/workspace/integration/seed.ts";

const Test = Layer.mergeAll(
  TestApp.layerWith({
    ...unconfirmedEmails,
    PEAL_PARTNER_SELF_SERVICE: "true",
  }),
  SqlLive
);

const PageJsonSchema = Schema.toCodecJson(ActivityPageSchema);

// What the `RateLimit` header says is left.
const left = /^"default";r=(?<remaining>\d+);t=\d+$/u;

const remainingOf = (headers: Headers) =>
  Number(left.exec(headers.get("ratelimit") ?? "")?.groups?.["remaining"]);

const requestId = /^[\w.:-]{8,}$/u;

const content = (text: string) => ({ media: [], overrides: [], text });

const later = { _tag: "at", at: "2031-03-04T09:00:00Z", timeZone: "UTC" };

const ErrorSchema = Schema.Struct({
  _tag: Schema.String,
  code: Schema.String,
  message: Schema.String,
  requestId: Schema.String,
});

const BulkSchema = Schema.Struct({
  created: Schema.Int,
  items: Schema.Array(
    Schema.Struct({
      _tag: Schema.String,
      refusal: Schema.optionalKey(
        Schema.Struct({ _tag: Schema.String, code: Schema.String })
      ),
    })
  ),
  refused: Schema.Int,
});

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "a partner key across the server",
  (it) => {
    it.effect(
      "is counted as one credential, wherever it asks, and every answer names its request",
      () =>
        Effect.gen(function* counted() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("seam-limits");
          const { key } = yield* keyOf(owner, home);
          const customer = yield* customerOf(key, "Counted", "cus_seam_1");

          const overview = yield* app.request("/api/partner", {
            headers: bearer(key),
          });

          const inside = yield* app.request(
            `/api/workspaces/${customer.id}/channels`,
            { headers: bearer(key) }
          );

          assert.strictEqual(overview.status, 200);
          assert.strictEqual(inside.status, 200);

          // One count for the key, on the partner API and in a workspace.
          assert.strictEqual(
            overview.headers.get("ratelimit-policy"),
            '"default";q=600;w=60'
          );

          const before = remainingOf(overview.headers);
          const after = remainingOf(inside.headers);

          // The window may turn between the two.
          assert.isTrue(after === before - 1 || after === 599, `${after}`);

          for (const reply of [overview, inside]) {
            assert.match(reply.headers.get("x-request-id") ?? "", requestId);
          }

          // The caller's own id comes back, on a refusal too, in its body.
          const elsewhere = yield* app.request(
            `/api/workspaces/${home}/channels`,
            {
              headers: { ...bearer(key), "x-request-id": "seam-request-0001" },
            }
          );

          assert.strictEqual(elsewhere.status, 404);
          assert.strictEqual(
            elsewhere.headers.get("x-request-id"),
            "seam-request-0001"
          );
          assert.deepInclude(yield* bodyOf(ErrorSchema, elsewhere), {
            _tag: "WorkspaceNotFound",
            code: "workspace_not_found",
            requestId: "seam-request-0001",
          });
        })
    );

    it.effect(
      "names its request on a hosted page's answers, which no key's limit counts",
      () =>
        Effect.gen(function* hosted() {
          const app = yield* TestApp;

          const missing = yield* app.request(
            "/api/connect-links/synthetic-token-that-opens-nothing",
            { headers: { "x-request-id": "seam-request-0002" } }
          );

          assert.strictEqual(missing.status, 404);
          assert.strictEqual(
            missing.headers.get("x-request-id"),
            "seam-request-0002"
          );
          assert.isNull(missing.headers.get("ratelimit"));
          assert.deepInclude(yield* bodyOf(ErrorSchema, missing), {
            _tag: "ConnectLinkNotFound",
            code: "connect_link_not_found",
            requestId: "seam-request-0002",
          });
        })
    );

    it.effect(
      "checks, sends several, imports and searches posts in a workspace its partner owns, and in no other",
      () =>
        Effect.gen(function* posting() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("seam-posting");
          const { key } = yield* keyOf(owner, home);
          const customer = yield* customerOf(key, "Posting", "cus_seam_2");
          const stranger = yield* partnerOf("seam-stranger");
          const channel = yield* seedChannel(customer.id, "seam@social.test");
          const headers = bearer(key);

          const calls = (workspaceId: string) =>
            [
              {
                body: {
                  channelIds: [channel],
                  content: content("A synthetic check."),
                  when: later,
                },
                path: "/posts/validate",
              },
              {
                body: {
                  posts: [
                    {
                      channelIds: ["not-a-channel"],
                      content: content("Nowhere."),
                      when: later,
                    },
                    {
                      channelIds: [channel],
                      content: content("a".repeat(501)),
                      when: later,
                    },
                  ],
                },
                path: "/posts/bulk",
              },
              {
                body: {
                  csv: `text,channels,at\nA synthetic row.,${channel},2031-03-04T09:00:00Z`,
                  dryRun: true,
                },
                path: "/posts/import",
              },
              { body: undefined, path: "/posts/search?status=scheduled" },
            ].map(({ body, path }) => ({
              body,
              path: `/api/workspaces/${workspaceId}${path}`,
            }));

          const owned = yield* Effect.forEach(
            calls(customer.id),
            ({ body, path }) => app.request(path, { body, headers }),
            { concurrency: 1 }
          );

          assert.deepStrictEqual(
            owned.map(({ status }) => status),
            [200, 200, 200, 200]
          );

          const [validation, bulk, imported] = owned;

          assert.deepInclude(validation?.body, { valid: true });
          assert.deepInclude(imported?.body, { created: 0, dryRun: true });

          // Each item refused inside the 200 carries the code its error has.
          const sent = yield* Effect.fromNullishOr(bulk).pipe(
            Effect.flatMap((reply) => bodyOf(BulkSchema, reply))
          );

          assert.deepStrictEqual(
            sent.items.map(({ refusal }) => refusal),
            [
              { _tag: "UnknownChannels", code: "unknown_channels" },
              { _tag: "PostContentInvalid", code: "post_content_invalid" },
            ]
          );

          // Its home workspace and another partner's read as no workspace.
          for (const workspaceId of [home, stranger.home]) {
            const refused = yield* Effect.forEach(
              calls(workspaceId),
              ({ body, path }) => app.request(path, { body, headers }),
              { concurrency: 1 }
            );

            assert.deepStrictEqual(
              refused.map(({ status }) => status),
              [404, 404, 404, 404],
              workspaceId
            );
          }
        })
    );

    it.effect(
      "is told why it is refused: the scope or the permission it lacks, or the origin",
      () =>
        Effect.gen(function* refusals() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("seam-refusals");
          const full = yield* keyOf(owner, home);
          const customer = yield* customerOf(full.key, "Refused", "cus_seam_4");

          const reading = yield* keyOf(owner, home, {
            permissions: ["channel:read"],
            scopes: ["workspaces:read"],
          });

          const RefusalSchema = Schema.Struct({
            _tag: Schema.Literal("Forbidden"),
            code: Schema.Literal("forbidden"),
            message: Schema.String,
            permission: Schema.optionalKey(Schema.String),
            reason: Schema.optionalKey(Schema.String),
            scope: Schema.optionalKey(Schema.String),
          });

          // A scope of the partner API.
          const unscoped = yield* app.request("/api/partner/workspaces", {
            body: { name: "Never made" },
            headers: bearer(reading.key),
          });

          assert.strictEqual(unscoped.status, 403);

          const scope = yield* bodyOf(RefusalSchema, unscoped);

          assert.deepInclude(scope, {
            reason: "missingScope",
            scope: "workspaces:write",
          });
          assert.include(scope.message, "workspaces:write");

          // A permission inside a workspace its partner owns.
          const unpermitted = yield* app.request(
            `/api/workspaces/${customer.id}/connect-links`,
            { body: { platform: "mastodon" }, headers: bearer(reading.key) }
          );

          assert.strictEqual(unpermitted.status, 403);

          const permission = yield* bodyOf(RefusalSchema, unpermitted);

          assert.deepInclude(permission, {
            permission: "channel:connect",
            reason: "missingPermission",
          });
          assert.include(permission.message, "partner key");

          // The partner API takes partner keys alone.
          const inPerson = yield* app.request("/api/partner", {
            headers: { cookie: owner.cookies },
          });

          assert.strictEqual(inPerson.status, 403);
          assert.include(
            (yield* bodyOf(RefusalSchema, inPerson)).message,
            "partner key"
          );

          // A hosted page's step sent from another site.
          const foreign = yield* app.request(
            "/api/connect-links/synthetic-token-that-opens-nothing/start",
            {
              body: { instance: "social.example" },
              headers: { origin: "https://evil.example.test" },
            }
          );

          assert.strictEqual(foreign.status, 403);
          assert.deepInclude(yield* bodyOf(RefusalSchema, foreign), {
            reason: "untrustedOrigin",
          });
        })
    );

    it.effect(
      "leaves what it asked to change in the workspace's activity log, and reads it",
      () =>
        Effect.gen(function* logged() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("seam-activity");

          const { key, partnerKey } = yield* keyOf(owner, home, {
            permissions: [...everyPermission, "activity:read"],
          });

          const customer = yield* customerOf(key, "Logged", "cus_seam_3");
          const channel = yield* seedChannel(customer.id, "log@social.test");
          const headers = bearer(key);
          const base = `/api/workspaces/${customer.id}`;

          // Renamed through the partner API.
          const renamed = yield* app.request(
            `/api/partner/workspaces/${customer.id}`,
            { body: { name: "Logged again" }, headers, method: "PATCH" }
          );

          assert.strictEqual(renamed.status, 200);

          // A draft, a check, a dry run and several posts at once.
          const drafted = yield* app.request(`${base}/posts`, {
            body: { channelIds: [], content: content("A synthetic draft.") },
            headers,
          });

          assert.strictEqual(drafted.status, 201);

          yield* app.request(`${base}/posts/validate`, {
            body: {
              channelIds: [channel],
              content: content("A synthetic check."),
              when: later,
            },
            headers,
          });
          yield* app.request(`${base}/posts/import`, {
            body: {
              csv: `text,channels,at\nA synthetic row.,${channel},2031-03-04T09:00:00Z`,
              dryRun: true,
            },
            headers,
          });
          yield* app.request(`${base}/posts/bulk`, {
            body: {
              posts: [
                {
                  channelIds: ["not-a-channel"],
                  content: content("Nowhere."),
                  when: later,
                },
              ],
            },
            headers,
          });

          const log = yield* app.request(`${base}/activity`, { headers });

          assert.strictEqual(log.status, 200);

          const { items } = yield* bodyOf(PageJsonSchema, log);

          // Newest first: one event for the request that sent several
          // posts, one for the draft; a check and a dry run change nothing,
          // and leave nothing.
          assert.deepStrictEqual(
            items.map(({ actor, application, operation, status, via }) => ({
              actor,
              application,
              operation,
              status,
              via,
            })),
            (
              [
                ["posts.bulk", 200],
                ["posts.create", 201],
                // The workspace's own making and renaming, by the partner.
                ["partner.updateWorkspace", 200],
                ["partner.createWorkspace", 201],
              ] as const
            ).map(([operation, status]) => ({
              actor: { _tag: "apiKey" as const, apiKeyId: partnerKey.id },
              application: { id: partnerKey.id, name: "backend" },
              operation,
              status,
              via: "partnerKey" as const,
            }))
          );

          // A key without the permission does not read the log.
          const plain = yield* keyOf(owner, home);

          const denied = yield* app.request(`${base}/activity`, {
            headers: bearer(plain.key),
          });

          assert.strictEqual(denied.status, 403);
        })
    );
  }
);
