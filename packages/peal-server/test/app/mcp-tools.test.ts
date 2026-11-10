import { assert, layer } from "@effect/vitest";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { McpClient } from "effect/ai";
import type { McpSchema } from "effect/ai";
import { SqlClient } from "effect/sql";
import { InvitationSchema, PostSchema } from "peal-contract";
import type { TargetOptions } from "peal-contract";

import { ListedMemberSchema } from "#app/mcp/people-tools.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { freshChannel, syntheticCredentials } from "#test/channels/support.ts";
import {
  apiKeyOf,
  emailTo,
  newEmail,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

import {
  authorize,
  connect,
  registeredClient,
  toolNamed,
} from "./mcp-support.ts";

// The tools that read and change a workspace, as an MCP client calls them:
// their annotations, what they answer, and what a connection that reads
// only, or a role that does not allow it, is refused.

interface Fixture {
  readonly channelId: string;
  /**
   * An API key of the workspace that reads and writes drafts and reads
   * channels, and nothing else.
   */
  readonly draftingKey: string;
  /** A YouTube channel of the workspace. */
  readonly youtubeId: string;
  /**
   * A token that may do what the owner's role allows in the workspace, but
   * what puts posts out.
   */
  readonly writing: string;
  /** A token that may do everything the owner's role allows. */
  readonly publishing: string;
  /** A token that may only read the workspace. */
  readonly reading: string;
  readonly workspaceId: string;
}

class ToolsFixture extends Context.Service<ToolsFixture, Fixture>()(
  "peal-server/test/ToolsFixture"
) {}

const ToolsFixtureLive = Layer.effect(
  ToolsFixture,
  Effect.gen(function* toolsFixture() {
    const owner = yield* signedUpUnconfirmed("tools-owner");
    const workspaceId = yield* workspaceOf(owner, "Atelier");
    const channel = yield* freshChannel(WorkspaceIdSchema.make(workspaceId));

    const youtube = yield* freshChannel(WorkspaceIdSchema.make(workspaceId), {
      platform: "youtube",
    });

    yield* ChannelRepository.use((channels) =>
      Effect.all([
        channels.insert(channel, syntheticCredentials(channel)),
        channels.insert(youtube, syntheticCredentials(youtube)),
      ])
    );

    const clientId = yield* registeredClient;

    // Each asks for more than the one before, so the consent page comes
    // back every time: a consent covers only what it was given for.
    const reading = yield* authorize(
      owner,
      clientId,
      workspaceId,
      "openid workspace:read"
    );

    const writing = yield* authorize(
      owner,
      clientId,
      workspaceId,
      "openid workspace:read workspace:write"
    );

    const publishing = yield* authorize(
      owner,
      clientId,
      workspaceId,
      "openid workspace:read workspace:write workspace:publish"
    );

    const { key } = yield* apiKeyOf(owner, workspaceId, [
      "channel:read",
      "post:read",
      "post:create",
    ]);

    return {
      channelId: channel.id,
      draftingKey: key,
      publishing,
      reading,
      workspaceId,
      writing,
      youtubeId: youtube.id,
    };
  })
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      TestApp.layerWith({
        ...unconfirmedEmails,
        MCP_DYNAMIC_REGISTRATION: "true",
        PEAL_LEGAL_RETENTION: "true",
      }),
      DrizzleChannelRepository.pipe(
        Layer.provideMerge(IdsLive),
        Layer.provideMerge(DatabaseLive)
      )
    )
  )
);

// Replies are JSON, which writes instants as strings.
const PostJsonSchema = Schema.toCodecJson(PostSchema);

const DraftPageJsonSchema = Schema.toCodecJson(
  Schema.Struct({
    items: Schema.Array(PostSchema),
    nextCursor: Schema.NullOr(Schema.String),
  })
);

const TextContentSchema = Schema.Struct({
  text: Schema.String,
  type: Schema.Literal("text"),
});

const decodeText = Schema.decodeUnknownOption(TextContentSchema);

/** What a refused call told the client, as text. */
const refusalOf = (result: McpSchema.CallToolResult) =>
  result.content
    .flatMap((block) => Option.toArray(decodeText(block)))
    .map(({ text }) => text)
    .join("\n");

