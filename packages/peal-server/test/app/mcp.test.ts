import { assert, layer } from "@effect/vitest";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { McpClient, McpProtocol } from "effect/ai";
import {
  AuthorizationServerSchema,
  ProtectedResourceSchema,
} from "peal-contract";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { freshChannel, syntheticCredentials } from "#test/channels/support.ts";
import {
  bodyOf,
  origin,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import type { Person } from "#test/workspace/integration/harness.ts";

import {
  authorize,
  connect,
  mcpResource,
  registeredClient,
  toolNamed,
} from "./mcp-support.ts";
import type { JsonRpcRequest } from "./mcp-support.ts";

// The MCP endpoint, as an MCP client meets it: a 401 that leads to the
// authorization server, dynamic registration, the authorization code flow
// with PKCE through the workspace picker and the consent page, then tool
// calls with a token bound to the workspace the user picked.

interface Fixture {
  readonly clientId: string;
  readonly owner: Person;
  /** A workspace with one channel. */
  readonly studio: string;
  readonly studioChannel: string;
  /** A workspace without channels. */
  readonly shop: string;
}

class McpFixture extends Context.Service<McpFixture, Fixture>()(
  "peal-server/test/McpFixture"
) {}

const McpFixtureLive = Layer.effect(
  McpFixture,
  Effect.gen(function* mcpFixture() {
    const owner = yield* signedUpUnconfirmed("agent-owner");
    const studio = yield* workspaceOf(owner, "Studio");
    const shop = yield* workspaceOf(owner, "Shop");

    const channel = yield* freshChannel(WorkspaceIdSchema.make(studio));

    yield* ChannelRepository.use((channels) =>
      channels.insert(channel, syntheticCredentials(channel))
    );

    const clientId = yield* registeredClient;

    return { clientId, owner, shop, studio, studioChannel: channel.id };
  })
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      TestApp.layerWith({
        ...unconfirmedEmails,
        MCP_DYNAMIC_REGISTRATION: "true",
      }),
      DrizzleChannelRepository.pipe(
        Layer.provideMerge(IdsLive),
        Layer.provideMerge(DatabaseLive)
      )
    )
  )
);

const WhoAmISchema = Schema.Struct({
  user: Schema.Struct({ id: Schema.String }),
  workspace: Schema.Struct({
    id: Schema.String,
    permissions: Schema.Array(Schema.String),
    role: Schema.String,
  }),
});

const WorkspacesSchema = Schema.Struct({
  workspaces: Schema.Array(
    Schema.Struct({ connected: Schema.Boolean, id: Schema.String })
  ),
});

const ChannelsSchema = Schema.Struct({
  channels: Schema.Array(Schema.Struct({ id: Schema.String })),
});

const HealthSchema = Schema.Struct({
  database: Schema.String,
  server: Schema.String,
});

// Calls every tool as the token's member.
const callTools = Effect.gen(function* callTools() {
  const client = yield* McpClient.McpClient;
  const tools = yield* client.listTools();

  const call = <S extends Schema.Top>(name: string, schema: S) =>
    client.callTool({ schema, tool: toolNamed(tools, name) });

  return {
    channels: yield* call("list_channels", ChannelsSchema),
    health: yield* call("server_health", HealthSchema),
    names: tools.map(({ name }) => name).toSorted(),
    whoami: yield* call("whoami", WhoAmISchema),
    workspaces: yield* call("list_workspaces", WorkspacesSchema),
  };
});

// The HTTP status and challenge a refused connection got.
const refusedConnection = (
  token: Option.Option<string>,
  protocol?: typeof McpProtocol.v2025_11_25
) =>
  McpClient.McpClient.pipe(
    Effect.provide(connect(token, protocol)),
    Effect.flip,
    Effect.map((error) =>
      error.reason._tag === "HttpError"
        ? {
            challenge: error.reason.wwwAuthenticate ?? "",
            status: error.reason.status,
          }
        : { challenge: "", status: 0 }
    )
  );

