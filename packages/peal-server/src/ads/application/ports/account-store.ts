import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { AdAccountFacts } from "#ads/domain/ad-account-facts.ts";
import type { AdAccount } from "#ads/domain/ad-account.ts";
import type { AdAccountId, AdGrantId } from "#ads/domain/ids.ts";
import type { SpendAuthorization } from "#ads/domain/spend-authorization.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** An ad account with whether, and how much, it may spend through Peal. */
export interface AuthorizedAccount {
  readonly account: AdAccount;
  readonly authorization: SpendAuthorization;
}

/** Where a listing of the accounts due for a sync starts again. */
export interface SyncCursor {
  readonly accountId: AdAccountId;
  readonly dueAt: DateTime.Utc;
}

/**
 * The ad accounts of every workspace. Reads that name a workspace only
 * find its own accounts, whatever the id.
 */
export class AccountStore extends Context.Service<
  AccountStore,
  {
    readonly list: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly AuthorizedAccount[], DatabaseError>;
    readonly findIn: (
      workspaceId: WorkspaceId,
      accountId: AdAccountId
    ) => Effect.Effect<Option.Option<AuthorizedAccount>, DatabaseError>;
    /** Any workspace's account, for the jobs. */
    readonly get: (
      accountId: AdAccountId
    ) => Effect.Effect<Option.Option<AuthorizedAccount>, DatabaseError>;
    readonly count: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DatabaseError>;
    /**
     * Runs `changing` in a transaction that holds back, until it ends, any
     * other one that connects an account to the workspace: counting them,
     * then adding one, takes turns.
     */
    readonly addingTo: <A, E, R>(
      workspaceId: WorkspaceId,
      changing: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, DatabaseError | E, R>;
    /**
     * Runs `spending` in a transaction that holds back, until it ends, any
     * other one that reserves, releases or re-reads what the account's
     * boosts commit, or changes its ceiling: two boosts asked together
     * are counted one after the other.
     */
    readonly spendingOn: <A, E, R>(
      accountId: AdAccountId,
      spending: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, DatabaseError | E, R>;
    /**
     * Adds an account, with spending off. An account the workspace already
     * connects stays as it is, under its grant, and is answered.
     */
    readonly insert: (
      account: AdAccount
    ) => Effect.Effect<AdAccount, DatabaseError>;
    /** Saves what the network says of the account now. */
    readonly saveFacts: (
      accountId: AdAccountId,
      facts: AdAccountFacts
    ) => Effect.Effect<void, DatabaseError>;
    readonly authorize: (
      accountId: AdAccountId,
      authorization: SpendAuthorization
    ) => Effect.Effect<void, DatabaseError>;
    readonly remove: (
      workspaceId: WorkspaceId,
      accountId: AdAccountId
    ) => Effect.Effect<void, DatabaseError>;
    readonly ofGrant: (
      grantId: AdGrantId
    ) => Effect.Effect<readonly AdAccount[], DatabaseError>;
    /**
     * At most `limit` accounts whose next sync is due by `now`, those that
     * waited longest first, after `after` when given; accounts whose grant
     * needs its person again are left out.
     */
    readonly dueForSync: (
      now: DateTime.Utc,
      limit: number,
      after: Option.Option<SyncCursor>
    ) => Effect.Effect<
      readonly { readonly account: AdAccount; readonly dueAt: DateTime.Utc }[],
      DatabaseError
    >;
    /** Says when the account is next read, and that it was read now if so. */
    readonly scheduleSync: (
      accountId: AdAccountId,
      next: DateTime.Utc,
      syncedAt: Option.Option<DateTime.Utc>
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/ads/application/AccountStore") {}
