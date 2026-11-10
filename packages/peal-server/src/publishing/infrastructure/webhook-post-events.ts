import { DateTime, Effect, Layer, Match, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

type Event = EventToPublish["event"];

// What webhook endpoints hear of posts, from publishing's two seams: what
// members do to a post's schedule (PostEvents) and how each target ends
// (PublicationOutcomes). Both run in the transaction that records the
// fact, which the webhooks context's WebhookEvents joins: an event commits
// with it or not at all, once per key. Events carry ids, states, codes and
// instants: never what the post says.

// A bug in telling must never stop publishing: it is logged, and its
// savepoint rolled back. The database failing rolls the fact back with it,
// and the step is retried.
const neverStopping = <R>(
  telling: Effect.Effect<void, DatabaseError, R>
): Effect.Effect<void, DatabaseError, R> =>
  telling.pipe(
    Effect.catchDefect((defect) =>
      Effect.logError("A post's webhook event could not be published", defect)
    )
  );

const makeTelling = Effect.gen(function* makeTelling() {
  const channels = yield* ChannelRepository;
  const webhooks = yield* WebhookEvents;

  // The target as an event names it, with its channel's platform as the
  // channels context has it now: none once the channel is disconnected.
  const refOf = Effect.fn("PostEvents.refOf")(function* refOf(
    target: PostTarget
  ) {
    const channel = yield* channels.get(target.channelId);

    return {
      channelId: target.channelId,
      platform: channel.pipe(
        Option.map(({ platform }) => platform),
        Option.getOrNull
      ),
      targetId: target.id,
    };
  });

  const refsOf = (targets: readonly PostTarget[]) =>
    Effect.all(targets.map((target) => refOf(target)));

  const publish = (key: string, event: Event) =>
    webhooks.publish({ event, key });

  // How a target ended, in the round it was sent: nothing while it has not.
  const settled = Effect.fn("PostEvents.settled")(function* settled(
    post: Post,
    target: PostTarget,
    how: "confirmed" | "settled"
  ) {
    const on = {
      ...(yield* refOf(target)),
      postId: post.id,
      round: target.round,
      workspaceId: post.workspaceId,
    };

    const key = `post-target:${target.id}:${target.round}:${how}:${target.status._tag}`;

    yield* Match.valueTags(target.status, {
      cancelled: ({ cancelledAt }) =>
        publish(key, {
          data: {
            cancelledAt,
            postId: post.id,
            targets: [
              {
                channelId: on.channelId,
                platform: on.platform,
                targetId: on.targetId,
              },
            ],
            workspaceId: post.workspaceId,
          },
          type: "post.cancelled",
        }),
      failed: ({ failedAt, reason }) =>
        publish(key, {
          data: { ...on, failedAt, reason },
          type: "post.failed",
        }),
      pending: () => Effect.void,
      published: ({ permalink, publishedAt }) =>
        publish(key, {
          data: { ...on, permalink: Option.getOrNull(permalink), publishedAt },
          type: "post.published",
        }),
      publishing: () => Effect.void,
      unconfirmed: ({ attemptedAt, reason }) =>
        publish(key, {
          data: { ...on, attemptedAt, reason },
          type: "post.unconfirmed",
        }),
    });
  });

  return { publish, refsOf, settled };
});

/**
 * PostEvents through the webhooks context: `post.scheduled` for each
 * schedule or move (keyed by the post's schedule revision),
 * `post.unscheduled`, `post.cancelled` with the targets cancelled then, and
 * what a member found for an unconfirmed target, as the `post.published`
 * or `post.failed` it turned out to be.
 */
export const WebhookPostEvents = Layer.effect(
  PostEvents,
  Effect.gen(function* WebhookPostEvents() {
    const { publish, refsOf, settled } = yield* makeTelling;

    const scheduled = Effect.fn("PostEvents.scheduled")(function* scheduled(
      post: Post,
      targets: readonly PostTarget[]
    ) {
      if (post.status._tag !== "scheduled") {
        return;
      }

      yield* publish(`post:${post.id}:scheduled:${post.scheduleRevision}`, {
        data: {
          postId: post.id,
          scheduledAt: post.status.schedule.at,
          targets: yield* refsOf(targets),
          timeZone: post.status.schedule.timeZone,
          workspaceId: post.workspaceId,
        },
        type: "post.scheduled",
      });
    });

    const cancelled = Effect.fn("PostEvents.cancelled")(function* cancelled(
      post: Post,
      targets: readonly PostTarget[]
    ) {
      const cancelledAt = yield* DateTime.now;

      yield* publish(
        `post:${post.id}:cancelled:${DateTime.formatIso(cancelledAt)}`,
        {
          data: {
            cancelledAt,
            postId: post.id,
            targets: yield* refsOf(targets),
            workspaceId: post.workspaceId,
          },
          type: "post.cancelled",
        }
      );
    });

    return PostEvents.of({
      cancelled: (post, targets) => neverStopping(cancelled(post, targets)),
      confirmed: (post, target) =>
        neverStopping(settled(post, target, "confirmed")),
      scheduled: (post, targets) => neverStopping(scheduled(post, targets)),
      unscheduled: (post) =>
        neverStopping(
          publish(`post:${post.id}:unscheduled:${post.scheduleRevision}`, {
            data: { postId: post.id, workspaceId: post.workspaceId },
            type: "post.unscheduled",
          })
        ),
    });
  })
);

/**
 * Outcomes told through `told`, after the workspace's webhook endpoints
 * heard how the target ended, in the transaction that settled it:
 * `post.published`, `post.failed`, `post.unconfirmed`, or `post.cancelled`
 * for a target cancelled while its post was going out. Once per target,
 * round and outcome, so a repost is told again.
 */
export const webhookOutcomes = <E, R>(
  told: Layer.Layer<PublicationOutcomes, E, R>
) =>
  Layer.effect(
    PublicationOutcomes,
    Effect.gen(function* WebhookPublicationOutcomes() {
      const outcomes = yield* PublicationOutcomes;
      const posts = yield* PostRepository;
      const { settled } = yield* makeTelling;

      const tell = Effect.fn("PublicationOutcomes.tellWebhooks")(function* tell(
        target: PostTarget
      ) {
        const found = yield* posts.find(target.postId);

        if (Option.isSome(found)) {
          yield* settled(found.value.post, target, "settled");
        }
      });

      return PublicationOutcomes.of({
        resolved: outcomes.resolved,
        settled: (target) =>
          neverStopping(tell(target)).pipe(
            Effect.andThen(outcomes.settled(target))
          ),
      });
    })
  ).pipe(Layer.provide(told));
