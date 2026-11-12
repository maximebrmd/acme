import { Context, DateTime, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { partnerUsageCutoff } from "#workspace/domain/partner-usage-retention.ts";

import { PartnerStore } from "./partner-store.ts";
import { PartnerWorkspaces } from "./partner-workspaces.ts";

/** What a run counted. */
export interface PartnerUsageRun {
  /** The partners' daily counts deleted, past their 400 days. */
  readonly days: number;
  /** The idempotency keys forgotten, past their day. */
  readonly keys: number;
  /** The partner accounts counted. */
  readonly partners: number;
}

/**
 * The daily count of what every partner account holds, its workspaces and
 * the channels connected across them, kept by day (UTC) so a price by the
 * workspace or by the connected channel has its figures; and the end of
 * the day workspace creations' idempotency keys are kept. The same run
 * deletes the daily counts past `partnerUsageRetentionDays` (400), whether
 * the count went through or not.
 */
export class MeterPartnerUsage extends Context.Service<
  MeterPartnerUsage,
  { readonly run: Effect.Effect<PartnerUsageRun, DatabaseError> }
>()("peal-server/workspace/application/MeterPartnerUsage") {
  static readonly layer = Layer.effect(
    MeterPartnerUsage,
    Effect.gen(function* MeterPartnerUsageLive() {
      const workspaces = yield* PartnerWorkspaces;
      const partners = yield* PartnerStore;

      const run = Effect.gen(function* run() {
        // The purge runs whatever became of the count, so days past their
        // time go even on a day the count fails.
        const counted = yield* Effect.all({
          keys: workspaces.purgeKeys,
          partners: workspaces.meter,
        }).pipe(Effect.exit);

        const days = yield* partners.purgeUsageBefore(
          partnerUsageCutoff(yield* DateTime.now)
        );

        const done: PartnerUsageRun = { ...(yield* counted), days };

        return done;
      }).pipe(Effect.withSpan("MeterPartnerUsage.run"));

      return MeterPartnerUsage.of({ run });
    })
  );
}
