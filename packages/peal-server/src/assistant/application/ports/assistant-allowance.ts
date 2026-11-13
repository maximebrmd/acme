import { Context } from "effect";
import type { Effect } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * How many requests a workspace may send the assistant each day: its
 * plan's allowance on a server that bills, across its billing account,
 * otherwise the server's setting, the same for every workspace alone.
 */
export class AssistantAllowance extends Context.Service<
  AssistantAllowance,
  {
    readonly dailyRequests: (workspaceId: WorkspaceId) => Effect.Effect<number>;
    /**
     * How many of those images may take: as many, but on a plan in its
     * trial (`imageRequestsOnTrial`).
     */
    readonly imageRequests: (workspaceId: WorkspaceId) => Effect.Effect<number>;
    /**
     * Whether the workspace's requests of the server's models are metered
     * per billing account and month (`MeteredUsage`) instead of the day's
     * limit: on a server that bills, for the free tier and per-account
     * pricing; a legacy plan keeps its plan's day until it moves. The
     * day's count is still kept when metered, unbounded, for the usage
     * ledger's snapshot.
     */
    readonly metered: (workspaceId: WorkspaceId) => Effect.Effect<boolean>;
    /**
     * Whether workspaces share a day at all: on a server that bills. When
     * not, a claim is one statement, and neither read below is made.
     */
    readonly pooled: boolean;
    /**
     * The other workspaces whose requests count with the workspace's
     * against the day's limit: its billing account's, on a server that
     * bills; none elsewhere. In a transaction, the pool stays held until
     * it ends (`AssistantUsage.claim`).
     */
    readonly sharedWith: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WorkspaceId[]>;
    /** The same, holding nothing: for reports of the day. */
    readonly sharingWith: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<readonly WorkspaceId[]>;
  }
>()("peal-server/assistant/application/AssistantAllowance") {}
