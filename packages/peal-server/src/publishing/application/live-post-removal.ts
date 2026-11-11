import { DateTime, Effect, Option, Result, Schema } from "effect";

import type { LivePostChangeId } from "#publishing/domain/live-post-change-id.ts";
import {
  failChange,
  finishChange,
  partEdited,
  partRemoved,
} from "#publishing/domain/live-post-change.ts";
import type { LivePostChange } from "#publishing/domain/live-post-change.ts";
import { isOperatorRefusal } from "#publishing/domain/own-refusals.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { decideRemoval } from "#publishing/domain/removal-decision.ts";
import type {
  EarlierRemovals,
  RemovalAttempt,
  RemovalDecision,
} from "#publishing/domain/removal-decision.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";

import { remember } from "./duplicate-guard.ts";
import { LivePostChangeStore } from "./live-post-change-store.ts";
import { LivePostClients } from "./live-post-clients.ts";
import { LivePostEvents } from "./live-post-events.ts";
import { OperatorAlerts } from "./operator-alerts.ts";
import { PostRepository } from "./post-repository.ts";

// The steps of changing a live post, removing it or editing it, one use
// case per step of its durable job (`ChangeLivePostV1`): what parts it
// takes, each call, and how it ended. Each reads the change again: one
// erased with its workspace, or ended meanwhile, is left alone.

/**
 * The parts the job deletes, in order (the last part of a thread first),
 * or nothing, when the change is gone or no longer pending. Stored in the
 * job's history: add members, never rename or remove one.
 */
export const RemovalClaimSchema = Schema.Union([
  Schema.TaggedStruct("parts", { indexes: Schema.Array(Schema.Int) }),
  Schema.TaggedStruct("gone", {}),
]);

export type RemovalClaim = typeof RemovalClaimSchema.Type;

/**
 * How a change ended: `done`, `failed`, or `gone` when it was erased
 * first. Stored in the job's history.
 */
export const ChangeOutcomeSchema = Schema.Literals(["done", "failed", "gone"]);

export type ChangeOutcome = typeof ChangeOutcomeSchema.Type;

const gone: RemovalDecision = { _tag: "gone" };

// A compare and set that misses under the row's lock means the lock was
// not held: a bug, not a conflict to report.
const applied = (written: boolean) =>
  written ? Effect.void : Effect.die("A change moved under its row lock");

/** The parts left to delete, as the job starts or runs again. */
export const claimRemovalRun = Effect.fn("LivePostRemoval.claim")(
  function* claimRemovalRun(changeId: LivePostChangeId) {
    const store = yield* LivePostChangeStore;
    const found = yield* store.find(changeId);

    const claim: RemovalClaim =
      Option.isSome(found) && found.value.status === "pending"
        ? {
            _tag: "parts",
            indexes: found.value.partsLeft.map(({ index }) => index),
          }
        : { _tag: "gone" };

    return claim;
  }
);

/** One call that deletes, or edits, one part, as the job's attempt `n`. */
export interface RemovalCall {
  readonly changeId: LivePostChangeId;
  /** How earlier calls for this part ended, the retried ones only. */
  readonly earlier: EarlierRemovals;
  readonly part: number;
}

/**
 * Deletes a part from the platform, or edits it, and decides what
 * follows. It is not a transaction: the call's start is committed before
 * the platform is called, so an erasure sees it in flight, and a run cut
 * short calls again (a post found gone is deleted; the same text sent
 * again changes nothing). Once the platform answered, the part leaves the
 * change's parts in one transaction. An edit's call carries the change's
 * id, never its text, which the gate's side reads.
 */
export const removalAttemptRun = Effect.fn("LivePostRemoval.attempt")(
  function* removalAttemptRun(call: RemovalCall) {
    const store = yield* LivePostChangeStore;
    const clients = yield* LivePostClients;
    const { transaction } = yield* TransactionRunner;

    const found = yield* store.find(call.changeId);

    if (Option.isNone(found) || found.value.status !== "pending") {
      return gone;
    }

    const part = found.value.partsLeft.find(({ index }) => index === call.part);

    // Recorded by a run before this one.
    if (part === undefined) {
      const done: RemovalDecision = { _tag: "removed", alreadyGone: false };

      return done;
    }

    const started = yield* store.beginCall(call.changeId, yield* DateTime.now);

    if (started === "refused") {
      return gone;
    }

    const isEdit = found.value.kind === "edit";

    const attempt: RemovalAttempt = yield* (
      isEdit
        ? clients
            .edit({
              changeId: call.changeId,
              channelId: found.value.channelId,
              platformPostId: part.platformPostId,
            })
            .pipe(Effect.map((): RemovalAttempt => ({ _tag: "edited" })))
        : clients
            .remove({
              channelId: found.value.channelId,
              platformPostId: part.platformPostId,
            })
            .pipe(
              // Found gone after a call of Peal's that never ended: that
              // call may have deleted it, so nobody is said to have before.
              Effect.map((outcome): RemovalAttempt => ({
                _tag: "removed",
                alreadyGone: outcome === "alreadyGone" && started === "begun",
              }))
            )
    ).pipe(Effect.catch((error) => Effect.succeed(error)));

    const finishedAt = yield* DateTime.now;

    // The part leaves the change once the platform said it is gone, or
    // edited, with the call's end, in one transaction; a refusal ends the
    // call alone.
    const recordDone = (alreadyGone: boolean) =>
      transaction(
        Effect.gen(function* record() {
          const locked = yield* store.lock(call.changeId);

          if (Option.isNone(locked) || locked.value.status !== "pending") {
            return;
          }

          const next = yield* Result.match(
            isEdit
              ? partEdited(locked.value, call.part)
              : partRemoved(locked.value, call.part, alreadyGone),
            { onFailure: Effect.die, onSuccess: Effect.succeed }
          );

          yield* applied(yield* store.update(next, locked.value));
          yield* store.endCall(call.changeId, finishedAt);
        })
      );

    if (attempt._tag === "removed") {
      yield* recordDone(attempt.alreadyGone);
    } else if (attempt._tag === "edited") {
      yield* recordDone(false);
    } else {
      yield* store.endCall(call.changeId, finishedAt);
    }

    // The platform refuses the server's app until its operator pays.
    if (
      attempt._tag === "PlatformUnavailable" &&
      isOperatorRefusal(attempt.code)
    ) {
      const { code } = attempt;

      yield* OperatorAlerts.use((alerts) =>
        alerts.appRefused({ channelId: found.value.channelId, code })
      );
    }

    return decideRemoval(attempt, call.earlier);
  }
);

