import { Effect, Option } from "effect";
import { CurrentMember, PlanLimitReached } from "peal-contract";

import { UpgradePaths } from "#shared/application/upgrade-paths.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { PlanLimitReached as LimitReached } from "#shared/domain/plan-limit-reached.ts";

/** Answers a plan's refusal as the contract tells clients. */
export type LimitRefusal = (
  reached: LimitReached
) => Effect.Effect<never, PlanLimitReached, CurrentMember>;

/**
 * A plan's refusal as the contract tells clients, in the member's
 * workspace: the limit, what the workspace holds, its plan, the smallest
 * plan with room and its billing page (`UpgradePaths`). Handlers of every
 * context answer a limit with it, so every client can offer the same way
 * out. Built with the group, as its use cases are.
 */
export const limitRefusal: Effect.Effect<LimitRefusal, never, UpgradePaths> =
  UpgradePaths.use((paths) =>
    Effect.succeed((reached: LimitReached) =>
      Effect.gen(function* limitReached() {
        const member = yield* CurrentMember;

        const path = yield* paths.from(
          WorkspaceIdSchema.make(member.workspaceId),
          reached.limit,
          reached.needed
        );

        return yield* new PlanLimitReached({
          allowed: reached.allowed,
          billingUrl: path.billingUrl,
          limit: reached.limit,
          // Only a workspace with a plan is refused.
          plan: Option.getOrElse(path.plan, () => "free" as const),
          planWithRoom: Option.getOrNull(path.planWithRoom),
          used: reached.used,
        });
      })
    )
  );
