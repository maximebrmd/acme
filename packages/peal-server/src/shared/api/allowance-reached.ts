import { Effect } from "effect";
import { CurrentMember, UsageAllowanceReached } from "peal-contract";

import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import type { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/** Answers a meter's refusal as the contract tells clients. */
export type AllowanceRefusal = (
  reached: AllowanceReached
) => Effect.Effect<never, UsageAllowanceReached, CurrentMember>;

/**
 * A meter's refusal as the contract tells clients, in the member's
 * workspace: the meter, what the month allows and what was used, when it
 * resets, why, and the billing page of the workspace that bills the
 * account (`UpgradePaths`), where a payment method is added or a ceiling
 * raised. Handlers of every context that claims a meter answer with it.
 * Built with the group, as its use cases are.
 */
export const allowanceRefusal: Effect.Effect<
  AllowanceRefusal,
  never,
  UpgradePaths
> = UpgradePaths.use((paths) =>
  Effect.succeed((reached: AllowanceReached) =>
    Effect.gen(function* allowanceReached() {
      const member = yield* CurrentMember;

      const { billingUrl } = yield* paths.paid(
        WorkspaceIdSchema.make(member.workspaceId)
      );

      return yield* new UsageAllowanceReached({
        allowed: reached.allowed,
        billingUrl,
        meter: reached.meter,
        reason: reached.reason,
        resetsAt: reached.resetsAt,
        used: reached.used,
      });
    })
  )
);
