import { DateTime, Effect, Layer, Option } from "effect";

import { Notify } from "#notifications/application/notify.ts";
import { FeedNotices } from "#publishing/application/feed-notices.ts";
import { DatabaseError } from "#shared/application/database-error.ts";

/**
 * FeedNotices through the notifications context: `FeedStopped`, in the
 * transaction that stops the feed, to whoever started it while they are a
 * member (as a post's author), else to every member who may schedule
 * posts, and to those who chose to hear of every post. Keyed by the feed
 * and when it stopped, so each stop is told once. The feed's id and the
 * reason only: nothing a feed says.
 */
export const NotifiedFeedNotices = Layer.effect(
  FeedNotices,
  Effect.gen(function* NotifiedFeedNotices() {
    const notices = yield* Notify;

    return FeedNotices.of({
      stopped: (feed, reason) =>
        notices
          .notify({
            ...Option.match(feed.startedBy, {
              onNone: () => ({}),
              onSome: (author) => ({ author }),
            }),
            event: { _tag: "FeedStopped", feedId: feed.id, reason },
            key: `feed-stopped:${feed.id}:${String(
              feed.status._tag === "stopped"
                ? DateTime.toEpochMillis(feed.status.stoppedAt)
                : DateTime.toEpochMillis(feed.updatedAt)
            )}`,
            workspaceId: feed.workspaceId,
          })
          .pipe(
            Effect.catchTag("RecipientsUnavailable", (failure) =>
              Effect.fail(new DatabaseError({ cause: failure }))
            )
          ),
    });
  })
);
