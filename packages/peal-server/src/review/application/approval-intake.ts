import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  defaultApprovalPolicy,
  isApplication,
  maySubmit as mayActorSubmit,
  needsApproval,
} from "#review/domain/approval-policy.ts";
import {
  ApprovalRequest,
  changed,
  withdraw,
} from "#review/domain/approval-request.ts";
import type { RequestOrigin } from "#review/domain/approval-request.ts";
import { ApprovalRequestIdSchema } from "#review/domain/review-ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import type {
  ChannelId,
  PostId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

import { ApprovalStore } from "./ports/approval-store.ts";
import { ReviewArchive } from "./ports/review-archive.ts";
import { ReviewOutcomes } from "./ports/review-outcomes.ts";
import { ReviewSettingsStore } from "./ports/review-settings-store.ts";

/** A post someone asks to send, as publishing shows it to the gate. */
export interface PostSubmission {
  readonly authorId: Option.Option<UserId>;
  /** The channels it goes to. */
  readonly channelIds: readonly ChannelId[];
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
  /** The SHA-256 of what the post says and where it goes. */
  readonly subjectHash: string;
  readonly timeZone: TimeZoneId;
  readonly workspaceId: WorkspaceId;
}

/** The key of the notices that ask people to decide on a request. */
export const requestKeyOf = (request: ApprovalRequest): string =>
  `approval-request:${request.id}`;

const originOf = (actor: Actor): RequestOrigin => {
  if (actor.subject._tag === "apiKey") {
    return "apiKey";
  }

  return isApplication(actor) ? "application" : "member";
};

const requesterOf = ({ subject }: Actor): Option.Option<UserId> =>
  subject._tag === "user" ? Option.some(subject.userId) : Option.none();

/**
 * What publishing's approval gate asks: whether a post someone schedules
 * goes out or waits, by the workspace's policy
 * (`#review/domain/approval-policy.ts`), and what becomes of the requests
 * when posts stop waiting. It runs in publishing's transactions, joining
 * them, so a post waits exactly when a request for it is pending.
 */
