import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Entitlements } from "#billing/domain/entitlements.ts";
import type { InvalidUsageRange } from "#billing/domain/invalid-usage-range.ts";
import type { MeteredPostCount } from "#billing/domain/metered-posts.ts";
import { reportOf, usagePeriodOf } from "#billing/domain/usage-meter.ts";
import type { UsagePeriod, UsageReport } from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { MeteredPostLedger } from "./ports/metered-post-ledger.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import { UsageLedger } from "./ports/usage-ledger.ts";
import { WorkspaceUsage } from "./ports/workspace-usage.ts";
import type { Usage } from "./ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "./workspace-entitlements.ts";

/** The days asked for, each a day's first instant (UTC), or none. */
export interface UsageRangeAsked {
  readonly from: Option.Option<DateTime.Utc>;
  readonly to: Option.Option<DateTime.Utc>;
}

/** A workspace's usage against its plan, now and over a period. */
export interface WorkspaceUsageReport {
  readonly current: Usage;
  /** Its plan; none on a server that does not bill. */
  readonly entitlements: Entitlements;
  /**
   * Its posts on platforms that bill the server per post, in each calendar
   * month the period touches, oldest first.
   */
  readonly meteredPosts: readonly MeteredPostCount[];
  readonly period: UsagePeriod;
  readonly report: UsageReport;
  /**
   * The workspace whose plan its channels count against, when not its own:
   * a partner's home workspace.
   */
  readonly sharedWith: Option.Option<WorkspaceId>;
}

// The months a metered count falls in that the period touches.
const touches = (period: UsagePeriod) => (count: MeteredPostCount) =>
  !DateTime.isLessThan(count.month, DateTime.startOf(period.from, "month")) &&
  !DateTime.isGreaterThan(count.month, period.to);

/**
 * What a workspace has used of its plan: what each limit counts now, then
 * day by day (UTC) over a period, from the usage ledger, with the posts on
 * platforms that bill per post. Counts only: nothing is priced. Needs
 * billing:read. On a server that does not bill it answers the same counts,
 * without a plan.
 */
export class UsageReports extends Context.Service<
  UsageReports,
  {
    readonly ofWorkspace: (
      actor: Actor,
      asked: UsageRangeAsked
    ) => Effect.Effect<
      WorkspaceUsageReport,
      DatabaseError | InvalidUsageRange | MissingPermission
    >;
  }
>()("peal-server/billing/application/UsageReports") {
  static readonly layer = Layer.effect(
    UsageReports,
    Effect.gen(function* UsageReportsLive() {
      const entitlements = yield* WorkspaceEntitlements;
      const usage = yield* WorkspaceUsage;
      const ledger = yield* UsageLedger;
      const metered = yield* MeteredPostLedger;
      const holders = yield* PlanHolders;

      const ofWorkspace = Effect.fn("UsageReports.ofWorkspace")(
        function* ofWorkspace(actor: Actor, asked: UsageRangeAsked) {
          yield* Effect.fromResult(authorize(actor, "billing:read"));

          const period = yield* Effect.fromResult(
            usagePeriodOf(asked, yield* DateTime.now)
          );

          const { workspaceId } = actor;

          const found = yield* Effect.all(
            {
              counted: metered.ofWorkspace(workspaceId),
              current: usage.of(workspaceId),
              entitled: entitlements.of(workspaceId),
              holder: holders.holderOf(workspaceId),
              records: ledger.ofWorkspace(workspaceId, period),
            },
            { concurrency: "unbounded" }
          );

          const report: WorkspaceUsageReport = {
            current: found.current,
            entitlements: found.entitled,
            meteredPosts: found.counted.filter(touches(period)),
            period,
            report: reportOf(found.records, period),
            sharedWith:
              found.holder === workspaceId
                ? Option.none()
                : Option.some(found.holder),
          };

          return report;
        }
      );

      return UsageReports.of({ ofWorkspace });
    })
  );
}
