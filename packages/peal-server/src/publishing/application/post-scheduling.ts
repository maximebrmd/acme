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
import { optionsOn } from "#publishing/domain/channel-options.ts";
import { checkPublishable } from "#publishing/domain/content-rules.ts";
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
  scheduledThrough,
  schedulePost,
  asReceived,
} from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import { postingMonthOf, sameMonth } from "#publishing/domain/posting-month.ts";
import type { ScheduleInPast } from "#publishing/domain/schedule-in-past.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
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

import { AccountRules } from "./account-rules.ts";
import { ApprovalGate } from "./approval-gate.ts";
import type { AttachableMedia } from "./attachable-media.ts";
import { IdempotencyKeyReused } from "./idempotency-key-reused.ts";
import { IdempotencyKeys } from "./idempotency-keys.ts";
import type { KeyedRequest, KeyUse } from "./idempotency-keys.ts";
import { PostAllowance } from "./post-allowance.ts";
import { PostEvents } from "./post-events.ts";
import type { PostNotFound } from "./post-not-found.ts";
import { PostOrigins } from "./post-origins.ts";
import { channelsFor, mediaFor } from "./post-references.ts";
import { PostRepository } from "./post-repository.ts";
import type { PostWithTargets, StoredPost } from "./post-repository.ts";
import { PublicationScheduler } from "./publication-scheduler.ts";
import type { UnknownChannels } from "./unknown-channels.ts";
import type { UnknownMedia } from "./unknown-media.ts";
import { withinPlan as withinPlanOf } from "./within-plan.ts";
import type { WorkspaceChannels } from "./workspace-channels.ts";
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
}

/**
 * A new post to send to some channels, now or at an instant, in one call:
 * what `posts.send`, the MCP tool `create_post` and `peal post` ask for.
 */
export interface SendPostRequest {
  /** When it goes out; none is now. */
  readonly at: Option.Option<DateTime.Utc>;
  // At least one; a channel listed twice gets one target.
  readonly channelIds: readonly [ChannelId, ...ChannelId[]];
  readonly content: PostContent;
  /**
   * The key the request names itself with, if it does: sent again with it
   * within `idempotencyKeyLifetime`, it answers the post it made.
   */
  readonly idempotency: Option.Option<KeyedRequest>;
  // The options it has on some channels, one at most per channel.
  readonly options?: readonly ChannelOptions[];
  /** The zone its time was chosen in, which calendars show it in. */
  readonly timeZone: TimeZoneId;
}

/** The post a request made, or made when it was first sent. */
export interface SentPost extends PostWithTargets {
  /** Whether an earlier request with the same key made it. */
  readonly replayed: boolean;
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

type Ports =
  | AccountRules
  | ApprovalGate
  | AttachableMedia
  | IdempotencyKeys
  | Ids
  | PostAllowance
  | PostOrigins
  | PostRepository
  | WorkspaceChannels;

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
    /** Creates a post scheduled on the given channels. */
    readonly schedule: (
      actor: Actor,
      request: SchedulePostRequest
    ) => Effect.Effect<
      PostWithTargets,
      DatabaseError | MissingPermission | ScheduleInPast | Unpublishable
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
     */
    readonly send: (
      actor: Actor,
      request: SendPostRequest
    ) => Effect.Effect<
      SentPost,
      | DatabaseError
      | IdempotencyKeyReused
      | MissingPermission
      | PostNotFound
      | ScheduleInPast
      | Unpublishable
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

          // What the platforms' rules refuse, every violation of them.
          const againstRules = Result.match(
            checkPublishable(content, channels, files, options),
            {
              onFailure: (rejected) => rejected.violations,
              onSuccess: () => [],
            }
          );

          // And what each account's own settings refuse, which only its
          // platform tells: both come in one answer, so whoever fixes the
          // post fixes it once.
          const rules = yield* AccountRules;

          const refused = yield* Effect.forEach(
            channels,
            (channel) =>
              rules.violationsOn({
                channel,
                files,
                options: optionsOn(options, channel.channelId),
              }),
            { concurrency: 4 }
          );

