import { Result } from "effect";
import type { DateTime } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

import { InvalidPostTransition } from "./invalid-post-transition.ts";
import type { InvalidTargetTransition } from "./invalid-target-transition.ts";
import { LastTargetLeft } from "./last-target-left.ts";
import { withoutChannels } from "./post-content.ts";
import { cancelledFromPost } from "./post-target.ts";
import type { PostTarget } from "./post-target.ts";
import { Post } from "./post.ts";

/**
 * Takes one channel off a post that waits for its time (scheduled, or
 * awaiting an approval), which still goes out on the others: the target
 * is cancelled, marked `dropped`, and never sent. A target that is not
 * pending stays as it is, and so does the last one still pending, as the
 * post would go out nowhere (`LastTargetLeft`: cancel the post instead).
 * `targets` are every target of the post, read under its lock.
 */
export const dropTarget = (
  post: Post,
  targets: readonly PostTarget[],
  target: PostTarget,
  now: DateTime.Utc
): Result.Result<
  PostTarget,
  InvalidPostTransition | InvalidTargetTransition | LastTargetLeft
> => {
  const { status } = post;

  if (status._tag !== "scheduled" && status._tag !== "awaitingApproval") {
    return Result.fail(
      new InvalidPostTransition({
        action: "dropTarget",
        from: status._tag,
        postId: post.id,
      })
    );
  }

  return Result.flatMap(cancelledFromPost(target, now), (dropped) =>
    targets.some(
      ({ id, status: other }) => id !== target.id && other._tag === "pending"
    )
      ? Result.succeed(dropped)
      : Result.fail(
          new LastTargetLeft({ postId: post.id, targetId: target.id })
        )
  );
};

/**
 * The post without what its parts had on a channel taken off it: the
 * channel's texts and media of their own go with it, so nothing names a
 * channel the post no longer goes to, and the files only it showed are
 * free again. What every other channel receives is as it was.
 */
export const withoutChannelOf = (post: Post, channelId: ChannelId): Post =>
  new Post({
    attribution: post.attribution,
    authorId: post.authorId,
    content: withoutChannels(post.content, [channelId]),
    id: post.id,
    occurrence: post.occurrence,
    queueId: post.queueId,
    scheduleRevision: post.scheduleRevision,
    shortenLinks: post.shortenLinks,
    status: post.status,
    tagIds: post.tagIds,
    workspaceId: post.workspaceId,
  });
