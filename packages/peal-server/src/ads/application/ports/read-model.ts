import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { AccountSnapshot } from "#ads/domain/account-snapshot.ts";
import type { AdAccount } from "#ads/domain/ad-account.ts";
import type {
  AdObjectStatus,
  CampaignObjective,
} from "#ads/domain/ad-object.ts";
import type { AdAccountId, NetworkObjectId } from "#ads/domain/ids.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, PostTargetId, WorkspaceId } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

/** What some ads did over some days, summed. */
export interface PaidTotals {
  readonly clicks: number;
  readonly impressions: number;
  /** The sum of each day's reach: people seen on several days count each day. */
  readonly reach: number;
  /** None when no day reported any. */
  readonly results: Option.Option<number>;
  /** In the account's minor units. */
  readonly spend: number;
}

/** A campaign as last read, with what its ads did over a range of days. */
export interface CampaignRow {
  readonly accountId: AdAccountId;
  readonly dailyBudget: Option.Option<number>;
  readonly endsAt: Option.Option<DateTime.Utc>;
  readonly externalId: NetworkObjectId;
  readonly name: string;
  readonly objective: CampaignObjective;
  readonly rawStatus: string;
  readonly startsAt: Option.Option<DateTime.Utc>;
  readonly status: AdObjectStatus;
  readonly syncedAt: DateTime.Utc;
  readonly totalBudget: Option.Option<number>;
  readonly totals: PaidTotals;
}

/** An ad as last read, with what it did over a range of days. */
export interface AdRow {
  readonly accountId: AdAccountId;
  readonly adSetExternalId: NetworkObjectId;
  readonly campaignExternalId: NetworkObjectId;
  readonly externalId: NetworkObjectId;
  readonly name: string;
  /** The workspace's own post the ad promotes, when it is one. */
  readonly postId: Option.Option<PostId>;
  readonly rawStatus: string;
  readonly status: AdObjectStatus;
  readonly targetId: Option.Option<PostTargetId>;
  readonly totals: PaidTotals;
}

/** What an account's ads did on one day, summed. */
export interface DayTotals extends PaidTotals {
  readonly day: LocalDate;
}

/** The days a report covers, on the account's calendar, both included. */
export interface DayRange {
  readonly from: LocalDate;
  readonly to: LocalDate;
}

/**
 * The campaigns, ad sets, ads and daily numbers read from the networks:
 * ids, names, statuses, budgets and counts, never who saw an ad.
 */
export class ReadModel extends Context.Service<
  ReadModel,
  {
    /**
     * Saves what a sync read of an account, in one transaction: objects
     * are added or updated, days replaced. With `complete`, the objects
     * the network no longer lists are marked archived. `matched` names the
     * workspace's own posts the ads promote, by the platform's id.
     */
    readonly save: (request: {
      readonly account: AdAccount;
      readonly complete: boolean;
      readonly matched: ReadonlyMap<
        string,
        { readonly postId: PostId; readonly targetId: PostTargetId }
      >;
      readonly now: DateTime.Utc;
      readonly snapshot: AccountSnapshot;
    }) => Effect.Effect<void, DatabaseError>;
    /** An account's campaigns, the most recently started first. */
    readonly campaigns: (
      workspaceId: WorkspaceId,
      accountId: AdAccountId,
      range: DayRange
    ) => Effect.Effect<readonly CampaignRow[], DatabaseError>;
    /** A campaign's ads. */
    readonly ads: (
      workspaceId: WorkspaceId,
      accountId: AdAccountId,
      campaignExternalId: Option.Option<string>,
      range: DayRange
    ) => Effect.Effect<readonly AdRow[], DatabaseError>;
    /** What an account's ads did each day of a range, oldest first. */
    readonly days: (
      workspaceId: WorkspaceId,
      accountId: AdAccountId,
      range: DayRange
    ) => Effect.Effect<readonly DayTotals[], DatabaseError>;
    /**
     * The ads that promote a post of the workspace, with all they did:
     * one entry per account, as amounts of different currencies never add.
     */
    readonly ofPost: (
      workspaceId: WorkspaceId,
      postId: PostId
    ) => Effect.Effect<
      readonly {
        readonly accountId: AdAccountId;
        readonly ads: number;
        readonly targetId: Option.Option<PostTargetId>;
        readonly totals: PaidTotals;
      }[],
      DatabaseError
    >;
    /** What one ad spent in all, in minor units. */
    readonly spentBy: (
      accountId: AdAccountId,
      adExternalId: NetworkObjectId
    ) => Effect.Effect<number, DatabaseError>;
    /** Deletes the days before a date, and says how many rows went. */
    readonly purgeDaysBefore: (
      day: LocalDate
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/ads/application/ReadModel") {}
