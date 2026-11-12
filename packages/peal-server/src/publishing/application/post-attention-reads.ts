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
  }
>()("peal-server/publishing/application/PostAttentionReads") {}
