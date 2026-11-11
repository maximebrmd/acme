import { Context, Effect, Layer } from "effect";
import type { DateTime } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** What a workspace requires of its members to reach it. */
export interface SecurityPolicy {
  /** Every member's account has two-step verification on. */
  readonly twoStepRequired: boolean;
}

/** A workspace that never set one requires nothing. */
export const noPolicy: SecurityPolicy = { twoStepRequired: false };

/**
 * Each workspace's security policy: whether its owners require two-step
 * verification of every member. Who changed it is in the workspace's
 * activity log, not here.
 */
export class SecurityPolicies extends Context.Service<
  SecurityPolicies,
  {
    readonly get: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<SecurityPolicy, DatabaseError>;
    /** Those of these workspaces that require two-step verification. */
    readonly requiredAmong: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlySet<WorkspaceId>, DatabaseError>;
    readonly set: (
      workspaceId: WorkspaceId,
      policy: SecurityPolicy,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/workspace/application/SecurityPolicies") {
  /** For tests that need no policy: nothing is required, nothing kept. */
  static readonly none = Layer.succeed(
    SecurityPolicies,
    SecurityPolicies.of({
      get: () => Effect.succeed(noPolicy),
      requiredAmong: () => Effect.succeed(new Set()),
      set: () => Effect.void,
    })
  );
}
