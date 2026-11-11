import {
  Array as Arr,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Result,
} from "effect";

import { approvalSubject } from "#publishing/domain/approval-subject.ts";
import type { ChannelOptions } from "#publishing/domain/channel-options.ts";
import type { DuplicateContent } from "#publishing/domain/duplicate-content.ts";
import { idempotencyKeyLifetime } from "#publishing/domain/idempotency.ts";
import { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import type { PostContent } from "#publishing/domain/post-content.ts";
import { cancelTarget, isSettled } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import {
  authorOf,
  awaitApproval,
  cancelPost,
  createDraft,
  finishPost,
  moveToDraft,
  placedBy,
  scheduledThrough,
  schedulePost,
  asReceived,
  tagPost,
} from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import { postingMonthOf, sameMonth } from "#publishing/domain/posting-month.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import {
  reshuffleBatchSize,
  reshufflePlan,
} from "#publishing/domain/queue-reshuffle.ts";
import type { ReshuffleMove } from "#publishing/domain/queue-reshuffle.ts";
import { sameTimetable } from "#publishing/domain/queue.ts";
import type { Queue } from "#publishing/domain/queue.ts";
import type { ScheduleInPast } from "#publishing/domain/schedule-in-past.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import type { TagId } from "#publishing/domain/tag-id.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

import type { AccountRules } from "./account-rules.ts";
import { ApprovalGate } from "./approval-gate.ts";
import type { AttachableMedia } from "./attachable-media.ts";
import type { ChannelSetNotFound } from "./channel-set-not-found.ts";
import type { ContentFingerprints } from "./content-fingerprints.ts";
import { admit, remember } from "./duplicate-guard.ts";
import { IdempotencyKeyReused } from "./idempotency-key-reused.ts";
import { IdempotencyKeys } from "./idempotency-keys.ts";
import type { KeyedRequest, KeyUse } from "./idempotency-keys.ts";
import { freeSlotOf, queueNamed } from "./placement.ts";
import type { Placement } from "./placement.ts";
import { PostAllowance } from "./post-allowance.ts";
import { PostEvents } from "./post-events.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostOrigins } from "./post-origins.ts";
import { nothingAsked, PostPresets } from "./post-presets.ts";
import type { PresetAsk, DroppedChannels } from "./post-presets.ts";
import { channelsFor, mediaFor, tagsFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets, StoredPost } from "./post-repository.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";
import { violationsOf } from "./publishability.ts";
import { QueueHasNoRoom } from "./queue-has-no-room.ts";
import type { QueueNotFound } from "./queue-not-found.ts";
import { QueueStore } from "./queue-store.ts";
import type { SignatureNotFound } from "./signature-not-found.ts";
import type { TagStore } from "./tag-store.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import type { UnknownTags } from "./unknown-tags.ts";
import { withinPlan as withinPlanOf } from "./within-plan.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";
import {
  findInWorkspace,
  lockInWorkspace,
  optionsOfTargets,
  targetsOn,
} from "./workspace-posts.ts";

// A compare and set that misses under the row lock means the lock was not
// held: a bug, not a conflict to report.
const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A post changed under its row lock");

// The time of a post that is scheduled, or waits for an approval to be.
const scheduleOf = (post: Post) =>
  post.status._tag === "scheduled" || post.status._tag === "awaitingApproval"
    ? Effect.succeed(post.status.schedule)
    : Effect.die(`Post ${post.id} is ${post.status._tag}, not scheduled`);

/** A new post for some channels, at a time. */
export interface SchedulePostRequest {
  // At least one; a channel listed twice gets one target.
  readonly channelIds: readonly [ChannelId, ...ChannelId[]];
  readonly content: PostContent;
  // The options it has on some channels, one at most per channel.
  readonly options?: readonly ChannelOptions[];
  readonly schedule: Schedule;
  /** The workspace's tags it is filed under; left out, none. */
  readonly tagIds?: readonly TagId[];
}

/**
 * A new post to send to some channels, now or at an instant, in one call:
 * what `posts.send`, the MCP tool `create_post` and `peal post` ask for.
 */
export interface SendPostRequest {
  /**
   * What it takes from what the workspace saved: channel sets, whose
   * channels it goes to as well, and signatures. Left out, nothing.
   */
  readonly presets?: PresetAsk;
  /**
   * True when the same content may go to a channel that already has it
   * within `duplicateWindow`; otherwise that is DuplicateContent.
   */
  readonly allowDuplicate?: boolean;
  // At least one, with those of the sets it names, unless it goes to a
  // queue, whose channels it then takes; a channel listed twice gets one
  // target.
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
  /**
   * The key the request names itself with, if it does: sent again with it
   * within `idempotencyKeyLifetime`, it answers the post it made.
   */
  readonly idempotency: Option.Option<KeyedRequest>;
  // The options it has on some channels, one at most per channel.
  readonly options?: readonly ChannelOptions[];
  /** When it goes out: now, at an instant, or on a queue's next free slot. */
  readonly placement: Placement;
  /** The workspace's tags it is filed under; left out, none. */
  readonly tagIds?: readonly TagId[];
  /**
   * The zone its time was chosen in, which calendars show it in; a post
   * added to a queue takes the queue's.
   */
  readonly timeZone: TimeZoneId;
}

/**
 * A post to put on a queue's next free slot: the queue named, or the
 * workspace's default; for a draft, the channels named, else its own,
 * else the queue's.
 */
export interface EnqueueRequest {
  readonly channelIds: Option.Option<readonly [ChannelId, ...ChannelId[]]>;
  readonly queueId: Option.Option<QueueId>;
}

// A new post, whatever its time: what it says and where it goes.
interface NewPostRequest {
  readonly channelIds: readonly ChannelId[];
  readonly content: PostContent;
  readonly options?: readonly ChannelOptions[];
  readonly tagIds?: readonly TagId[];
}

