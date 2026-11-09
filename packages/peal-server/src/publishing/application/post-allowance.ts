import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's channel allowance, and the channels it has connected. */
export interface ChannelCount {
  readonly allowed: Allowance;
  readonly connected: number;
}

/** A workspace's member allowance, and the members it has. */
export interface SeatCount {
  readonly allowed: Allowance;
  readonly taken: number;
}

/**
 * How many posts a workspace may have going out in a calendar month (UTC):
 * its plan's allowance, from the billing context, or no limit on a server
 * that does not bill. And how many channels and members it may have,
 * against those it has: a workspace over its plan's channels or members,
 * as after its trial, schedules and publishes nothing until it is back
 * within its plan.
 */
export class PostAllowance extends Context.Service<
  PostAllowance,
  {
    readonly scheduledPerMonth: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Allowance, DatabaseError>;
    readonly channels: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<ChannelCount, DatabaseError>;
    readonly members: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<SeatCount, DatabaseError>;
  }
>()("peal-server/publishing/application/PostAllowance") {}
