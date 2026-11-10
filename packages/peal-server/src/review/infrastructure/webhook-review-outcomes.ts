import { Effect, Layer } from "effect";

import { ReviewOutcomes } from "#review/application/ports/review-outcomes.ts";
import type { Reviewer } from "#review/domain/reviewer.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

type ReviewParty = Extract<
  EventToPublish["event"],
  { readonly type: "post.approved" }
>["data"]["by"];

// Who decided, by kind: an API key is an application, as in the notices.
const partyOf = (reviewer: Reviewer): ReviewParty =>
  reviewer._tag === "apiKey" ? "application" : reviewer._tag;

// A bug in telling must never undo a decision: it is logged, and its
// savepoint rolled back. The database failing rolls the decision back with
// it.
const neverStopping = <R>(
  telling: Effect.Effect<void, DatabaseError, R>
): Effect.Effect<void, DatabaseError, R> =>
  telling.pipe(
    Effect.catchDefect((defect) =>
      Effect.logError("A review's webhook event could not be published", defect)
    )
  );

/**
 * Outcomes told through `told`, after the workspace's webhook endpoints
 * heard them, in the transaction that made them: `post.approval_requested`
 * when a post starts waiting, `post.approved` and `post.changes_requested`
 * when someone decides. Once per outcome, by its key. Events carry ids,
 * instants and who decided by kind: never a name, a comment or what the
 * post says. A comment sends no event.
 */
export const webhookReviewOutcomes = <E, R>(
  told: Layer.Layer<ReviewOutcomes, E, R>
) =>
  Layer.effect(
    ReviewOutcomes,
    Effect.gen(function* WebhookReviewOutcomes() {
      const outcomes = yield* ReviewOutcomes;
      const webhooks = yield* WebhookEvents;

      const publish = (key: string, event: EventToPublish["event"]) =>
        neverStopping(webhooks.publish({ event, key: `review:${key}` }));

      return ReviewOutcomes.of({
        approvalRequested: (outcome) =>
          publish(outcome.key, {
            data: {
              postId: outcome.postId,
              scheduledAt: outcome.scheduledAt,
              workspaceId: outcome.workspaceId,
            },
            type: "post.approval_requested",
          }).pipe(Effect.andThen(outcomes.approvalRequested(outcome))),
        approved: (outcome) =>
          publish(outcome.key, {
            data: {
              by: partyOf(outcome.by),
              late: outcome.late,
              postId: outcome.postId,
              workspaceId: outcome.workspaceId,
            },
            type: "post.approved",
          }).pipe(Effect.andThen(outcomes.approved(outcome))),
        changesRequested: (outcome) =>
          publish(outcome.key, {
            data: {
              by: partyOf(outcome.by),
              postId: outcome.postId,
              workspaceId: outcome.workspaceId,
            },
            type: "post.changes_requested",
          }).pipe(Effect.andThen(outcomes.changesRequested(outcome))),
        commented: outcomes.commented,
        settled: outcomes.settled,
      });
    })
  ).pipe(Layer.provide(told));