// When a post goes out, once decided, and the queue that decided it.
interface Placed {
  readonly queueId: Option.Option<QueueId>;
  readonly schedule: Schedule;
}

/** The post a request made, or made when it was first sent. */
export interface SentPost extends PostWithTargets {
  /** Whether an earlier request with the same key made it. */
  readonly replayed: boolean;
}

/**
 * Why a reshuffle stopped before every waiting post was on its slot: a
 * month without room in the plan, no slot left within the horizon, or the
 * queue's timetable changed (or the queue went) while it ran.
 */
export type ReshuffleStop = "changed" | "full" | "planLimit";

/** What a reshuffle did. */
export interface QueueReshuffle {
  /** Posts moved onto their slots. */
  readonly moved: number;
  /**
   * Waiting posts left where they were: already on their slots, not the
   * caller's to move, or moved, sent back or cancelled by someone else
   * while it ran.
   */
  readonly unchanged: number;
  /** Waiting posts not placed when it stopped. */
  readonly remaining: number;
  readonly stoppedBy: Option.Option<ReshuffleStop>;
}

/** A draft to send to some channels, at a time, with its targets' options. */
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

// A new post is refused too when a tag, a channel set or a signature it
// names is not the workspace's.
type Unfiled =
  | ChannelSetNotFound
  | SignatureNotFound
  | Unpublishable
  | UnknownTags;

type Ports =
  | AccountRules
  | ApprovalGate
  | AttachableMedia
  | ContentFingerprints
  | IdempotencyKeys
  | Ids
  | PostAllowance
  | PostOrigins
  | PostPresets
  | PostRepository
  | QueueStore
  | TagStore
  | WorkspaceChannels;

// A time chosen by hand, placed by no queue.
const byHand = (schedule: Schedule): Placed => ({
  queueId: Option.none(),
  schedule,
});

// The post as a placement leaves it: placed by its queue, if one did.
const withQueue = (post: Post, queueId: Option.Option<QueueId>) =>
  Option.match(queueId, {
    onNone: () => post,
    onSome: (id) => placedBy(post, id),
  });

// Someone who only asks acts on drafts and on posts that wait: a scheduled
// post is for those who may schedule to move or stop.
const mayChange = (actor: Actor, { status }: Post) =>
  status._tag === "draft" || status._tag === "awaitingApproval"
    ? Effect.succeed(actor)
    : Effect.fromResult(authorize(actor, "post:schedule"));

/**
 * Scheduling posts: create one for a time, schedule a draft, move a post,
 * take it back to draft, cancel it. Each use case changes the post and
 * starts or stops its job in one transaction, so a post is scheduled exactly
 * when its job exists. Each needs post:schedule, and scheduling reads the
 * workspace's channels, which needs channel:read. A post keeps who scheduled
 * or moved it last, and how they reached Peal (`PostOrigins`).
 *
 * Every post scheduled here passes the workspace's `ApprovalGate`, in the
 * transaction that saves it: a post it holds waits for an approval
 * (`awaitingApproval`) with its time and no job, which `HeldPosts` starts
 * once it is approved. Where the gate lets them (`maySubmit`), people
 * without post:schedule ask for posts to go out too, and act on drafts and
 * on posts that wait, never on a scheduled one.
 *
 * A post is scheduled only on channels of its workspace, with ready media of
 * the workspace, and with content their platforms take, its media included
 * (`#publishing/domain/content-rules.ts`). Its month (UTC) must have room
 * for it in the workspace's plan (`PostAllowance`): a scheduled post moved
 * within its month takes no more room, and a draft takes none until it is
 * scheduled, nor once it is taken back to draft.
 *
 * A post is only found in the workspace that owns it: another workspace's
 * post is PostNotFound, whatever its id.
 */
