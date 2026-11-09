import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

/** Units of one bucket of a platform's daily quota, on one of its days. */
export interface QuotaSpending {
  /** The most units the server may spend in the bucket that day. */
  readonly allowance: number;
  /** The quota bucket, such as YouTube's video uploads. */
  readonly bucket: string;
  /** The day, as the platform counts days. */
  readonly day: LocalDate;
}

/**
 * The server's ledger of a platform's daily quotas, shared by every channel
 * and workspace, since the quota belongs to the server's API project. A
 * spend is counted in one statement, so calls made together never pass the
 * allowance.
 */
export class PlatformQuota extends Context.Service<
  PlatformQuota,
  {
    /** Spends `units` if they fit in the day's allowance: whether they did. */
    readonly spend: (
      spending: QuotaSpending & { readonly units: number }
    ) => Effect.Effect<boolean, DatabaseError>;
    /** Counts the day's allowance spent, as the platform said it is. */
    readonly exhaust: (
      spending: QuotaSpending
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/PlatformQuota") {}
