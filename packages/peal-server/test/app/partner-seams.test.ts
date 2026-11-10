// What a partner key meets across the server, where partner accounts cross
// the API's conventions, the posting API and the activity log: the request
// id and the rate limit, posts checked, sent several at once, imported and
// searched in a workspace its partner owns and in none other, and a log of
// what it asked to change.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Schema } from "effect";
import { McpClient, McpProtocol } from "effect/ai";
import { ActivityPageSchema, PostSchema } from "peal-contract";

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

import { connect, mcpResource, toolNamed } from "./mcp-support.ts";

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

const messageOf = (response: Response) =>
  Effect.promise(async () => await response.text());

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

    it.effect(
      "acts on the MCP endpoint in the workspace it names, one its partner owns",
      () =>
        Effect.gen(function* mcp() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("seam-mcp");

          const { key, partnerKey } = yield* keyOf(owner, home, {
            permissions: [...everyPermission, "activity:read"],
          });

          const customer = yield* customerOf(key, "Agent", "cus_seam_5");
          const stranger = yield* partnerOf("seam-mcp-stranger");

          // As an MCP client sends them: with no Origin header.
          const initialize = (headers: Readonly<Record<string, string>>) =>
            Effect.promise(
              async () =>
                await app.handler(
                  new Request(mcpResource, {
                    body: JSON.stringify({
                      id: 1,
                      jsonrpc: "2.0",
                      method: "initialize",
                      params: {
                        capabilities: {},
                        clientInfo: { name: "peal-test", version: "1.0.0" },
                        protocolVersion: "2025-11-25",
                      },
                    }),
                    headers: {
                      accept: "application/json, text/event-stream",
                      "content-type": "application/json",
                      ...headers,
                    },
                    method: "POST",
                  })
                )
            );

          // Its key spans workspaces: it says which one it means.
          const unnamed = yield* initialize(bearer(key));

          assert.strictEqual(unnamed.status, 400);
          assert.include(yield* messageOf(unnamed), "Peal-Workspace");

          // Its home workspace, another partner's and no workspace at all
          // read the same: as no workspace.
          for (const workspace of [home, stranger.home, "not-a-workspace"]) {
            const elsewhere = yield* initialize({
              ...bearer(key),
              "peal-workspace": workspace,
            });

            assert.strictEqual(elsewhere.status, 404, workspace);
          }

          // A key that does not work is led to sign in, as any is.
          const unknown = yield* initialize({
            ...bearer("peal_partner_synthetic-key-that-was-never-issued"),
            "peal-workspace": customer.id,
          });

          assert.strictEqual(unknown.status, 401);
          assert.include(
            unknown.headers.get("www-authenticate") ?? "",
            "resource_metadata"
          );

          assert.strictEqual(
            (yield* initialize({
              ...bearer(key),
              "peal-workspace": customer.id,
            })).status,
            200
          );

          // The tools then act there, with the key's permissions.
          const context = yield* Layer.build(
            connect(Option.some(key), McpProtocol.v2026_07_28, {
              "peal-workspace": customer.id,
            })
          );

          const client = yield* McpClient.McpClient.pipe(
            Effect.provide(context)
          );

          const tools = yield* client.listTools().pipe(Effect.provide(context));

          const who = yield* client
            .callTool({
              arguments: {},
              schema: Schema.Struct({
                apiKey: Schema.Struct({
                  id: Schema.String,
                  name: Schema.String,
                }),
                user: Schema.Null,
                workspace: Schema.Struct({
                  id: Schema.String,
                  name: Schema.String,
                }),
              }),
              tool: toolNamed(tools, "whoami"),
            })
            .pipe(Effect.provide(context));

          assert.deepStrictEqual(who, {
            apiKey: { id: partnerKey.id, name: "backend" },
            user: null,
            workspace: { id: customer.id, name: "Agent" },
          });

          const draft = yield* client
            .callTool({
              arguments: {
                channelIds: [],
                content: content("A synthetic draft from a partner's agent."),
              },
              schema: Schema.toCodecJson(PostSchema),
              tool: toolNamed(tools, "create_draft"),
            })
            .pipe(Effect.provide(context));

          assert.strictEqual(draft.status, "draft");

          // Kept in the workspace's log as the tool's call, by the key.
          const log = yield* app.request(
            `/api/workspaces/${customer.id}/activity?operation=mcp.create_draft`,
            { headers: bearer(key) }
          );

          assert.deepStrictEqual(
            (yield* bodyOf(PageJsonSchema, log)).items.map(
              ({ actor, application, via }) => ({ actor, application, via })
            ),
            [
              {
                actor: { _tag: "apiKey", apiKeyId: partnerKey.id },
                application: { id: partnerKey.id, name: "backend" },
                via: "mcp",
              },
            ]
          );
        }).pipe(Effect.scoped)
    );
  }
);

