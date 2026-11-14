import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
  Result,
} from "effect";

import type { FollowUpAsk } from "#publishing/domain/follow-up-ability.ts";
import { FollowUpIdSchema } from "#publishing/domain/follow-up-id.ts";
import type { FollowUpId } from "#publishing/domain/follow-up-id.ts";
import {
  actsUntil,
  endFollowUpRule,
  mayAct,
  maxFollowUpsPerChannelDay,
} from "#publishing/domain/follow-up-rule.ts";
import type { FollowUpRule } from "#publishing/domain/follow-up-rule.ts";
import {
  armFollowUp,
  cancelFollowUp,
  expireFollowUp,
  isPast,
  settleFollowUp,
  triggerFollowUp,
  wasAttempted,
} from "#publishing/domain/follow-up.ts";
import type {
  FollowUp,
  FollowUpCallOutcome,
  FollowUpCancelReason,
  FollowUpExpiryReason,
  FollowUpKind,
} from "#publishing/domain/follow-up.ts";
import { isSettled, livePartsOf } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

import { ApprovalGate } from "./approval-gate.ts";
import { FollowUpChannels } from "./follow-up-channels.ts";
import { FollowUpCounts } from "./follow-up-counts.ts";
import { FollowUpJobs } from "./follow-up-jobs.ts";
import { FollowUpStore } from "./follow-up-store.ts";
import type { ArmedFollowUp } from "./follow-up-store.ts";
import { PlatformCredentials } from "./platform-credentials.ts";
import { PostRepository } from "./post-repository.ts";
import { RecyclingActors } from "./recycling-actors.ts";

/** Follow-ups that set out, ended or waited, by what became of them. */
export const followUpsRun = Metric.counter("peal.publishing.follow_ups", {
  description:
    "Follow-ups of rules at a threshold, by what a run did with them",
  incremental: true,
});

/**
 * How long a follow-up may stay on its way before it is handed over: far
 * past a call through its channel's gate.
 */
export const followUpStrandedAfter = Duration.hours(1);

/** How recently a gate's claim of the call keeps it from being handed over. */
export const followUpCallBound = Duration.minutes(10);

// The stranded follow-ups one run hands over: there are few, if any.
const strandedPerRun = 100;

/** How many armed follow-ups a run reads at once. */
export const armedPageSize = 200;

// The post-scoped rules a run looks at for completion.
const completedPerRun = 100;

/** What a run of the follow-ups did. */
/** What arming a rule on its published post did. */
export interface ArmedPublished {
  readonly armed: readonly FollowUp[];
  /** The kinds it asks that other follow-ups already hold there. */
  readonly taken: number;
}

export interface FollowUpRun {
  /** Set out to be sent: their job started. */
  readonly triggered: number;
  /** Their window passed. */
  readonly expired: number;
  /** Given up: their rule ended, their post or channel gone. */
  readonly cancelled: number;
  /**
   * Past their threshold but left for a later run: paused, awaiting an
   * approval, the channel's day full, a starter locked out, or held.
   */
  readonly left: number;
  /** Post-scoped rules that ended, all they armed being over. */
  readonly completed: number;
}

/** What a rule asks, as a channel's abilities read it. */
export const askOf = (rule: FollowUpRule): FollowUpAsk => ({
  comment: rule.comment,
  repost: rule.repost,
});

const kindsAsked = (rule: FollowUpRule): readonly FollowUpKind[] => [
  ...(Option.isSome(rule.comment) ? (["comment"] as const) : []),
  ...(rule.repost ? (["repost"] as const) : []),
];

const isOpen = (rule: FollowUpRule) => rule.status._tag !== "ended";

// When the target's post went live there: its first part's time.
const liveSince = (target: PostTarget): Option.Option<DateTime.Utc> =>
  target.status._tag === "published" && target.status.removedAt === undefined
    ? Option.fromUndefinedOr(livePartsOf(target)[0]?.publishedAt)
    : Option.none();

