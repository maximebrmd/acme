import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  AnalyticsRecord,
  AuthoredPostRecord,
  BillingRecord,
  ChannelRecord,
  ContractsRecord,
  IdentificationRecord,
  LegalHoldRecord,
  MediaRecord,
  NoticeRecord,
  PostRecord,
  PreferencesRecord,
  ReviewRecord,
  StaffActionRecord,
  UsageRecord,
  UserReviewRecord,
} from "#shared/application/personal-data.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import type { BillingUnavailable } from "./billing-unavailable.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";
import type { WorkspaceFilesRemain } from "./workspace-files-remain.ts";
import type { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/** How erasing a workspace treats a subscription Stripe may still bill. */
export interface WorkspaceErasureOptions {
  /**
   * Cancel it at Stripe, at once, as the person deleting agreed to;
   * otherwise the erasure is refused (`WorkspaceSubscribed`).
   */
  readonly cancelSubscriptions: boolean;
}

/** What erasing workspaces ended outside Peal. */
export interface ErasedWorkspace {
  /** The subscriptions cancelled at Stripe. */
  readonly subscriptionsCancelled: number;
}

/** What the other contexts keep in a workspace. */
export interface WorkspaceContent {
  readonly analytics: readonly AnalyticsRecord[];
  readonly assistantUsage: readonly UsageRecord[];
  readonly billing: BillingRecord;
  readonly channels: readonly ChannelRecord[];
  readonly media: readonly MediaRecord[];
  readonly posts: readonly PostRecord[];
  /** Its approval policy, review links, comments and approvals. */
  readonly review: ReviewRecord;
}

/** What the other contexts keep about a user, wherever they are a member. */
export interface UserContent {
  /** The orders and withdrawals they made. */
  readonly contracts: ContractsRecord;
  /**
   * What the law has Peal keep beyond the account: the connections that
   * made content, and what closing it leaves; null on a server that keeps
   * nothing for the law.
   */
  readonly legalHold: LegalHoldRecord | null;
  readonly notices: readonly NoticeRecord[];
  readonly preferences: PreferencesRecord;
  /** What they wrote and decided in the reviews of posts. */
  readonly review: UserReviewRecord;
  /** What staff did to their account, from the audit log. */
  readonly staffActions: readonly StaffActionRecord[];
}

/**
 * The data the other contexts keep about workspaces and users: channels,
 * posts and their authors, media, analytics, assistant usage, billing,
 * notices and preferences, the staff audit log, and what the law has Peal
 * keep (`#legal`). Erasures run in the caller's transaction, except the media
 * files, which the store holds outside the database: remove them once the
 * rest is committed.
 */
export class ContextRecords extends Context.Service<
  ContextRecords,
  {
    readonly exportWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<WorkspaceContent, DatabaseError>;
    readonly exportUser: (
      userId: UserId
    ) => Effect.Effect<UserContent, DatabaseError>;
    /** The posts the user wrote in these workspaces, oldest first. */
    readonly exportAuthoredPosts: (
      userId: UserId,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<readonly AuthoredPostRecord[], DatabaseError>;
    /**
     * What erasing these workspaces does outside the database, which
     * cannot be undone, so it runs before the erasure's transaction:
     * refused while one of their posts is being published, while Stripe
     * may still bill one of them and `options` does not say to cancel (with
     * every subscription that would be cancelled), and while Stripe cannot
     * be reached; then their open checkouts are expired at Stripe and, when
     * `options` says to, the subscriptions that may still bill them
     * cancelled. Says how many were cancelled.
     */
    readonly settleWorkspaces: (
      workspaceIds: readonly WorkspaceId[],
      options: WorkspaceErasureOptions
    ) => Effect.Effect<
      ErasedWorkspace,
      BillingUnavailable | DatabaseError | WorkspaceBusy | WorkspaceSubscribed
    >;
    /**
     * Deletes everything of the workspace, once settled, stopping its
     * scheduled posts. Refused, before anything is deleted, while one of
     * its posts is being published, while Stripe still bills it, as a
     * checkout completed since settling would, and while Stripe cannot be
     * reached.
     */
    readonly eraseWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<
      void,
      BillingUnavailable | DatabaseError | WorkspaceBusy | WorkspaceSubscribed
    >;
    /**
     * Deletes the user's notices and preferences, and the connections they
     * have in progress, and forgets them as the author of posts in the
     * workspaces that remain, and as the account staff acted on in the
     * audit log; what is kept beyond the account (a ban's reason, the
     * trial it had) is kept by a keyed pseudonym of `email`.
     */
    readonly eraseUser: (
      userId: UserId,
      email: string
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Keeps who held an account that closes, apart from everything else,
     * as the law requires of a host (loi n° 2004-575, art. 6, V, A; décret
     * n° 2021-1362): 5 years, the name and address; 1 year, how they
     * signed in and the references of their payments. Runs in the
     * caller's transaction, so no account closes without it.
     */
    readonly holdIdentification: (
      record: IdentificationRecord
    ) => Effect.Effect<void, DatabaseError>;
    readonly removeWorkspaceFiles: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, WorkspaceFilesRemain>;
  }
>()("peal-server/workspace/application/ContextRecords") {}
