import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { UtcDay } from "#analytics/domain/account-metrics.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type {
  AccountDayRow,
  ChannelCounts,
  FollowedChannel,
} from "./analytics-reports.ts";

/** A row of several workspaces' reads, with the workspace it is of. */
export type OfWorkspace<A> = A & { readonly workspaceId: WorkspaceId };

/**
 * What the report across workspaces reads, every workspace's id in one
 * parameter: the same rows as a workspace's dashboard reads
 * (`AnalyticsReports.counts`, `channels`, `accountDays`), for several
 * workspaces in one query each.
 */
export class AnalyticsAcrossReads extends Context.Service<
  AnalyticsAcrossReads,
  {
    /** The posts published in a span, by workspace and channel. */
    readonly counts: (
      workspaceIds: readonly WorkspaceId[],
      start: DateTime.Utc,
      end: DateTime.Utc
    ) => Effect.Effect<readonly OfWorkspace<ChannelCounts>[], DatabaseError>;
    /** The channels analytics follows, with their platforms. */
    readonly channels: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<readonly OfWorkspace<FollowedChannel>[], DatabaseError>;
    /**
     * The accounts' days over a span, and before them each channel's last
     * day with followers, as `AnalyticsReports.accountDays` reads them.
     */
    readonly accountDays: (
      workspaceIds: readonly WorkspaceId[],
      from: UtcDay,
      to: UtcDay
    ) => Effect.Effect<readonly OfWorkspace<AccountDayRow>[], DatabaseError>;
  }
>()("peal-server/analytics/application/AnalyticsAcrossReads") {}