// Why a window passed without it going out.
const expiryOf = (
  { rule }: ArmedFollowUp,
  likes: Option.Option<number>,
  starterHeld: boolean
): FollowUpExpiryReason => {
  if (rule.status._tag === "paused") {
    return "paused";
  }

  if (!Option.exists(likes, (count) => count >= rule.likes)) {
    return "belowThreshold";
  }

  return rule.approval._tag === "pending" || !mayAct(rule, starterHeld)
    ? "notApproved"
    : "dailyLimit";
};

/**
 * Whether the starter may still have posts go out: whoever may schedule,
 * or whoever the gate lets ask, whose posts then wait for an approval.
 */
const mayStillAsk = (gate: typeof ApprovalGate.Service, actor: Actor) =>
  can(actor, "post:schedule") ? Effect.succeed(true) : gate.maySubmit(actor);

/**
 * Rules that act by themselves on a published post once it has enough
 * likes (`#publishing/domain/follow-up-rule.ts`), the publishing side of
 * them: `arm` arms a target as it is published, in the transaction that
 * settles it; `runDue` (the `publishing.follow-ups` cron) reads the likes
 * analytics last counted for every armed follow-up, never a platform,
 * and sets those past their threshold out, one transaction each, as the
 * rule's starter is now: approved, or needing no approval; within the
 * channel's day; on a post still live there. It expires those whose window
 * passed, saying why, and ends post-scoped rules all of whose follow-ups
 * are over.
 */
