import { DateTime, Duration, Effect, Option, Result, Schema } from "effect";

import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { InvalidPostTransition } from "./invalid-post-transition.ts";
import type { PostAction } from "./invalid-post-transition.ts";
import { PostContent } from "./post-content.ts";
import { PostNotDue } from "./post-not-due.ts";
import { PostOccurrenceSchema } from "./post-occurrence.ts";
import type { PostOccurrence } from "./post-occurrence.ts";
import { PostAttribution, PostAttributionField } from "./post-origin.ts";
import type { PostOrigin } from "./post-origin.ts";
import { PostStatusSchema } from "./post-status.ts";
import type { PostOutcome, PostStatus } from "./post-status.ts";
import type { PostTarget } from "./post-target.ts";
import { QueueIdSchema } from "./queue-id.ts";
import type { QueueId } from "./queue-id.ts";
import { ScheduleInPast } from "./schedule-in-past.ts";
import { Schedule } from "./schedule.ts";
import type { TagId } from "./tag-id.ts";
import { PostTagIdsSchema } from "./tag.ts";

/**
 * A post, sent to one or more channels (its targets, `./post-target.ts`), and
 * where it is in its life:
 *
 * | From             | To                                       |
 * | ---------------- | ---------------------------------------- |
 * | draft            | draft (edited), awaitingApproval,        |
 * |                  | scheduled, cancelled, discarded (deleted)|
 * | awaitingApproval | awaitingApproval (moved), scheduled      |
 * |                  | (approved, or scheduled by someone who   |
 * |                  | may), draft, cancelled                   |
 * | scheduled        | scheduled (moved), awaitingApproval,     |
 * |                  | draft, publishing, cancelled             |
 * | publishing       | finished                                 |
 * | finished         | finished (a target confirmed),           |
 * |                  | publishing (a target reposted)           |
 * | cancelled        | nothing                                  |
 *
 * A post waits for an approval (`awaitingApproval`) when its workspace asks
 * for one before it is scheduled: it has its time, and no job.
 *
 * What the post says is its content (`./post-content.ts`), which only a
 * draft may change. Its author is the member who created it, none when an
 * API key did, and its attribution says how it was created and scheduled
 * (`./post-origin.ts`). Its tags (`./tag.ts`) file it for its workspace:
 * they are no part of what it says, and change whatever its status.
 *
 * `queueId` is the queue that gave it its time, if one did (`./queue.ts`):
 * it holds that queue's slot while it is scheduled, awaiting approval or
 * publishing at exactly the slot's instant. A move by hand keeps it, and
 * so does a move back to draft: the slot follows from the time and the
 * status, never from this alone.
 *
 * `occurrence` says which recycling rule made it, and its place among the
 * rule's posts (`./recycling-rule.ts`): an ordinary post otherwise, with
 * its own job and outcome, which a member moves or cancels as any other.
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
  "peal-server/publishing/domain/Post"
)({
  attribution: PostAttributionField,
  authorId: Schema.Option(UserIdSchema),
  content: PostContent,
  id: PostIdSchema,
  // None unless a recycling rule made it: which, and its place among the
  // rule's posts.
  occurrence: Schema.Option(PostOccurrenceSchema).pipe(
    Schema.withConstructorDefault(Effect.succeed(Option.none()))
  ),
  // None unless a queue placed it.
  queueId: Schema.Option(QueueIdSchema).pipe(
    Schema.withConstructorDefault(Effect.succeed(Option.none()))
  ),
  scheduleRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  status: PostStatusSchema,
  // None unless given: the labels its workspace filed it under.
  tagIds: PostTagIdsSchema.pipe(
    Schema.withConstructorDefault(Effect.succeed([]))
  ),
  workspaceId: WorkspaceIdSchema,
}) {}

type Transition<E = never> = Result.Result<Post, InvalidPostTransition | E>;

const withStatus = (
  post: Post,
  status: PostStatus,
  scheduleRevision = post.scheduleRevision
): Post =>
  new Post({
    attribution: post.attribution,
    authorId: post.authorId,
    content: post.content,
    id: post.id,
    occurrence: post.occurrence,
    queueId: post.queueId,
    scheduleRevision,
    status,
    tagIds: post.tagIds,
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

/** The member an actor stands for, who authors what they create. */
export const authorOf = (actor: Actor): Option.Option<UserId> =>
  actor.subject._tag === "user"
    ? Option.some(actor.subject.userId)
    : Option.none();

/** Whether the actor is the member who created the post. */
export const isAuthor = (post: Post, actor: Actor): boolean =>
  Option.isSome(post.authorId) &&
  Option.contains(authorOf(actor), post.authorId.value);

/**
 * Who may discard a draft: members with post:delete, and its author while
 * they may change drafts (post:update), as contributors may.
 */
