import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's API rate limit, as staff read it. */
export interface StaffRequestLimit {
  /** Whether this server bills: else the setting is everyone's. */
  readonly bills: boolean;
  /** Whether its billing account pays. */
  readonly paying: boolean;
  /** The policy its keys send under now: default, free or override. */
  readonly policy: "default" | "free" | "override";
  readonly requestsPerMinute: number;
  /** What staff set for it, if they did. */
  readonly override: Option.Option<{
    readonly requestsPerMinute: number;
    readonly setAt: DateTime.Utc;
  }>;
}

/** The API's rate limit of each workspace, for staff: the activity context's. */
export class RequestLimitDesk extends Context.Service<
  RequestLimitDesk,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<StaffRequestLimit, DatabaseError>;
    /**
     * Sets the workspace's own limit, or removes it with none; on a server
     * that does not bill, says so with none and changes nothing.
     */
    readonly set: (
      workspaceId: WorkspaceId,
      requestsPerMinute: Option.Option<number>
    ) => Effect.Effect<Option.Option<StaffRequestLimit>, DatabaseError>;
  }
>()("peal-server/staff/application/ports/RequestLimitDesk") {}
