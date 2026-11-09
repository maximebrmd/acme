import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type {
  AttemptOutcome,
  EarlierRefusals,
  PublicationDecision,
} from "#publishing/domain/publication-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/** Which call: one attempt at a target, in one round. */
export interface CallId {
  readonly attempt: number;
  readonly round: number;
  readonly targetId: PostTargetId;
}

/** A publishing call about to be made, as the journal records it. */
export interface PublishCall extends CallId {
  readonly idempotencyKey: string;
  readonly startedAt: DateTime.Utc;
}

/** A call that some run began, and how far it got. */
export type BegunCall =
  // A run began it and never wrote how it ended: it may have gone out.
  | { readonly _tag: "inFlight"; readonly startedAt: DateTime.Utc }
  // A run made it and wrote how it ended.
  | {
      readonly _tag: "completed";
      readonly finishedAt: DateTime.Utc;
      readonly outcome: AttemptOutcome;
      readonly startedAt: DateTime.Utc;
    };

/** What the journal knew of a call when it was about to be made. */
export type CallStart =
  // No run made it yet: make it.
  { readonly _tag: "started" } | BegunCall;

/** One attempt at publishing a target, once decided. */
export interface AttemptRecord {
  readonly attempt: number;
  readonly decision: PublicationDecision;
  readonly finishedAt: DateTime.Utc;
  readonly outcome: AttemptOutcome;
  readonly round: number;
  readonly startedAt: DateTime.Utc;
  readonly targetId: PostTargetId;
}

/**
 * The record of every publishing call and attempt.
 *
 * A run writes the call down, and commits, before sending anything. A run
 * that finds the call already begun but not ended knows an earlier run may
 * have sent it, so it does not send it again: that is what makes a retried
 * job publish at most once.
 */
export class PublicationJournal extends Context.Service<
  PublicationJournal,
  {
    readonly begin: (
      call: PublishCall
    ) => Effect.Effect<CallStart, DatabaseError>;
    /** The call, if a run began it. */
    readonly find: (
      call: CallId
    ) => Effect.Effect<Option.Option<BegunCall>, DatabaseError>;
    readonly finish: (
      idempotencyKey: string,
      outcome: AttemptOutcome,
      finishedAt: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * How the attempts recorded before this call's, in its round, were
     * refused.
     */
    readonly earlierRefusals: (
      call: CallId
    ) => Effect.Effect<EarlierRefusals, DatabaseError>;
    /** Records an attempt. Recording one again leaves the first record. */
    readonly recordAttempt: (
      attempt: AttemptRecord
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/publishing/application/PublicationJournal") {}
