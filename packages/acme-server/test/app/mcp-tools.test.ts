import { assert, layer } from "@effect/vitest";
import {
  InvitationSchema,
  PostSchema,
  WorkspaceMemberSchema,
} from "acme-contract";
import type { TargetOptions } from "acme-contract";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { McpClient } from "effect/ai";
import type { McpSchema } from "effect/ai";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { freshChannel, syntheticCredentials } from "#test/channels/support.ts";
import {
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
  /** A YouTube channel of the workspace. */
  readonly youtubeId: string;
  /** A token that may do what the owner's role allows in the workspace. */
  readonly writing: string;
  /** A token that may only read the workspace. */
  readonly reading: string;
  readonly workspaceId: string;
}

class ToolsFixture extends Context.Service<ToolsFixture, Fixture>()(
  "acme-server/test/ToolsFixture"
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

    return {
      channelId: channel.id,
      reading: yield* authorize(
        owner,
        clientId,
        workspaceId,
        "openid workspace:read"
      ),
      workspaceId,
      writing: yield* authorize(
        owner,
        clientId,
        workspaceId,
        "openid workspace:read workspace:write"
      ),
      youtubeId: youtube.id,
    };
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
          confirm_target: [false, true, true, false],
          create_draft: [false, false, false, false],
          discard_draft: [false, true, true, false],
          get_billing: [true, false, true, false],
          get_post: [true, false, true, false],
          get_tiktok_creator: [true, false, true, true],
          invite_member: [false, true, false, true],
          list_channels: [true, false, true, false],
          list_drafts: [true, false, true, false],
          list_invitations: [true, false, true, false],
          list_members: [true, false, true, false],
          list_workspaces: [true, false, true, false],
          post_analytics: [true, false, true, false],
          repost_target: [false, false, false, true],
          revoke_invitation: [false, true, true, false],
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
      "write, list, change and discard drafts, and refuse a connection that reads only",
      () =>
        Effect.gen(function* drafts() {
          const fixture = yield* ToolsFixture;

          const writer = yield* connected(fixture.writing);

          const created = yield* writer.call("create_draft", PostJsonSchema, {
            channelIds: [fixture.channelId],
            content: content("A synthetic draft from an assistant."),
          });

          assert.strictEqual(created.status, "draft");
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

          // A draft has nothing to unschedule, repost or confirm.
          assert.include(
            yield* writer.refused("unschedule_post", { postId: created.id }),
            "The post is draft, which does not allow this."
          );
          assert.include(
            yield* writer.refused("repost_target", {
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
            "they let this client read only"
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
            `optionsForOtherPlatform on ${fixture.channelId}`
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
      "list members, invite by email and revoke, for a connection that may",
      () =>
        Effect.gen(function* people() {
          const fixture = yield* ToolsFixture;

          const writer = yield* connected(fixture.writing);

          const reader = yield* connected(fixture.reading);

          const { members } = yield* reader.call(
            "list_members",
            Schema.toCodecJson(
              Schema.Struct({ members: Schema.Array(WorkspaceMemberSchema) })
            )
          );

          assert.deepStrictEqual(
            members.map(({ role }) => role),
            ["owner"]
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
  }
);
