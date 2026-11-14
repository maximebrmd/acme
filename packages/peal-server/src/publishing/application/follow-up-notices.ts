import { Context, Effect, Layer } from "effect";
import type { DateTime } from "effect";

import type { FollowUpEndReason } from "#publishing/domain/follow-up-end-reason.ts";
import type { FollowUpRule } from "#publishing/domain/follow-up-rule.ts";
import type { FollowUp } from "#publishing/domain/follow-up.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Tells those who expect a follow-up rule to act that it did not, in the
 * transaction that records it: follow-ups that ended without going out
 * (`notSent`, once a rule and UTC day, with how many and why), and a rule
 * that ended by itself (`stopped`, once a rule). Nothing is told for an
 * end a member meant (`stopped` by a member, `completed`).
 */
export class FollowUpNotices extends Context.Service<
  FollowUpNotices,
  {
    readonly notSent: (
      rule: FollowUpRule,
      followUps: readonly FollowUp[],
      now: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    readonly stopped: (
      rule: FollowUpRule,
      reason: Exclude<FollowUpEndReason, "completed" | "stopped">
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/FollowUpNotices") {
  /** For tests: nobody hears. */
  static readonly none = Layer.succeed(
    FollowUpNotices,
    FollowUpNotices.of({
      notSent: () => Effect.void,
      stopped: () => Effect.void,
    })
  );
}
