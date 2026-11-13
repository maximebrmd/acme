import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type {
  AccountTransfer,
  AccountTransferId,
} from "#billing/domain/account-transfer.ts";
import type {
  BillingAccount,
  BillingAccountId,
} from "#billing/domain/billing-account.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, Uuid7, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The billing accounts, the workspace each one holds, and the offers to
 * hand a workspace to another payer. Writes join the caller's
 * transaction; the holds last until it ends, and hold nothing outside
 * one.
 */
export class BillingAccountStore extends Context.Service<
  BillingAccountStore,
  {
    /** Holds back whoever resolves or changes the person's accounts. */
    readonly holdPayer: (userId: UserId) => Effect.Effect<void, DatabaseError>;
    /** Holds back whoever resolves the partner's account. */
    readonly holdPartner: (
      partnerId: Uuid7
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Holds back whoever counts across the account, or adds or removes
     * one of its workspaces: the pool's hold of a person's account.
     */
    readonly holdAccount: (
      accountId: BillingAccountId
    ) => Effect.Effect<void, DatabaseError>;
    /** The account the workspace belongs to, once written. */
    readonly accountOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<BillingAccount>, DatabaseError>;
    /** The account of each of these workspaces that has one, in one read. */
    readonly accountsIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, BillingAccount>, DatabaseError>;
    readonly get: (
      accountId: BillingAccountId
    ) => Effect.Effect<Option.Option<BillingAccount>, DatabaseError>;
    /** The person's own account, the one that is not standalone. */
    readonly personalOf: (
      userId: UserId
    ) => Effect.Effect<Option.Option<BillingAccount>, DatabaseError>;
    readonly ofPartner: (
      partnerId: Uuid7
    ) => Effect.Effect<Option.Option<BillingAccount>, DatabaseError>;
    /** Every account the person pays for, standalone ones included. */
    readonly paidBy: (
      userId: UserId
    ) => Effect.Effect<readonly BillingAccount[], DatabaseError>;
    readonly create: (
      account: BillingAccount
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes the account, its workspaces gone, with the offers it made. */
    readonly delete: (
      accountId: BillingAccountId
    ) => Effect.Effect<void, DatabaseError>;
    readonly setHolder: (
      accountId: BillingAccountId,
      holder: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    readonly setFreeTier: (
      accountId: BillingAccountId,
      freeTier: boolean
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Puts the workspace in the account, out of any other; `merged` when
     * staff put it there, which keeps it whoever owns it.
     */
    readonly attach: (
      workspaceId: WorkspaceId,
      accountId: BillingAccountId,
      at: DateTime.Utc,
      merged?: boolean
    ) => Effect.Effect<void, DatabaseError>;
    /** Those of these workspaces staff merged into their account. */
    readonly mergedIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlySet<WorkspaceId>, DatabaseError>;
    /** Accounts by id after `after`, `limit` at most. */
    readonly page: (
      after: Option.Option<BillingAccountId>,
      limit: number
    ) => Effect.Effect<readonly BillingAccount[], DatabaseError>;
    /** Deletes the offers that lapsed by `now`; how many. */
    readonly purgeLapsedTransfers: (
      now: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Whether staff required a payment method of the person: by their id,
     * or by the pseudonym of their address, from an account closed before.
     */
    readonly requiresPayment: (
      userId: UserId,
      pseudonym: Option.Option<string>
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Keeps the requirement, by the person's id. */
    readonly requirePayment: (
      userId: UserId,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Gives the free tier back: forgets the requirement, by id and address. */
    readonly releasePayment: (
      userId: UserId,
      pseudonym: Option.Option<string>
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Closing the account: the requirement is kept by the pseudonym of its
     * address alone, without the user, from `at`.
     */
    readonly rememberPayment: (
      userId: UserId,
      pseudonym: string,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes requirements forgotten before `before`; how many. */
    readonly purgePayments: (
      before: DateTime.Utc
    ) => Effect.Effect<number, DatabaseError>;
    readonly detach: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** The account's workspaces, by id. */
    readonly workspacesOf: (
      accountId: BillingAccountId
    ) => Effect.Effect<readonly WorkspaceId[], DatabaseError>;
    /** The workspaces of each of these accounts, in one read. */
    readonly workspacesOfEach: (
      accountIds: readonly BillingAccountId[]
    ) => Effect.Effect<
      ReadonlyMap<BillingAccountId, readonly WorkspaceId[]>,
      DatabaseError
    >;
    /** Keeps the offer, replacing an earlier one for the workspace. */
    readonly offer: (
      transfer: AccountTransfer
    ) => Effect.Effect<void, DatabaseError>;
    /** The offer open for the workspace, expired or not. */
    readonly transferOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<AccountTransfer>, DatabaseError>;
    readonly deleteTransfer: (
      transferId: AccountTransferId
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes the offers made for the workspace. */
    readonly deleteTransfersOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** Deletes the offers the person made or was made. */
    readonly deleteTransfersFor: (
      userId: UserId
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/BillingAccountStore") {}