export class PostScheduling extends Context.Service<
  PostScheduling,
  {
    /**
     * Whether the actor may ask for posts to go out: whoever may schedule,
     * and whoever the workspace's gate lets ask, whose posts then wait for
     * an approval. `MissingPermission` (post:schedule) otherwise.
     */
    readonly mayAsk: (
      actor: Actor
    ) => Effect.Effect<Actor, DatabaseError | MissingPermission>;
    /** Creates a post scheduled on the given channels. */
    readonly schedule: (
      actor: Actor,
      request: SchedulePostRequest
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | MissingPermission | ScheduleInPast | Unfiled
    >;
    /**
     * Creates a post and sends it to the given channels, now or at an
     * instant, as `schedule` does: "now" is the current time, which goes
     * through every rule a later time does. A request that names itself
     * with an idempotency key makes one post however often it is sent
     * within the key's lifetime: sent again, it answers that post as it now
     * stands, before anything is checked again, so a retry that comes once
     * the post went out is not told its time has passed. The same key with
     * another request is IdempotencyKeyReused, and PostNotFound once the
     * post it made was deleted.
     *
     * Added to a queue, it takes the queue's first free slot after the
     * request came, decided under the queue's lock in the transaction that
     * saves it, so posts sent together take different slots; then it is
     * an ordinary scheduled post, the month's room counted in the slot's
     * month. Naming no channel and no set, it goes to the queue's.
     */
    readonly send: (
      actor: Actor,
      request: SendPostRequest
    ) => Effect.Effect<
      SentPost,
      | DatabaseError
      | DuplicateContent
      | IdempotencyKeyReused
      | MissingPermission
      | PostNotFound
      | QueueHasNoRoom
      | QueueNotFound
      | ScheduleInPast
      | Unfiled
    >;
    /**
     * Puts a post on the next free slot of a queue: a draft is scheduled
     * there as `scheduleDraft` schedules it, and a scheduled post or one
     * that waits for an approval is moved there as `reschedule` moves it.
     * The slot is decided under the queue's lock, the post's own slot
     * apart, so a post added again to its queue stays where it is unless an
     * earlier slot was freed since, which it takes. A draft
     * for no channel, given none, goes where the same content sent onto
     * the queue would: its channels still connected and its channel set's,
     * with the set's options and the channels' defaults, the channels gone
     * since told in `dropped`.
     */
    readonly enqueue: (
      actor: Actor,
      postId: PostId,
      request: EnqueueRequest
    ) => Effect.Effect<
      PostWithTargets,
      | ChannelSetNotFound
      | DatabaseError
      | InvalidPostTransition
      | MissingPermission
      | PostNotFound
      | QueueHasNoRoom
      | QueueNotFound
      | ScheduleInPast
      | Unpublishable
    >;
    /**
     * Moves the queue's waiting posts (scheduled or awaiting an approval,
     * after now) onto its slots as they now are, first to first, in the
     * order of their times: posts moved by hand included, publishing ones
     * untouched and their slots kept clear. Each move is a hand move's
     * (`reschedule`): the gate asked, the month's room in the plan, the
     * job replaced, the post told as scheduled; a post already on its slot
     * is not written. Someone who only asks moves the posts that wait for
     * an approval, and leaves the scheduled ones (`unchanged`).
     *
     * The slots are planned once, under the queue's lock, then posts are
     * moved by batches of `reshuffleBatchSize`, one transaction each: the
     * queue's lock, then the posts' rows in id order. It stops, keeping
     * what it moved, at a month without room (`planLimit`), when no slot
     * is left within the horizon (`full`), or when the queue's timetable
     * changed meanwhile (`changed`): called again, it goes on. Called
     * twice, the second call moves nothing. QueueHasNoRoom (`noSlots`) for
     * a queue without slots.
     */
    readonly reshuffle: (
      actor: Actor,
      queueId: QueueId
    ) => Effect.Effect<
      QueueReshuffle,
      DatabaseError | MissingPermission | QueueHasNoRoom | QueueNotFound
    >;
    /**
     * Deletes the idempotency keys past their lifetime, and says how many:
     * the daily retention.
     */
    readonly forgetExpiredKeys: Effect.Effect<number, DatabaseError>;
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
     * moment earlier still is (see `scheduleGrace`), however long the
     * checks then take (`asReceived`).
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
     * Takes a scheduled post back to draft, to change what it says: its
     * revision goes up, so the job for its time, which is stopped, would
     * publish nothing if it woke anyway. Schedule it again once edited.
     */
    readonly unschedule: (
      actor: Actor,
      postId: PostId
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | InvalidPostTransition | MissingPermission | PostNotFound
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
>()("peal-server/publishing/application/PostScheduling") {
  static readonly layer = Layer.effect(
    PostScheduling,
    Effect.gen(function* PostSchedulingLive() {
      const posts = yield* PostRepository;
      const scheduler = yield* PublicationScheduler;
      const events = yield* PostEvents;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ports>();

      const withPorts = Effect.provideContext(ports);
      const gate = yield* ApprovalGate;

      // Whoever may schedule, and whoever the gate lets ask for posts to go
      // out, which then wait for an approval.
      const mayAsk = Effect.fn("PostScheduling.mayAsk")(function* mayAsk(
        actor: Actor
      ) {
        const allowed =
          can(actor, "post:schedule") || (yield* gate.maySubmit(actor));

        if (!allowed) {
          return yield* new MissingPermission({ permission: "post:schedule" });
        }

        return actor;
      });

      // The post as the gate leaves it: scheduled, or waiting for an
      // approval. Run in the transaction that saves it.
      const throughGate = Effect.fn("PostScheduling.throughGate")(
        function* throughGate(
          actor: Actor,
          post: Post,
          targets: readonly PostTarget[]
        ) {
          const { at, timeZone } = yield* scheduleOf(post);

          const admission = yield* gate.admit(actor, {
            authorId: post.authorId,
            postId: post.id,
            scheduledAt: at,
            subject: approvalSubject(post.content, targets),
            timeZone,
            workspaceId: post.workspaceId,
          });

          return admission === "admitted"
            ? post
            : yield* Effect.fromResult(awaitApproval(post)).pipe(Effect.orDie);
        }
      );

      // The channels to send the content to, once their platforms take it
      // and the options it has on them.
      const publishableOn = Effect.fn("PostScheduling.publishableOn")(
        function* publishableOn(
          actor: Actor,
          content: PostContent,
          channelIds: readonly ChannelId[],
          options: readonly ChannelOptions[]
        ) {
          const channels = yield* channelsFor(actor, channelIds);
          const files = yield* mediaFor(actor, content);

          // What the platforms' rules and each account's own refuse.
          const violations = yield* violationsOf(
            content,
            channels,
            files,
            options
          );

          if (Arr.isReadonlyArrayNonEmpty(violations)) {
            return yield* new PostContentRejected({ violations });
          }

          return channels.map(({ channelId }) => channelId);
        },
        withPorts
      );

      // A workspace with more channels or members than its plan allows,
      // as after its trial, schedules and moves nothing until it is back
      // within it.
      const withinPlan = (post: Post) =>
        withinPlanOf(post.workspaceId).pipe(withPorts);

      // Room in the month the post goes out in, besides the post itself.
      // Run in the transaction that saves the post: the month stays claimed
      // until it commits, so posts scheduled together are counted in turn.
      const roomInMonth = Effect.fn("PostScheduling.roomInMonth")(
        function* roomInMonth(post: Post) {
          yield* withinPlan(post);

          const allowed = yield* PostAllowance.use((allowance) =>
            allowance.scheduledPerMonth(post.workspaceId)
          );

          if (Option.isNone(allowed)) {
            return;
          }

          const { at } = yield* scheduleOf(post);
          const month = postingMonthOf(at);

          yield* posts.claimMonth(post.workspaceId, month);

          const going = yield* posts.countGoingOut(
            post.workspaceId,
            month,
            Option.some(post.id)
          );

          yield* Effect.fromResult(
            roomForOneMore("scheduledPosts", allowed, going)
          );
        },
        withPorts
      );

      // Starts the job for the post's current revision, at the time it was
      // scheduled for (which may be later than asked), and records it. A
      // post that waits for an approval gets none.
      const startJob = Effect.fn("PostScheduling.startJob")(function* startJob(
        post: Post
      ) {
        if (post.status._tag === "awaitingApproval") {
          return;
        }

        const { at } = yield* scheduleOf(post);

        const executionId = yield* scheduler.schedule({
          postId: post.id,
          revision: post.scheduleRevision,
          scheduledAt: at,
        });

        yield* applied(yield* posts.setExecution(post, executionId));
      });

      // Tells whoever follows the workspace that the post is scheduled.
      // One that waits for an approval is not: `HeldPosts` tells it once
      // it is released.
      const announce = (post: Post, targets: readonly PostTarget[]) =>
        post.status._tag === "scheduled"
          ? events.scheduled(post, targets)
          : Effect.void;

      const stopJob = ({ execution }: StoredPost) =>
        Option.match(execution, {
          onNone: () => Effect.void,
          onSome: scheduler.cancel,
        });

      // How the actor reached Peal, which the post they schedule keeps.
      const originOf = (actor: Actor) =>
        PostOrigins.use((origins) => origins.of(actor)).pipe(withPorts);

      // Saves the post at its new time, with who moved it there, and swaps
      // its job for one then. A queue that placed it is kept with it.
      const move = Effect.fn("PostScheduling.move")(function* move(
        actor: Actor,
        current: StoredPost,
        { queueId, schedule: at }: Placed,
        received: DateTime.Utc,
        targets: readonly PostTarget[]
      ) {
        const now = yield* DateTime.now;

        const moved = yield* throughGate(
          actor,
          withQueue(
            scheduledThrough(
              yield* Effect.fromResult(
                schedulePost(current.post, asReceived(at, received, now), now)
              ),
              yield* originOf(actor),
              authorOf(actor)
            ),
            queueId
          ),
          targets
        );

        // A scheduled post moved within its month takes no more room, even
        // in a month already past a smaller plan's allowance.
        const staysInMonth =
          current.post.status._tag !== "draft" &&
          sameMonth(
            (yield* scheduleOf(current.post)).at,
            (yield* scheduleOf(moved)).at
          );

        // It waited for an approval, and no longer does.
        if (
          current.post.status._tag === "awaitingApproval" &&
          moved.status._tag === "scheduled"
        ) {
          yield* gate.withdrawn(moved.workspaceId, moved.id);
        }

        // Within its month it takes no more room, and the plan is still
        // checked: a workspace over it moves nothing.
        yield* staysInMonth ? withinPlan(moved) : roomInMonth(moved);

        yield* applied(yield* posts.update(moved, current.post));
        // What it sends is kept, for posts sent later to be compared with:
        // a draft scheduled, or a post moved, is itself never refused as a
        // duplicate, being one post its member sees.
        yield* remember(moved, yield* posts.targets(moved.id)).pipe(withPorts);
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

      // Tells the gate that a post which waited for an approval stopped.
      const noLongerWaits = (post: Post) =>
        post.status._tag === "awaitingApproval"
          ? gate.withdrawn(post.workspaceId, post.id)
          : Effect.void;

      const lockPost = (actor: Actor, postId: PostId) =>
        lockInWorkspace(actor.workspaceId, postId).pipe(withPorts);

      const keys = yield* IdempotencyKeys;
      const queues = yield* QueueStore;

      // The queue's first free slot after `after`, `except` the post being
      // placed: taken under the queue's lock, which the transaction holds
      // until the post is saved, so posts placed together take turns. Run
      // after an idempotency key's claim, and before the post's row and
      // the plan's month are locked: always in that order. The queue is
      // read again under the lock, as it may have changed or gone.
      const onQueue = Effect.fn("PostScheduling.onQueue")(function* onQueue(
        queue: Queue,
        after: DateTime.Utc,
        except: Option.Option<PostId>
      ) {
        yield* queues.lock(queue.id);

        const current = yield* queueNamed(
          queue.workspaceId,
          Option.some(queue.id)
        ).pipe(withPorts);

        const slot = yield* freeSlotOf(current, after, except).pipe(withPorts);

        if (Result.isFailure(slot)) {
          return yield* new QueueHasNoRoom({
            queueId: current.id,
            reason: slot.failure,
          });
        }

        const placed: Placed = {
          queueId: Option.some(current.id),
          schedule: new Schedule({
            at: slot.success,
            timeZone: current.timeZone,
          }),
        };

        return placed;
      });

      // A new post scheduled on the channels, saved with its job unless
      // `claimed` finds, in the same transaction, that another request made
      // it already. Its time is `placing`'s, decided in that transaction
      // after the claim, so a request answered from an earlier one takes
      // no slot of a queue.
      const scheduleNew = Effect.fn("PostScheduling.scheduleNew")(
        function* scheduleNew<E, E2, E3>(
          actor: Actor,
          { channelIds, content, options = [], tagIds = [] }: NewPostRequest,
          placing: (received: DateTime.Utc) => Effect.Effect<Placed, E3>,
          claimed: (
            postId: PostId
          ) => Effect.Effect<Option.Option<KeyUse>, DatabaseError | E>,
          // Keeps what the post sends to its channels, once nothing
          // refuses it: `remember`, or `admit`, which refuses duplicates.
          kept: (
            post: Post,
            targets: readonly PostTarget[]
          ) => Effect.Effect<void, DatabaseError | E2, ContentFingerprints>
        ) {
          // The checks can take minutes, when a platform is slow to say
          // what an account takes: the time asked for is judged as of now.
          const received = yield* DateTime.now;

          const channels = yield* publishableOn(
            actor,
            content,
            channelIds,
            options
          );

          const tags = yield* tagsFor(actor.workspaceId, tagIds).pipe(
            withPorts
          );

          const postId = yield* newId(PostIdSchema).pipe(withPorts);

          const via = yield* originOf(actor);

          const draft = tagPost(
            createDraft(
              postId,
              actor.workspaceId,
              content,
              authorOf(actor),
              Option.some(via)
            ),
            tags
          );

          const targets = yield* targetsOn(
            postId,
            channels,
            [],
            Option.some(options)
          ).pipe(withPorts);

          const used = yield* transaction(
            Effect.gen(function* insertAndStart() {
              const earlier = yield* claimed(postId);

              if (Option.isSome(earlier)) {
                return { placed: Option.none<Post>(), used: earlier };
              }

              const { queueId, schedule: at } = yield* placing(received);
              const now = yield* DateTime.now;

              // A new draft can always be scheduled.
              const post = withQueue(
                scheduledThrough(
                  yield* Effect.fromResult(
                    schedulePost(draft, asReceived(at, received, now), now)
                  ).pipe(Effect.catchTag("InvalidPostTransition", Effect.die)),
                  via,
                  authorOf(actor)
                ),
                queueId
              );

              // The gate first: a post it holds waits with its time, takes
              // its room in the month, and gets no job.
              const placed = yield* throughGate(actor, post, targets);

              yield* roomInMonth(placed);
              yield* posts.insert(placed, targets);
              yield* kept(placed, targets).pipe(withPorts);
              yield* startJob(placed);
              // Told once, with the post: a request that finds its key
              // used made none, and tells nothing.
              yield* announce(placed, targets);

              return { placed: Option.some(placed), used: earlier };
            })
          );

          return {
            made: used.placed.pipe(Option.map((post) => ({ post, targets }))),
            used: used.used,
          };
        }
      );

      const schedule = Effect.fn("PostScheduling.schedule")(function* schedule(
        actor: Actor,
        request: SchedulePostRequest
      ) {
        yield* mayAsk(actor);

        const { made } = yield* scheduleNew(
          actor,
          request,
          () => Effect.succeed(byHand(request.schedule)),
          () => Effect.succeed(Option.none()),
          remember
        );

        return yield* Option.match(made, {
          onNone: () => Effect.die("A post scheduled anew was not made"),
          onSome: Effect.succeed,
        });
      });

      // The post a key was first used for, as it now stands, if this is
      // the request it was used with.
      const replay = Effect.fn("PostScheduling.replay")(function* replay(
        actor: Actor,
        { postId, sameRequest }: KeyUse
      ) {
        if (!sameRequest) {
          return yield* new IdempotencyKeyReused();
        }

        const { post } = yield* findInWorkspace(actor.workspaceId, postId).pipe(
          withPorts
        );

        const sent: SentPost = {
          post,
          replayed: true,
          targets: yield* posts.targets(postId),
        };

        return sent;
      });

      // The queue's channels a post goes to when it names none, and those
      // of them the workspace no longer has, which it is told of.
      const queueChannels = Effect.fn("PostScheduling.queueChannels")(
        function* queueChannels(actor: Actor, queue: Queue) {
          const connected = new Set(
            queue.channelIds.length === 0
              ? []
              : (yield* WorkspaceChannels.use((channels) =>
                  channels.lookUp(actor, queue.channelIds)
                ).pipe(withPorts)).map(({ channelId }) => channelId)
          );

          const gone = queue.channelIds.filter((id) => !connected.has(id));

          const dropped: readonly DroppedChannels[] =
            Arr.isReadonlyArrayNonEmpty(gone)
              ? [
                  {
                    _tag: "queue",
                    channelIds: gone,
                    queueId: queue.id,
                    queueName: queue.name,
                  },
                ]
              : [];

          return {
            channelIds: queue.channelIds.filter((id) => connected.has(id)),
            dropped,
          };
        }
      );

      const send = Effect.fn("PostScheduling.send")(function* send(
        actor: Actor,
        {
          allowDuplicate = false,
          idempotency,
          placement,
          timeZone,
          ...request
        }: SendPostRequest
      ) {
        // As `schedule`: where the gate lets them, people and applications
        // without post:schedule send posts too, which wait for an approval.
        yield* mayAsk(actor);

        const now = yield* DateTime.now;
        const since = DateTime.subtractDuration(now, idempotencyKeyLifetime);

        // Sent before: the post it made then, whatever happened since.
        const before = yield* Option.match(idempotency, {
          onNone: () => Effect.succeed(Option.none<KeyUse>()),
          onSome: (keyed) => keys.find(actor.workspaceId, keyed, since),
        });

        if (Option.isSome(before)) {
          return yield* replay(actor, before.value);
        }

        // The queue it is added to, read once for its channels; its slots
        // are read again under its lock, once the post is checked.
        const queue =
          placement._tag === "queue"
            ? Option.some(
                yield* queueNamed(actor.workspaceId, placement.queueId).pipe(
                  withPorts
                )
              )
            : Option.none<Queue>();

        const asked = request.presets ?? nothingAsked;

        // Naming no channel and no set, it goes to the queue's: its
        // channels still connected, and its set.
        const fromQueue = yield* Option.match(
          queue.pipe(
            Option.filter(
              () =>
                request.channelIds.length === 0 &&
                asked.channelSets.length === 0
            )
          ),
          {
            onNone: () => Effect.succeed(Option.none()),
            onSome: (chosen) =>
              queueChannels(actor, chosen).pipe(
                Effect.map((channels) =>
                  Option.some({
                    ...channels,
                    channelSets: Option.toArray(chosen.channelSetId),
                  })
                )
              ),
          }
        );

        // What it names of the workspace's saved items, filled in: the
        // sets' channels and options, the channels' default options, and
        // signatures.
        const filled = yield* PostPresets.use((presets) =>
          presets.fill(actor, {
            ...asked,
            channelIds: Option.match(fromQueue, {
              onNone: () => request.channelIds,
              onSome: ({ channelIds }) => channelIds,
            }),
            channelSets: Option.match(fromQueue, {
              onNone: () => asked.channelSets,
              onSome: ({ channelSets }) => channelSets,
            }),
            content: request.content,
            defaultOptions: true,
            options: request.options ?? [],
          })
        ).pipe(withPorts);

        const { channelIds } = filled;

        const dropped = [
          ...Option.match(fromQueue, {
            onNone: () => [],
            onSome: (left) => left.dropped,
          }),
          ...filled.dropped,
        ];

        // Every channel its sets, or its queue, named is gone, and it
        // lists no other. A queue for no channel leaves it for none, which
        // its checks refuse (`noChannels`).
        const gone = dropped.flatMap((left) => left.channelIds);

        if (
          !Arr.isReadonlyArrayNonEmpty(channelIds) &&
          Arr.isReadonlyArrayNonEmpty(gone)
        ) {
          return yield* new UnknownChannels({ channelIds: gone });
        }

        const placing = (received: DateTime.Utc) =>
          Option.match(queue, {
            onNone: () =>
              Effect.succeed(
                byHand(
                  new Schedule({
                    at: placement._tag === "at" ? placement.at : now,
                    timeZone,
                  })
                )
              ),
            onSome: (chosen) => onQueue(chosen, received, Option.none()),
          });

        const { made, used } = yield* scheduleNew(
          actor,
          {
            ...request,
            channelIds,
            content: filled.content,
            options: filled.options,
          },
          placing,
          (postId) =>
            Option.match(idempotency, {
              onNone: () => Effect.succeed(Option.none<KeyUse>()),
              onSome: (keyed) =>
                keys.claim(
                  actor.workspaceId,
                  keyed,
                  { at: now, postId },
                  since
                ),
            }),
          (post, targets) => admit(post, targets, allowDuplicate)
        );

        // Sent together with this one, the other request made the post.
        if (Option.isSome(used)) {
          return yield* replay(actor, used.value);
        }

        if (Option.isNone(made)) {
          return yield* Effect.die("A post sent anew was not made");
        }

        const sent: SentPost = { ...made.value, dropped, replayed: false };

        return sent;
      });

      const forgetExpiredKeys = DateTime.now.pipe(
        Effect.flatMap((now) =>
          keys.purge(DateTime.subtractDuration(now, idempotencyKeyLifetime))
        ),
        Effect.withSpan("PostScheduling.forgetExpiredKeys")
      );

      // A draft, locked, scheduled on the channels as placed: they become
      // its targets, keeping the options of those it had.
      const draftScheduled = Effect.fn("PostScheduling.draftScheduled")(
        function* draftScheduled(
          actor: Actor,
          current: StoredPost,
          channelIds: readonly ChannelId[],
          placed: Placed,
          received: DateTime.Utc,
          given: Option.Option<readonly ChannelOptions[]> = Option.none()
        ) {
          const postId = current.post.id;

          // Only a draft takes new channels: a scheduled post moves.
          if (current.post.status._tag !== "draft") {
            return yield* new InvalidPostTransition({
              action: "schedule",
              from: current.post.status._tag,
              postId,
            });
          }

          const existing = yield* posts.lockTargets(postId);

          // A channel it had keeps its options, and a new one has none,
          // unless they were filled in for it.
          const channels = yield* publishableOn(
            actor,
            current.post.content,
            channelIds,
            Option.getOrElse(given, () =>
              optionsOfTargets(existing, channelIds)
            )
          );

          const targets = yield* targetsOn(
            postId,
            channels,
            existing,
            given
          ).pipe(withPorts);

          yield* posts.setTargets(postId, targets);

          const post = yield* move(actor, current, placed, received, targets);

          yield* announce(post, targets);

          const scheduled: PostWithTargets = { post, targets };

          return scheduled;
        }
      );

      // A post, locked, moved as placed, or a draft scheduled on the
      // channels it has.
      const moved = Effect.fn("PostScheduling.moved")(function* moved(
        actor: Actor,
        current: StoredPost,
        placed: Placed,
        received: DateTime.Utc
      ) {
        const postId = current.post.id;

        yield* mayChange(actor, current.post);

        const targets = yield* posts.targets(postId);

        // A draft is checked as it is scheduled. A scheduled post was
        // checked then, and moving it changes nothing it says.
        if (current.post.status._tag === "draft") {
          const channelIds = targets.map(({ channelId }) => channelId);

          yield* publishableOn(
            actor,
            current.post.content,
            channelIds,
            optionsOfTargets(targets, channelIds)
          );
        }

        const post = yield* move(actor, current, placed, received, targets);

        yield* announce(post, targets);

        const changed: PostWithTargets = { post, targets };

        return changed;
      });

      // What one batch of a reshuffle did, and why it stopped, if it did.
      interface BatchOutcome {
        readonly moved: number;
        readonly unchanged: number;
        // The moves of the batch it did not get to.
        readonly left: number;
        readonly stoppedBy: Option.Option<ReshuffleStop>;
      }

      // One batch of a reshuffle, in one transaction: the queue's lock,
      // the queue read again (a changed timetable stops it), the rows of
      // the posts to move in id order, then each move in the order of
      // times. A post moved, sent back or cancelled since the plan is left
      // as it is.
      const reshuffleBatch = Effect.fn("PostScheduling.reshuffleBatch")(
        function* reshuffleBatch(
          actor: Actor,
          planned: Queue,
          batch: readonly ReshuffleMove[],
          received: DateTime.Utc
        ) {
          yield* queues.lock(planned.id);

          const queue = yield* queues.byId(planned.workspaceId, planned.id);

          if (Option.isNone(queue) || !sameTimetable(queue.value, planned)) {
            const changed: BatchOutcome = {
              left: batch.length,
              moved: 0,
              stoppedBy: Option.some("changed"),
              unchanged: 0,
            };

            return changed;
          }

          const toMove = batch.filter(
            ({ from, to }) => !DateTime.Equivalence(from, to)
          );

          const locked = new Map<PostId, StoredPost>();

          for (const { postId } of toMove.toSorted((left, right) =>
            left.postId.localeCompare(right.postId)
          )) {
            const current = yield* lockPost(actor, postId).pipe(
              Effect.map(Option.some),
              Effect.catchTag("PostNotFound", () =>
                Effect.succeed(Option.none<StoredPost>())
              )
            );

            if (Option.isSome(current)) {
              locked.set(postId, current.value);
            }
          }

          let movedCount = 0;
          let unchanged = 0;

          for (const [place, { from, postId, to }] of batch.entries()) {
            const current = locked.get(postId);

            // Still where the plan found it, waiting, on this queue.
            const asPlanned =
              current !== undefined &&
              Option.contains(current.post.queueId, planned.id) &&
              (current.post.status._tag === "scheduled" ||
                current.post.status._tag === "awaitingApproval") &&
              DateTime.Equivalence(current.post.status.schedule.at, from);

            // On its slot already, or moved, sent back or cancelled since
            // the plan: left as it is.
            if (
              DateTime.Equivalence(from, to) ||
              current === undefined ||
              !asPlanned
            ) {
              unchanged += 1;

              continue;
            }

            const placed: Placed = {
              queueId: Option.some(planned.id),
              schedule: new Schedule({ at: to, timeZone: planned.timeZone }),
            };

            // Each move in a savepoint of its own: one refused leaves
            // those before it moved.
            const outcome = yield* transaction(
              moved(actor, current, placed, received)
            ).pipe(
              Effect.as("moved" as const),
              // A scheduled post is not for someone who only asks to move,
              // and a month may have no room. A waiting post moved to a
              // slot after the request came is neither checked again nor
              // late: the other refusals are bugs.
              Effect.catchTags({
                InvalidPostTransition: Effect.die,
                MissingPermission: () => Effect.succeed("unchanged" as const),
                PlanLimitReached: () => Effect.succeed("planLimit" as const),
                PostContentRejected: Effect.die,
                ScheduleInPast: Effect.die,
                UnknownChannels: Effect.die,
                UnknownMedia: Effect.die,
              })
            );

            if (outcome === "planLimit") {
              const stopped: BatchOutcome = {
                left: batch.length - place,
                moved: movedCount,
                stoppedBy: Option.some("planLimit"),
                unchanged,
              };

              return stopped;
            }

            if (outcome === "moved") {
              movedCount += 1;
            } else {
              unchanged += 1;
            }
          }

          const done: BatchOutcome = {
            left: 0,
            moved: movedCount,
            stoppedBy: Option.none(),
            unchanged,
          };

          return done;
        }
      );

      const reshuffle = Effect.fn("PostScheduling.reshuffle")(
        function* reshuffle(actor: Actor, queueId: QueueId) {
          yield* mayAsk(actor);

          const received = yield* DateTime.now;

          // The plan, from the queue and its posts as they stand under its
          // lock: where the waiting posts are plays no part but their order.
          const { plan, queue } = yield* transaction(
            Effect.gen(function* planning() {
              yield* queues.lock(queueId);

              const current = yield* queueNamed(
                actor.workspaceId,
                Option.some(queueId)
              ).pipe(withPorts);

              const planned = reshufflePlan(
                current,
                received,
                yield* queues.queuedFrom(current.id, received)
              );

              if (Result.isFailure(planned)) {
                return yield* new QueueHasNoRoom({
                  queueId: current.id,
                  reason: planned.failure,
                });
              }

              return { plan: planned.success, queue: current };
            })
          );

          let movedCount = 0;
          let unchanged = 0;
          const remaining = plan.unplaced;

          const batches = Arr.chunksOf(plan.moves, reshuffleBatchSize);

          for (const [place, batch] of batches.entries()) {
            const outcome = yield* transaction(
              reshuffleBatch(actor, queue, batch, received)
            );

            movedCount += outcome.moved;
            unchanged += outcome.unchanged;

            if (Option.isSome(outcome.stoppedBy)) {
              const later = batches
                .slice(place + 1)
                .reduce((sum, rest) => sum + rest.length, 0);

              const stopped: QueueReshuffle = {
                moved: movedCount,
                remaining: remaining + outcome.left + later,
                stoppedBy: outcome.stoppedBy,
                unchanged,
              };

              return stopped;
            }
          }

          const done: QueueReshuffle = {
            moved: movedCount,
            remaining,
            stoppedBy: remaining > 0 ? Option.some("full") : Option.none(),
            unchanged,
          };

          return done;
        }
      );

      const scheduleDraft = Effect.fn("PostScheduling.scheduleDraft")(
        function* scheduleDraft(
          actor: Actor,
          postId: PostId,
          { channelIds, schedule: at }: ScheduleDraftRequest
        ) {
          yield* mayAsk(actor);

          const received = yield* DateTime.now;

          return yield* transaction(
            lockPost(actor, postId).pipe(
              Effect.flatMap((current) =>
                draftScheduled(actor, current, channelIds, byHand(at), received)
              )
            )
          );
        }
      );

      const reschedule = Effect.fn("PostScheduling.reschedule")(
        function* reschedule(actor: Actor, postId: PostId, at: Schedule) {
          yield* mayAsk(actor);

          const received = yield* DateTime.now;

          return yield* transaction(
            lockPost(actor, postId).pipe(
              Effect.flatMap((current) =>
                moved(actor, current, byHand(at), received)
              )
            )
          );
        }
      );

      const enqueue = Effect.fn("PostScheduling.enqueue")(function* enqueue(
        actor: Actor,
        postId: PostId,
        request: EnqueueRequest
      ) {
        yield* mayAsk(actor);

        const received = yield* DateTime.now;

        const queue = yield* queueNamed(
          actor.workspaceId,
          request.queueId
        ).pipe(withPorts);

        return yield* transaction(
          Effect.gen(function* placeAndRestart() {
            // The queue before the post: deleting a queue holds it, then
            // writes its posts. A queue without room is said once the post
            // is known to be one it could take.
            const slot = yield* onQueue(
              queue,
              received,
              Option.some(postId)
            ).pipe(
              Effect.map(Result.succeed),
              Effect.catchTag("QueueHasNoRoom", (noRoom) =>
                Effect.succeed(Result.fail(noRoom))
              )
            );

            const current = yield* lockPost(actor, postId);
            const { status } = current.post;

            if (
              status._tag !== "draft" &&
              status._tag !== "scheduled" &&
              status._tag !== "awaitingApproval"
            ) {
              return yield* new InvalidPostTransition({
                action: "schedule",
                from: status._tag,
                postId,
              });
            }

            yield* mayChange(actor, current.post);

            const placed = yield* Effect.fromResult(slot);

            if (status._tag !== "draft") {
              return yield* moved(actor, current, placed, received);
            }

            const own = (yield* posts.targets(postId)).map(
              ({ channelId }) => channelId
            );

            if (Option.isSome(request.channelIds) || own.length > 0) {
              return yield* draftScheduled(
                actor,
                current,
                Option.getOrElse(request.channelIds, () => own),
                placed,
                received
              );
            }

            // A draft for no channel goes where the same content sent onto
            // the queue would: its channels still connected, and its set.
            const fromQueue = yield* queueChannels(actor, queue);

            const filled = yield* PostPresets.use((presets) =>
              presets.fill(actor, {
                ...nothingAsked,
                channelIds: fromQueue.channelIds,
                channelSets: Option.toArray(queue.channelSetId),
                content: current.post.content,
                defaultOptions: true,
                options: [],
              })
            ).pipe(
              withPorts,
              // Nothing asks for a signature here.
              Effect.catchTag("SignatureNotFound", Effect.die)
            );

            const dropped = [...fromQueue.dropped, ...filled.dropped];
            const gone = dropped.flatMap((left) => left.channelIds);

            if (
              !Arr.isReadonlyArrayNonEmpty(filled.channelIds) &&
              Arr.isReadonlyArrayNonEmpty(gone)
            ) {
              return yield* new UnknownChannels({ channelIds: gone });
            }

            const scheduled = yield* draftScheduled(
              actor,
              current,
              filled.channelIds,
              placed,
              received,
              Option.some(filled.options)
            );

            return dropped.length === 0 ? scheduled : { ...scheduled, dropped };
          })
        );
      });

      const unschedule = Effect.fn("PostScheduling.unschedule")(
        function* unschedule(actor: Actor, postId: PostId) {
          yield* mayAsk(actor);

          return yield* transaction(
            Effect.gen(function* moveBackAndStop() {
              const current = yield* lockPost(actor, postId);

              yield* mayChange(actor, current.post);

              const draft = yield* Effect.fromResult(moveToDraft(current.post));

              yield* applied(yield* posts.update(draft, current.post));
              yield* stopJob(current);
              yield* noLongerWaits(current.post);

              // A post that waited was never told as scheduled, yet those
              // who heard it waited (`post.approval_requested`) hear it no
              // longer does, as those who heard it scheduled do.
              yield* events.unscheduled(draft);

              return { post: draft, targets: yield* posts.targets(postId) };
            })
          );
        }
      );

      const cancel = Effect.fn("PostScheduling.cancel")(function* cancel(
        actor: Actor,
        postId: PostId
      ) {
        yield* mayAsk(actor);

        return yield* transaction(
          Effect.gen(function* cancelAndStop() {
            const current = yield* lockPost(actor, postId);
            const now = yield* DateTime.now;

            yield* mayChange(actor, current.post);

            // The job already woke: it finishes with the targets it sent.
            // Once every target has settled, as when only a repost that had
            // not started yet was left, no job remains to finish the post:
            // it finishes here.
            // Those still waiting, which this cancels: the others ended, or
            // end, on their own.
            const waiting = new Set(
              (yield* posts.targets(postId))
                .filter(({ status }) => status._tag === "pending")
                .map(({ id }) => id)
            );

            const cancelledNow = (targets: readonly PostTarget[]) =>
              targets.filter(
                ({ id, status }) =>
                  status._tag === "cancelled" && waiting.has(id)
              );

            if (current.post.status._tag === "publishing") {
              const targets = yield* cancelTargets(postId, now);

              if (cancelledNow(targets).length > 0) {
                yield* events.cancelled(current.post, cancelledNow(targets));
              }

              if (!targets.every(isSettled)) {
                return { post: current.post, targets };
              }

              const finished = yield* Effect.fromResult(
                finishPost(current.post, targets, now)
              ).pipe(Effect.orDie);

              yield* applied(yield* posts.update(finished, current.post));

              return { post: finished, targets };
            }

            const cancelled = yield* Effect.fromResult(
              cancelPost(current.post, now)
            );

            yield* applied(yield* posts.update(cancelled, current.post));

            const targets = yield* cancelTargets(postId, now);

            yield* stopJob(current);
            yield* noLongerWaits(current.post);
            yield* events.cancelled(cancelled, cancelledNow(targets));

            return { post: cancelled, targets };
          })
        );
      });

      return PostScheduling.of({
        cancel,
        enqueue,
        forgetExpiredKeys,
        mayAsk,
        reschedule,
        reshuffle,
        schedule,
        scheduleDraft,
        send,
        unschedule,
      });
    })
  );
}