export class FollowUps extends Context.Service<
  FollowUps,
  {
    /**
     * Arms the follow-ups of the rules acting on a target that was just
     * published: each kind its rule asks that its channel can carry, until
     * `followUpWindow` after it went live. Run in the transaction that
     * settles the target. A target already armed of a kind is left.
     */
    readonly arm: (
      target: PostTarget
    ) => Effect.Effect<readonly FollowUp[], DatabaseError>;
    /**
     * Arms what a rule just started, or given a kind, acts on that is
     * already published: the targets of its post, while their windows
     * last. A kind another rule's follow-up already holds on a target is
     * left to it, and counted in `taken`.
     */
    readonly armPublished: (
      rule: FollowUpRule
    ) => Effect.Effect<ArmedPublished, DatabaseError>;
    /** The cron's run. */
    readonly runDue: Effect.Effect<FollowUpRun, DatabaseError>;
    /**
     * Hands over the follow-ups no job settled: still `sending`
     * `followUpStrandedAfter` they were triggered, with no call claimed in
     * the last `followUpCallBound`. One whose call never set out is armed
     * again, nothing having gone out; one whose call did is
     * `unconfirmed`. Its job is stopped in the same transaction. Answers
     * how many.
     */
    readonly settleStranded: Effect.Effect<number, DatabaseError>;
    /** Gives up what a rule armed and has not sent: it ended. */
    readonly cancelArmed: (
      rule: FollowUpRule
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/publishing/application/FollowUps") {
  static readonly layer = Layer.effect(
    FollowUps,
    Effect.gen(function* FollowUpsLive() {
      const store = yield* FollowUpStore;
      const counts = yield* FollowUpCounts;
      const jobs = yield* FollowUpJobs;
      const channels = yield* FollowUpChannels;
      const posts = yield* PostRepository;
      const credentials = yield* PlatformCredentials;
      const actors = yield* RecyclingActors;
      const gate = yield* ApprovalGate;
      const ids = yield* Ids;
      const { transaction } = yield* TransactionRunner;

      // What the rule arms on the target: each kind it asks that the
      // channel can carry now. Nothing when the channel cannot be read.
      const armingsOf = Effect.fn("FollowUps.armingsOf")(function* armingsOf(
        rule: FollowUpRule,
        target: PostTarget,
        until: DateTime.Utc,
        now: DateTime.Utc
      ) {
        const account = yield* credentials
          .account(target.channelId)
          .pipe(Effect.option);

        if (Option.isNone(account)) {
          return [];
        }

        const able = yield* channels.of(
          {
            channelId: target.channelId,
            connection: account.value.connection,
            platform: account.value.platform,
          },
          askOf(rule)
        );

        const kinds = kindsAsked(rule).filter(
          (kind) => able[kind] === "available"
        );

        return yield* Effect.forEach((kind: FollowUpKind) =>
          newId(FollowUpIdSchema).pipe(
            Effect.provideService(Ids, ids),
            Effect.map((id) =>
              armFollowUp(
                {
                  channelId: target.channelId,
                  id,
                  kind,
                  postId: target.postId,
                  ruleId: rule.id,
                  targetId: target.id,
                  until,
                  workspaceId: rule.workspaceId,
                },
                now
              )
            )
          )
        )(kinds);
      });

      // What the rules would arm on the target: each kind they ask, while
      // its window lasts.
      const armingsFor = Effect.fn("FollowUps.armingsFor")(function* armingsFor(
        rules: readonly FollowUpRule[],
        target: PostTarget
      ) {
        const since = liveSince(target);
        const now = yield* DateTime.now;

        if (Option.isNone(since)) {
          return [];
        }

        const until = actsUntil(since.value);

        if (!DateTime.isLessThan(now, until)) {
          return [];
        }

        const acting = rules.filter(
          (rule) =>
            isOpen(rule) &&
            // A channel's rule acts on what went live after it started.
            (rule.scope._tag === "post" ||
              !DateTime.isLessThan(since.value, rule.createdAt))
        );

        const armings = yield* Effect.forEach((rule: FollowUpRule) =>
          armingsOf(rule, target, until, now)
        )(acting);

        return armings.flat();
      });

      const armWith = Effect.fn("FollowUps.armWith")(function* armWith(
        rules: readonly FollowUpRule[],
        target: PostTarget
      ) {
        return yield* store.arm(yield* armingsFor(rules, target));
      });

      const arm = Effect.fn("FollowUps.arm")(function* arm(target: PostTarget) {
        if (Option.isNone(liveSince(target))) {
          return [];
        }

        const stored = yield* posts.find(target.postId);

        if (Option.isNone(stored)) {
          return [];
        }

        const { workspaceId } = stored.value.post;

        // The post's own rule first: it arms a kind before the channel's.
        const rules = [
          ...Option.toArray(
            yield* store.openOfPost(workspaceId, target.postId)
          ),
          ...Option.toArray(
            yield* store.openOfChannel(workspaceId, target.channelId)
          ),
        ];

        return rules.length === 0 ? [] : yield* armWith(rules, target);
      });

      const armPublished = Effect.fn("FollowUps.armPublished")(
        function* armPublished(rule: FollowUpRule) {
          if (rule.scope._tag !== "post") {
            return { armed: [], taken: 0 } satisfies ArmedPublished;
          }

          const targets = yield* posts.targets(rule.scope.postId);

          const armings = yield* Effect.forEach((target: PostTarget) =>
            armingsFor([rule], target)
          )(targets);

          const wanted = armings.flat();
          const armed = yield* store.arm(wanted);

          return {
            armed,
            taken: wanted.length - armed.length,
          } satisfies ArmedPublished;
        }
      );

      const cancel = (
        followUp: FollowUp,
        reason: FollowUpCancelReason,
        now: DateTime.Utc
      ) =>
        Result.match(cancelFollowUp(followUp, reason, now), {
          onFailure: () => Effect.succeed(false),
          onSuccess: (next) => store.advance(next, followUp),
        });

      const cancelArmed = Effect.fn("FollowUps.cancelArmed")(
        function* cancelArmed(rule: FollowUpRule) {
          const now = yield* DateTime.now;
          const armed = yield* store.armedOfRule(rule.id);

          const done = yield* Effect.forEach((followUp: FollowUp) =>
            cancel(followUp, "ruleEnded", now)
          )(armed);

          return done.filter(Boolean).length;
        }
      );

      type Step = "cancelled" | "expired" | "left" | "skipped" | "triggered";

      // Whether the rule may act now as its starter: `go`; `left` while
      // they are locked out or the rule waits for an approval their posts
      // would need; `cancelled` once they can no longer have posts go out,
      // which ends the rule.
      const starterSays = Effect.fn("FollowUps.starterSays")(
        function* starterSays(rule: FollowUpRule, now: DateTime.Utc) {
          const starter = yield* actors.of(rule);

          if (starter._tag === "lockedOut") {
            return "left" as const;
          }

          if (
            starter._tag === "gone" ||
            !(yield* mayStillAsk(gate, starter.actor))
          ) {
            yield* store.updateRule(endFollowUpRule(rule, "starterGone", now));
            yield* cancelArmed(rule);

            return "cancelled" as const;
          }

          return mayAct(rule, yield* gate.holds(starter.actor))
            ? ("go" as const)
            : ("left" as const);
        }
      );

      // Whether the follow-up's channel can still carry it.
      const carries = Effect.fn("FollowUps.carries")(function* carries(
        followUp: FollowUp,
        rule: FollowUpRule
      ) {
        const account = yield* credentials
          .account(followUp.channelId)
          .pipe(Effect.option);

        if (Option.isNone(account)) {
          return false;
        }

        const able = yield* channels.of(
          {
            channelId: followUp.channelId,
            connection: account.value.connection,
            platform: account.value.platform,
          },
          askOf(rule)
        );

        return able[followUp.kind] === "available";
      });

      // One armed follow-up past its threshold, in a transaction of its
      // own, under its row's lock, skipped when another run holds it.
      const trigger = Effect.fn("FollowUps.trigger")(function* trigger(
        id: FollowUpId,
        likes: number
      ) {
        const now = yield* DateTime.now;
        const locked = yield* store.lockUnlessHeld(id);

        if (Option.isNone(locked) || locked.value.status._tag !== "armed") {
          return "skipped" satisfies Step;
        }

        const followUp = locked.value;

        const found = yield* store.lockRule(
          followUp.workspaceId,
          followUp.ruleId
        );

        if (Option.isNone(found) || found.value.status._tag === "ended") {
          return (yield* cancel(followUp, "ruleEnded", now))
            ? ("cancelled" satisfies Step)
            : ("skipped" satisfies Step);
        }

        const rule = found.value;

        if (rule.status._tag === "paused" || likes < rule.likes) {
          return "left" satisfies Step;
        }

        const says = yield* starterSays(rule, now);

        if (says !== "go") {
          return says satisfies Step;
        }

        const target = yield* posts.findTarget(followUp.targetId);

        if (Option.isNone(target) || Option.isNone(liveSince(target.value))) {
          return (yield* cancel(followUp, "postGone", now))
            ? ("cancelled" satisfies Step)
            : ("skipped" satisfies Step);
        }

        if (!(yield* carries(followUp, rule))) {
          return (yield* cancel(followUp, "unavailable", now))
            ? ("cancelled" satisfies Step)
            : ("skipped" satisfies Step);
        }

        const today = yield* store.triggeredSince(
          followUp.channelId,
          DateTime.startOf(now, "day")
        );

        if (today >= maxFollowUpsPerChannelDay) {
          return "left" satisfies Step;
        }

        const triggered = triggerFollowUp(followUp, likes, now);

        if (Result.isFailure(triggered)) {
          return "skipped" satisfies Step;
        }

        if (!(yield* store.advance(triggered.success, followUp))) {
          return "skipped" satisfies Step;
        }

        yield* jobs.start(followUp.id, triggered.success.attempt);

        return "triggered" satisfies Step;
      });

      const expire = Effect.fn("FollowUps.expire")(function* expire(
        armed: ArmedFollowUp,
        likes: Option.Option<number>
      ) {
        const now = yield* DateTime.now;
        const starter = yield* actors.of(armed.rule);

        // A starter whose posts the policy holds now waits for an
        // approval, whatever the rule's was when it started.
        const starterHeld =
          starter._tag === "acting" && (yield* gate.holds(starter.actor));

        const expired = expireFollowUp(
          armed.followUp,
          expiryOf(armed, likes, starterHeld),
          now
        );

        return Result.isSuccess(expired) &&
          (yield* store.advance(expired.success, armed.followUp))
          ? ("expired" satisfies Step)
          : ("skipped" satisfies Step);
      });

      // A post-scoped rule all of whose follow-ups are over, on a post
      // with nothing left to publish, ends `completed`.
      const complete = Effect.fn("FollowUps.complete")(function* complete(
        candidate: FollowUpRule
      ) {
        const now = yield* DateTime.now;

        const locked = yield* store.lockRule(
          candidate.workspaceId,
          candidate.id
        );

        if (
          Option.isNone(locked) ||
          locked.value.status._tag === "ended" ||
          locked.value.scope._tag !== "post"
        ) {
          return false;
        }

        const targets = yield* posts.targets(locked.value.scope.postId);

        if (!targets.every(isSettled)) {
          return false;
        }

        yield* store.updateRule(
          endFollowUpRule(locked.value, "completed", now)
        );

        return true;
      });

      const runDue = Effect.gen(function* runDue() {
        const tally = {
          cancelled: 0,
          completed: 0,
          expired: 0,
          left: 0,
          triggered: 0,
        };

        let after = Option.none<FollowUpId>();

        // Every armed follow-up, a page at a time, by id: the run reads
        // them all, however many there are.
        for (;;) {
          const page = yield* store.armed(after, armedPageSize);

          if (page.length === 0) {
            break;
          }

          after = Option.fromUndefinedOr(page.at(-1)?.followUp.id);

          const likes = yield* counts.likesOf(
            page.map(({ followUp }) => followUp.targetId)
          );

          const now = yield* DateTime.now;

          for (const armed of page) {
            const counted = Option.fromUndefinedOr(
              likes.get(armed.followUp.targetId)
            );

            const reached = counted.pipe(
              Option.filter((count) => count >= armed.rule.likes)
            );

            let step: Step = "skipped";

            if (isPast(armed.followUp, now)) {
              step = yield* transaction(expire(armed, counted));
            } else if (Option.isSome(reached)) {
              step = yield* transaction(
                trigger(armed.followUp.id, reached.value)
              );
            }

            if (step !== "skipped") {
              tally[step] += 1;
            }
          }

          if (page.length < armedPageSize) {
            break;
          }
        }

        const settled = yield* store.settledPostRules(completedPerRun);

        for (const rule of settled) {
          if (yield* transaction(complete(rule))) {
            tally.completed += 1;
          }
        }

        for (const [outcome, count] of Object.entries(tally)) {
          yield* Metric.update(
            Metric.withAttributes(followUpsRun, { outcome }),
            count
          );
        }

        const run: FollowUpRun = tally;

        return run;
      }).pipe(Effect.withSpan("FollowUps.runDue"));

      const settleStranded = Effect.gen(function* settleStranded() {
        const now = yield* DateTime.now;

        const stranded = yield* store.stranded(
          DateTime.subtractDuration(now, followUpStrandedAfter),
          DateTime.subtractDuration(now, followUpCallBound),
          strandedPerRun
        );

        let settled = 0;

        for (const followUp of stranded) {
          const outcome: FollowUpCallOutcome = wasAttempted(followUp)
            ? {
                _tag: "answered",
                result: { _tag: "unconfirmed", reason: "interrupted" },
              }
            : { _tag: "refused", failure: new PlatformUnavailable() };

          const next = settleFollowUp(followUp, outcome, now);

          const handed =
            Result.isSuccess(next) &&
            (yield* transaction(
              store
                .advance(next.success, followUp)
                .pipe(
                  Effect.tap((written) =>
                    written
                      ? jobs.cancel(followUp.id, followUp.attempt)
                      : Effect.void
                  )
                )
            ));

          settled += handed ? 1 : 0;
        }

        return settled;
      }).pipe(Effect.withSpan("FollowUps.settleStranded"));

      return FollowUps.of({
        arm,
        armPublished,
        cancelArmed,
        runDue,
        settleStranded,
      });
    })
  );
}
