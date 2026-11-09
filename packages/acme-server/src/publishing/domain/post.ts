import { DateTime, Option, Result, Schema } from "effect";

import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

import { InvalidPostTransition } from "./invalid-post-transition.ts";
import type { PostAction } from "./invalid-post-transition.ts";
import { PostNotDue } from "./post-not-due.ts";
import { PostStatusSchema } from "./post-status.ts";
import type { PostOutcome, PostStatus } from "./post-status.ts";
import type { PostTarget } from "./post-target.ts";
import { ScheduleInPast } from "./schedule-in-past.ts";
import type { Schedule } from "./schedule.ts";

/**
 * A post, sent to one or more channels (its targets, `./post-target.ts`), and
 * where it is in its life:
 *
 * | From       | To                                           |
 * | ---------- | -------------------------------------------- |
 * | draft      | scheduled, cancelled                         |
 * | scheduled  | scheduled (moved), draft, publishing,        |
 * |            | cancelled                                    |
 * | publishing | finished                                     |
 * | finished   | nothing                                      |
 * | cancelled  | nothing                                      |
 *
 * `scheduleRevision` counts the times the post was scheduled or taken back
 * to draft. The job that publishes a post is started for one revision, and
 * only publishes while the post still has it, so a job left from an earlier
 * schedule does nothing.
 *
 * Transitions are pure: each takes the post and the facts it needs, and
 * returns the next post or a typed error. Time comes in as `now`.
 */
export class Post extends Schema.Class<Post>(
  "acme-server/publishing/domain/Post"
)({
  id: PostIdSchema,
  scheduleRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  status: PostStatusSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

type Transition<E = never> = Result.Result<Post, InvalidPostTransition | E>;

const withStatus = (
  post: Post,
  status: PostStatus,
  scheduleRevision = post.scheduleRevision
): Post =>
  new Post({
    id: post.id,
    scheduleRevision,
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

export const createDraft = (id: PostId, workspaceId: WorkspaceId): Post =>
  new Post({
    id,
    scheduleRevision: 0,
    status: { _tag: "draft" },
    workspaceId,
  });

/**
 * Schedules a draft, or moves a scheduled post to another time. Either way the
 * post gets a new revision, which the job for its previous time does not
 * publish.
 */
export const schedulePost = (
  post: Post,
  schedule: Schedule,
  now: DateTime.Utc
): Transition<ScheduleInPast> => {
  const { status } = post;

  if (status._tag !== "draft" && status._tag !== "scheduled") {
    return rejected(post, "schedule");
  }

  if (DateTime.isLessThan(schedule.at, now)) {
    return Result.fail(
      new ScheduleInPast({ at: schedule.at, now, postId: post.id })
    );
  }

  return Result.succeed(
    withStatus(post, { _tag: "scheduled", schedule }, post.scheduleRevision + 1)
  );
};

/** Takes a scheduled post back to draft, with a new revision. */
export const moveToDraft = (post: Post): Transition =>
  post.status._tag === "scheduled"
    ? Result.succeed(
        withStatus(post, { _tag: "draft" }, post.scheduleRevision + 1)
      )
    : rejected(post, "moveToDraft");

/** Starts publishing a scheduled post once its time has come. */
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

/**
 * How a post ended, from its settled targets: unconfirmed as soon as one
 * channel may have it live (the user has to check), published when every
 * channel has it, partially when some do, cancelled when every target was
 * cancelled, failed otherwise.
 */
export const outcomeOf = (targets: readonly PostTarget[]): PostOutcome => {
  const statuses = targets.map((target) => target.status._tag);
  const published = statuses.filter((status) => status === "published").length;

  if (statuses.includes("unconfirmed")) {
    return "unconfirmed";
  }

  if (published > 0) {
    return published === statuses.length ? "published" : "partiallyPublished";
  }

  return statuses.every((status) => status === "cancelled")
    ? "cancelled"
    : "failed";
};

/** Ends publishing, with the outcome its settled targets add up to. */
export const finishPost = (
  post: Post,
  targets: readonly PostTarget[],
  now: DateTime.Utc
): Transition => {
  const { status } = post;

  if (status._tag !== "publishing") {
    return rejected(post, "finish");
  }

  return Result.succeed(
    withStatus(post, {
      _tag: "finished",
      finishedAt: now,
      outcome: outcomeOf(targets),
      schedule: status.schedule,
      startedAt: status.startedAt,
    })
  );
};

/**
 * Cancels a draft or a scheduled post. A post already publishing is not
 * cancelled as a whole: its targets not yet sent are, and it finishes once the
 * others have.
 */
export const cancelPost = (post: Post, now: DateTime.Utc): Transition => {
  const { status } = post;

  if (status._tag === "draft") {
    return Result.succeed(
      withStatus(post, {
        _tag: "cancelled",
        cancelledAt: now,
        schedule: Option.none(),
      })
    );
  }

  if (status._tag === "scheduled") {
    return Result.succeed(
      withStatus(post, {
        _tag: "cancelled",
        cancelledAt: now,
        schedule: Option.some(status.schedule),
      })
    );
  }

  return rejected(post, "cancel");
};