export const mayDiscard = (actor: Actor, post: Post): boolean =>
  can(actor, "post:delete") ||
  (can(actor, "post:update") && isAuthor(post, actor));

export const createDraft = (
  id: PostId,
  workspaceId: WorkspaceId,
  content: PostContent,
  authorId: Option.Option<UserId>,
  // How its creator reached Peal, when known.
  via: Option.Option<PostOrigin> = Option.none()
): Post =>
  new Post({
    attribution: new PostAttribution({
      createdVia: via,
      scheduledBy: Option.none(),
      scheduledVia: Option.none(),
    }),
    authorId,
    content,
    id,
    scheduleRevision: 0,
    status: { _tag: "draft" },
    workspaceId,
  });

/**
 * Gives a draft new content. Once scheduled, a post keeps what it says: the
 * user takes it back to draft to change it.
 */
export const editDraft = (post: Post, content: PostContent): Transition =>
  post.status._tag === "draft"
    ? Result.succeed(
        new Post({
          attribution: post.attribution,
          authorId: post.authorId,
          content,
          id: post.id,
          occurrence: post.occurrence,
          queueId: post.queueId,
          scheduleRevision: post.scheduleRevision,
          status: post.status,
          tagIds: post.tagIds,
          workspaceId: post.workspaceId,
        })
      )
    : rejected(post, "edit");

/**
 * Discards a draft: it is deleted, as it never went out. A post scheduled
 * once and taken back to draft is discarded too; anything else is cancelled
 * or stays as it ended.
 */
export const discardDraft = (post: Post): Transition =>
  post.status._tag === "draft"
    ? Result.succeed(post)
    : rejected(post, "discard");

/**
 * How long before `now` a time may be and still mean now: a caller that
 * publishes now read the clock a moment before the use case did.
 */
export const scheduleGrace = Duration.minutes(1);

// The post, with who scheduled it and how.
const attributed = (
  post: Post,
  scheduledVia: Option.Option<PostOrigin>,
  scheduledBy: Option.Option<UserId>
): Post =>
  new Post({
    attribution: new PostAttribution({
      createdVia: post.attribution.createdVia,
      scheduledBy,
      scheduledVia,
    }),
    authorId: post.authorId,
    content: post.content,
    id: post.id,
    occurrence: post.occurrence,
    queueId: post.queueId,
    scheduleRevision: post.scheduleRevision,
    status: post.status,
    tagIds: post.tagIds,
    workspaceId: post.workspaceId,
  });

/**
 * Files the post under these tags, instead of those it had. Tags say
 * nothing to the platforms, so a post takes them whatever its status.
 */
export const tagPost = (post: Post, tagIds: readonly TagId[]): Post =>
  new Post({
    attribution: post.attribution,
    authorId: post.authorId,
    content: post.content,
    id: post.id,
    occurrence: post.occurrence,
    queueId: post.queueId,
    scheduleRevision: post.scheduleRevision,
    status: post.status,
    tagIds,
    workspaceId: post.workspaceId,
  });

/**
 * The post as a queue placed it: it holds the queue's slot at its time.
 * Placing it on another queue's slot names that queue instead.
 */
export const placedBy = (post: Post, queueId: QueueId): Post =>
  new Post({
    attribution: post.attribution,
    authorId: post.authorId,
    content: post.content,
    id: post.id,
    occurrence: post.occurrence,
    queueId: Option.some(queueId),
    scheduleRevision: post.scheduleRevision,
    status: post.status,
    tagIds: post.tagIds,
    workspaceId: post.workspaceId,
  });

/** The post as a recycling rule makes it: its occurrence of the rule. */
export const madeBy = (post: Post, occurrence: PostOccurrence): Post =>
  new Post({
    attribution: post.attribution,
    authorId: post.authorId,
    content: post.content,
    id: post.id,
    occurrence: Option.some(occurrence),
    queueId: post.queueId,
    scheduleRevision: post.scheduleRevision,
    status: post.status,
    tagIds: post.tagIds,
    workspaceId: post.workspaceId,
  });

/**
 * Records who scheduled or moved the post, and how they reached Peal: the
 * latest to do so, as a post has one time.
 */
export const scheduledThrough = (
  post: Post,
  via: PostOrigin,
  by: Option.Option<UserId>
): Post => attributed(post, Option.some(via), by);

// The time a post takes when asked for `schedule` at `now`: `now` itself
// for a time up to `scheduleGrace` before it, and none for an earlier one.
const timeFrom = (
  post: Post,
  schedule: Schedule,
  now: DateTime.Utc
): Result.Result<Schedule, ScheduleInPast> => {
  if (
    DateTime.isLessThan(
      schedule.at,
      DateTime.subtractDuration(now, scheduleGrace)
    )
  ) {
    return Result.fail(
      new ScheduleInPast({ at: schedule.at, now, postId: post.id })
    );
  }

  return Result.succeed(
    DateTime.isLessThan(schedule.at, now)
      ? new Schedule({ at: now, timeZone: schedule.timeZone })
      : schedule
  );
};