          const violations = [...againstRules, ...refused.flat()];

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
      // its job for one then.
      const move = Effect.fn("PostScheduling.move")(function* move(
        actor: Actor,
        current: StoredPost,
        at: Schedule,
        received: DateTime.Utc,
        targets: readonly PostTarget[]
      ) {
        const now = yield* DateTime.now;

        const moved = yield* throughGate(
          actor,
          scheduledThrough(
            yield* Effect.fromResult(
              schedulePost(current.post, asReceived(at, received, now), now)
            ),
            yield* originOf(actor),
            authorOf(actor)
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

      // A new post scheduled on the channels, saved with its job unless
      // `claimed` finds, in the same transaction, that another request made
      // it already.
      const scheduleNew = Effect.fn("PostScheduling.scheduleNew")(
        function* scheduleNew<E>(
          actor: Actor,
          {
            channelIds,
            content,
            options = [],
            schedule: at,
          }: SchedulePostRequest,
          claimed: (
            post: Post
          ) => Effect.Effect<Option.Option<KeyUse>, DatabaseError | E>
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

          const now = yield* DateTime.now;
          const postId = yield* newId(PostIdSchema).pipe(withPorts);

          const via = yield* originOf(actor);

          // A new draft can always be scheduled.
          const post = scheduledThrough(
            yield* Effect.fromResult(
              schedulePost(
                createDraft(
                  postId,
                  actor.workspaceId,
                  content,
                  authorOf(actor),
                  Option.some(via)
                ),
                asReceived(at, received, now),
                now
              )
            ).pipe(Effect.catchTag("InvalidPostTransition", Effect.die)),
            via,
            authorOf(actor)
          );

          const targets = yield* targetsOn(
            postId,
            channels,
            [],
            Option.some(options)
          ).pipe(withPorts);

          const used = yield* transaction(
            Effect.gen(function* insertAndStart() {
              const earlier = yield* claimed(post);

              if (Option.isSome(earlier)) {
                return { placed: post, used: earlier };
              }

              // The gate first: a post it holds waits with its time, takes
              // its room in the month, and gets no job.
              const placed = yield* throughGate(actor, post, targets);

              yield* roomInMonth(placed);
              yield* posts.insert(placed, targets);
              yield* startJob(placed);
              // Told once, with the post: a request that finds its key
              // used made none, and tells nothing.
              yield* announce(placed, targets);

              return { placed, used: earlier };
            })
          );

          return { made: { post: used.placed, targets }, used: used.used };
        }
      );

      const schedule = Effect.fn("PostScheduling.schedule")(function* schedule(
        actor: Actor,
        request: SchedulePostRequest
      ) {
        yield* mayAsk(actor);

        const { made } = yield* scheduleNew(actor, request, () =>
          Effect.succeed(Option.none())
        );

        return made;
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

      const send = Effect.fn("PostScheduling.send")(function* send(
        actor: Actor,
        { at, idempotency, timeZone, ...request }: SendPostRequest
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

        const { made, used } = yield* scheduleNew(
          actor,
          {
            ...request,
            schedule: new Schedule({
              at: Option.getOrElse(at, () => now),
              timeZone,
            }),
          },
          (post) =>
            Option.match(idempotency, {
              onNone: () => Effect.succeed(Option.none<KeyUse>()),
              onSome: (keyed) =>
                keys.claim(
                  actor.workspaceId,
                  keyed,
                  { at: now, postId: post.id },
                  since
                ),
            })
        );

        // Sent together with this one, the other request made the post.
        if (Option.isSome(used)) {
          return yield* replay(actor, used.value);
        }

        const sent: SentPost = { ...made, replayed: false };

        return sent;
      });

      const forgetExpiredKeys = DateTime.now.pipe(
        Effect.flatMap((now) =>
          keys.purge(DateTime.subtractDuration(now, idempotencyKeyLifetime))
        ),
        Effect.withSpan("PostScheduling.forgetExpiredKeys")
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

              const existing = yield* posts.lockTargets(postId);

              // A channel it had keeps its options; a new one has none.
              const channels = yield* publishableOn(
                actor,
                current.post.content,
                channelIds,
                optionsOfTargets(existing, channelIds)
              );

              const targets = yield* targetsOn(postId, channels, existing).pipe(
                withPorts
              );

              yield* posts.setTargets(postId, targets);

              const post = yield* move(actor, current, at, received, targets);

              yield* announce(post, targets);

              return { post, targets };
            })
          );
        }
      );

      const reschedule = Effect.fn("PostScheduling.reschedule")(
        function* reschedule(actor: Actor, postId: PostId, at: Schedule) {
          yield* mayAsk(actor);

          const received = yield* DateTime.now;

          return yield* transaction(
            Effect.gen(function* moveAndRestart() {
              const current = yield* lockPost(actor, postId);

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

              const post = yield* move(actor, current, at, received, targets);

              yield* announce(post, targets);

              return { post, targets };
            })
          );
        }
      );

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

              // A post that waited was never told as scheduled.
              if (current.post.status._tag === "scheduled") {
                yield* events.unscheduled(draft);
              }

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
        forgetExpiredKeys,
        reschedule,
        schedule,
        scheduleDraft,
        send,
        unschedule,
      });
    })
  );
}
