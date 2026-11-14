import { Effect, Layer, Option } from "effect";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { isSocialChannel } from "#channels/application/social-channels.ts";
import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { LivePostEvents } from "#publishing/application/live-post-events.ts";
import type { LivePostChange } from "#publishing/domain/live-post-change.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// A bug in telling must never stop the change from settling: it is logged,
// and the database failing rolls the change back with it, to be retried.
const neverStopping = <R>(
  telling: Effect.Effect<void, DatabaseError, R>
): Effect.Effect<void, DatabaseError, R> =>
  telling.pipe(
    Effect.catchDefect((defect) =>
      Effect.logError("A live post's change could not be told", defect)
    )
  );

/**
 * LivePostEvents that tell, in the transaction that settles a change, the
 * workspace's webhook endpoints (`post.unpublished`,
 * `post.unpublish_failed`, `post.edited`, `post.edit_failed`: ids, codes,
 * places and instants, never what the post says), and, once a post is off
 * its platform, analytics and the inbox,
 * which stop following it and keep what they read
 * (`AnalyticsRecords.postRemoved`, `EngagementRecords.postRemoved`).
 */
export const ToldLivePostEvents = Layer.effect(
  LivePostEvents,
  Effect.gen(function* ToldLivePostEvents() {
    const channels = yield* ChannelRepository;
    const webhooks = yield* WebhookEvents;
    const analytics = yield* AnalyticsRecords;
    const engagement = yield* EngagementRecords;

    // The target as an event names it, with its channel's platform as the
    // channels context has it now: none once the channel is disconnected.
    const refOf = Effect.fn("LivePostEvents.refOf")(function* refOf(
      change: LivePostChange,
      target: PostTarget
    ) {
      const channel = (yield* channels.get(target.channelId)).pipe(
        Option.filter(isSocialChannel)
      );

      return {
        channelId: target.channelId,
        platform: channel.pipe(
          Option.map(({ platform }) => platform),
          Option.getOrNull
        ),
        postId: change.postId,
        targetId: target.id,
        workspaceId: change.workspaceId,
      };
    });

    const unpublished = (change: LivePostChange, target: PostTarget) =>
      neverStopping(
        Effect.gen(function* tell() {
          const removedAt = Option.getOrThrow(change.finishedAt);

          yield* analytics.postRemoved(target.id, removedAt);
          yield* engagement.postRemoved(target.id, removedAt);
          yield* webhooks.publish({
            event: {
              data: {
                ...(yield* refOf(change, target)),
                alreadyGone: change.alreadyGone,
                removedAt,
              },
              type: "post.unpublished",
            },
            key: `live-post-change:${change.id}:done`,
          });
        })
      );

    const unpublishFailed = (change: LivePostChange, target: PostTarget) =>
      neverStopping(
        Effect.gen(function* tell() {
          yield* webhooks.publish({
            event: {
              data: {
                ...(yield* refOf(change, target)),
                code: Option.getOrElse(change.failureCode, () => "unknown"),
                failedAt: Option.getOrThrow(change.finishedAt),
              },
              type: "post.unpublish_failed",
            },
            key: `live-post-change:${change.id}:failed`,
          });
        })
      );

    // An edit changes nothing analytics or the inbox read: the webhooks
    // alone hear of it.
    const edited = (change: LivePostChange, target: PostTarget, part: number) =>
      neverStopping(
        Effect.gen(function* tell() {
          yield* webhooks.publish({
            event: {
              data: {
                ...(yield* refOf(change, target)),
                editedAt: Option.getOrThrow(change.finishedAt),
                part,
              },
              type: "post.edited",
            },
            key: `live-post-change:${change.id}:done`,
          });
        })
      );

    const editFailed = (
      change: LivePostChange,
      target: PostTarget,
      part: number
    ) =>
      neverStopping(
        Effect.gen(function* tell() {
          yield* webhooks.publish({
            event: {
              data: {
                ...(yield* refOf(change, target)),
                code: Option.getOrElse(change.failureCode, () => "unknown"),
                failedAt: Option.getOrThrow(change.finishedAt),
                part,
              },
              type: "post.edit_failed",
            },
            key: `live-post-change:${change.id}:failed`,
          });
        })
      );

    return LivePostEvents.of({
      editFailed,
      edited,
      unpublishFailed,
      unpublished,
    });
  })
);
