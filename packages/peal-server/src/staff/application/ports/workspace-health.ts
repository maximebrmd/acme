import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ChannelId,
  PostId,
  PostTargetId,
  WorkspaceId,
} from "#shared/domain/ids.ts";
import type { PaidPlan, Plan } from "#shared/domain/plan.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** The subscription that buys a workspace its plan, as Stripe last told. */
export interface StaffSubscription {
  readonly cancelAtPeriodEnd: boolean;
  readonly currentPeriodEnd: Option.Option<DateTime.Utc>;
  readonly interval: "month" | "year";
  readonly plan: PaidPlan;
  readonly startedAt: Option.Option<DateTime.Utc>;
  readonly status: string;
  readonly trialEnd: Option.Option<DateTime.Utc>;
}

/** A workspace's plan; none on a server that does not bill. */
export interface WorkspaceBilling {
  readonly plan: Option.Option<Plan>;
  readonly subscription: Option.Option<StaffSubscription>;
}

/** Whether a channel posts, as the channels context has it. */
export type ChannelState =
  | { readonly _tag: "active" }
  | { readonly _tag: "refreshNeeded" }
  | { readonly _tag: "disabled"; readonly refreshNeeded: boolean };

/** A channel and how it is doing, without its tokens. */
export interface ChannelHealth {
  readonly handle: string;
  readonly id: ChannelId;
  readonly platform: Platform;
  readonly status: ChannelState;
  readonly tokenExpiresAt: Option.Option<DateTime.Utc>;
  readonly workspaceId: WorkspaceId;
}

/** How many of a workspace's posts are in each status. */
export interface PostCounts {
  readonly awaitingApproval: number;
  readonly cancelled: number;
  readonly draft: number;
  readonly finished: number;
  readonly publishing: number;
  readonly scheduled: number;
}

/** A post that failed on a channel, or may have gone out unconfirmed. */
export interface PostTrouble {
  readonly at: DateTime.Utc;
  readonly channelId: ChannelId;
  readonly code: Option.Option<string>;
  readonly postId: PostId;
  /** Publishing's reason, which the contract lists. */
  readonly reason: string;
  readonly status: "failed" | "unconfirmed";
  readonly targetId: PostTargetId;
}

/** What the console shows of a workspace besides its people. */
export class WorkspaceHealth extends Context.Service<
  WorkspaceHealth,
  {
    readonly billing: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<WorkspaceBilling, DatabaseError>;
    readonly channels: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly ChannelHealth[], DatabaseError>;
    readonly posts: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<PostCounts, DatabaseError>;
    /** The latest troubles, newest first. */
    readonly troubles: (
      workspaceId: WorkspaceId,
      limit: number
    ) => Effect.Effect<readonly PostTrouble[], DatabaseError>;
  }
>()("peal-server/staff/application/WorkspaceHealth") {}
