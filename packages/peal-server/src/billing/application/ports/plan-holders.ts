import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Whose plan a workspace is on, and whether that billing account keeps its
 * free tier (false once staff required a payment method).
 */
export interface HeldPlan {
  readonly freeTier: boolean;
  readonly holder: WorkspaceId;
}

interface Holders {
  readonly holderOf: (
    workspaceId: WorkspaceId
  ) => Effect.Effect<WorkspaceId, DatabaseError>;
  /** Whose plan each of these workspaces is on, every one of them. */
  readonly holdersOf: (
    workspaceIds: readonly WorkspaceId[]
  ) => Effect.Effect<ReadonlyMap<WorkspaceId, WorkspaceId>, DatabaseError>;
}

/**
 * Whose plan a workspace is on: its billing account's billing workspace,
 * a partner's home workspace for the workspaces the partner owns, or its
 * own; and the account's free tier, in the same reads.
 */
export class PlanHolders extends Context.Service<
  PlanHolders,
  Holders & {
    readonly heldBy: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<HeldPlan, DatabaseError>;
    /** `heldBy`, for each of these workspaces, every one of them. */
    readonly heldByEach: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, HeldPlan>, DatabaseError>;
  }
>()("peal-server/billing/application/PlanHolders") {
  /** Holders whose accounts all keep their free tier, for tests. */
  static readonly ofHolders = ({ holderOf, holdersOf }: Holders) =>
    PlanHolders.of({
      heldBy: (workspaceId) =>
        holderOf(workspaceId).pipe(
          Effect.map((holder) => ({ freeTier: true, holder }))
        ),
      heldByEach: (workspaceIds) =>
        holdersOf(workspaceIds).pipe(
          Effect.map(
            (held) =>
              new Map(
                [...held].map(([id, holder]) => [
                  id,
                  { freeTier: true, holder },
                ])
              )
          )
        ),
      holderOf,
      holdersOf,
    });

  /** For tests without partners: every workspace holds its own plan. */
  static readonly layerOwn = Layer.succeed(
    PlanHolders,
    PlanHolders.ofHolders({
      holderOf: (workspaceId) => Effect.succeed(workspaceId),
      holdersOf: (workspaceIds) =>
        Effect.succeed(new Map(workspaceIds.map((id) => [id, id]))),
    })
  );
}