// Billing on, against no Stripe at all: nothing here orders or pays, and a
// workspace without a subscription is on the free plan.
const BillingTest = Layer.mergeAll(
  TestApp.layerWith({
    ...unconfirmedEmails,
    PEAL_PARTNER_SELF_SERVICE: "true",
    STRIPE_API_URL: "http://127.0.0.1:9",
    STRIPE_SECRET_KEY: "sk_test_synthetic_partner_seams",
    STRIPE_WEBHOOK_SECRET: "whsec_synthetic_seams_test_secret",
  }),
  SqlLive
);

const ShortfallSchema = Schema.Struct({
  planLimit: Schema.NullOr(Schema.Struct({ limit: Schema.String })),
  valid: Schema.Boolean,
});

const RefusedItemsSchema = Schema.Struct({
  created: Schema.Int,
  items: Schema.Array(
    Schema.Struct({
      _tag: Schema.Literal("refused"),
      refusal: Schema.Struct({
        _tag: Schema.String,
        code: Schema.String,
        limit: Schema.String,
      }),
    })
  ),
});

layer(BillingTest, { excludeTestServices: true, timeout: "180 seconds" })(
  "a partner's workspaces on a server that bills",
  (it) => {
    it.effect(
      "send nothing, one post or several, while the partner holds more channels than its plan allows across them all",
      () =>
        Effect.gen(function* pooled() {
          const app = yield* TestApp;
          const { home, owner } = yield* partnerOf("seam-pool");
          const { key } = yield* keyOf(owner, home);
          const customer = yield* customerOf(key, "Pooled", "cus_seam_6");
          const headers = bearer(key);
          const base = `/api/workspaces/${customer.id}/posts`;

          const channel = yield* seedChannel(customer.id, "one@social.test");

          const post = {
            channelIds: [channel],
            content: content("A synthetic post of a pooled plan."),
            when: later,
          };

          const validate = app
            .request(`${base}/validate`, { body: post, headers })
            .pipe(Effect.flatMap((reply) => bodyOf(ShortfallSchema, reply)));

          // Three channels on the free plan, the home workspace's and the
          // customer's together: within it.
          yield* seedChannel(home, "home-one@social.test");
          yield* seedChannel(home, "home-two@social.test");

          assert.deepStrictEqual(yield* validate, {
            planLimit: null,
            valid: true,
          });

          // A fourth, as a plan that shrank leaves them: no workspace of
          // the partner holds more than three itself, and all of them
          // together do.
          yield* seedChannel(customer.id, "two@social.test");

          assert.deepStrictEqual(yield* validate, {
            planLimit: { limit: "channels" },
            valid: false,
          });

          const bulk = yield* app.request(`${base}/bulk`, {
            body: { posts: [post, post] },
            headers,
          });

          assert.strictEqual(bulk.status, 200);

          const sent = yield* bodyOf(RefusedItemsSchema, bulk);

          assert.strictEqual(sent.created, 0);
          assert.deepStrictEqual(
            sent.items.map(({ refusal }) => refusal),
            [0, 1].map(() => ({
              _tag: "PlanLimitReached",
              code: "plan_limit_reached",
              limit: "channels",
            }))
          );

          const imported = yield* app.request(`${base}/import`, {
            body: {
              csv: `text,channels,at\nA synthetic row.,${channel},2031-03-04T09:00:00Z`,
            },
            headers,
          });

          assert.strictEqual(imported.status, 200);
          assert.deepInclude(imported.body, { created: 0 });
        })
    );
  }
);
