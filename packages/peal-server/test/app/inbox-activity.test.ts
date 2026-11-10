// What the activity log keeps of the inbox and of the analytics' exports,
// through the whole server: a reply, a comment settled or moderated are
// requests that ask for a change, kept as metadata; a read, an export
// included, leaves nothing; and no event holds what anyone wrote.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { ActivityPageSchema } from "peal-contract";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import { receiveComment } from "#engagement/domain/comment.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import { followPost } from "#engagement/domain/thread.ts";
import { DrizzleEngagementStore } from "#engagement/infrastructure/drizzle-engagement-store.ts";
import { newId } from "#shared/application/ids.ts";
import {
  PostIdSchema,
  PostTargetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { DatabaseLive } from "#shared/infrastructure/database.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { freshChannel, syntheticCredentials } from "#test/channels/support.ts";
import { reading } from "#test/engagement/support.ts";
import {
  apiKeyOf,
  bodyOf,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

const Test = Layer.mergeAll(
  TestApp.layerWith(unconfirmedEmails),
  Layer.mergeAll(DrizzleChannelRepository, DrizzleEngagementStore).pipe(
    Layer.provideMerge(IdsLive),
    Layer.provideMerge(DatabaseLive)
  )
);

const PageJsonSchema = Schema.toCodecJson(ActivityPageSchema);

const commentText = "A synthetic comment the log must never hold.";
const replyText = "A synthetic reply the log must never hold either.";

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "the activity log, for the inbox and the exports",
  (it) => {
    it.effect(
      "keeps who answered, settled or moderated which comment, and how it was answered: never a word of it",
      () =>
        Effect.gen(function* recorded() {
          const app = yield* TestApp;
          const store = yield* EngagementStore;
          const sql = yield* SqlClient.SqlClient;
          const owner = yield* signedUpUnconfirmed("inbox-activity");
          const workspaceId = yield* workspaceOf(owner, "Inbox activity");
          const base = `/api/workspaces/${workspaceId}`;

          const channel = yield* freshChannel(
            WorkspaceIdSchema.make(workspaceId)
          );

          yield* ChannelRepository.use((channels) =>
            channels.insert(channel, syntheticCredentials(channel))
          );

          // A thread no collection reads, with one comment someone left.
          const writtenAt = DateTime.makeUnsafe("2046-05-06T10:05:00.000Z");

          const thread = followPost(yield* newId(ThreadIdSchema), {
            authorId: Option.none(),
            channelId: channel.id,
            permalink: Option.none(),
            platformPostId: PlatformPostIdSchema.make("1001"),
            postId: yield* newId(PostIdSchema),
            publishedAt: DateTime.makeUnsafe("2046-05-06T10:00:00.000Z"),
            targetId: yield* newId(PostTargetIdSchema),
            workspaceId: WorkspaceIdSchema.make(workspaceId),
          });

          const comment = receiveComment(
            yield* newId(CommentIdSchema),
            thread,
            reading(1, { text: commentText, writtenAt }),
            writtenAt
          );

          yield* store.follow([thread]);
          yield* store.saveComments([comment]);

          const desk = yield* apiKeyOf(owner, workspaceId, [
            "analytics:read",
            "engagement:read",
            "engagement:reply",
          ]);

          const asked = (id: string) => ({
            authorization: `Bearer ${desk.key}`,
            "x-request-id": id,
          });

          const comments = `${base}/inbox/comments/${comment.id}`;

          // Settled without a reply: done.
          const settled = yield* app.request(`${comments}/answered`, {
            body: { answered: true },
            headers: asked("inbox-activity-0001"),
          });

          // A reply that says nothing: refused before anything is sent.
          const empty = yield* app.request(`${comments}/replies`, {
            body: { text: "   " },
            headers: asked("inbox-activity-0002"),
          });

          // A reply the API cannot read: its text is far too long.
          const unreadable = yield* app.request(`${comments}/replies`, {
            body: { text: replyText.repeat(400) },
            headers: asked("inbox-activity-0003"),
          });

          // What Mastodon lets nobody do to someone else's reply.
          const hidden = yield* app.request(`${comments}/moderation`, {
            body: { action: "hide" },
            headers: asked("inbox-activity-0004"),
          });

          assert.deepStrictEqual(
            [settled.status, empty.status, unreadable.status, hidden.status],
            [200, 422, 400, 409]
          );

          // Reads: the thread, and both exports.
          const days = "days=7&timeZone=Europe%2FParis";

          const reads = yield* Effect.forEach(
            [
              `${base}/inbox/threads/${thread.id}`,
              `${base}/analytics/export?kind=posts&${days}`,
              `${base}/analytics/export?kind=accounts&format=json&${days}`,
            ],
            (path) => app.request(path, { headers: asked("inbox-read") })
          );

          assert.deepStrictEqual(
            reads.map(({ status }) => status),
            [200, 200, 200]
          );

          const log = yield* app
            .request(`${base}/activity`, { headers: { cookie: owner.cookies } })
            .pipe(Effect.flatMap((reply) => bodyOf(PageJsonSchema, reply)));

          const actor = { _tag: "apiKey" as const, apiKeyId: desk.apiKey.id };
          const objectIds = { commentId: comment.id };

          assert.deepStrictEqual(
            log.items
              .filter(({ operation }) => operation.startsWith("inbox."))
              .map(
                ({
                  actor: by,
                  errorCode,
                  objectIds: ids,
                  operation,
                  requestId,
                  status,
                  via,
                }) => ({
                  by,
                  errorCode,
                  ids,
                  operation,
                  requestId,
                  status,
                  via,
                })
              ),
            [
              {
                by: actor,
                errorCode: "inbox_action_unavailable",
                ids: objectIds,
                operation: "inbox.moderate",
                requestId: "inbox-activity-0004",
                status: 409,
                via: "apiKey",
              },
              {
                by: actor,
                errorCode: "invalid_request",
                ids: objectIds,
                operation: "inbox.reply",
                requestId: "inbox-activity-0003",
                status: 400,
                via: "apiKey",
              },
              {
                by: actor,
                errorCode: "reply_invalid",
                ids: objectIds,
                operation: "inbox.reply",
                requestId: "inbox-activity-0002",
                status: 422,
                via: "apiKey",
              },
              {
                by: actor,
                errorCode: null,
                ids: objectIds,
                operation: "inbox.setAnswered",
                requestId: "inbox-activity-0001",
                status: 200,
                via: "apiKey",
              },
            ]
          );

          // A read asks for no change, an export included: nothing kept.
          assert.deepStrictEqual(
            log.items
              .map(({ operation }) => operation)
              .filter((operation) => operation.startsWith("analytics.")),
            []
          );
          assert.isFalse(
            log.items.some(({ requestId }) => requestId === "inbox-read")
          );

          // Not a word anyone wrote is in the log's rows.
          const [stored] = yield* sql<{
            readonly rows: string;
          }>`SELECT coalesce(json_agg(e)::text, '') AS rows FROM activity.events e WHERE workspace_id = ${workspaceId}`;

          assert.isDefined(stored);
          assert.include(stored.rows, comment.id);

          for (const words of [
            commentText,
            replyText,
            "Reader 1",
            "reader1@",
          ]) {
            assert.notInclude(stored.rows, words);
          }

          yield* sql`DELETE FROM engagement.threads WHERE id = ${thread.id}`;
        })
    );
  }
);
