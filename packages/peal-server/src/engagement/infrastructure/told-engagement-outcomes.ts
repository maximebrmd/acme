import { DateTime, Effect, Layer, Option } from "effect";

import { EngagementOutcomes } from "#engagement/application/ports/engagement-outcomes.ts";
import type { Comment } from "#engagement/domain/comment.ts";
import type { Reply } from "#engagement/domain/reply.ts";
import type { Thread } from "#engagement/domain/thread.ts";
import { Notify } from "#notifications/application/notify.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// The UTC day of an instant, as `2026-11-10`.
const dayOf = (at: DateTime.Utc) => DateTime.formatIso(at).slice(0, 10);

const logged = (what: string) =>
  Effect.catchDefect((cause: unknown) =>
    Effect.logError(`Telling the workspace of ${what} failed`, cause)
  );

/**
 * Tells the workspace what happened in a thread, in the transaction that
 * records it: its endpoints through the webhooks context, one event per
 * comment and per reply sent, and its members through the notifications
 * context.
 *
 * Members are told of new comments once per thread and UTC day: the key
 * names the thread and the day, so a post that draws a thousand comments
 * brings one notice that day, with the count of the first read. It goes to
 * the post's author and to the members who answer comments and chose to
 * hear about every post, or to all who answer comments when the post has
 * no author among the members. Events and notices carry ids and counts,
 * never what a comment says or who wrote it. A bug in telling is logged
 * and never undoes what was read or sent; the database failing does.
 */
export const ToldEngagementOutcomes = Layer.effect(
  EngagementOutcomes,
  Effect.gen(function* ToldEngagementOutcomes() {
    const notices = yield* Notify;
    const webhooks = yield* WebhookEvents;

    const receivedEvent = (thread: Thread, comment: Comment) =>
      webhooks.publish({
        event: {
          data: {
            channelId: thread.channelId,
            commentId: comment.id,
            postId: thread.postId,
            receivedAt: comment.receivedAt,
            threadId: thread.id,
            workspaceId: thread.workspaceId,
          },
          type: "comment.received",
        },
        key: `comment:${comment.id}:received`,
      });

    return EngagementOutcomes.of({
      received: (thread, comments) =>
        Effect.gen(function* received() {
          yield* Effect.forEach(
            comments,
            (comment) => receivedEvent(thread, comment),
            { discard: true }
          );

          const [first] = comments;

          if (first === undefined) {
            return;
          }

          yield* notices
            .notify({
              ...Option.match(thread.authorId, {
                onNone: () => ({}),
                onSome: (author) => ({ author }),
              }),
              event: {
                _tag: "CommentsReceived",
                count: comments.length,
                postId: thread.postId,
                threadId: thread.id,
              },
              key: `comments:${thread.id}:${dayOf(first.receivedAt)}`,
              workspaceId: thread.workspaceId,
            })
            .pipe(
              // The members could not be listed: the comments are kept,
              // and the app shows them.
              Effect.catchTag("RecipientsUnavailable", (failure) =>
                Effect.logWarning(
                  "Could not tell members of new comments",
                  failure
                )
              )
            );
        }).pipe(logged("new comments")),
      replied: (thread, reply) =>
        reply.status._tag === "sent"
          ? webhooks
              .publish({
                event: {
                  data: {
                    channelId: thread.channelId,
                    commentId: reply.commentId,
                    permalink: Option.getOrNull(reply.status.permalink),
                    postId: thread.postId,
                    repliedAt: reply.status.at,
                    replyId: reply.id,
                    threadId: thread.id,
                    workspaceId: thread.workspaceId,
                  },
                  type: "comment.replied",
                },
                key: `reply:${reply.id}:sent`,
              })
              .pipe(logged("a reply"))
          : Effect.void,
    });
  })
);

/** Tells nobody: for tests of what is stored and sent. */
export const SilentEngagementOutcomes = Layer.succeed(
  EngagementOutcomes,
  EngagementOutcomes.of({
    received: () => Effect.void,
    replied: (_thread: Thread, _reply: Reply) => Effect.void,
  })
);
