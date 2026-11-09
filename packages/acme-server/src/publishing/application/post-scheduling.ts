import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import { checkPublishable } from "#publishing/domain/content-rules.ts";
import { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import type { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import { cancelTarget } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import {
  cancelPost,
  createDraft,
  schedulePost,
} from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import { postingMonthOf, sameMonth } from "#publishing/domain/posting-month.ts";
import type { ScheduleInPast } from "#publishing/domain/schedule-in-past.ts";
import type { Schedule } from "#publishing/domain/schedule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

import type { AttachableMedia } from "./attachable-media.ts";
import { PostAllowance } from "./post-allowance.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { channelsFor, mediaFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets, StoredPost } from "./post-repository.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";
import { lockInWorkspace, targetsOn } from "./workspace-posts.ts";

// A compare and set that misses under the row lock means the lock was not
// held: a bug, not a conflict to report.
const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A post changed under its row lock");

const scheduleOf = (post: Post) =>
  post.status._tag === "scheduled"
    ? Effect.succeed(post.status.schedule)
    : Effect.die(`Post ${post.id} is ${post.status._tag}, not scheduled`);

/** A new post for some channels, at a time. */
export interface SchedulePostRequest {
  // At least one; a channel listed twice gets one target.
  readonly channelIds: readonly [ChannelId, ...ChannelId[]];
  readonly content: PostContent;
  readonly schedule: Schedule;
}

/** A draft to send to some channels, at a time. */
export interface ScheduleDraftRequest {
  // A channel listed twice gets one target.
  readonly channelIds: readonly ChannelId[];
  readonly schedule: Schedule;
}

/**
 * Why a post's channels, content or media keep it from being scheduled, or
 * the workspace's plan from adding it to its month.
 */
type Unpublishable =
  | PlanLimitReached
  | PostContentRejected
  | UnknownChannels
  | UnknownMedia;

type Ports =
  | AttachableMedia
  | Ids
  | PostAllowance
  | PostRepository
  | WorkspaceChannels;

const mayPublish = (actor: Actor) =>
  Effect.fromResult(authorize(actor, "post:schedule"));

/**
 * Scheduling posts: create one for a time, schedule a draft, move a post,
 * cancel it. Each use case changes the post and starts or stops its job in
 * one transaction, so a post is scheduled exactly when its job exists. Each
 * needs post:schedule, and scheduling reads the workspace's channels, which
 * needs channel:read.
 *
 * A post is scheduled only on channels of its workspace, with ready media of
 * the workspace, and with content their platforms take, its media included
 * (`#publishing/domain/content-rules.ts`). Its month (UTC) must have room
 * for it in the workspace's plan (`PostAllowance`): a scheduled post moved
 * within its month takes no more room.
 *
 * A post is only found in the workspace that owns it: another workspace's
 * post is PostNotFound, whatever its id.
 */
export class PostScheduling extends Context.Service<
  PostScheduling,
  {
    /** Creates a post scheduled on the given channels. */
    readonly schedule: (
      actor: Actor,
      request: SchedulePostRequest
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | MissingPermission | ScheduleInPast | Unpublishable
    >;
    /**
     * Schedules a draft on the given channels, which become its targets.
     * Its content is checked against their platforms.
     */
    readonly scheduleDraft: (
      actor: Actor,
      postId: PostId,
      request: ScheduleDraftRequest
    ) => Effect.Effect<
      PostWithTargets,
      | DatabaseError
      | InvalidPostTransition
      | MissingPermission
      | PostNotFound
      | ScheduleInPast
      | Unpublishable
    >;
    /**
     * Moves a scheduled post, or schedules a draft on the channels it has.
     * The job for the old time is stopped and one for the new time started;
     * "publish now" is a move to the current time, which a time read a
     * moment earlier still is (see `scheduleGrace`).
     */
    readonly reschedule: (
      actor: Actor,
      postId: PostId,
      schedule: Schedule
    ) => Effect.Effect<
      PostWithTargets,
      | DatabaseError
      | InvalidPostTransition
      | MissingPermission
      | PostNotFound
      | ScheduleInPast
      | Unpublishable
    >;
    /**
     * Cancels a post. Once it is publishing, the post itself finishes with
     * whatever its channels did: a channel not yet sent is cancelled, one
     * waiting to try again makes no further attempt, and a call in flight
     * still counts.
     */
    readonly cancel: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | InvalidPostTransition | MissingPermission | PostNotFound
    >;
  }
>()("acme-server/publishing/application/PostScheduling") {
  static readonly layer = Layer.effect(
    PostScheduling,
    Effect.gen(function* PostSchedulingLive() {
      const posts = yield* PostRepository;
      const scheduler = yield* PublicationScheduler;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ports>();

      const withPorts = Effect.provideContext(ports);

      // The channels to send the content to, once their platforms take it.
      const publishableOn = Effect.fn("PostScheduling.publishableOn")(
        function* publishableOn(
          actor: Actor,
          content: PostContent,
          channelIds: readonly ChannelId[]
        ) {
          const channels = yield* channelsFor(actor, channelIds);
          const files = yield* mediaFor(actor, content);

          yield* Effect.fromResult(checkPublishable(content, channels, files));

          return channels.map(({ channelId }) => channelId);
        },
        withPorts
      );

      // Room in the month the post goes out in, besides the post itself.
      const roomInMonth = Effect.fn("PostScheduling.roomInMonth")(
        function* roomInMonth(post: Post) {
          const allowed = yield* PostAllowance.use((allowance) =>
            allowance.scheduledPerMonth(post.workspaceId)
          );

          if (Option.isNone(allowed)) {
            return;
          }

          const { at } = yield* scheduleOf(post);

          const going = yield* posts.countGoingOut(
            post.workspaceId,
            postingMonthOf(at),
            Option.some(post.id)
          );

          yield* Effect.fromResult(
            roomForOneMore("scheduledPosts", allowed, going)
          );
        },
        withPorts
      );

      // Starts the job for the post's current revision, at the time it was
      // scheduled for (which may be later than asked), and records it.
      const startJob = Effect.fn("PostScheduling.startJob")(function* startJob(
        post: Post
      ) {
        const { at } = yield* scheduleOf(post);

        const executionId = yield* scheduler.schedule({
          postId: post.id,
          revision: post.scheduleRevision,
          scheduledAt: at,
        });

        yield* applied(yield* posts.setExecution(post, executionId));
      });

      const stopJob = ({ execution }: StoredPost) =>
        Option.match(execution, {
          onNone: () => Effect.void,
          onSome: scheduler.cancel,
        });

      // Saves the post at its new time, and swaps its job for one then.
      const move = Effect.fn("PostScheduling.move")(function* move(
        current: StoredPost,
        at: Schedule
      ) {
        const moved = yield* Effect.fromResult(
          schedulePost(current.post, at, yield* DateTime.now)
        );

        // A scheduled post moved within its month takes no more room, even
        // in a month already past a smaller plan's allowance.
        const staysInMonth =
          current.post.status._tag === "scheduled" &&
          sameMonth(
            current.post.status.schedule.at,
            (yield* scheduleOf(moved)).at
          );

        if (!staysInMonth) {
          yield* roomInMonth(moved);
        }

        yield* applied(yield* posts.update(moved, current.post));
        yield* stopJob(current);
        yield* startJob(moved);

        return moved;
      });

      const cancelTargets = Effect.fn("PostScheduling.cancelTargets")(
        function* cancelTargets(postId: PostId, now: DateTime.Utc) {
          const targets = yield* posts.lockTargets(postId);

          return yield* Effect.all(
            targets.map((target: PostTarget) =>
              Result.match(cancelTarget(target, now), {
                // A settled target stays as it ended.
                onFailure: () => Effect.succeed(target),
                onSuccess: (cancelled) =>
                  posts
                    .updateTarget(cancelled, target)
                    .pipe(Effect.flatMap(applied), Effect.as(cancelled)),
              })
            )
          );
        }
      );

      const lockPost = (actor: Actor, postId: PostId) =>
        lockInWorkspace(actor.workspaceId, postId).pipe(withPorts);

      const schedule = Effect.fn("PostScheduling.schedule")(function* schedule(
        actor: Actor,
        { channelIds, content, schedule: at }: SchedulePostRequest
      ) {
        yield* mayPublish(actor);

        const channels = yield* publishableOn(actor, content, channelIds);
        const now = yield* DateTime.now;
        const postId = yield* newId(PostIdSchema).pipe(withPorts);

        // A new draft can always be scheduled.
        const post = yield* Effect.fromResult(
          schedulePost(createDraft(postId, actor.workspaceId, content), at, now)
        ).pipe(Effect.catchTag("InvalidPostTransition", Effect.die));

        const targets = yield* targetsOn(postId, channels).pipe(withPorts);

        yield* transaction(
          Effect.gen(function* insertAndStart() {
            yield* roomInMonth(post);
            yield* posts.insert(post, targets);
            yield* startJob(post);
          })
        );

        return { post, targets };
      });

      const scheduleDraft = Effect.fn("PostScheduling.scheduleDraft")(
        function* scheduleDraft(
          actor: Actor,
          postId: PostId,
          { channelIds, schedule: at }: ScheduleDraftRequest
        ) {
          yield* mayPublish(actor);

          return yield* transaction(
            Effect.gen(function* retargetAndStart() {
              const current = yield* lockPost(actor, postId);

              // Only a draft takes new channels: a scheduled post moves.
              if (current.post.status._tag !== "draft") {
                return yield* new InvalidPostTransition({
                  action: "schedule",
                  from: current.post.status._tag,
                  postId,
                });
              }

              const channels = yield* publishableOn(
                actor,
                current.post.content,
                channelIds
              );

              const targets = yield* targetsOn(
                postId,
                channels,
                yield* posts.lockTargets(postId)
              ).pipe(withPorts);

              yield* posts.setTargets(postId, targets);

              const post = yield* move(current, at);

              return { post, targets };
            })
          );
        }
      );

      const reschedule = Effect.fn("PostScheduling.reschedule")(
        function* reschedule(actor: Actor, postId: PostId, at: Schedule) {
          yield* mayPublish(actor);

          return yield* transaction(
            Effect.gen(function* moveAndRestart() {
              const current = yield* lockPost(actor, postId);
              const targets = yield* posts.targets(postId);

              // A draft is checked as it is scheduled. A scheduled post was
              // checked then, and moving it changes nothing it says.
              if (current.post.status._tag === "draft") {
                yield* publishableOn(
                  actor,
                  current.post.content,
                  targets.map(({ channelId }) => channelId)
                );
              }

              const post = yield* move(current, at);

              return { post, targets };
            })
          );
        }
      );

      const cancel = Effect.fn("PostScheduling.cancel")(function* cancel(
        actor: Actor,
        postId: PostId
      ) {
        yield* mayPublish(actor);

        return yield* transaction(
          Effect.gen(function* cancelAndStop() {
            const current = yield* lockPost(actor, postId);
            const now = yield* DateTime.now;

            // The job already woke: it finishes with the targets it sent.
            if (current.post.status._tag === "publishing") {
              const targets = yield* cancelTargets(postId, now);

              return { post: current.post, targets };
            }

            const cancelled = yield* Effect.fromResult(
              cancelPost(current.post, now)
            );

            yield* applied(yield* posts.update(cancelled, current.post));

            const targets = yield* cancelTargets(postId, now);

            yield* stopJob(current);

            return { post: cancelled, targets };
          })
        );
      });

      return PostScheduling.of({ cancel, reschedule, schedule, scheduleDraft });
    })
  );
}