// What a tool call carries, as the MCP schema has it.
type ToolArguments = NonNullable<
  (typeof McpSchema.CallTool.payloadSchema.Type)["arguments"]
>;

// How many connections that made content the legal records keep for the
// workspace, through the MCP endpoint.
const mcpConnections = Effect.fn("mcpConnections")(function* mcpConnections(
  workspaceId: string
) {
  const sql = yield* SqlClient.SqlClient;

  const [row] =
    yield* sql`SELECT count(*)::int AS count FROM legal.connections WHERE workspace_id = ${workspaceId} AND access = 'mcp'`.pipe(
      Effect.flatMap(
        Schema.decodeUnknownEffect(
          Schema.Array(Schema.Struct({ count: Schema.Number }))
        )
      ),
      Effect.orDie
    );

  return row?.count ?? 0;
});

// A client connected with the token for the test's scope, and its tools by
// name: `call` decodes a success, `refused` answers the text of a refusal.
// Requests read the in-process transport from the context, so each one
// runs in the connection's.
const connected = Effect.fn("connected")(function* connected(token: string) {
  const context = yield* Layer.build(connect(Option.some(token)));
  const client = yield* McpClient.McpClient.pipe(Effect.provide(context));
  const listed = yield* client.listTools().pipe(Effect.provide(context));

  return {
    call: <S extends Schema.Top>(
      name: string,
      schema: S,
      args: ToolArguments = {}
    ) =>
      client
        .callTool({ arguments: args, schema, tool: toolNamed(listed, name) })
        .pipe(Effect.provide(context)),
    listed,
    refused: (name: string, args: ToolArguments = {}) =>
      client.callTool({ arguments: args, tool: toolNamed(listed, name) }).pipe(
        Effect.provide(context),
        Effect.map((result) => {
          assert.isTrue(result.isError, `${name} should have been refused`);

          return refusalOf(result);
        })
      ),
  };
});

const content = (text: string) => ({ media: [], overrides: [], text });

