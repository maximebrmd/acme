import { DateTime, Effect, Match, Option, Result, Schedule } from "effect";

import type { PostOutcome } from "#publishing/domain/post-status.ts";
import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import {
  isCancelRequested,
  isSettled,
  missTarget,
  settleTarget,
} from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { finishPost, outcomeOf } from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import type {
  PostClaim,
  TargetClaim,
  TargetOutcome,
} from "#publishing/domain/publication-claims.ts";
import {
  claimPost,
  claimTarget,
  targetOutcomeOf,
} from "#publishing/domain/publication-claims.ts";
import { decide } from "#publishing/domain/publication-policy.ts";
import type {
  AttemptOutcome,
  PublicationDecision,
} from "#publishing/domain/publication-policy.ts";
import type { Schedule as PostSchedule } from "#publishing/domain/schedule.ts";
import { needsReconnect } from "#publishing/domain/target-settlement.ts";
import type { TargetSettlement } from "#publishing/domain/target-settlement.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { ChannelId, PostId } from "#shared/domain/ids.ts";

import { ChannelHealth } from "./channel-health.ts";
import { PlatformPublisher } from "./platform-publisher.ts";
import { PostRepository } from "./post-repository.ts";
import { PublicationJournal } from "./publication-journal.ts";
import { PublicationOutcomes } from "./publication-outcomes.ts";

// The steps of publishing a post, one use case per step of the durable job
// (#publishing/infrastructure/workflows). Each reads and writes the post as it
// is now, so a step run again after a crash, or for a post that changed, does
// the right thing. A post or a target missing when its job wakes was
// discarded as a draft, or dropped from one: the job is superseded. Any other
// row missing, or in a state no step leaves it in, is a bug, and dies.

const found = <A>(row: Option.Option<A>, what: string) =>
  Option.match(row, {
    onNone: () => Effect.die(`${what} is missing`),
    onSome: Effect.succeed,
  });

const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A row changed under its lock");

const settledOutcome = (target: PostTarget): Effect.Effect<TargetOutcome> => {
  const { status } = target;

  return status._tag === "pending" || status._tag === "publishing"
    ? Effect.die(`Target ${target.id} has not settled`)
    : Effect.succeed(targetOutcomeOf(status));
};

// When the round being sent was due: the post's time for its first round,
// and for a repost the moment its job started sending it, so the rate limit
// deadline counts from the repost.
const roundStartOf = (target: PostTarget, schedule: PostSchedule) => {
  const { status } = target;

  if (status._tag !== "publishing") {
    return Effect.die(`Target ${target.id} is ${status._tag}, not publishing`);
  }

  return Effect.succeed(target.round === 1 ? schedule.at : status.startedAt);
};

const scheduleOf = (post: Post) => {
  const { status } = post;

  return status._tag === "publishing" || status._tag === "finished"
    ? Effect.succeed(status.schedule)
    : Effect.die(`Post ${post.id} is ${status._tag}, not publishing`);
};

/**
 * The post's job woke for `revision`: start publishing if the post still has
 * that revision, mark it missed if it is too late (telling
 * PublicationOutcomes how each target ended), or stop.
 */
