import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** What a workspace holds as a day ends, and what it did that day. */
export interface WorkspaceDayState {
  /** The requests it sent the writing assistant that day (UTC). */
  readonly assistantRequests: number;
  /** The channels it connected itself, as they stand now. */
  readonly channels: number;
  /** The bytes of media it stores now, uploads in progress included. */
  readonly mediaStorage: number;
  readonly members: number;
  readonly workspaceId: WorkspaceId;
}

/** A page of workspaces to snapshot, in the order of their ids. */
export interface UsageStatesRequest {
  /** The last workspace of the page before; none for the first page. */
  readonly after: Option.Option<WorkspaceId>;
  /** Only the workspaces created before this instant. */
  readonly createdBefore: DateTime.Utc;
  /** The day (UTC, its first instant) whose assistant requests count. */
  readonly day: DateTime.Utc;
  readonly limit: number;
}

/**
 * What every workspace holds now, a page at a time, counted by the context
 * that holds each thing, one query a page each: for the daily snapshot of
 * the usage ledger.
 */
export class UsageStates extends Context.Service<
  UsageStates,
  {
    readonly page: (
      request: UsageStatesRequest
    ) => Effect.Effect<readonly WorkspaceDayState[], DatabaseError>;
  }
>()("peal-server/billing/application/UsageStates") {}