layer(ToolsFixtureLive, { excludeTestServices: true, timeout: "180 seconds" })(
  "the MCP tools",
  (it) => {
    it.effect("tell clients what each tool changes", () =>
      Effect.gen(function* hintsOfTools() {
        const fixture = yield* ToolsFixture;

        const { listed } = yield* connected(fixture.reading);

        const hints = Object.fromEntries(
          listed.map(({ annotations, name }) => [
            name,
            [
              annotations?.readOnlyHint,
              annotations?.destructiveHint,
              annotations?.idempotentHint,
              annotations?.openWorldHint,
            ],
          ])
        );

        // Read only, destructive, idempotent, open world.
        assert.deepStrictEqual(hints, {
          analytics_summary: [true, false, true, false],
          cancel_post: [false, true, true, false],
          confirm_target: [false, true, true, false],
          create_draft: [false, false, false, false],
          create_post: [false, false, false, true],
          // An endpoint is a server outside Peal, which then hears of the
          // workspace.
          create_webhook: [false, false, false, true],
          discard_draft: [false, true, true, false],
          find_tools: [true, false, true, false],
          get_billing: [true, false, true, false],
          get_post: [true, false, true, false],
          get_tiktok_creator: [true, false, true, true],
          import_media: [false, false, false, true],
          invite_member: [false, true, false, true],
          list_activity: [true, false, true, false],
          list_channels: [true, false, true, false],
          list_drafts: [true, false, true, false],
          list_invitations: [true, false, true, false],
          list_media: [true, false, true, false],
          list_members: [true, false, true, false],
          list_post_attempts: [true, false, true, false],
          list_posts: [true, false, true, false],
          list_webhook_deliveries: [true, false, true, false],
          list_webhooks: [true, false, true, false],
          list_workspaces: [true, false, true, false],
          post_analytics: [true, false, true, false],
          publish_post: [false, false, false, true],
          repost_target: [false, false, false, true],
          reschedule_post: [false, true, true, true],
          revoke_invitation: [false, true, true, false],
          schedule_post: [false, false, false, true],
          server_health: [true, false, true, false],
          unschedule_post: [false, true, true, false],
          update_draft: [false, true, true, false],
          whoami: [true, false, true, false],
        });

        for (const tool of listed) {
          assert.isNotEmpty(tool.description ?? "", tool.name);
        }
      })
    );

    it.effect(
      "list themselves by area, with the scope each takes and whether the connection holds it",
      () =>
        Effect.gen(function* discovery() {
          const fixture = yield* ToolsFixture;
          const reader = yield* connected(fixture.reading);
          const writer = yield* connected(fixture.writing);

          const FoundSchema = Schema.Struct({
            tools: Schema.Array(
              Schema.Struct({
                area: Schema.String,
                changes: Schema.Boolean,
                name: Schema.String,
                reachesOutside: Schema.Boolean,
                scope: Schema.String,
                scopeGranted: Schema.NullOr(Schema.Boolean),
                summary: Schema.String,
              })
            ),
          });

          // Every tool the endpoint lists is found, once, with an area and
          // a sentence about it.
          const all = yield* reader.call("find_tools", FoundSchema);

          assert.deepStrictEqual(
            all.tools.map(({ name }) => name).toSorted(),
            reader.listed.map(({ name }) => name).toSorted()
          );

          for (const tool of all.tools) {
            assert.match(tool.summary, /[.!?]$/u, tool.name);
            assert.isBelow(tool.summary.length, 600, tool.name);
          }

          // What reading alone allows, and what it does not.
          const granted = (found: typeof all, name: string) =>
            found.tools.find((tool) => tool.name === name)?.scopeGranted;

          assert.isTrue(granted(all, "list_posts"));
          assert.isFalse(granted(all, "create_draft"));
          assert.isFalse(granted(all, "schedule_post"));

          // An area, and words in any order and case.
          const media = yield* reader.call("find_tools", FoundSchema, {
            area: "media",
          });

          assert.deepStrictEqual(
            media.tools.map(({ name }) => name),
            ["list_media", "import_media"]
          );

          const found = yield* writer.call("find_tools", FoundSchema, {
            query: "Invitation REVOKE_invitation",
          });

          assert.deepStrictEqual(
            found.tools.map(({ area, name, scope, scopeGranted }) => ({
              area,
              name,
              scope,
              scopeGranted,
            })),
            [
              {
                area: "people",
                name: "revoke_invitation",
                scope: "workspace:write",
                scopeGranted: true,
              },
            ]
          );

          // The tools said to take workspace:publish refuse a connection
          // without it, naming the scope, before reading anything.
          const publishing = (yield* writer.call(
            "find_tools",
            FoundSchema
          )).tools.filter(({ scope }) => scope === "workspace:publish");

          const postId = "0190f3a0-0000-7000-8000-00000000c0de";

          const bogus = {
            cancel_post: { postId },
            confirm_target: {
              confirmation: { _tag: "notPublished" },
              postId,
              targetId: postId,
            },
            create_post: {
              channelIds: [fixture.channelId],
              content: content("Never sent."),
              when: { _tag: "now" },
            },
            publish_post: { postId },
            repost_target: { postId, targetId: postId },
            reschedule_post: {
              at: "2030-01-01T10:00:00Z",
              postId,
              timeZone: "Europe/Paris",
            },
            schedule_post: {
              at: "2030-01-01T10:00:00Z",
              postId,
              timeZone: "Europe/Paris",
            },
            unschedule_post: { postId },
          } satisfies Record<string, ToolArguments>;

          assert.deepStrictEqual(
            publishing.map(({ name }) => name).toSorted(),
            Object.keys(bogus).toSorted()
          );

          for (const { name, scopeGranted } of publishing) {
            assert.isFalse(scopeGranted, name);
            assert.include(
              yield* writer.refused(
                name,
                new Map<string, ToolArguments>(Object.entries(bogus)).get(name)
              ),
              "workspace:publish",
              name
            );
          }

          // An API key has permissions, not scopes.
          const agent = yield* connected(fixture.draftingKey);
          const keyed = yield* agent.call("find_tools", FoundSchema);

          assert.isNull(granted(keyed, "list_posts"));
        })
    );

    it.effect(
      "act for an API key of the workspace, within the key's permissions",
      () =>
        Effect.gen(function* headless() {
          const fixture = yield* ToolsFixture;
          const agent = yield* connected(fixture.draftingKey);

          // The same tools as any connection, and nobody behind them.
          const who = yield* agent.call(
            "whoami",
            Schema.Struct({
              apiKey: Schema.Struct({ id: Schema.String, name: Schema.String }),
              user: Schema.Null,
              workspace: Schema.Struct({
                id: Schema.String,
                name: Schema.String,
                permissions: Schema.Array(Schema.String),
                role: Schema.Null,
              }),
            })
          );

          assert.strictEqual(who.apiKey.name, "ci");
          assert.strictEqual(who.workspace.id, fixture.workspaceId);
          assert.strictEqual(who.workspace.name, "Atelier");
          assert.deepStrictEqual(who.workspace.permissions, [
            "channel:read",
            "post:read",
            "post:create",
          ]);

          const workspaces = yield* agent.call(
            "list_workspaces",
            Schema.Struct({
              workspaces: Schema.Array(
                Schema.Struct({ connected: Schema.Boolean, id: Schema.String })
              ),
            })
          );

          assert.deepStrictEqual(workspaces.workspaces, [
            { connected: true, id: fixture.workspaceId },
          ]);

          // What the key was given works, and is kept as a change made
          // through the MCP endpoint.
          const before = yield* mcpConnections(fixture.workspaceId);

          const created = yield* agent.call("create_draft", PostJsonSchema, {
            channelIds: [fixture.channelId],
            content: content("A synthetic draft from a headless agent."),
          });

          assert.strictEqual(created.status, "draft");
          assert.isNull(created.authorId);
          assert.strictEqual(
            yield* mcpConnections(fixture.workspaceId),
            before + 1
          );

          // And in the workspace's activity log, by the tool's name and
          // the key's.
          const sql = yield* SqlClient.SqlClient;

          const logged =
            yield* sql`SELECT operation, via, application_name FROM activity.events WHERE workspace_id = ${fixture.workspaceId} AND via = 'mcp'`.pipe(
              Effect.flatMap(
                Schema.decodeUnknownEffect(
                  Schema.Array(
                    Schema.Struct({
                      application_name: Schema.NullOr(Schema.String),
                      operation: Schema.String,
                      via: Schema.String,
                    })
                  )
                )
              ),
              Effect.orDie
            );

          assert.deepInclude(logged, {
            application_name: "ci",
            operation: "mcp.create_draft",
            via: "mcp",
          });

          // Which an owner's connection reads with a tool, and the key,
          // made without the permission, does not.
          const owner = yield* connected(fixture.reading);

          const activity = yield* owner.call(
            "list_activity",
            Schema.Struct({
              items: Schema.Array(
                Schema.Struct({
                  application: Schema.NullOr(
                    Schema.Struct({ name: Schema.NullOr(Schema.String) })
                  ),
                  operation: Schema.String,
                  via: Schema.String,
                })
              ),
              nextCursor: Schema.NullOr(Schema.String),
            }),
            { operation: "mcp.create_draft" }
          );

          assert.deepInclude(activity.items, {
            application: { name: "ci" },
            operation: "mcp.create_draft",
            via: "mcp",
          });

          assert.include(
            yield* agent.refused("list_activity"),
            "activity:read"
          );

          // What it was not given is refused, in words about the key: there
          // is no scope to ask a user for.
          const refusal = yield* agent.refused("schedule_post", {
            at: "2030-01-01T10:00:00Z",
            postId: created.id,
            timeZone: "Europe/Paris",
          });

          assert.include(refusal, "API key");
          assert.include(refusal, "post:schedule");
          assert.notInclude(refusal, "scope");

          // Members are listed to a person, never to a key.
          assert.include(yield* agent.refused("list_members"), "person");
        })
    );

    it.effect(
      "refuses an API key that does not work, as a token that does not",
      () =>
        Effect.gen(function* unknownKey() {
          const refused = yield* McpClient.McpClient.pipe(
            Effect.provide(connect(Option.some("peal_notakeyofanyworkspace"))),
            Effect.flip
          );

          assert.strictEqual(
            refused.reason._tag === "HttpError" ? refused.reason.status : 0,
            401
          );
        })
    );

    it.effect(
      "write, list, change and discard drafts, and refuse a connection that reads only",
      () =>
        Effect.gen(function* drafts() {
          const fixture = yield* ToolsFixture;

          const writer = yield* connected(fixture.writing);
          const before = yield* mcpConnections(fixture.workspaceId);

          const created = yield* writer.call("create_draft", PostJsonSchema, {
            channelIds: [fixture.channelId],
            content: content("A synthetic draft from an assistant."),
          });

          assert.strictEqual(created.status, "draft");

          // The law has Peal keep the connection that made it; reading
          // keeps nothing.
          assert.strictEqual(
            yield* mcpConnections(fixture.workspaceId),
            before + 1
          );
          assert.deepStrictEqual(
            created.targets.map(({ channelId }) => channelId),
            [fixture.channelId]
          );

          const page = yield* writer.call("list_drafts", DraftPageJsonSchema, {
            limit: 5,
          });

          assert.include(
            page.items.map(({ id }) => id),
            created.id
          );
          assert.strictEqual(
            yield* mcpConnections(fixture.workspaceId),
            before + 1
          );

          const updated = yield* writer.call("update_draft", PostJsonSchema, {
            channelIds: [],
            content: content("A synthetic draft, rewritten."),
            postId: created.id,
          });

          assert.strictEqual(
            updated.content.text,
            "A synthetic draft, rewritten."
          );
          assert.deepStrictEqual(updated.targets, []);

          const read = yield* writer.call("get_post", PostJsonSchema, {
            postId: created.id,
          });

          assert.strictEqual(
            read.content.text,
            "A synthetic draft, rewritten."
          );

          // Taking a post back is deciding what goes out, which the user
          // did not let this connection do.
          assert.include(
            yield* writer.refused("unschedule_post", { postId: created.id }),
            "workspace:publish"
          );

          const publisher = yield* connected(fixture.publishing);

          // A draft has nothing to unschedule, repost or confirm.
          assert.include(
            yield* publisher.refused("unschedule_post", {
              postId: created.id,
            }),
            "The post is draft, which does not allow this."
          );
          assert.include(
            yield* publisher.refused("repost_target", {
              postId: created.id,
              targetId: "not-a-target",
            }),
            "The workspace has no post with this id."
          );
          assert.include(
            yield* writer.refused("create_draft", {
              channelIds: ["00000000-0000-7000-8000-00000000c0de"],
              content: content("For a channel of nobody's."),
            }),
            "These channels are not the workspace's"
          );

          const reader = yield* connected(fixture.reading);

          assert.include(
            yield* reader.refused("discard_draft", { postId: created.id }),
            "This connection may not discard this draft in this workspace"
          );
          assert.include(
            yield* reader.refused("create_draft", {
              channelIds: [],
              content: content("Not for a reader."),
            }),
            "did not give this client the scope workspace:write"
          );

          assert.deepStrictEqual(
            yield* writer.call(
              "discard_draft",
              Schema.Struct({ discarded: Schema.String }),
              { postId: created.id }
            ),
            { discarded: created.id }
          );
          assert.include(
            yield* writer.refused("get_post", { postId: created.id }),
            "The workspace has no post with this id."
          );
        })
    );

    it.effect(
      "keep a draft's platform options, unless told to change them, and read TikTok creators only on TikTok",
      () =>
        Effect.gen(function* withOptions() {
          const fixture = yield* ToolsFixture;

          const writer = yield* connected(fixture.writing);

          const youtube = {
            madeForKids: false,
            platform: "youtube",
            title: "A synthetic launch video",
          } satisfies TargetOptions;

          const created = yield* writer.call("create_draft", PostJsonSchema, {
            channelIds: [fixture.youtubeId, fixture.channelId],
            content: content("A synthetic video from an assistant."),
            options: [{ channelId: fixture.youtubeId, options: youtube }],
          });

          const optionsOf = (post: typeof created) =>
            post.targets.map(({ channelId, options }) => ({
              channelId,
              options,
            }));

          assert.deepStrictEqual(optionsOf(created), [
            { channelId: fixture.youtubeId, options: youtube },
            { channelId: fixture.channelId, options: null },
          ]);

          // A rewrite that says nothing of options keeps them.
          const rewritten = yield* writer.call("update_draft", PostJsonSchema, {
            channelIds: [fixture.youtubeId, fixture.channelId],
            content: content("A synthetic video, rewritten."),
            postId: created.id,
          });

          assert.deepStrictEqual(optionsOf(rewritten), optionsOf(created));

          // Options of another platform are refused, naming the channel.
          assert.include(
            yield* writer.refused("update_draft", {
              channelIds: [fixture.youtubeId, fixture.channelId],
              content: content("A synthetic video, rewritten."),
              options: [{ channelId: fixture.channelId, options: youtube }],
              postId: created.id,
            }),
            '"_tag":"optionsForOtherPlatform"'
          );

          // A channel's options come once: which of two would stand is
          // nobody's guess.
          const twice = [
            { channelId: fixture.youtubeId, options: youtube },
            {
              channelId: fixture.youtubeId,
              options: { ...youtube, title: "Another title" },
            },
          ];

          for (const [tool, input] of [
            [
              "create_draft",
              {
                channelIds: [fixture.youtubeId],
                content: content("A synthetic video, twice set."),
                options: twice,
              },
            ],
            [
              "update_draft",
              {
                channelIds: [fixture.youtubeId],
                content: content("A synthetic video, twice set."),
                options: twice,
                postId: created.id,
              },
            ],
          ] as const) {
            assert.include(
              yield* writer.refused(tool, input),
              "options for each channel once"
            );
          }

          // An empty list removes them.
          const cleared = yield* writer.call("update_draft", PostJsonSchema, {
            channelIds: [fixture.youtubeId],
            content: content("A synthetic video, rewritten."),
            options: [],
            postId: created.id,
          });

          assert.deepStrictEqual(optionsOf(cleared), [
            { channelId: fixture.youtubeId, options: null },
          ]);

          assert.include(
            yield* writer.refused("get_tiktok_creator", {
              channelId: fixture.youtubeId,
            }),
            "This is not one of the workspace's TikTok channels"
          );

          yield* writer.call(
            "discard_draft",
            Schema.Struct({ discarded: Schema.String }),
            { postId: created.id }
          );
        })
    );

    it.effect(
      "read analytics and billing, and refuse a zone that is none",
      () =>
        Effect.gen(function* reports() {
          const fixture = yield* ToolsFixture;

          const reader = yield* connected(fixture.reading);

          const summary = yield* reader.call(
            "analytics_summary",
            Schema.Struct({
              from: Schema.String,
              timeZone: Schema.String,
              totals: Schema.Struct({ posts: Schema.Int }),
            }),
            { from: "2026-11-01", timeZone: "Europe/Paris", to: "2026-11-07" }
          );

          assert.deepStrictEqual(summary, {
            from: "2026-11-01",
            timeZone: "Europe/Paris",
            totals: { posts: 0 },
          });
          assert.include(
            yield* reader.refused("analytics_summary", {
              from: "2026-11-01",
              timeZone: "+01:00",
              to: "2026-11-07",
            }),
            "+01:00 is not an IANA time zone"
          );
          assert.include(
            yield* reader.refused("analytics_summary", {
              from: "2026-11-07",
              timeZone: "Europe/Paris",
              to: "2026-11-01",
            }),
            "The range must end on or after the day it starts"
          );
          assert.deepStrictEqual(
            yield* reader.call(
              "post_analytics",
              Schema.Struct({
                postId: Schema.String,
                targets: Schema.Array(Schema.Unknown),
              }),
              { postId: "not-a-post" }
            ),
            { postId: "not-a-post", targets: [] }
          );

          // Without a Stripe key, nothing is limited.
          assert.deepStrictEqual(
            yield* reader.call(
              "get_billing",
              Schema.Struct({
                enabled: Schema.Boolean,
                plan: Schema.NullOr(Schema.String),
              })
            ),
            { enabled: false, plan: null }
          );
        })
    );

    it.effect(
      "read the workspace's webhooks, and refuse an endpoint Peal would not deliver to",
      () =>
        Effect.gen(function* webhooks() {
          const fixture = yield* ToolsFixture;
          const reader = yield* connected(fixture.reading);
          const writer = yield* connected(fixture.writing);

          const address = {
            eventTypes: ["post.published"],
            url: "https://hooks.example.com/peal",
          };

          assert.deepStrictEqual(
            yield* reader.call(
              "list_webhooks",
              Schema.Struct({ endpoints: Schema.Array(Schema.Unknown) })
            ),
            { endpoints: [] }
          );
          assert.include(
            yield* reader.refused("create_webhook", address),
            "This connection may not manage webhooks"
          );
          // A documentation address (RFC 5737): never a public host.
          assert.include(
            yield* writer.refused("create_webhook", {
              ...address,
              url: "https://192.0.2.10/peal",
            }),
            "a host that is not public"
          );
          assert.include(
            yield* writer.refused("create_webhook", {
              ...address,
              url: "http://hooks.example.com/peal",
            }),
            "must be HTTPS"
          );
          assert.include(
            yield* reader.refused("list_webhook_deliveries", {
              endpointId: "not-an-endpoint",
            }),
            "The workspace has no webhook endpoint with this id"
          );
        })
    );

    it.effect(
      "list members, invite by email and revoke, for a connection that may",
      () =>
        Effect.gen(function* people() {
          const fixture = yield* ToolsFixture;

          const writer = yield* connected(fixture.writing);

          const reader = yield* connected(fixture.reading);

          const MembersSchema = Schema.toCodecJson(
            Schema.Struct({ members: Schema.Array(ListedMemberSchema) })
          );

          const { members } = yield* reader.call("list_members", MembersSchema);

          // Names and roles, and no email address unless asked for.
          assert.deepStrictEqual(
            members.map(({ email, role }) => ({ email, role })),
            [{ email: undefined, role: "owner" }]
          );

          const withEmails = yield* reader.call("list_members", MembersSchema, {
            includeEmails: true,
          });

          assert.isTrue(
            withEmails.members.every(
              ({ email }) => email?.includes("@") === true
            )
          );

          const email = newEmail("assistant-guest");

          assert.include(
            yield* reader.refused("invite_member", { email, role: "viewer" }),
            "This connection may not invite people"
          );

          const sent = yield* writer.call(
            "invite_member",
            Schema.toCodecJson(InvitationSchema),
            { email, role: "viewer" }
          );

          assert.strictEqual(sent.role, "viewer");

          yield* emailTo(sent.email, /invited you/u);

          const InvitationsSchema = Schema.toCodecJson(
            Schema.Struct({ invitations: Schema.Array(InvitationSchema) })
          );

          assert.deepStrictEqual(
            (yield* writer.call(
              "list_invitations",
              InvitationsSchema
            )).invitations.map(({ id }) => id),
            [sent.id]
          );
          assert.include(
            yield* writer.refused("revoke_invitation", {
              invitationId: "not-an-invitation",
            }),
            "The workspace has no pending invitation with this id"
          );
          assert.deepStrictEqual(
            yield* writer.call(
              "revoke_invitation",
              Schema.Struct({ revoked: Schema.String }),
              { invitationId: sent.id }
            ),
            { revoked: sent.id }
          );
          assert.deepStrictEqual(
            (yield* writer.call("list_invitations", InvitationsSchema))
              .invitations,
            []
          );
        })
    );
    it.effect(
      "put posts out only with the publishing scope, and say all that is wrong at once",
      () =>
        Effect.gen(function* posting() {
          const fixture = yield* ToolsFixture;
          const writer = yield* connected(fixture.writing);
          const publisher = yield* connected(fixture.publishing);

          const draft = yield* writer.call("create_draft", PostJsonSchema, {
            channelIds: [fixture.channelId, fixture.youtubeId],
            content: content("a".repeat(600)),
          });

          // The post says which application wrote it, for whom.
          assert.deepStrictEqual(draft.createdVia?.via, "application");
          assert.strictEqual(draft.createdVia?.name, "Synthetic agent");
          assert.isNull(draft.scheduledVia);

          const schedule = {
            at: "2031-06-15T08:00:00Z",
            postId: draft.id,
            timeZone: "Europe/Paris",
          };

          // Writing drafts is not putting them out.
          for (const [tool, args] of [
            ["schedule_post", schedule],
            ["publish_post", { postId: draft.id }],
            ["reschedule_post", schedule],
            ["cancel_post", { postId: draft.id }],
            [
              "create_post",
              {
                channelIds: [fixture.channelId],
                content: content("A synthetic post."),
                when: { _tag: "now" },
              },
            ],
          ] as const) {
            const refusal = yield* writer.refused(tool, args);

            assert.include(refusal, "scope workspace:publish", tool);
            assert.include(refusal, "connects this client to Peal again", tool);
          }

          // Every violation comes in one refusal: the text on Mastodon, and
          // on YouTube the text, the missing video and the missing options.
          const violations = yield* publisher.refused(
            "schedule_post",
            schedule
          );

          assert.include(
            violations,
            "nothing was saved, scheduled or published"
          );
          assert.include(violations, '"_tag":"textTooLong"');
          assert.include(violations, fixture.channelId);
          assert.include(violations, '"_tag":"optionMissing"');
          assert.include(violations, '"field":"title"');
          assert.include(violations, fixture.youtubeId);

          const sameAtOnce = yield* publisher.refused("create_post", {
            channelIds: [fixture.channelId, fixture.youtubeId],
            content: content("a".repeat(600)),
            idempotencyKey: "synthetic-mcp-key",
            when: {
              _tag: "at",
              at: "2031-06-15T08:00:00Z",
              timeZone: "Mars/Olympus",
            },
          });

          assert.include(sameAtOnce, "is not an IANA time zone");

          assert.include(
            yield* publisher.refused("reschedule_post", schedule),
            "schedule it with schedule_post"
          );
          assert.include(
            yield* publisher.refused("schedule_post", {
              ...schedule,
              at: "2020-01-01T00:00:00Z",
              channelIds: [fixture.channelId],
            }),
            "The post was refused"
          );

          const listed = yield* publisher.call(
            "list_posts",
            Schema.toCodecJson(
              Schema.Struct({ posts: Schema.Array(PostSchema) })
            ),
            { from: "2031-06-01T00:00:00Z", to: "2031-07-01T00:00:00Z" }
          );

          assert.deepStrictEqual(listed.posts, []);

          const attempts = yield* publisher.call(
            "list_post_attempts",
            Schema.Struct({ attempts: Schema.Array(Schema.Unknown) }),
            { postId: draft.id }
          );

          assert.deepStrictEqual(attempts.attempts, []);

          // Cancelling is for good, and reaches no platform.
          const cancelled = yield* publisher.call(
            "cancel_post",
            PostJsonSchema,
            {
              postId: draft.id,
            }
          );

          assert.strictEqual(cancelled.status, "cancelled");
        })
    );

    it.effect("list media, and import only from public addresses", () =>
      Effect.gen(function* media() {
        const fixture = yield* ToolsFixture;
        const reader = yield* connected(fixture.reading);
        const writer = yield* connected(fixture.writing);

        const page = yield* reader.call(
          "list_media",
          Schema.Struct({
            items: Schema.Array(Schema.Unknown),
            nextCursor: Schema.NullOr(Schema.String),
          }),
          { limit: 5 }
        );

        assert.deepStrictEqual(page, { items: [], nextCursor: null });

        assert.include(
          yield* reader.refused("import_media", {
            url: "https://127.0.0.1/picture.png",
          }),
          "scope workspace:write"
        );

        // The server's own network is not a place to fetch from.
        for (const url of [
          "https://127.0.0.1/picture.png",
          "http://files.example/picture.png",
          "https://169.254.169.254/latest/meta-data",
        ]) {
          assert.include(
            yield* writer.refused("import_media", { url }),
            "Peal does not fetch this address",
            url
          );
        }
      })
    );
  }
);