export const claimPostRun = Effect.fn("Publishing.claimPost")(
  function* claimPostRun(postId: PostId, revision: number) {
    const posts = yield* PostRepository;
    const outcomes = yield* PublicationOutcomes;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* claimInTransaction() {
        const stored = yield* posts.lock(postId);

        // Discarded as a draft since the job was started.
        if (Option.isNone(stored)) {
          const claim: PostClaim = { _tag: "superseded" };

          return claim;
        }

        const { post } = stored.value;
        const now = yield* DateTime.now;

        const decision = yield* Effect.fromResult(
          claimPost(post, revision, now)
        ).pipe(Effect.orDie);

        const claimed = posts.targets(postId).pipe(
          Effect.map((targets): PostClaim => ({
            _tag: "claimed",
            targets: targets.map((target) => ({
              round: target.round,
              targetId: target.id,
            })),
          }))
        );

        const missAll = Effect.fn("Publishing.missPost")(function* missAll(
          publishing: Post
        ) {
          const targets = yield* posts.lockTargets(postId);

          const missed = yield* Effect.all(
            targets.map((target) =>
              Effect.fromResult(missTarget(target, now)).pipe(
                Effect.orDie,
                Effect.tap((next) =>
                  posts.updateTarget(next, target).pipe(Effect.flatMap(applied))
                )
              )
            )
          );

          const finished = yield* Effect.fromResult(
            finishPost(publishing, missed, now)
          ).pipe(Effect.orDie);

          yield* applied(yield* posts.update(finished, post));

          // Each target settled here, never in recordTargetRun: told once,
          // as a step run again finds the post finished and misses nothing.
          yield* Effect.forEach(missed, (target) => outcomes.settled(target), {
            discard: true,
          });

          const claim: PostClaim = { _tag: "missed" };

          return claim;
        });

        return yield* Match.valueTags(decision, {
          cancelled: () => Effect.succeed<PostClaim>({ _tag: "cancelled" }),
          miss: ({ post: publishing }) => missAll(publishing),
          resume: () => claimed,
          start: ({ post: publishing }) =>
            posts
              .update(publishing, post)
              .pipe(Effect.flatMap(applied), Effect.andThen(claimed)),
          superseded: () => Effect.succeed<PostClaim>({ _tag: "superseded" }),
        });
      })
    );
  }
);

// Finishes a publishing post whose targets have all settled, in the
// caller's transaction, which holds the post's lock; leaves any other post as
// it is. Its outcome, once it is finished.
const finishIfSettled = Effect.fn("Publishing.finishIfSettled")(
  function* finishIfSettled(post: Post) {
    const posts = yield* PostRepository;

    if (post.status._tag === "finished") {
      return Option.some<PostOutcome>(post.status.outcome);
    }

    const targets = yield* posts.targets(post.id);

    if (post.status._tag !== "publishing" || !targets.every(isSettled)) {
      return Option.none<PostOutcome>();
    }

    const finished = yield* Effect.fromResult(
      finishPost(post, targets, yield* DateTime.now)
    ).pipe(Effect.orDie);

    yield* applied(yield* posts.update(finished, post));

    return finished.status._tag === "finished"
      ? Option.some(finished.status.outcome)
      : yield* Effect.die("A finished post is not finished");
  }
);

/**
 * Every target of the job has settled: the post finishes with what they add
 * up to, unless its last target already finished it. A target a member sent
 * again meanwhile finishes it once that round settles: the job answers with
 * what the targets add up to so far.
 */
export const completePostRun = Effect.fn("Publishing.completePost")(
  function* completePostRun(postId: PostId) {
    const posts = yield* PostRepository;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* completeInTransaction() {
        const { post } = yield* found(yield* posts.lock(postId), "The post");
        const outcome = yield* finishIfSettled(post);

        if (Option.isSome(outcome)) {
          return outcome.value;
        }

        if (post.status._tag !== "publishing") {
          return yield* Effect.die(
            `Post ${postId} is ${post.status._tag}, not publishing`
          );
        }

        return outcomeOf((yield* posts.targets(postId)).filter(isSettled));
      })
    );
  }
);

/**
 * A target's job started for `round`: start sending it if it is still
 * pending in that round, or say why not.
 */
