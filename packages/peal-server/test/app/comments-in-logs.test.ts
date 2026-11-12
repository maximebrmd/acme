// What the server writes about the inbox never holds what people wrote:
// a comment's text, its author's handle or name, or a reply's text. The
// app runs here as production runs it, logging each request and tracing
// it, and everything a log line or a span would export is searched,
// through reads, a reply that is journalled, one that is refused and one
// whose job cannot start, which is logged as an error.
import { assert, layer } from "@effect/vitest";
import {
  Cause,
  DateTime,
  Effect,
  Exit,
  Layer,
  Logger,
  Option,
  References,
  Tracer,
} from "effect";
import { SqlClient } from "effect/sql";

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
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

const lines: string[] = [];
const spans: Tracer.NativeSpan[] = [];

const tracer = Tracer.make({
  span: (options) => {
    const span = new Tracer.NativeSpan(options);

    spans.push(span);

    return span;
  },
});

// Everything a logger is handed: the message, its cause, and what the
// line is annotated with, as an exporter would write them.
const capture = Logger.layer([
  Logger.make(({ cause, fiber, message }) => {
    lines.push(
      JSON.stringify(message),
      Cause.pretty(cause),
      JSON.stringify(fiber.getRef(References.CurrentLogAnnotations)),
      JSON.stringify(fiber.getRef(References.CurrentLogSpans))
    );
  }),
]);

// Everything a span would export, as text.
const spanText = (span: Tracer.NativeSpan): string =>
  [
    span.name,
    JSON.stringify([...span.attributes]),
    JSON.stringify(span.events),
    span.status._tag === "Ended" && Exit.isFailure(span.status.exit)
      ? Cause.pretty(span.status.exit.cause)
      : "",
  ].join("\n");

const Test = Layer.mergeAll(
  TestApp.layerWith(
    unconfirmedEmails,
    Layer.merge(capture, Layer.succeed(Tracer.Tracer, tracer))
  ),
  Layer.mergeAll(DrizzleChannelRepository, DrizzleEngagementStore).pipe(
    Layer.provideMerge(IdsLive),
    Layer.provideMerge(DatabaseLive)
  )
);

const written = () => [...lines, ...spans.map(spanText)].join("\n");

// Words found nowhere else in what the server writes.
const commentText = "zxq-comment-words someone outside the workspace wrote";
const handle = "zxq-handle@social.example";
const displayName = "Zxq Display Name";
const authorId = "zxq-author-7001";
const replyText = "zxq-reply-words a member wrote back";

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "what the server writes about the inbox",
  (it) => {
    it.effect(
      "holds no comment's text, no author and no reply's text, whether a request is answered, refused or fails",
      () =>
        Effect.gen(function* searched() {
          const app = yield* TestApp;
          const store = yield* EngagementStore;
          const owner = yield* signedUpUnconfirmed("inbox-logs");
          const workspaceId = yield* workspaceOf(owner, "Inbox logs");
          const base = `/api/workspaces/${workspaceId}/inbox`;
          const headers = { cookie: owner.cookies };

          const channel = yield* freshChannel(
            WorkspaceIdSchema.make(workspaceId)
          );

          yield* ChannelRepository.use((channels) =>
            channels.insert(channel, syntheticCredentials(channel))
          );

          const writtenAt = DateTime.makeUnsafe("2047-05-06T10:05:00.000Z");

          const thread = followPost(yield* newId(ThreadIdSchema), {
            authorId: Option.none(),
            channelId: channel.id,
            permalink: Option.none(),
            platformPostId: PlatformPostIdSchema.make("1001"),
            postId: yield* newId(PostIdSchema),
            publishedAt: DateTime.makeUnsafe("2047-05-06T10:00:00.000Z"),
            targetId: yield* newId(PostTargetIdSchema),
            workspaceId: WorkspaceIdSchema.make(workspaceId),
          });

          const comment = receiveComment(
            yield* newId(CommentIdSchema),
            thread,
            reading(1, {
              author: Option.some({
                displayName: Option.some(displayName),
                handle,
                platformId: authorId,
              }),
              text: commentText,
              writtenAt,
            }),
            writtenAt
          );

          yield* store.follow([thread]);
          yield* store.saveComments([comment]);

          const comments = `${base}/comments/${comment.id}`;

          const statuses = yield* Effect.forEach(
            [
              // Read: the list, then the thread with the comment whole.
              { path: `${base}/threads` },
              { path: `${base}/threads/${thread.id}` },
              // Refused: Mastodon hides nobody's reply.
              { body: { action: "hide" }, path: `${comments}/moderation` },
              // Unreadable: far longer than a reply may be.
              {
                body: { text: replyText.repeat(400) },
                path: `${comments}/replies`,
              },
              // Journalled, then its job cannot start on this server,
              // which runs none: the failure is the server's, and logged.
              { body: { text: replyText }, path: `${comments}/replies` },
              { body: { answered: true }, path: `${comments}/answered` },
            ],
            (request) =>
              app
                .request(request.path, { ...request, headers })
                .pipe(Effect.map(({ status }) => status)),
            { concurrency: 1 }
          );

          assert.deepStrictEqual(statuses, [200, 200, 409, 400, 500, 200]);

          const all = written();

          // The requests were written about, the failure with its cause.
          assert.include(all, `/inbox/threads/${thread.id}`);
          assert.include(all, "SendReplyV1 is not registered");
          assert.isAbove(spans.length, 10);

          for (const [name, words] of [
            ["a comment's text", commentText],
            ["its author's handle", handle],
            ["its author's name", displayName],
            ["its author's id on the platform", authorId],
            ["a reply's text", replyText],
            ["any of them, cut short", "zxq-"],
          ] as const) {
            assert.notInclude(all, words, name);
          }

          yield* SqlClient.SqlClient.use(
            (sql) => sql`DELETE FROM engagement.threads WHERE id = ${thread.id}`
          );
        })
    );
  }
);