layer(McpFixtureLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "the MCP endpoint",
  (it) => {
    it.effect(
      "leads a client without a token to the authorization server",
      () =>
        Effect.gen(function* discovery() {
          const app = yield* TestApp;

          const refused = yield* refusedConnection(Option.none());

          assert.strictEqual(refused.status, 401);
          assert.include(
            refused.challenge,
            `resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`
          );

          const resource = yield* bodyOf(
            ProtectedResourceSchema,
            yield* app.request("/.well-known/oauth-protected-resource/api/mcp")
          );

          assert.strictEqual(resource.resource, mcpResource);
          assert.deepStrictEqual(resource.authorization_servers, [
            `${origin}/api/auth`,
          ]);

          const server = yield* bodyOf(
            AuthorizationServerSchema,
            yield* app.request(
              "/.well-known/oauth-authorization-server/api/auth"
            )
          );

          assert.strictEqual(
            server.registration_endpoint,
            `${origin}/api/auth/oauth2/register`
          );
        })
    );

    it.effect("refuses a token that is not one", () =>
      Effect.gen(function* forged() {
        const refused = yield* refusedConnection(
          Option.some("eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.c2ln")
        );

        assert.strictEqual(refused.status, 401);
        assert.include(refused.challenge, "resource_metadata=");
      })
    );

    it.effect(
      "asks a token that grants no workspace scope to step up, telling nothing of the user",
      () =>
        Effect.gen(function* identityOnly() {
          const fixture = yield* McpFixture;

          // The user agreed to the client knowing who they are, nothing more.
          const token = yield* authorize(
            fixture.owner,
            fixture.clientId,
            fixture.shop,
            "openid"
          );

          const refused = yield* refusedConnection(Option.some(token));

          assert.strictEqual(refused.status, 403);
          assert.include(refused.challenge, 'error="insufficient_scope"');
          assert.include(refused.challenge, 'scope="workspace:read"');
          assert.include(
            refused.challenge,
            `resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`
          );
        })
    );

    it.effect("acts in the workspace the user picked, reading only", () =>
      Effect.gen(function* picked() {
        const fixture = yield* McpFixture;

        const token = yield* authorize(
          fixture.owner,
          fixture.clientId,
          fixture.studio,
          "openid offline_access workspace:read"
        );

        const results = yield* callTools.pipe(
          Effect.provide(connect(Option.some(token)))
        );

        // Every tool is listed; those that change something refuse.
        assert.deepStrictEqual(results.names, [
          "analytics_dashboard",
          "analytics_summary",
          "approve_post",
          "await_post",
          "boost_post",
          "cancel_post",
          "channel_analytics",
          "clear_channel_defaults",
          "confirm_comment_reply",
          "confirm_target",
          "create_channel_set",
          "create_connect_link",
          "create_draft",
          "create_post",
          "create_posts",
          "create_queue",
          "create_signature",
          "create_tag",
          "create_webhook",
          "delete_channel_set",
          "delete_queue",
          "delete_signature",
          "delete_tag",
          "disable_channel",
          "discard_draft",
          "duplicate_post",
          "edit_published_post",
          "enable_channel",
          "find_tools",
          "get_ad_account",
          "get_ad_insights",
          "get_ads_status",
          "get_billing",
          "get_boost",
          "get_channel_capabilities",
          "get_channel_defaults",
          "get_comment_thread",
          "get_connect_link",
          "get_partner_account",
          "get_partner_usage",
          "get_post",
          "get_post_ad_performance",
          "get_post_review",
          "get_recycling_rule",
          "get_tiktok_creator",
          "get_usage",
          "import_media",
          "invite_member",
          "list_activity",
          "list_ad_campaigns",
          "list_approvals",
          "list_boosts",
          "list_channel_sets",
          "list_channels",
          "list_comment_threads",
          "list_connect_links",
          "list_drafts",
          "list_invitations",
          "list_media",
          "list_members",
          "list_partner_workspaces",
          "list_post_attempts",
          "list_post_changes",
          "list_posts",
          "list_queues",
          "list_recycling_rules",
          "list_signatures",
          "list_tags",
          "list_webhook_deliveries",
          "list_webhooks",
          "list_workspaces",
          "mark_comment_answered",
          "moderate_comment",
          "pause_boost",
          "post_analytics",
          "preview_queue",
          "publish_post",
          "queue_post",
          "quote_boost",
          "recycle_post",
          "redeliver_webhooks",
          "rename_channel",
          "reply_to_comment",
          "repost_target",
          "request_changes",
          "reschedule_post",
          "reshuffle_queue",
          "resume_boost",
          "resume_recycling_rule",
          "revoke_connect_link",
          "revoke_invitation",
          "run_channel_lookup",
          "schedule_post",
          "send_test_webhook",
          "server_health",
          "set_channel_defaults",
          "stop_boost",
          "stop_recycling_rule",
          "tag_post",
          "unpublish_post",
          "unschedule_post",
          "update_channel_set",
          "update_draft",
          "update_queue",
          "update_recycling_rule",
          "update_signature",
          "update_tag",
          "update_webhook",
          "validate_post",
          "whoami",
          "withdraw_comment_reply",
        ]);
        assert.strictEqual(results.whoami.user.id, fixture.owner.id);
        assert.strictEqual(results.whoami.workspace.id, fixture.studio);
        assert.strictEqual(results.whoami.workspace.role, "owner");
        // The user agreed to reading only.
        assert.include(results.whoami.workspace.permissions, "channel:read");
        assert.notInclude(results.whoami.workspace.permissions, "post:publish");
        assert.deepStrictEqual(
          results.channels.channels.map(({ id }) => id),
          [fixture.studioChannel]
        );
        assert.deepStrictEqual(
          results.workspaces.workspaces
            .map(({ connected, id }) => ({ connected, id }))
            .toSorted((a, b) => a.id.localeCompare(b.id)),
          [
            { connected: true, id: fixture.studio },
            { connected: false, id: fixture.shop },
          ].toSorted((a, b) => a.id.localeCompare(b.id))
        );
        assert.deepStrictEqual(results.health, {
          database: "up",
          server: "up",
        });
      })
    );

    it.effect(
      "keeps a token for another workspace to that workspace, then refuses it once the user left",
      () =>
        Effect.gen(function* elsewhere() {
          const app = yield* TestApp;
          const fixture = yield* McpFixture;
          const workspace = yield* workspaceOf(fixture.owner, "Pop-up");

          const token = yield* authorize(
            fixture.owner,
            fixture.clientId,
            workspace,
            "openid workspace:read workspace:write workspace:publish"
          );

          // Over the sessionful revision as well.
          const results = yield* callTools.pipe(
            Effect.provide(connect(Option.some(token), McpProtocol.v2025_11_25))
          );

          assert.strictEqual(results.whoami.workspace.id, workspace);
          assert.include(results.whoami.workspace.permissions, "post:publish");
          assert.deepStrictEqual(results.channels.channels, []);

          const deleted = yield* app.request(`/api/workspaces/${workspace}`, {
            body: { name: "Pop-up" },
            headers: { cookie: fixture.owner.cookies },
            method: "DELETE",
          });

          assert.strictEqual(deleted.status, 204);

          const refused = yield* refusedConnection(
            Option.some(token),
            McpProtocol.v2025_11_25
          );

          // Signing in again would not help: no challenge.
          assert.strictEqual(refused.status, 403);
          assert.strictEqual(refused.challenge, "");
        })
    );

    it.effect("lets a client end its session, with its token only", () =>
      Effect.gen(function* endSession() {
        const app = yield* TestApp;
        const fixture = yield* McpFixture;
        const workspace = yield* workspaceOf(fixture.owner, "Kiosk");

        const token = yield* authorize(
          fixture.owner,
          fixture.clientId,
          workspace,
          "workspace:read"
        );

        // As an MCP client sends them: with no Origin header.
        const send = (
          method: "DELETE" | "POST",
          headers: Readonly<Record<string, string>>,
          body?: JsonRpcRequest
        ) =>
          Effect.promise(
            async () =>
              await app.handler(
                new Request(mcpResource, {
                  body: body === undefined ? undefined : JSON.stringify(body),
                  headers: {
                    accept: "application/json, text/event-stream",
                    "content-type": "application/json",
                    ...headers,
                  },
                  method,
                })
              )
          );

        const authorization = { authorization: `Bearer ${token}` };

        const initialized = yield* send("POST", authorization, {
          id: 1,
          jsonrpc: "2.0",
          method: "initialize",
          params: {
            capabilities: {},
            clientInfo: { name: "peal-test", version: "1.0.0" },
            protocolVersion: "2025-11-25",
          },
        });

        assert.strictEqual(initialized.status, 200);

        const session = {
          "mcp-protocol-version": "2025-11-25",
          "mcp-session-id": initialized.headers.get("mcp-session-id") ?? "",
        };

        assert.notStrictEqual(session["mcp-session-id"], "");

        // Without a token, the session stays.
        assert.strictEqual((yield* send("DELETE", session)).status, 401);
        assert.strictEqual(
          (yield* send("DELETE", { ...authorization, ...session })).status,
          204
        );

        const listed = yield* send(
          "POST",
          { ...authorization, ...session },
          { id: 2, jsonrpc: "2.0", method: "tools/list" }
        );

        assert.strictEqual(listed.status, 404);
      })
    );
  }
);