export class ApprovalIntake extends Context.Service<
  ApprovalIntake,
  {
    readonly maySubmit: (actor: Actor) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Whether the workspace's policy has a post the actor asks to send
     * wait for an approval. Nothing is recorded.
     */
    readonly holds: (actor: Actor) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Admits the post, or holds it: the request that waits for it is made,
     * or renewed for what it now says and when it now goes, and those who
     * may approve are told, once per request.
     */
    readonly consider: (
      actor: Actor,
      submission: PostSubmission
    ) => Effect.Effect<"admitted" | "held", DatabaseError>;
    /**
     * A held post was moved by someone who did not ask for it again (a
     * reshuffle of its queue), or lost a channel: the request that waits
     * follows its time and what it now says, for whoever asked, and nobody
     * is asked again to decide. It never admits the post.
     */
    readonly followed: (
      actor: Actor,
      submission: PostSubmission
    ) => Effect.Effect<void, DatabaseError>;
    readonly approved: (
      workspaceId: WorkspaceId,
      postId: PostId,
      subjectHash: string
    ) => Effect.Effect<boolean, DatabaseError>;
    /** The post stopped waiting without a decision. */
    readonly withdrawn: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<void, DatabaseError>;
    /** The post was deleted: so is everything about its review. */
    readonly forgotten: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/review/application/ApprovalIntake") {
  static readonly layer = Layer.effect(
    ApprovalIntake,
    Effect.gen(function* ApprovalIntakeLive() {
      const archive = yield* ReviewArchive;
      const outcomes = yield* ReviewOutcomes;
      const requests = yield* ApprovalStore;
      const settings = yield* ReviewSettingsStore;
      const { transaction } = yield* TransactionRunner;
      const ids = yield* Effect.context<Ids>();

      const policyOf = (workspaceId: WorkspaceId) =>
        settings
          .policy(workspaceId)
          .pipe(Effect.map(Option.getOrElse(() => defaultApprovalPolicy)));

      const withdrawn = Effect.fn("ApprovalIntake.withdrawn")(
        function* withdrawn(workspaceId: WorkspaceId, postId: PostId) {
          yield* transaction(
            Effect.gen(function* withdrawPending() {
              const pending = yield* requests.lockPending(workspaceId, postId);

              if (Option.isNone(pending)) {
                return;
              }

              yield* requests.update(withdraw(pending.value));
              yield* outcomes.settled(requestKeyOf(pending.value));
            })
          );
        }
      );

      const hold = Effect.fn("ApprovalIntake.hold")(function* hold(
        actor: Actor,
        submission: PostSubmission
      ) {
        const now = yield* DateTime.now;

        const pending = yield* requests.lockPending(
          submission.workspaceId,
          submission.postId
        );

        // The request that waits follows the post: its time, and who asks
        // now. Those who decide were asked already, and are not again
        // (the key is the same); whoever follows the workspace from
        // outside hears the new time.
        if (Option.isSome(pending)) {
          const renewed = changed(pending.value, {
            requestedBy: requesterOf(actor),
            requestedVia: originOf(actor),
            scheduledAt: submission.scheduledAt,
            subjectHash: submission.subjectHash,
            timeZone: submission.timeZone,
          });

          yield* requests.update(renewed);

          yield* outcomes.approvalRequested({
            authorId: submission.authorId,
            channelIds: submission.channelIds,
            key: requestKeyOf(renewed),
            postId: renewed.postId,
            requestedBy: renewed.requestedBy,
            scheduledAt: renewed.scheduledAt,
            workspaceId: renewed.workspaceId,
          });

          return;
        }

        const request = new ApprovalRequest({
          decision: Option.none(),
          id: yield* newId(ApprovalRequestIdSchema).pipe(
            Effect.provideContext(ids)
          ),
          postId: submission.postId,
          requestedAt: now,
          requestedBy: requesterOf(actor),
          requestedVia: originOf(actor),
          scheduledAt: submission.scheduledAt,
          status: "pending",
          subjectHash: submission.subjectHash,
          timeZone: submission.timeZone,
          workspaceId: submission.workspaceId,
        });

        yield* requests.insert(request);

        yield* outcomes.approvalRequested({
          authorId: submission.authorId,
          channelIds: submission.channelIds,
          key: requestKeyOf(request),
          postId: request.postId,
          requestedBy: request.requestedBy,
          scheduledAt: request.scheduledAt,
          workspaceId: request.workspaceId,
        });
      });

      const followed = Effect.fn("ApprovalIntake.followed")(function* followed(
        actor: Actor,
        submission: PostSubmission
      ) {
        yield* transaction(
          Effect.gen(function* follow() {
            const pending = yield* requests.lockPending(
              submission.workspaceId,
              submission.postId
            );

            // A held post always has its request; were it missing, the
            // post would still wait, so one is made for it.
            if (Option.isNone(pending)) {
              yield* hold(actor, submission);

              return;
            }

            // It follows what the post now says too: a channel taken off
            // it changes that, and a page read before is looked at again.
            const moved = changed(pending.value, {
              scheduledAt: submission.scheduledAt,
              subjectHash: submission.subjectHash,
              timeZone: submission.timeZone,
            });

            yield* requests.update(moved);

            // Those who decide were asked already (the key is the same);
            // whoever follows the workspace from outside hears the new
            // time.
            yield* outcomes.approvalRequested({
              authorId: submission.authorId,
              channelIds: submission.channelIds,
              key: requestKeyOf(moved),
              postId: moved.postId,
              requestedBy: moved.requestedBy,
              scheduledAt: moved.scheduledAt,
              workspaceId: moved.workspaceId,
            });
          })
        );
      });

      const consider = Effect.fn("ApprovalIntake.consider")(function* consider(
        actor: Actor,
        submission: PostSubmission
      ) {
        const { postId, subjectHash, workspaceId } = submission;
        const policy = yield* policyOf(workspaceId);

        const admitted =
          !needsApproval(policy, actor) ||
          (yield* requests.approved(workspaceId, postId, subjectHash));

        if (admitted) {
          // A request that waited for it has nothing left to ask.
          yield* withdrawn(workspaceId, postId);

          return "admitted" as const;
        }

        yield* transaction(hold(actor, submission));

        return "held" as const;
      });

      return ApprovalIntake.of({
        approved: requests.approved,
        consider,
        followed,
        forgotten: archive.deletePost,
        holds: (actor) =>
          policyOf(actor.workspaceId).pipe(
            Effect.map((policy) => needsApproval(policy, actor))
          ),
        maySubmit: (actor) =>
          policyOf(actor.workspaceId).pipe(
            Effect.map((policy) => mayActorSubmit(policy, actor))
          ),
        withdrawn,
      });
    })
  );
}