/**
 * How the job ended, for `settleChangeRun`: done with the parts it took
 * (the claim's), or failed with a code.
 */
export type ChangeEnding =
  | { readonly _tag: "done"; readonly parts: readonly number[] }
  | { readonly _tag: "failed"; readonly code: string };

// The target with its published status's notes changed: still published.
const publishedWith = (
  target: PostTarget,
  notes:
    | { readonly editedAt: DateTime.Utc }
    | { readonly removedAt: DateTime.Utc }
) =>
  target.status._tag === "published"
    ? new PostTarget({
        channelId: target.channelId,
        id: target.id,
        liveParts: target.liveParts,
        options: target.options,
        postId: target.postId,
        round: target.round,
        status: { ...target.status, ...notes },
      })
    : target;

/**
 * Records how the change ended, in one transaction under the post's, the
 * target's and the change's locks, in that order. A removal done gives
 * the target its `removedAt`; an edit done makes its text the part's own
 * on the channel (`amendText`), gives the target its `editedAt` and keeps
 * the target's new content digest (`remember`); either way an edit's
 * text leaves the change. Failed, the parts left stay for a member who
 * asks again. Tells LivePostEvents either way. Run again, it answers what
 * the first run recorded.
 */
export const settleChangeRun = Effect.fn("LivePostRemoval.settle")(
  function* settleChangeRun(changeId: LivePostChangeId, ending: ChangeEnding) {
    const store = yield* LivePostChangeStore;
    const posts = yield* PostRepository;
    const events = yield* LivePostEvents;
    const { transaction } = yield* TransactionRunner;

    return yield* transaction(
      Effect.gen(function* settle() {
        const unlocked = yield* store.find(changeId);

        if (Option.isNone(unlocked)) {
          const erased: ChangeOutcome = "gone";

          return erased;
        }

        yield* posts.lock(unlocked.value.postId);

        const target = yield* posts.lockTarget(unlocked.value.targetId);
        const locked = yield* store.lock(changeId);

        if (Option.isNone(target) || Option.isNone(locked)) {
          const erased: ChangeOutcome = "gone";

          return erased;
        }

        const change = locked.value;

        if (change.status !== "pending") {
          const settled: ChangeOutcome = change.status;

          return settled;
        }

        const now = yield* DateTime.now;

        const next: LivePostChange = yield* Result.match(
          ending._tag === "done"
            ? finishChange(change, now)
            : failChange(change, ending.code, now),
          { onFailure: Effect.die, onSuccess: Effect.succeed }
        );

        yield* applied(yield* store.update(next, change));

        // The part an edit asked for: the one it took, or the one left.
        const editedPart =
          ending._tag === "done"
            ? (ending.parts[0] ?? 0)
            : (change.partsLeft[0]?.index ?? 0);

        if (change.kind === "edit" && ending._tag === "done") {
          // A pending edit always holds its text: none is a bug.
          const text = yield* Option.match(change.text, {
            onNone: () => Effect.die("A pending edit without its text"),
            onSome: Effect.succeed,
          });

          const amended = yield* posts.amendText(
            change.postId,
            editedPart,
            change.channelId,
            text
          );

          yield* posts.markEdited(change.targetId, now);

          if (Option.isSome(amended)) {
            yield* remember(amended.value, [target.value]);
          }

          yield* events.edited(
            next,
            publishedWith(target.value, { editedAt: now }),
            editedPart
          );
        } else if (change.kind === "edit") {
          yield* events.editFailed(next, target.value, editedPart);
        } else if (ending._tag === "done") {
          yield* posts.markRemoved(change.targetId, now);
          yield* events.unpublished(
            next,
            publishedWith(target.value, { removedAt: now })
          );
        } else {
          yield* events.unpublishFailed(next, target.value);
        }

        const outcome: ChangeOutcome =
          next.status === "done" ? "done" : "failed";

        return outcome;
      })
    );
  }
);
