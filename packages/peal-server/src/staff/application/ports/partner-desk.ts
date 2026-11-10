import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** A workspace's partner account, as staff read it. */
export interface PartnerAccountSummary {
  readonly createdAt: DateTime.Utc;
  readonly id: string;
  readonly name: string;
  /** How many workspaces it owns. */
  readonly workspaces: number;
}

/** The partner that owns a workspace, as staff read it. */
export interface PartnerOwnerSummary {
  readonly externalId: Option.Option<string>;
  readonly homeWorkspaceId: WorkspaceId;
  readonly partnerId: string;
}

/** Where a workspace stands with partner accounts. */
export interface PartnerPosition {
  /** Its own partner account, when it is one's home workspace. */
  readonly account: Option.Option<PartnerAccountSummary>;
  /** The partner that owns it, when one does. */
  readonly owner: Option.Option<PartnerOwnerSummary>;
}

/**
 * The partner accounts as staff read and grant them, which the workspace
 * context keeps.
 */
export class PartnerDesk extends Context.Service<
  PartnerDesk,
  {
    readonly positionOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<PartnerPosition, DatabaseError>;
    /**
     * Opens a partner account for the workspace, or leaves the one it has.
     * Says whether the workspace could hold one: not one a partner owns,
     * nor one that is gone.
     */
    readonly grant: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/staff/application/PartnerDesk") {}
