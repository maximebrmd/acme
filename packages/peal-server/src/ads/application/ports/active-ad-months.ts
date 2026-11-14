import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The ads a sync saw delivering or in review each calendar month (UTC),
 * by workspace: what the billing account's managed ads meter counts, one
 * each a month.
 */
export class ActiveAdMonths extends Context.Service<
  ActiveAdMonths,
  {
    /** Those of `adExternalIds` not counted yet in the month. */
    readonly unseen: (
      workspaceId: WorkspaceId,
      month: DateTime.Utc,
      adExternalIds: readonly string[]
    ) => Effect.Effect<readonly string[], DatabaseError>;
    /**
     * Counts the ad in the month, unless it was: whether this did, in the
     * caller's transaction.
     */
    readonly record: (
      workspaceId: WorkspaceId,
      month: DateTime.Utc,
      adExternalId: string
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/ads/application/ActiveAdMonths") {}
