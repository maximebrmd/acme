import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { ApprovalPolicy } from "#review/domain/approval-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** The approval policy each workspace chose. */
export class ReviewSettingsStore extends Context.Service<
  ReviewSettingsStore,
  {
    /** What the workspace chose, if it did. */
    readonly policy: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<ApprovalPolicy>, DatabaseError>;
    readonly setPolicy: (change: {
      readonly at: DateTime.Utc;
      readonly by: Option.Option<UserId>;
      readonly policy: ApprovalPolicy;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/review/application/ReviewSettingsStore") {}