/**
 * The schedule a request asked for at `received`, once its checks are done
 * at `now`: a time that was not past when it was asked is not past because
 * the platforms were slow to say what their accounts take, and becomes
 * `now`. One that was past then stays as it is, for `schedulePost` to
 * refuse.
 */
export const asReceived = (
  schedule: Schedule,
  received: DateTime.Utc,
  now: DateTime.Utc
): Schedule =>
  DateTime.isLessThan(schedule.at, now) &&
  !DateTime.isLessThan(
    schedule.at,
    DateTime.subtractDuration(received, scheduleGrace)
  )
    ? new Schedule({ at: now, timeZone: schedule.timeZone })
    : schedule;

const hasNoTimeYet = ({ status }: Post) =>
  status._tag !== "draft" &&
  status._tag !== "scheduled" &&
  status._tag !== "awaitingApproval";

/**
 * Schedules a draft or a post waiting for an approval, or moves a scheduled
 * post to another time. Either way the post gets a new revision, which the
 * job for its previous time does not publish. A time up to `scheduleGrace`
 * before `now` is scheduled at `now`.
 */
export const schedulePost = (
  post: Post,
  schedule: Schedule,
  now: DateTime.Utc
): Transition<ScheduleInPast> =>
  hasNoTimeYet(post)
    ? rejected(post, "schedule")
    : timeFrom(post, schedule, now).pipe(
        Result.map((at) =>
          withStatus(
            post,
            { _tag: "scheduled", schedule: at },
            post.scheduleRevision + 1
          )
        )
      );

/**
 * Holds a post that was just scheduled until someone approves it: it keeps
 * its time and its revision, and gets no job. Scheduling a post that needs
 * an approval is `schedulePost`, then this.
 */
export const awaitApproval = (post: Post): Transition =>
  post.status._tag === "scheduled"
    ? Result.succeed(
        withStatus(post, {
          _tag: "awaitingApproval",
          schedule: post.status.schedule,
        })
      )
    : rejected(post, "awaitApproval");

/**
 * What becomes of a post waiting for an approval once it is approved: it is
 * scheduled for the time it was asked for. An approval that comes after
 * that time publishes nothing late: the post goes back to draft, for a
 * member to give it a new time (a time up to `scheduleGrace` ago still means
 * now). Either way it gets a new revision.
 */
export const releasePost = (post: Post, now: DateTime.Utc): Transition => {
  const { status } = post;

  if (status._tag !== "awaitingApproval") {
    return rejected(post, "release");
  }

  return Result.succeed(
    Result.match(timeFrom(post, status.schedule, now), {
      onFailure: () =>
        attributed(
          withStatus(post, { _tag: "draft" }, post.scheduleRevision + 1),
          Option.none(),
          Option.none()
        ),
      onSuccess: (at) =>
        withStatus(
          post,
          { _tag: "scheduled", schedule: at },
          post.scheduleRevision + 1
        ),
    })
  );
};

/**
 * Takes a scheduled post, or one waiting for an approval, back to draft,
 * with a new revision. Nobody scheduled a draft: it keeps only how it was
 * created.
 */
export const moveToDraft = (post: Post): Transition =>
  post.status._tag === "scheduled" || post.status._tag === "awaitingApproval"
    ? Result.succeed(
        attributed(
          withStatus(post, { _tag: "draft" }, post.scheduleRevision + 1),
          Option.none(),
          Option.none()
        )
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
 * channel has it whole, partially when some do or when a channel has some
 * of its parts only, cancelled when every target was cancelled, failed
 * otherwise.
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

  // Nothing is whole anywhere, and some parts are live somewhere.
  if (targets.some((target) => target.liveParts.length > 0)) {
    return "partiallyPublished";
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
 * A target of a post that finished was sent again (a new round): the post
 * is publishing again until that round settles. One still publishing goes
 * on. A post that never went out has nothing to send again.
 */
export const reopenPost = (post: Post, now: DateTime.Utc): Transition => {
  const { status } = post;

  if (status._tag === "publishing") {
    return Result.succeed(post);
  }

  if (status._tag !== "finished") {
    return rejected(post, "reopen");
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
 * A finished post's outcome once a member said how an unconfirmed target
 * ended: what its targets add up to now. It keeps when it finished.
 */
export const reviseOutcome = (
  post: Post,
  targets: readonly PostTarget[]
): Transition => {
  const { status } = post;

  if (status._tag !== "finished") {
    return rejected(post, "finish");
  }

  return Result.succeed(
    withStatus(post, { ...status, outcome: outcomeOf(targets) })
  );
};

/**
 * Cancels a draft, a scheduled post or one waiting for an approval. A post already publishing is not
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

  if (status._tag === "scheduled" || status._tag === "awaitingApproval") {
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
