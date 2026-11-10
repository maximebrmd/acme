import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { AuditAction } from "#ads/domain/audit-action.ts";
import type { Boost, BoostState } from "#ads/domain/boost.ts";
import type { Committed } from "#ads/domain/commitment.ts";
import type {
  AdAccountId,
  BoostId,
  NetworkObjectId,
  SpendCallId,
} from "#ads/domain/ids.ts";
import type { SpendOutcome, SpendStep } from "#ads/domain/spend-step.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ActorSubject } from "#shared/domain/access.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";

/** A request to the network that changes something, as journalled. */
export interface SpendCall {
  readonly boostId: BoostId;
  readonly finishedAt: Option.Option<DateTime.Utc>;
  readonly id: SpendCallId;
  readonly networkCode: Option.Option<string>;
  readonly objectId: Option.Option<NetworkObjectId>;
  readonly outcome: Option.Option<SpendOutcome>;
  readonly startedAt: DateTime.Utc;
  readonly step: SpendStep;
}

/** A line of the audit trail. */
export interface AuditEntry {
  readonly accountId: Option.Option<AdAccountId>;
  readonly action: AuditAction;
  /** Amounts in minor units, by name: a ceiling, a budget, a commitment. */
  readonly amounts: Readonly<Record<string, number>>;
  readonly at: DateTime.Utc;
  readonly boostId: Option.Option<BoostId>;
  /** Who did it: none for what Peal's jobs found (an end, a failure). */
  readonly by: Option.Option<ActorSubject>;
  readonly currency: Option.Option<string>;
  readonly id: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * The boosts of every workspace, the journal of the requests they sent,
 * and the audit trail. Reads that name a workspace only find its own.
 */
export class BoostStore extends Context.Service<
  BoostStore,
  {
    readonly insert: (boost: Boost) => Effect.Effect<void, DatabaseError>;
    readonly findIn: (
      workspaceId: WorkspaceId,
      boostId: BoostId
    ) => Effect.Effect<Option.Option<Boost>, DatabaseError>;
    readonly get: (
      boostId: BoostId
    ) => Effect.Effect<Option.Option<Boost>, DatabaseError>;
    /** The boost the workspace asked for under this key, if any. */
    readonly byKey: (
      workspaceId: WorkspaceId,
      idempotencyKey: string
    ) => Effect.Effect<Option.Option<Boost>, DatabaseError>;
    /** The workspace's boosts, newest first, of one post when given. */
    readonly list: (
      workspaceId: WorkspaceId,
      filter: {
        readonly before: Option.Option<BoostId>;
        readonly limit: number;
        readonly postId: Option.Option<PostId>;
      }
    ) => Effect.Effect<readonly Boost[], DatabaseError>;
    /**
     * Saves the boost if it still stands where `from` says, and tells
     * whether it did: a change made meanwhile is never overwritten.
     */
    readonly save: (
      boost: Boost,
      from: BoostState["_tag"]
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * What the account's boosts commit against its ceiling over the runs
     * that overlap `from` to `to`, `except` one when given.
     */
    readonly committedOn: (
      accountId: AdAccountId,
      window: { readonly from: DateTime.Utc; readonly to: DateTime.Utc },
      except: Option.Option<BoostId>
    ) => Effect.Effect<readonly Committed[], DatabaseError>;
    /**
     * What the account's boosts that are being made, run or may run still
     * commit, `except` one: what its own spend cap must leave room for.
     */
    readonly outstandingOn: (
      accountId: AdAccountId,
      except: Option.Option<BoostId>
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * How many boosts of the accounts are being made, run, may run or are
     * paused: those whose campaign may run again at the network.
     */
    readonly heldOn: (
      accountIds: readonly AdAccountId[]
    ) => Effect.Effect<number, DatabaseError>;
    /** How many boosts of the accounts are being made, run or may run. */
    readonly openOn: (
      accountIds: readonly AdAccountId[]
    ) => Effect.Effect<number, DatabaseError>;
    /** How many of the workspace's boosts stand in each state. */
    readonly countsByState: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Readonly<Record<string, number>>, DatabaseError>;
    /** At most `limit` boosts whose end date passed and that have not ended. */
    readonly dueToEnd: (
      now: DateTime.Utc,
      limit: number
    ) => Effect.Effect<readonly Boost[], DatabaseError>;
    /** The account's boosts that run, for the sync to compare with spend. */
    readonly runningOn: (
      accountId: AdAccountId
    ) => Effect.Effect<readonly Boost[], DatabaseError>;
    /**
     * Records that a boost used its whole budget; says whether this call
     * was the first to.
     */
    readonly markBudgetReached: (
      boostId: BoostId,
      now: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Journals a request before it leaves, and commits. */
    readonly beginCall: (call: {
      readonly boostId: BoostId;
      readonly id: SpendCallId;
      readonly startedAt: DateTime.Utc;
      readonly step: SpendStep;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<void, DatabaseError>;
    /** Records how a journalled request ended. */
    readonly finishCall: (
      callId: SpendCallId,
      result: {
        readonly finishedAt: DateTime.Utc;
        readonly networkCode: Option.Option<string>;
        readonly objectId: Option.Option<NetworkObjectId>;
        readonly outcome: SpendOutcome;
      }
    ) => Effect.Effect<void, DatabaseError>;
    /** The boost's journal, oldest first. */
    readonly calls: (
      boostId: BoostId
    ) => Effect.Effect<readonly SpendCall[], DatabaseError>;
    readonly audit: (entry: AuditEntry) => Effect.Effect<void, DatabaseError>;
    /** Deletes the audit trail's lines before an instant; says how many. */
    readonly purgeAudit: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /** The workspace's audit trail, newest first. */
    readonly auditTrail: (
      workspaceId: WorkspaceId,
      page: { readonly before: Option.Option<string>; readonly limit: number }
    ) => Effect.Effect<readonly AuditEntry[], DatabaseError>;
  }
>()("peal-server/ads/application/BoostStore") {}
