import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * A workspace's posts that need someone, counted: going out in the next 7
 * days, waiting for an approval, and finished in the last 7 days with a
 * channel that failed (the outcomes `failed` and `partiallyPublished`) or
 * one that may have it live and must be checked (`unconfirmed`).
 */
export interface AttentionCounts {
  readonly awaitingApproval: number;
  readonly failedLast7Days: number;
  readonly scheduledNext7Days: number;
  readonly unconfirmedLast7Days: number;
}

/** The statuses of the posts with a time that go out, or went out. */
export type AgendaStatus =
  | "awaitingApproval"
  | "finished"
  | "publishing"
  | "scheduled";

/** One post with a time, as an agenda across workspaces lists it. */
export interface AgendaPost {
  readonly channelIds: readonly ChannelId[];
  /** The start of its text (`excerptOf`). */
  readonly excerpt: string;
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
  readonly status: AgendaStatus;
  readonly timeZone: string;
  readonly workspaceId: WorkspaceId;
}

/** Which posts a page of an agenda across workspaces holds. */
export interface AgendaPageRequest {
  readonly after: Option.Option<{
    readonly postId: PostId;
    readonly scheduledAt: DateTime.Utc;
  }>;
  /** Included. */
  readonly from: DateTime.Utc;
  readonly limit: number;
  /** Excluded. */
  readonly to: DateTime.Utc;
  readonly workspaceIds: readonly WorkspaceId[];
}

/** An agenda's post as stored, its text cut short in the query. */
export type StoredAgendaPost = Omit<AgendaPost, "excerpt"> & {
  readonly textStart: string;
};

/** The instants that bound what the counts read. */
export interface AttentionWindow {
  /** Finished from then, included. */
  readonly finishedFrom: DateTime.Utc;
  /** Scheduled from then, included. */
  readonly scheduledFrom: DateTime.Utc;
  /** Scheduled before then. */
  readonly scheduledTo: DateTime.Utc;
}

/**
 * A workspace's week, by the time each post had: those that went out in
 * the week (`published` and `partiallyPublished`), those that failed on
 * every channel (`failed`) or must be checked (`unconfirmed`), and in the
 * week after it those scheduled and those waiting for an approval.
 */
export interface WeekCounts {
  readonly awaitingApproval: number;
  readonly failed: number;
  readonly scheduled: number;
  readonly unconfirmed: number;
  readonly wentOut: number;
}

/** One post of a week, by its time. */
export interface WeekPost {
  /** The start of its text (`excerptOf`). */
  readonly excerpt: string;
  readonly postId: PostId;
  readonly scheduledAt: DateTime.Utc;
}

/** A week's post as stored, its text cut short in the query. */
export type StoredWeekPost = Omit<WeekPost, "excerpt"> & {
  readonly textStart: string;
};

/**
 * The instants that bound a week and the week after it, and how many
 * posts of each to list.
 */
export interface WeekWindow {
  /** The week from then, included. */
  readonly from: DateTime.Utc;
  /** The most posts listed of each week. */
  readonly listed: number;
  /** The end of the week, excluded: the start of the week after it. */
  readonly to: DateTime.Utc;
  /** The end of the week after it, excluded. */
  readonly until: DateTime.Utc;
}

/** A workspace's week: counted, and the first posts of each listed. */
export interface WorkspaceWeek<Post> {
  readonly counts: WeekCounts;
  /** The first of those going out in the week after, by time. */
  readonly planned: readonly Post[];
  /** The first of those that went out in the week, by time. */
  readonly wentOut: readonly Post[];
}

/** The queries behind `PostAttention`, every workspace's ids as one array. */
export class PostAttentionReads extends Context.Service<
  PostAttentionReads,
  {
    readonly countsIn: (
      workspaceIds: readonly WorkspaceId[],
      window: AttentionWindow
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, AttentionCounts>,
      DatabaseError
    >;
    readonly agenda: (
      request: AgendaPageRequest
    ) => Effect.Effect<readonly StoredAgendaPost[], DatabaseError>;
    readonly week: (
      workspaceId: WorkspaceId,
      window: WeekWindow
    ) => Effect.Effect<WorkspaceWeek<StoredWeekPost>, DatabaseError>;
  }
>()("peal-server/publishing/application/PostAttentionReads") {}