export const claimTargetRun = Effect.fn("Publishing.claimTarget")(
  function* claimTargetRun(targetId: PostTargetId, round: number) {
    const posts = yield* PostRepository;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* claimInTransaction() {
        const locked = yield* posts.lockTarget(targetId);

        // Its draft was discarded, or left its channel, since.
        if (Option.isNone(locked)) {
          const claim: TargetClaim = { _tag: "superseded" };

          return claim;
        }

        const target = locked.value;

        const decision = yield* Effect.fromResult(
          claimTarget(target, round, yield* DateTime.now)
        ).pipe(Effect.orDie);

        const claimed = (sending: PostTarget) =>
          Effect.gen(function* claiming() {
            const { post } = yield* found(
              yield* posts.find(target.postId),
              "The post"
            );

            const claim: TargetClaim = {
              _tag: "claimed",
              channelId: target.channelId,
              postId: post.id,
              scheduledAt: yield* roundStartOf(
                sending,
                yield* scheduleOf(post)
              ),
            };

            return claim;
          });

        return yield* Match.valueTags(decision, {
          cancelled: () => Effect.succeed<TargetClaim>({ _tag: "cancelled" }),
          resume: () => claimed(target),
          settled: ({ outcome }) =>
            Effect.succeed<TargetClaim>({ _tag: "settled", outcome }),
          start: ({ target: started }) =>
            posts
              .updateTarget(started, target)
              .pipe(Effect.flatMap(applied), Effect.andThen(claimed(started))),
          superseded: () => Effect.succeed<TargetClaim>({ _tag: "superseded" }),
        });
      })
    );
  }
);

/** One attempt at publishing a claimed target. */
export interface PublishAttempt {
  readonly attempt: number;
  readonly channelId: ChannelId;
  // Unique to this attempt of this job, and the same for every run of it.
  readonly idempotencyKey: string;
  readonly postId: PostId;
  readonly round: number;
  readonly scheduledAt: DateTime.Utc;
  readonly targetId: PostTargetId;
}

// How the call ended lives only in memory until the journal has it: the step
// run again would find the call begun and not ended, and mark it unconfirmed.
// So that one write is retried on its own, backing off up to a minute, for as
// long as the database refuses it.
const outcomeWriteRetry = Schedule.min([
  Schedule.exponential("200 millis", 2),
  Schedule.spaced("1 minute"),
]);

const writeOutcome = (
  attempt: PublishAttempt,
  outcome: AttemptOutcome,
  finishedAt: DateTime.Utc
) =>
  PublicationJournal.use((journal) =>
    journal.finish(attempt.idempotencyKey, outcome, finishedAt)
  ).pipe(
    // The outcome holds the platform's ids and codes, never content: logged,
    // a post that went live can still be found if the write never lands.
    Effect.tapError((failure) =>
      Effect.logWarning(
        "Could not record how a publishing call ended; retrying",
        failure
      ).pipe(
        Effect.annotateLogs({
          attempt: attempt.attempt,
          outcome,
          round: attempt.round,
          targetId: attempt.targetId,
        })
      )
    ),
    Effect.retry(outcomeWriteRetry)
  );

// An earlier run's call, left in flight, that this run does not check.
const interrupted: AttemptOutcome = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

// The journal row is written, and committed, before the call: a run that
// finds it begun and not ended does not send it blindly again, but asks the
// publisher to resume it, which looks for the post where the platform allows
// and answers unconfirmed otherwise. A resume may send the post, so once the
// member cancelled it, the call stays unconfirmed: what the earlier run sent
// counts, nothing more is sent. A row that ended returns what it recorded,
// so a run after a crash decides as the first one did.
const callPlatform = Effect.fn("Publishing.callPlatform")(
  function* callPlatform(attempt: PublishAttempt, cancelRequested: boolean) {
    const journal = yield* PublicationJournal;
    const publisher = yield* PlatformPublisher;

    const now = yield* DateTime.now;

    const start = yield* journal.begin({
      attempt: attempt.attempt,
      idempotencyKey: attempt.idempotencyKey,
      round: attempt.round,
      startedAt: now,
      targetId: attempt.targetId,
    });

    if (start._tag === "completed") {
      return start;
    }

    // When the call was made, by this run or the one that began it.
    const startedAt = start._tag === "inFlight" ? start.startedAt : now;

    const request = {
      channelId: attempt.channelId,
      idempotencyKey: attempt.idempotencyKey,
      postId: attempt.postId,
      startedAt,
      targetId: attempt.targetId,
    };

    const resumed = cancelRequested
      ? Effect.succeed(interrupted)
      : publisher.resume(request);

    const outcome: AttemptOutcome = yield* (
      start._tag === "inFlight" ? resumed : publisher.publish(request)
    ).pipe(Effect.catch((error) => Effect.succeed(error)));

    const finishedAt = yield* DateTime.now;

    yield* writeOutcome(attempt, outcome, finishedAt);

    return { finishedAt, outcome, startedAt };
  }
);

