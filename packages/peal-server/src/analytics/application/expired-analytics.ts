import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** The instants before which what analytics keeps is deleted. */
export interface RetentionCutoffs {
  /** What was read on a platform without a cap of its own. */
  readonly before: DateTime.Utc;
  /** What was read on each platform whose terms cap its storage. */
  readonly byPlatform: readonly {
    readonly before: DateTime.Utc;
    readonly platform: Platform;
  }[];
  /** Posts of channels that left their workspace, by when they did. */
  readonly disconnectedBefore: DateTime.Utc;
  /** The counts of billed reads. */
  readonly paidReadsBefore: DateTime.Utc;
}

/** How much a purge deleted. */
export interface PurgeReport {
  /** Days of accounts' numbers. */
  readonly accountDays: number;
  /** Billed reads counted. */
  readonly paidReads: number;
  /** Posts followed, each with its snapshots. */
  readonly posts: number;
}

/** Deletes what analytics kept past its retention. */
export class ExpiredAnalytics extends Context.Service<
  ExpiredAnalytics,
  {
    readonly delete: (
      cutoffs: RetentionCutoffs
    ) => Effect.Effect<PurgeReport, DatabaseError>;
  }
>()("peal-server/analytics/application/ExpiredAnalytics") {}
