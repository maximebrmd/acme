import { Context, Effect, Layer } from "effect";
import type { DateTime, Option } from "effect";

import { channelsOfSubject } from "#publishing/domain/approval-subject.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { can } from "#shared/domain/access.ts";
import type { Actor } from "#shared/domain/access.ts";
import type {
  ChannelId,
  PostId,
  UserId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";

/** A post someone asks to send at a time, as the gate is shown it. */
export interface Submission {
  /** The member who wrote it, if a member did. */
  readonly authorId: Option.Option<UserId>;
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
  /**
   * What an approval covers (`approvalSubject`): what the post says and
   * where it goes. It holds the post's text: never log it.
   */
  readonly subject: string;
  readonly timeZone: TimeZoneId;
  readonly workspaceId: WorkspaceId;
}

/** The channels a submitted post goes to, as its subject names them. */
export const channelsSubmitted = (
  submission: Pick<Submission, "subject">
): readonly ChannelId[] => channelsOfSubject(submission.subject);

/**
 * Whether the post gets its job: `admitted`, or `held` until someone
 * approves it.
 */
export type Admission = "admitted" | "held";

/**
 * The workspace's say on which posts go out without anyone approving them.
 * Every use case that schedules a post asks it, in the transaction that
 * saves the post, so no way of scheduling goes around it. The review
 * context backs it with the workspace's approval setting.
 */
export class ApprovalGate extends Context.Service<
  ApprovalGate,
  {
    /**
     * Whether someone without post:schedule may still ask for posts to go
     * out, which then wait for an approval.
     */
    readonly maySubmit: (actor: Actor) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Whether a post the actor asks to send would be held, as `admit`
     * would hold a new one. It records nothing: for a check that makes no
     * post.
     */
    readonly holds: (actor: Actor) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Admits the post, or holds it and records that the actor asks for its
     * approval. A post approved as it now is (`subject`) is admitted.
     */
    readonly admit: (
      actor: Actor,
      submission: Submission
    ) => Effect.Effect<Admission, DatabaseError>;
    /**
     * A held post moved to another time by someone who did not ask for it
     * again, as a reshuffle of its queue moves it: it keeps waiting, under
     * the request it had, which follows its new time. Nobody is asked
     * again to decide, and the post is never admitted this way, whoever
     * moves it.
     */
    readonly follow: (
      actor: Actor,
      submission: Submission
    ) => Effect.Effect<void, DatabaseError>;
    /** Whether an approval stands for the post as it now is. */
    readonly approved: (
      submission: Pick<Submission, "postId" | "subject" | "workspaceId">
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * A post that waited for an approval no longer does, though nobody
     * decided: it was taken back to draft, scheduled by someone who may,
     * or cancelled.
     */
    readonly withdrawn: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * A draft was discarded: nothing said or decided about it is worth
     * keeping.
     */
    readonly forgotten: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/ApprovalGate") {
  /** No approvals: whoever may schedule does, and nobody else asks. */
  static readonly open = Layer.succeed(
    ApprovalGate,
    ApprovalGate.of({
      admit: () => Effect.succeed("admitted"),
      approved: () => Effect.succeed(false),
      follow: () => Effect.void,
      forgotten: () => Effect.void,
      holds: () => Effect.succeed(false),
      maySubmit: (actor) => Effect.succeed(can(actor, "post:schedule")),
      withdrawn: () => Effect.void,
    })
  );
}