/**
 * Makes one attempt and decides what follows: retry after a delay, or
 * settle the target. It is not a transaction: the journal commits before the
 * platform is called. Run again after a database failure, it finds the call
 * in the journal and decides from what the journal holds.
 */
export const publishAttemptRun = Effect.fn("Publishing.publishAttempt")(
  function* publishAttemptRun(attempt: PublishAttempt) {
    const journal = yield* PublicationJournal;
    const posts = yield* PostRepository;

    const target = yield* found(
      yield* posts.findTarget(attempt.targetId),
      "The target"
    );

    // Cancelled since the last attempt: nothing more is sent. A run of this
    // attempt that began its call before the cancel still counts, in flight
    // or answered, so only an attempt the journal has never seen is cancelled.
    if (
      isCancelRequested(target) &&
      Option.isNone(yield* journal.find(attempt))
    ) {
      const cancelled: PublicationDecision = {
        _tag: "settle",
        settlement: { _tag: "cancelled" },
      };

      return cancelled;
    }

    const { finishedAt, outcome, startedAt } = yield* callPlatform(
      attempt,
      isCancelRequested(target)
    );

    // Read from the journal, so a run after a crash decides as the first did.
    const earlier = yield* journal.earlierRefusals(attempt);

    const decision: PublicationDecision = decide(outcome, {
      earlier,
      sinceScheduled: DateTime.distance(attempt.scheduledAt, finishedAt),
      startedAt,
    });

    yield* journal.recordAttempt({
      attempt: attempt.attempt,
      decision,
      finishedAt,
      outcome,
      round: attempt.round,
      startedAt,
      targetId: attempt.targetId,
    });

    return decision;
  }
);

/**
 * Settles a target with how its attempts ended, tells the channels context
 * when its token is gone for good, and tells PublicationOutcomes how it
 * ended. The last target of a post to settle finishes it, as a reposted
 * round has no post job to do so.
 */
export const recordTargetRun = Effect.fn("Publishing.recordTarget")(
  function* recordTargetRun(
    targetId: PostTargetId,
    round: number,
    settlement: TargetSettlement
  ) {
    const posts = yield* PostRepository;
    const health = yield* ChannelHealth;
    const outcomes = yield* PublicationOutcomes;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* recordInTransaction() {
        const unlocked = yield* found(
          yield* posts.findTarget(targetId),
          "The target"
        );

        // The post first, then the target, as every use case locks them.
        const { post } = yield* found(
          yield* posts.lock(unlocked.postId),
          "The post"
        );

        const target = yield* found(
          yield* posts.lockTarget(targetId),
          "The target"
        );

        if (target.round !== round) {
          const outcome: TargetOutcome = "superseded";

          return outcome;
        }

        // An earlier run recorded it.
        if (isSettled(target)) {
          return yield* settledOutcome(target);
        }

        const settled = yield* Result.match(
          settleTarget(target, settlement, yield* DateTime.now),
          { onFailure: Effect.die, onSuccess: Effect.succeed }
        );

        yield* applied(yield* posts.updateTarget(settled, target));

        if (needsReconnect(settlement)) {
          yield* health.reconnectRequired(target.channelId);
        }

        yield* outcomes.settled(settled);
        yield* finishIfSettled(post);

        return yield* settledOutcome(settled);
      })
    );
  }
);
