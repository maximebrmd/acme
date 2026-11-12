import { Context, Effect, Layer } from "effect";

import type { RecyclingEndReason } from "#publishing/domain/recycling-end-reason.ts";
import type { RecyclingRule } from "#publishing/domain/recycling-rule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Tells those who expect a rule to go on that it ended, in the transaction
 * that ends it, once for each time it ends: a rule resumed and ended again
 * tells again. Nothing is told for an end a member meant (`completed`,
 * `stopped`).
 */
export class RecyclingNotices extends Context.Service<
  RecyclingNotices,
  {
    readonly ended: (
      rule: RecyclingRule,
      reason: RecyclingEndReason
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/RecyclingNotices") {
  /** For tests: nobody hears. */
  static readonly none = Layer.succeed(
    RecyclingNotices,
    RecyclingNotices.of({ ended: () => Effect.void })
  );
}
