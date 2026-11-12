import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

/**
 * A workspace's posts that need someone: those going out in the next 7
 * days, those waiting for an approval, and those that finished in the last
 * 7 days with a channel that failed (`failed` and `partiallyPublished`, as
 * the posts' `outcome` filter names them) or one that may have it live
 * and must be checked (`unconfirmed`).
 */
export interface PostAttention {
  readonly awaitingApproval: number;
  readonly failedLast7Days: number;
  readonly scheduledNext7Days: number;
  readonly unconfirmedLast7Days: number;
}

/** A workspace's channels: how many, how many to reconnect, how many off. */
export interface ChannelStates {
  readonly connected: number;
  readonly off: number;
  readonly toReconnect: number;
}

/** Where a post stands, of those with a time that the agenda lists. */
export type AgendaStatus =
  | "awaitingApproval"
  | "finished"
  | "publishing"
  | "scheduled";

/** Where a page of the agenda ended: its last post's time and id. */
export interface AgendaPosition {
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
}

/** One post of the agenda, light: never more of its text than an excerpt. */
export interface AgendaEntry {
  /** The start of its text, as its page shows it. */
  readonly excerpt: string;
  /** Those of its channels the workspace still has, once each. */
  readonly platforms: readonly Platform[];
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
  readonly status: AgendaStatus;
  readonly timeZone: string;
  readonly workspaceId: WorkspaceId;
}

/** Which posts a page of the agenda holds. */
export interface AgendaRequest {
  readonly after: Option.Option<AgendaPosition>;
  /** Included. */
  readonly from: DateTime.Utc;
  readonly limit: number;
  /** Excluded. */
  readonly to: DateTime.Utc;
  readonly workspaceIds: readonly WorkspaceId[];
}

/**
 * The latest counts of a range's posts, added up, as a workspace's
 * dashboard gives them: none where no platform of the workspace gives a
 * count, never zero.
 */
export interface ReportTotals {
  readonly clicks: Option.Option<number>;
  readonly engagement: number;
  readonly impressions: Option.Option<number>;
  readonly likes: number;
  readonly posts: number;
  readonly quotes: Option.Option<number>;
  readonly reach: Option.Option<number>;
  readonly replies: number;
  readonly reposts: number;
  readonly saves: Option.Option<number>;
}

/** Followers at the end of a range, and their change over it. */
export interface ReportFollowers {
  readonly current: Option.Option<number>;
  readonly gained: Option.Option<number>;
}

/** A workspace's range beside the one before, as its dashboard answers it. */
export interface ReportFigures {
  readonly followers: ReportFollowers;
  readonly previousFollowers: ReportFollowers;
  /** Whether the range before is still all kept by every platform. */
  readonly previousKept: boolean;
  readonly previousTotals: ReportTotals;
  readonly totals: ReportTotals;
}

/** The days of a report, both included. */
export interface ReportDays {
  readonly from: LocalDate;
  readonly to: LocalDate;
}

/** The last `days` ending today in `timeZone`. */
export interface ReportAsked {
  readonly days: 7 | 30 | 90;
  readonly timeZone: TimeZoneId;
}

/** A report's range, the one before, and the workspaces' figures. */
export interface ReportAnswer {
  readonly previous: ReportDays;
  readonly range: ReportDays;
  readonly workspaces: ReadonlyMap<WorkspaceId, ReportFigures>;
}

/**
 * What the overview reads of the other contexts, a set of workspaces at a
 * time: one read each, which answers a map by workspace and leaves out a
 * workspace with nothing. None checks a permission: the overview decided
 * which workspaces to name, through `ResolveMember`, and passes only
 * those whose members may read each.
 */
export class OverviewSources extends Context.Service<
  OverviewSources,
  {
    readonly posts: (
      workspaceIds: readonly WorkspaceId[],
      now: DateTime.Utc
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, PostAttention>, DatabaseError>;
    readonly channels: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, ChannelStates>, DatabaseError>;
    /** The threads with a comment waiting for an answer, by workspace. */
    readonly unanswered: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, number>, DatabaseError>;
    /**
     * Those of these workspaces that hold more than their plan allows, and
     * schedule nothing until they come back within it: the billing page's
     * standing (`mustReduce`), every member's to read.
     */
    readonly overPlan: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlySet<WorkspaceId>, DatabaseError>;
    /**
     * The posts with a time in the range, by time then id, after the
     * position: `limit` of them at most.
     */
    readonly agenda: (
      request: AgendaRequest
    ) => Effect.Effect<readonly AgendaEntry[], DatabaseError>;
    /**
     * The workspaces of these actors over the same range, each beside the
     * range before, as its own dashboard answers them; the range alone
     * when there is no actor. Each actor may read its analytics.
     */
    readonly report: (
      actors: readonly Actor[],
      asked: ReportAsked
    ) => Effect.Effect<ReportAnswer, DatabaseError>;
  }
>()("peal-server/workspace/application/OverviewSources") {}
