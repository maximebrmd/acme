import { Option, Result } from "effect";

import { PlanLimitReached } from "./plan-limit-reached.ts";
import type { PlanLimit } from "./plan-limit.ts";

/**
 * How many of something a workspace may have: none for no limit, as on a
 * server that does not bill.
 */
export type Allowance = Option.Option<number>;

/**
 * Whether one more fits, with `used` already taken: PlanLimitReached once
 * the allowance is used up. A workspace over its allowance, as after moving
 * to a smaller plan, keeps what it has and adds nothing.
 */
export const roomForOneMore = (
  limit: PlanLimit,
  allowance: Allowance,
  used: number
): Result.Result<void, PlanLimitReached> =>
  Option.match(allowance, {
    onNone: () => Result.succeed(undefined),
    onSome: (allowed) =>
      used < allowed
        ? Result.succeed(undefined)
        : Result.fail(new PlanLimitReached({ allowed, limit })),
  });
