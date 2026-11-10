import { Effect } from "effect";

import { withinAllowance } from "#shared/domain/allowance.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { PostAllowance } from "./post-allowance.ts";

/**
 * Whether the workspace holds no more channels and members than its plan
 * allows: PlanLimitReached when it holds more. A workspace over its plan,
 * as after its trial, schedules and moves nothing until it is back within
 * it, whoever asks: a member, or an approval that would schedule a post
 * that waited.
 */
export const withinPlan = Effect.fn("Publishing.withinPlan")(
  function* withinPlan(workspaceId: WorkspaceId) {
    const allowance = yield* PostAllowance;
    const channels = yield* allowance.channels(workspaceId);

    yield* Effect.fromResult(
      withinAllowance("channels", channels.allowed, channels.connected)
    );

    const members = yield* allowance.members(workspaceId);

    yield* Effect.fromResult(
      withinAllowance("members", members.allowed, members.taken)
    );
  }
);
