import { DateTime, Option, Result, Schema } from "effect";

import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { InvalidPostTransition } from "./invalid-post-transition.ts";
import type { PostAction } from "./invalid-post-transition.ts";
import { PostNotDue } from "./post-not-due.ts";
import { PostStatusSchema } from "./post-status.ts";
import type {
  FailureReason,
  PlatformPostId,
  PostStatus,
} from "./post-status.ts";
import { ScheduleInPast } from "./schedule-in-past.ts";
import type { Schedule } from "./schedule.ts";

/**
 * A post for one channel, and where it is in its life:
 *
 * | From        | To                                             |
 * | ----------- | ---------------------------------------------- |
 * | draft       | scheduled                                      |
 * | scheduled   | scheduled (moved), draft, publishing           |
 * | publishing  | published, failed, unconfirmed                 |
 * | failed      | scheduled, draft                               |
 * | unconfirmed | published or failed, once the user has checked |
 * | published   | nothing                                        |
 *
 * Transitions are pure: each takes the post and the facts it needs, and
 * returns the next post or a typed error. Time comes in as `now`.
 */
export class Post extends Schema.Class<Post>(
  "acme-server/publishing/domain/Post"
)({
  channelId: ChannelIdSchema,
  id: PostIdSchema,
  status: PostStatusSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type Transition<E = never> = Result.Result<Post, InvalidPostTransition | E>;

const withStatus = (post: Post, status: PostStatus): Post =>
  new Post({
    channelId: post.channelId,
    id: post.id,
    status,
    workspaceId: post.workspaceId,
  });

const rejected = (
  post: Post,
  action: PostAction
): Result.Result<never, InvalidPostTransition> =>
  Result.fail(
    new InvalidPostTransition({
      action,
      from: post.status._tag,
      postId: post.id,
    })
  );

export const createDraft = (
  id: PostId,
  workspaceId: WorkspaceId,
  channelId: ChannelId
): Post => new Post({ channelId, id, status: { _tag: "draft" }, workspaceId });

/**
 * Schedules a draft, moves a scheduled post, or schedules a failed post
 * again. An unconfirmed post cannot be scheduled: it may already be live, so
 * the user confirms it first.
 */
export const schedulePost = (
  post: Post,
  schedule: Schedule,
  now: DateTime.Utc
): Transition<ScheduleInPast> => {
  const { status } = post;

  if (
    status._tag !== "draft" &&
    status._tag !== "scheduled" &&
    status._tag !== "failed"
  ) {
    return rejected(post, "schedule");
  }

  if (DateTime.isLessThan(schedule.at, now)) {
    return Result.fail(
      new ScheduleInPast({ at: schedule.at, now, postId: post.id })
    );
  }

  return Result.succeed(withStatus(post, { _tag: "scheduled", schedule }));
};

/** Takes a scheduled or failed post back to draft. */
export const moveToDraft = (post: Post): Transition => {
  const { status } = post;

  if (status._tag !== "scheduled" && status._tag !== "failed") {
    return rejected(post, "moveToDraft");
  }

  return Result.succeed(withStatus(post, { _tag: "draft" }));
};

/** Starts publishing a scheduled post once its instant has come. */
export const startPublishing = (
  post: Post,
  now: DateTime.Utc
): Transition<PostNotDue> => {
  const { status } = post;

  if (status._tag !== "scheduled") {
    return rejected(post, "startPublishing");
  }

  if (DateTime.isLessThan(now, status.schedule.at)) {
    return Result.fail(
      new PostNotDue({ at: status.schedule.at, now, postId: post.id })
    );
  }

  return Result.succeed(
    withStatus(post, {
      _tag: "publishing",
      schedule: status.schedule,
      startedAt: now,
    })
  );
};

/** The platform accepted the post and gave it an id. */
export const markPublished = (
  post: Post,
  platformPostId: PlatformPostId,
  now: DateTime.Utc
): Transition => {
  if (post.status._tag !== "publishing") {
    return rejected(post, "markPublished");
  }

  return Result.succeed(
    withStatus(post, {
      _tag: "published",
      platformPostId: Option.some(platformPostId),
      publishedAt: now,
    })
  );
};

/** The platform refused the post, or it could not be sent. */
export const markFailed = (
  post: Post,
  reason: FailureReason,
  now: DateTime.Utc
): Transition => {
  if (post.status._tag !== "publishing") {
    return rejected(post, "markFailed");
  }

  return Result.succeed(
    withStatus(post, { _tag: "failed", failedAt: now, reason })
  );
};

/**
 * The attempt ended without knowing whether the platform published the post,
 * as when a request times out after it was sent.
 */
export const markUnconfirmed = (post: Post): Transition => {
  const { status } = post;

  if (status._tag !== "publishing") {
    return rejected(post, "markUnconfirmed");
  }

  return Result.succeed(
    withStatus(post, { _tag: "unconfirmed", attemptedAt: status.startedAt })
  );
};

/**
 * The user found an unconfirmed post on the platform. The platform's id for it
 * is unknown unless the user gives it.
 */
export const confirmPublished = (
  post: Post,
  platformPostId: Option.Option<PlatformPostId>,
  now: DateTime.Utc
): Transition => {
  if (post.status._tag !== "unconfirmed") {
    return rejected(post, "confirmPublished");
  }

  return Result.succeed(
    withStatus(post, { _tag: "published", platformPostId, publishedAt: now })
  );
};

/**
 * The user found no trace of an unconfirmed post on the platform. It becomes
 * failed, and can then be scheduled again.
 */
export const confirmNotPublished = (
  post: Post,
  now: DateTime.Utc
): Transition => {
  if (post.status._tag !== "unconfirmed") {
    return rejected(post, "confirmNotPublished");
  }

  return Result.succeed(
    withStatus(post, { _tag: "failed", failedAt: now, reason: "notPublished" })
  );
};
