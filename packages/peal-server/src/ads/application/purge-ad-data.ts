import { Context, DateTime, Effect, Layer } from "effect";

import {
  auditRetention,
  insightCutoff,
  unusedGrantLifetime,
} from "#ads/domain/insight-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { BoostStore } from "./ports/boost-store.ts";
import { GrantStore } from "./ports/grant-store.ts";
import { ReadModel } from "./ports/read-model.ts";

/** What a run of the retention deleted. */
export interface PurgeReport {
  readonly auditLines: number;
  readonly days: number;
  readonly signIns: number;
}

/**
 * Ends what the ads context keeps for a time: the days of ads' numbers
 * past 13 months, the audit trail's lines past 13 months, the sign-ins
 * left in progress, and those that connected no account within a day.
 */
export class PurgeAdData extends Context.Service<
  PurgeAdData,
  { readonly purge: Effect.Effect<PurgeReport, DatabaseError> }
>()("peal-server/ads/application/PurgeAdData") {
  static readonly layer = Layer.effect(
    PurgeAdData,
    Effect.gen(function* PurgeAdDataLive() {
      const readModel = yield* ReadModel;
      const boosts = yield* BoostStore;
      const grants = yield* GrantStore;

      return PurgeAdData.of({
        purge: Effect.gen(function* purging() {
          const now = yield* DateTime.now;
          const { day, month, year } = DateTime.toPartsUtc(insightCutoff(now));

          const report: PurgeReport = {
            auditLines: yield* boosts.purgeAudit(
              DateTime.subtractDuration(now, auditRetention)
            ),
            days: yield* readModel.purgeDaysBefore({ day, month, year }),
            signIns: yield* grants.purge(
              now,
              DateTime.subtractDuration(now, unusedGrantLifetime)
            ),
          };

          return report;
        }).pipe(Effect.withSpan("PurgeAdData.purge")),
      });
    })
  );
}
