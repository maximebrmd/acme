import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { PostTargetId } from "#publishing/domain/post-target-id.ts";
import type {
  AttemptOutcome,
  PublicationDecision,
} from "#publishing/domain/publication-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/** A publishing call about to be made, as the journal records it. */
export interface PublishCall {
  readonly attempt: number;
  readonly idempotencyKey: string;
  readonly round: number;
  readonly startedAt: DateTime.Utc;
  readonly targetId: PostTargetId;
}

/** What the journal knew of a call when it was about to be made. */
export type CallStart =
  // No run made it yet: make it.
  | { readonly _tag: "started" }
  // A run began it and never wrote how it ended: it may have gone out.
  | { readonly _tag: "inFlight"; readonly startedAt: DateTime.Utc }
  // A run made it and wrote how it ended.
  | {
      readonly _tag: "completed";
      readonly finishedAt: DateTime.Utc;
      readonly outcome: AttemptOutcome;
    };

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
    readonly finish: (
      idempotencyKey: string,
      outcome: AttemptOutcome,
      finishedAt: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Records an attempt. Recording one again leaves the first record. */
    readonly recordAttempt: (
      attempt: AttemptRecord
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("acme-server/publishing/application/PublicationJournal") {}
