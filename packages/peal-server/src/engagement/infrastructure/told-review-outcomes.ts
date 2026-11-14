import { Effect, Layer } from "effect";

import { ReviewOutcomes } from "#engagement/application/ports/review-outcomes.ts";
import type { ReviewReply } from "#engagement/domain/review-reply.ts";
import type { ReviewThread } from "#engagement/domain/review-thread.ts";
import type { Review } from "#engagement/domain/review.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

const logged = (what: string) =>
  Effect.catchDefect((cause: unknown) =>
    Effect.logError(`Telling the workspace of ${what} failed`, cause)
  );

/**
 * Tells the workspace's endpoints, through the webhooks context, in the
 * transaction that records it: one `review.received` per review read for
 * the first time, with its stars, and one `review.replied` per reply that
 * went out. Events carry ids, never what a review says or who wrote it. A
 * bug in telling is logged and never undoes what was read or sent; the
 * database failing does.
 */
export const ToldReviewOutcomes = Layer.effect(
  ReviewOutcomes,
  Effect.gen(function* ToldReviewOutcomes() {
    const webhooks = yield* WebhookEvents;

    const receivedEvent = (thread: ReviewThread, review: Review) =>
      webhooks.publish({
        event: {
          data: {
            channelId: thread.channelId,
            rating: review.rating,
            receivedAt: review.receivedAt,
            reviewId: review.id,
            threadId: thread.id,
            workspaceId: thread.workspaceId,
          },
          type: "review.received",
        },
        key: `review:${review.id}:received`,
      });

    return ReviewOutcomes.of({
      received: (thread, reviews) =>
        Effect.forEach(reviews, (review) => receivedEvent(thread, review), {
          discard: true,
        }).pipe(logged("new reviews")),
      replied: (thread, reply: ReviewReply) =>
        reply.status._tag === "sent"
          ? webhooks
              .publish({
                event: {
                  data: {
                    channelId: thread.channelId,
                    repliedAt: reply.status.at,
                    replyId: reply.id,
                    reviewId: reply.reviewId,
                    threadId: thread.id,
                    workspaceId: thread.workspaceId,
                  },
                  type: "review.replied",
                },
                key: `review-reply:${reply.id}:sent`,
              })
              .pipe(logged("a reply to a review"))
          : Effect.void,
    });
  })
);
