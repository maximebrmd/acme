import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

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
     * Whether the actor's workspace holds more than its plan allows, and
     * schedules nothing until it comes back within it: the billing page's
     * standing, one workspace at a time.
     */
    readonly overPlan: (actor: Actor) => Effect.Effect<boolean, DatabaseError>;
    /**
     * The posts with a time in the range, by time then id, after the
     * position: `limit` of them at most.
     */
    readonly agenda: (
      request: AgendaRequest
    ) => Effect.Effect<readonly AgendaEntry[], DatabaseError>;
  }
>()("peal-server/workspace/application/OverviewSources") {}
